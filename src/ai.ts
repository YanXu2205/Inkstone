import type { EditorView } from "@codemirror/view";
import { t } from "./i18n";

/**
 * Bring-your-own-key AI assistance. Everything stays between the user
 * and their chosen OpenAI-compatible endpoint — Inkstone ships no
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

export const AI_ACTIONS: { id: string; key: string; hint: string }[] = [
  { id: "polish", key: "ai.action.polish", hint: "Fix grammar & flow, keep syntax" },
  { id: "translate", key: "ai.action.translate", hint: "EN ⇄ 中文, auto-detected" },
  { id: "summarize", key: "ai.action.summarize", hint: "3–5 bullet points" },
];

export interface AIPanel {
  el: HTMLElement;
  close(): void;
}

const PRESETS: { label: string; baseUrl: string; model: string }[] = [
  { label: "OpenAI", baseUrl: "https://api.openai.com/v1", model: "gpt-4o-mini" },
  { label: "Ollama (local)", baseUrl: "http://localhost:11434/v1", model: "llama3.2" },
  { label: "LM Studio (local)", baseUrl: "http://localhost:1234/v1", model: "local-model" },
];

/** Settings + quick-action modal. `onAction` runs an AI command on the editor. */
export function buildAIPanel(onAction: (id: string) => void): AIPanel {
  const s = getAISettings();
  const mask = document.createElement("div");
  mask.className = "ot-modal-mask";
  const modal = document.createElement("div");
  modal.className = "ot-modal";

  modal.innerHTML = `
    <h3>${t("ai.title")} <span style="font-weight:400;font-size:11px;color:var(--fg-faint)">(${t("ai.subtitle")})</span></h3>
    <label>${t("ai.baseUrl")} <span style="opacity:.6">${t("ai.baseUrlHint")}</span></label>
    <input data-k="baseUrl" value="${escapeAttr(s.baseUrl)}" spellcheck="false">
    <label>${t("ai.apiKey")} <span style="opacity:.6">${t("ai.apiKeyHint")}</span></label>
    <input data-k="apiKey" type="password" value="${escapeAttr(s.apiKey)}" spellcheck="false" placeholder="sk-…">
    <label>${t("ai.model")}</label>
    <input data-k="model" value="${escapeAttr(s.model)}" spellcheck="false">`;

  const presetRow = document.createElement("div");
  presetRow.style.cssText = "display:flex;gap:6px;flex-wrap:wrap;margin-top:8px";
  for (const p of PRESETS) {
    const b = document.createElement("button");
    b.className = "ot-btn";
    b.style.fontSize = "11.5px";
    b.style.padding = "4px 10px";
    b.textContent = p.label;
    b.addEventListener("click", () => {
      (modal.querySelector('[data-k="baseUrl"]') as HTMLInputElement).value = p.baseUrl;
      (modal.querySelector('[data-k="model"]') as HTMLInputElement).value = p.model;
    });
    presetRow.appendChild(b);
  }
  modal.appendChild(presetRow);

  const actionsRow = document.createElement("div");
  actionsRow.style.cssText =
    "display:flex;flex-wrap:wrap;gap:8px;margin-top:16px;padding-top:12px;border-top:1px solid var(--border)";
  for (const a of AI_ACTIONS) {
    const b = document.createElement("button");
    b.className = "ot-btn";
    b.textContent = t(a.key);
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
  btnRow.innerHTML = `<button class="ot-btn" data-act="close">${t("common.close")}</button>
    <button class="ot-btn primary" data-act="save">${t("settings.save")}</button>`;
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
      toast(t("toast.aiSettingsSaved"));
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
    toast(t("toast.aiKeyMissing"));
    return;
  }
  const sys = PROMPTS[id];
  if (!sys) return;

  const { from, to } = view.state.selection.main;
  const useWhole = from === to;
  const text = useWhole ? view.state.doc.toString() : view.state.sliceDoc(from, to);
  if (!text.trim()) {
    toast(t("toast.aiNothing"));
    return;
  }

  toast(t("toast.aiRunning", id));
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
    toast(t("toast.aiDone"));
  } catch (e) {
    toast(t("toast.aiFailed", (e as Error).message));
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
