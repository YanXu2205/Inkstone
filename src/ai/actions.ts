import type { EditorState } from "@codemirror/state";
import type { EditorView } from "@codemirror/view";
import type { ContextMode } from "./config";

/**
 * What each action does to the document is declared up front: `replace`
 * swaps a range (reviewed as a diff), `insert` adds text at the caret
 * (also reviewed as a diff), `comments` never touches the document at all.
 */

export type ResultKind = "replace" | "insert" | "comments";

export interface Action {
  id: string;
  kind: ResultKind;
  /** Rewrite actions work on the target range; these read the whole file. */
  wholeDoc?: boolean;
  system: string;
}

const KEEP =
  "Preserve every markdown construct exactly: headings, list markers, links, " +
  "images, footnotes, tables, math and code blocks. Never invent facts. " +
  "Reply with the resulting markdown ONLY — no preamble, no explanation, and " +
  "do not wrap the answer in a code fence.";

export const ACTIONS: Action[] = [
  {
    id: "polish",
    kind: "replace",
    system: `You are a careful copy editor. Improve grammar, clarity and flow while keeping the author's voice and meaning. ${KEEP}`,
  },
  {
    id: "concise",
    kind: "replace",
    system: `You are a ruthless editor. Say the same thing in fewer words. Cut padding, keep substance. ${KEEP}`,
  },
  {
    id: "expand",
    kind: "replace",
    system: `You are a writing partner. Develop the text with concrete detail and examples that follow from what is already there. ${KEEP}`,
  },
  {
    id: "translate",
    kind: "replace",
    system: `Translate the text into English if it is mainly Chinese, otherwise into Simplified Chinese. Translate prose only — leave code, identifiers, URLs and math untranslated. ${KEEP}`,
  },
  {
    id: "continue",
    kind: "insert",
    system: `You are the author's writing partner. Continue the draft from where it stops, matching voice, language and formatting. Write one to three paragraphs. Do not repeat the text you were given. ${KEEP}`,
  },
  {
    id: "summarize",
    kind: "insert",
    wholeDoc: true,
    system:
      "Summarize the document as 3–5 markdown bullet points in the language of the source. " +
      "Reply with the list ONLY — no heading, no preamble, no code fence.",
  },
  {
    id: "review",
    kind: "comments",
    wholeDoc: true,
    system:
      "You are reviewing a draft like a colleague leaving review comments. Point out unclear " +
      "passages, missing evidence, contradictions, repetition and structural problems. Reply as a " +
      "markdown list where each item quotes a short fragment, then states the issue. Suggest, do " +
      "not rewrite. Reply with the list ONLY.",
  },
];

export function findAction(id: string): Action | undefined {
  return ACTIONS.find((a) => a.id === id);
}

export interface Target {
  from: number;
  to: number;
  text: string;
  /** True when the target covers the entire document. */
  whole: boolean;
}

/** Paragraph-ish range around `pos`, bounded by blank lines. */
function enclosingBlock(state: EditorState, pos: number): { from: number; to: number } {
  const doc = state.doc;
  const start = doc.lineAt(pos);
  let first = start;
  let last = start;
  while (first.number > 1) {
    const prev = doc.line(first.number - 1);
    if (!prev.text.trim()) break;
    first = prev;
  }
  while (last.number < doc.lines) {
    const next = doc.line(last.number + 1);
    if (!next.text.trim()) break;
    last = next;
  }
  return { from: first.from, to: last.to };
}

/**
 * The range an action may rewrite — and, for everything except `continue`,
 * exactly the text that gets sent. The send-confirmation dialog shows this
 * verbatim, so nothing may be added behind the user's back.
 */
export function resolveTarget(
  view: EditorView,
  mode: ContextMode,
  action: Action,
): Target {
  const state = view.state;
  const doc = state.doc;
  const sel = state.selection.main;

  if (action.wholeDoc || mode === "document") {
    return { from: 0, to: doc.length, text: doc.toString(), whole: true };
  }
  if (!sel.empty) {
    return { from: sel.from, to: sel.to, text: state.sliceDoc(sel.from, sel.to), whole: false };
  }
  if (mode === "selection") {
    const line = doc.lineAt(sel.head);
    return { from: line.from, to: line.to, text: line.text, whole: false };
  }
  const block = enclosingBlock(state, sel.head);
  return {
    from: block.from,
    to: block.to,
    text: state.sliceDoc(block.from, block.to),
    whole: block.from === 0 && block.to === doc.length,
  };
}

/** Preceding text handed to `continue`, capped so we never quietly send a whole book. */
const CONTINUE_WINDOW = 2000;

export function buildUserMessage(action: Action, target: Target, state: EditorState): string {
  if (action.kind !== "insert" || action.id !== "continue") return target.text;
  const head = state.selection.main.head;
  return state.sliceDoc(Math.max(0, head - CONTINUE_WINDOW), head);
}
