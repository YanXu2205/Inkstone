import { K } from "../storage";

/**
 * AI configuration. Deliberately light — `src/settings.ts` imports this to
 * render the on/off switch, while everything that can talk to a network
 * lives behind a dynamic import (see index.ts).
 */

export type ProviderKind = "openai" | "anthropic";
export type ContextMode = "selection" | "block" | "document";

export interface AIConfig {
  enabled: boolean;
  kind: ProviderKind;
  baseUrl: string;
  model: string;
  /** Opt-in: keep the key in localStorage instead of memory only. */
  persistKey: boolean;
  contextMode: ContextMode;
  maxOutputTokens: number;
}

export interface Preset {
  label: string;
  kind: ProviderKind;
  baseUrl: string;
  model: string;
}

/** Local presets come first — this project prefers models that never leave the machine. */
export const PRESETS: Preset[] = [
  { label: "Ollama", kind: "openai", baseUrl: "http://localhost:11434/v1", model: "qwen3:8b" },
  { label: "LM Studio", kind: "openai", baseUrl: "http://localhost:1234/v1", model: "local-model" },
  { label: "llama.cpp", kind: "openai", baseUrl: "http://localhost:8080/v1", model: "local-model" },
  { label: "OpenAI", kind: "openai", baseUrl: "https://api.openai.com/v1", model: "gpt-4o-mini" },
  { label: "Anthropic", kind: "anthropic", baseUrl: "https://api.anthropic.com", model: "claude-haiku-4-5" },
  { label: "DeepSeek", kind: "openai", baseUrl: "https://api.deepseek.com/v1", model: "deepseek-chat" },
];

const DEFAULTS: AIConfig = {
  enabled: false,
  kind: "openai",
  baseUrl: "http://localhost:11434/v1",
  model: "qwen3:8b",
  persistKey: false,
  contextMode: "block",
  maxOutputTokens: 2048,
};

export function loadConfig(): AIConfig {
  try {
    return { ...DEFAULTS, ...JSON.parse(localStorage.getItem(K.ai) || "{}") };
  } catch {
    return { ...DEFAULTS };
  }
}

export function saveConfig(next: AIConfig): void {
  localStorage.setItem(K.ai, JSON.stringify(next));
}

export function isEnabled(): boolean {
  return loadConfig().enabled;
}

export function setEnabled(on: boolean): void {
  saveConfig({ ...loadConfig(), enabled: on });
}

/** Loopback endpoints are treated as "never leaves this machine" in the UI. */
export function isLocalEndpoint(baseUrl: string): boolean {
  try {
    const host = new URL(baseUrl).hostname;
    return host === "localhost" || host === "127.0.0.1" || host === "::1" || host === "[::1]";
  } catch {
    return false;
  }
}

/** What the send-confirmation dialog shows as the destination. */
export function endpointHost(baseUrl: string): string {
  try {
    return new URL(baseUrl).host;
  } catch {
    return baseUrl;
  }
}
