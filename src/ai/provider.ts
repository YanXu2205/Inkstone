import { type AIConfig } from "./config";
import { getKey } from "./secrets";

/**
 * Streaming chat against either an OpenAI-compatible endpoint or
 * Anthropic's Messages API. No SDK, no proxy — one fetch straight from the
 * client to whatever the user configured.
 */

export interface ChatRequest {
  config: AIConfig;
  system: string;
  user: string;
  signal: AbortSignal;
  onDelta?(chunk: string): void;
}

/**
 * Rough token estimate for the pre-send disclosure. CJK is close to one
 * token per character; Latin text averages ~4 characters per token.
 */
const CJK = /[\p{Script=Han}\p{Script=Hiragana}\p{Script=Katakana}\p{Script=Hangul}]/gu;

export function estimateTokens(text: string): number {
  const cjk = (text.match(CJK) || []).length;
  const rest = text.length - cjk;
  return Math.ceil(cjk + rest / 4);
}

export async function chat(req: ChatRequest): Promise<string> {
  return req.config.kind === "anthropic" ? anthropic(req) : openai(req);
}

async function openai(req: ChatRequest): Promise<string> {
  const key = getKey();
  const headers: Record<string, string> = { "Content-Type": "application/json" };
  if (key) headers.Authorization = `Bearer ${key}`;

  const res = await fetch(`${trim(req.config.baseUrl)}/chat/completions`, {
    method: "POST",
    headers,
    signal: req.signal,
    body: JSON.stringify({
      model: req.config.model,
      temperature: 0.3,
      max_tokens: req.config.maxOutputTokens,
      stream: true,
      messages: [
        { role: "system", content: req.system },
        { role: "user", content: req.user },
      ],
    }),
  });
  await assertOk(res);

  return readSse(
    res,
    req.onDelta,
    (json) => str((json as OpenAIChunk)?.choices?.[0]?.delta?.content),
    (json) => str((json as OpenAIChunk)?.choices?.[0]?.message?.content),
  );
}

async function anthropic(req: ChatRequest): Promise<string> {
  const key = getKey();
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    "anthropic-version": "2023-06-01",
    // Browser-originated calls are rejected without this opt-in.
    "anthropic-dangerous-direct-browser-access": "true",
  };
  if (key) headers["x-api-key"] = key;

  const res = await fetch(`${trim(req.config.baseUrl)}/v1/messages`, {
    method: "POST",
    headers,
    signal: req.signal,
    body: JSON.stringify({
      model: req.config.model,
      max_tokens: req.config.maxOutputTokens,
      temperature: 0.3,
      stream: true,
      system: req.system,
      messages: [{ role: "user", content: req.user }],
    }),
  });
  await assertOk(res);

  return readSse(
    res,
    req.onDelta,
    (json) => {
      const event = json as AnthropicChunk;
      return event?.type === "content_block_delta" ? str(event.delta?.text) : "";
    },
    (json) => str((json as AnthropicChunk)?.content?.[0]?.text),
  );
}

interface OpenAIChunk {
  choices?: { delta?: { content?: unknown }; message?: { content?: unknown } }[];
}

interface AnthropicChunk {
  type?: string;
  delta?: { text?: unknown };
  content?: { text?: unknown }[];
}

function str(value: unknown): string {
  return typeof value === "string" ? value : "";
}

function trim(url: string): string {
  return url.replace(/\/+$/, "");
}

async function assertOk(res: Response): Promise<void> {
  if (res.ok) return;
  const detail = await res.text().catch(() => "");
  throw new Error(`HTTP ${res.status} ${detail.slice(0, 200)}`);
}

async function readSse(
  res: Response,
  onDelta: ((chunk: string) => void) | undefined,
  pick: (json: unknown) => string,
  whole: (json: unknown) => string,
): Promise<string> {
  // Local servers sometimes ignore `stream: true` and answer with plain JSON.
  if (!(res.headers.get("content-type") || "").includes("event-stream")) {
    const text = whole(await res.json());
    if (!text.trim()) throw new Error("empty response");
    onDelta?.(text);
    return text;
  }

  const reader = res.body?.getReader();
  if (!reader) throw new Error("no response body");

  const decoder = new TextDecoder();
  let buffer = "";
  let out = "";

  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });

    // SSE events are separated by a blank line; keep the partial tail.
    const events = buffer.split(/\r?\n\r?\n/);
    buffer = events.pop() ?? "";

    for (const event of events) {
      for (const line of event.split(/\r?\n/)) {
        if (!line.startsWith("data:")) continue;
        const payload = line.slice(5).trim();
        if (!payload || payload === "[DONE]") continue;
        let json: unknown;
        try {
          json = JSON.parse(payload);
        } catch {
          continue;
        }
        const chunk = pick(json);
        if (chunk) {
          out += chunk;
          onDelta?.(chunk);
        }
      }
    }
  }
  if (!out.trim()) throw new Error("empty response");
  return out;
}
