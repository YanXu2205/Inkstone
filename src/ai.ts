import type { EditorView } from "@codemirror/view";

/**
 * Bring-your-own-key AI assistance. Everything stays between the user
 * and their chosen OpenAI-compatible endpoint — OpenTypora ships no
 * cloud, no accounts, no telemetry.
 */

export interface AISettings {
  baseUrl: string;
  apiKey: string;
  model: string;
}

const KEY = "ot.ai";

const DEFAULTS: AISettings = {
  baseUrl: "https://api.openai.com/v1",
  apiKey: "",
  model: "gpt-4o-mini",
};

export function getAISettings(): AISettings {
  try {
    return { ...DEFAULTS, ...JSON.parse(localStorage.getItem(KEY) || "{}") };
  } catch {
    return { ...DEFAULTS };
  }
}

const PROMPTS: Record<string, string> = {
  polish:
    "You are a writing assistant. Improve clarity, grammar and flow of the markdown text. " +
    "Preserve all markdown syntax, code blocks and facts unchanged. " +
    "Reply with the revised markdown ONLY — no explanations, no wrapping code fences.",
  translate:
    "Translate the markdown text into English if it is mainly Chinese, otherwise into Chinese. " +
    "Preserve all markdown syntax. Reply with the translation ONLY.",
  summarize:
    "Summarize the text into 3–5 concise bullet points in the same language as the source, " +
    "as a markdown list. Reply with the list ONLY.",
};

export const AI_ACTIONS: { id: string; label: string; hint: string }[] = [
  { id: "polish", label: "✨ Polish", hint: "Fix grammar & flow, keep syntax" },
  { id: "translate", label: "文A Translate", hint: "EN ⇄ 中文, auto-detected" },
  { id: "summarize", label: "≡ Summarize", hint: "3–5 bullet points" },
];

export interface AIPanel {
  el: HTMLElement;
  close(): void;
}

/** Settings + quick-action modal. `onAction` runs an AI command on the editor. */
export function buildAIPanel(onAction: (id: string) => void): AIPanel {
  const s = getAISettings();
  const mask = document.createElement("div");
  mask.className = "ot-modal-mask";
  const modal = document.createElement("div");
  modal.className = "ot-modal";

  modal.innerHTML = `
    <h3>✨ AI Assist <span style="font-weight:400;font-size:11px;color:var(--fg-faint)">(bring your own key)</span></h3>
    <label>API Base URL <span style="opacity:.6">(any OpenAI-compatible endpoint)</span></label>
    <input data-k="baseUrl" value="${escapeAttr(s.baseUrl)}" spellcheck="false">
    <label>API Key <span style="opacity:.6">(stored only in this browser)</span></label>
    <input data-k="apiKey" type="password" value="${escapeAttr(s.apiKey)}" spellcheck="false" placeholder="sk-…">
    <label>Model</label>
    <input data-k="model" value="${escapeAttr(s.model)}" spellcheck="false">`;

  const actionsRow = document.createElement("div");
  actionsRow.style.cssText =
    "display:flex;flex-wrap:wrap;gap:8px;margin-top:16px;padding-top:12px;border-top:1px solid var(--border)";
  for (const a of AI_ACTIONS) {
    const b = document.createElement("button");
    b.className = "ot-btn";
    b.textContent = a.label;
    b.title = a.hint;
    b.addEventListener("click", () => {
      saveFromInputs();
      close();
      onAction(a.id);
    });
    actionsRow.appendChild(b);
  }
  modal.appendChild(actionsRow);

  const btnRow = document.createElement("div");
  btnRow.className = "ot-modal-actions";
  btnRow.innerHTML = `<button class="ot-btn" data-act="close">Close</button>
    <button class="ot-btn primary" data-act="save">Save</button>`;
  modal.appendChild(btnRow);

  mask.appendChild(modal);

  const close = () => mask.remove();

  function saveFromInputs() {
    const next: AISettings = { ...s };
    modal.querySelectorAll<HTMLInputElement>("input[data-k]").forEach((inp) => {
      next[inp.dataset.k as keyof AISettings] = inp.value.trim();
    });
    localStorage.setItem(KEY, JSON.stringify(next));
  }

  btnRow.addEventListener("click", (e) => {
    const btn = (e.target as HTMLElement).closest("button");
    if (!btn) return;
    if (btn.dataset.act === "save") {
      saveFromInputs();
      toast("AI settings saved");
    }
    close();
  });

  // clicking the mask closes
  mask.addEventListener("click", (e) => {
    if (e.target === mask) close();
  });

  return { el: mask, close };
}

export async function runAI(view: EditorView, id: string): Promise<void> {
  const settings = getAISettings();
  if (!settings.apiKey) {
    toast("Set your API key first (✨ button)");
    return;
  }
  const sys = PROMPTS[id];
  if (!sys) return;

  const { from, to } = view.state.selection.main;
  const useWhole = from === to;
  const text = useWhole ? view.state.doc.toString() : view.state.sliceDoc(from, to);
  if (!text.trim()) {
    toast("Nothing to work on");
    return;
  }

  toast(`AI ${id}… (may take a few seconds)`);
  try {
    const res = await fetch(`${settings.baseUrl.replace(/\/$/, "")}/chat/completions`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${settings.apiKey}`,
      },
      body: JSON.stringify({
        model: settings.model,
        temperature: 0.3,
        messages: [
          { role: "system", content: sys },
          { role: "user", content: text },
        ],
      }),
    });
    if (!res.ok) {
      const detail = await res.text().catch(() => "");
      throw new Error(`HTTP ${res.status} ${detail.slice(0, 140)}`);
    }
    const data = await res.json();
    const out: string = data?.choices?.[0]?.message?.content?.trim();
    if (!out) throw new Error("empty response");

    view.dispatch({
      changes: useWhole
        ? { from: 0, to: view.state.doc.length, insert: out }
        : { from, to, insert: out },
      selection: { anchor: from },
      scrollIntoView: true,
    });
    toast("Done — Ctrl+Z to undo");
  } catch (e) {
    toast(`AI failed: ${(e as Error).message}`);
  }
}

function escapeAttr(s: string): string {
  return s.replace(/[&<>"]/g, (c) =>
    ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c]!,
  );
}

export function toast(msg: string) {
  document.querySelectorAll(".ot-toast").forEach((t) => t.remove());
  const el = document.createElement("div");
  el.className = "ot-toast";
  el.textContent = msg;
  document.body.appendChild(el);
  setTimeout(() => el.remove(), 2600);
}
