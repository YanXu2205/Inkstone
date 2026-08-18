import type { Command } from "@codemirror/view";
import { EditorSelection } from "@codemirror/state";

/**
 * Markdown-aware wrapping commands with toggle & smart word selection,
 * mimicking Typora's Ctrl+B / Ctrl+I / Ctrl+K behaviour.
 */

function expandToWord(
  text: string,
  caret: number,
): { from: number; to: number } {
  const isWord = (c: string) => /[\p{L}\p{N}_]/u.test(c);
  let from = caret;
  let to = caret;
  while (from > 0 && isWord(text[from - 1])) from--;
  while (to < text.length && isWord(text[to])) to++;
  return { from, to };
}

/** Wrap (or unwrap) the selection / current word with `before`…`after`. */
function wrapWith(before: string, after: string = before): Command {
  return (view) => {
    const tr = view.state.changeByRange((range) => {
      let { from, to } = range;
      if (range.empty) {
        const line = view.state.doc.lineAt(range.from);
        const word = expandToWord(line.text, range.from - line.from);
        if (word.to > word.from) {
          from = line.from + word.from;
          to = line.from + word.to;
        }
      }
      const beforeText = view.state.sliceDoc(from - before.length, from);
      const afterText = view.state.sliceDoc(to, to + after.length);

      // toggle off when already wrapped
      if (beforeText === before && afterText === after) {
        return {
          changes: [
            { from: from - before.length, to: from, insert: "" },
            { from: to, to: to + after.length, insert: "" },
          ],
          range: EditorSelection.range(from - before.length, to - before.length),
        };
      }

      return {
        changes: [
          { from, insert: before },
          { from: to, insert: after },
        ],
        range: EditorSelection.range(from + before.length, to + before.length),
      };
    });
    view.dispatch(tr, { scrollIntoView: true });
    return true;
  };
}

/** Insert a link around the selection, caret placed on the URL. */
export const insertLink: Command = (view) => {
  const tr = view.state.changeByRange((range) => {
    let { from, to } = range;
    if (range.empty) {
      const line = view.state.doc.lineAt(range.from);
      const word = expandToWord(line.text, range.from - line.from);
      if (word.to > word.from) {
        from = line.from + word.from;
        to = line.from + word.to;
      }
    }
    const selected = view.state.sliceDoc(from, to);
    return {
      changes: { from, to, insert: `[${selected}]()` },
      range: EditorSelection.range(from + selected.length + 3, from + selected.length + 3),
    };
  });
  view.dispatch(tr, { scrollIntoView: true });
  return true;
};

export const toggleBold = wrapWith("**");
export const toggleItalic = wrapWith("*");
export const toggleStrike = wrapWith("~~");
export const toggleInlineCode = wrapWith("`");
