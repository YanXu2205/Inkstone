import type { EditorState } from "@codemirror/state";
import { EditorState as ES } from "@codemirror/state";
import type { Extension } from "@codemirror/state";
import type { EditorView } from "@codemirror/view";

/** Detect the dominant line ending so a save never rewrites the whole file. */
export function detectLineSeparator(text: string): "\r\n" | "\n" {
  let crlf = 0;
  let lf = 0;
  for (let i = 0; i < text.length; i++) {
    if (text.charCodeAt(i) === 10 /* \n */) {
      if (i > 0 && text.charCodeAt(i - 1) === 13 /* \r */) crlf++;
      else lf++;
    }
  }
  return crlf > lf ? "\r\n" : "\n";
}

export function lineSeparatorExt(text: string): Extension {
  return ES.lineSeparator.of(detectLineSeparator(text));
}

/** Always prefer this over `doc.toString()` — it respects the pinned separator. */
export function serializeDoc(state: EditorState): string {
  return state.doc.sliceString(0, state.doc.length, state.lineBreak);
}

export function serializeView(view: EditorView): string {
  return serializeDoc(view.state);
}
