import type { EditorView } from "@codemirror/view";
import { t } from "../i18n";
import { toast } from "../toast";
import { isLocalEndpoint, loadConfig } from "./config";
import { getKey } from "./secrets";
import { buildUserMessage, findAction, resolveTarget } from "./actions";
import { chat, estimateTokens } from "./provider";
import { scanForSecrets } from "./scan";
import { appendLog } from "./log";
import { confirmSecrets, confirmSend, redact, reviewDiff, showComments } from "./review-ui";
import { destination, openSettings } from "./settings-ui";

export async function runAction(view: EditorView, id: string): Promise<void> {
  const config = loadConfig();
  if (!config.enabled) {
    toast(t("ai.toast.disabled"));
    openSettings();
    return;
  }

  const action = findAction(id);
  if (!action) return;

  const target = resolveTarget(view, config.contextMode, action);
  let payload = buildUserMessage(action, target, view.state);
  if (!payload.trim()) {
    toast(t("ai.toast.nothing"));
    return;
  }

  const dest = destination(config);

  const findings = scanForSecrets(payload);
  if (findings.length) {
    const choice = await confirmSecrets(findings, dest);
    if (choice === "cancel") return;
    if (choice === "redacted") payload = redact(payload, findings);
  }

  const label = t(`ai.act.${action.id}`);
  if (!(await confirmSend({
    actionLabel: label,
    destination: dest,
    model: config.model,
    text: payload,
    whole: target.whole,
  }))) {
    return;
  }

  if (!getKey() && !isLocalEndpoint(config.baseUrl)) {
    toast(t("ai.toast.noKey"));
    openSettings();
    return;
  }

  const controller = new AbortController();
  const hud = openHud(label, () => controller.abort());
  let output = "";

  try {
    output = await chat({
      config,
      system: action.system,
      user: payload,
      signal: controller.signal,
      onDelta: (chunk) => hud.grow(chunk.length),
    });
  } catch (e) {
    hud.close();
    const err = e as Error;
    const cancelled = err.name === "AbortError";
    toast(cancelled ? t("ai.toast.cancelled") : t("ai.toast.failed", err.message));
    log(config, action.id, payload, output, cancelled ? "cancelled" : "error");
    return;
  }
  hud.close();
  log(config, action.id, payload, output, "ok");

  const clean = stripFence(output);

  if (action.kind === "comments") {
    showComments(clean);
    return;
  }

  if (action.kind === "insert") {
    const accepted = await reviewDiff("", clean);
    if (accepted === null) {
      toast(t("ai.toast.discarded"));
      return;
    }
    const head = view.state.selection.main.head;
    const line = view.state.doc.lineAt(head);
    const insert = `${line.text.trim() ? "\n\n" : ""}${accepted}`;
    view.dispatch({
      changes: { from: line.to, insert },
      selection: { anchor: line.to + insert.length },
      scrollIntoView: true,
    });
    toast(t("ai.toast.applied", 1));
    return;
  }

  const accepted = await reviewDiff(target.text, clean);
  if (accepted === null) {
    toast(t("ai.toast.discarded"));
    return;
  }
  if (accepted === target.text) {
    toast(t("ai.toast.discarded"));
    return;
  }
  view.dispatch({
    changes: { from: target.from, to: target.to, insert: accepted },
    selection: { anchor: target.from },
    scrollIntoView: true,
  });
  toast(t("ai.toast.applied", 1));
}

/** Models often wrap the answer in a fence despite being told not to. */
function stripFence(text: string): string {
  const trimmed = text.trim();
  const m = /^```[A-Za-z0-9-]*\n([\s\S]*?)\n?```$/.exec(trimmed);
  return (m ? m[1] : trimmed).replace(/\s+$/, "");
}

function log(
  config: ReturnType<typeof loadConfig>,
  action: string,
  input: string,
  output: string,
  status: "ok" | "cancelled" | "error",
): void {
  appendLog({
    at: Date.now(),
    action,
    host: destination(config),
    model: config.model,
    local: isLocalEndpoint(config.baseUrl),
    inTokens: estimateTokens(input),
    outTokens: estimateTokens(output),
    status,
  });
}

interface Hud {
  grow(chars: number): void;
  close(): void;
}

function openHud(label: string, onCancel: () => void): Hud {
  const el = document.createElement("div");
  el.className = "ot-hud";
  const text = document.createElement("span");
  let chars = 0;
  text.textContent = t("ai.toast.running", label);
  const cancel = document.createElement("button");
  cancel.className = "ot-btn";
  cancel.textContent = t("ai.cancel");
  cancel.addEventListener("click", () => onCancel());
  el.append(text, cancel);
  document.body.appendChild(el);

  const onKey = (e: KeyboardEvent) => {
    if (e.key === "Escape") onCancel();
  };
  document.addEventListener("keydown", onKey, true);

  return {
    grow(n) {
      chars += n;
      text.textContent = `${t("ai.toast.running", label)} · ${chars}`;
    },
    close() {
      document.removeEventListener("keydown", onKey, true);
      el.remove();
    },
  };
}
