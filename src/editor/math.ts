import type { InlineParser } from "@lezer/markdown";
/**
 * `$…$` inline / `$$…$$` display math for the Lezer markdown parser.
 *
 * Produces atomic `InlineMath` / `DisplayMath` nodes which the
 * live-preview plugin swaps for rendered KaTeX widgets (see
 * widgets.ts). Raw TeX shows through when the caret enters the node.
 */

const DOLLAR = 36;
const BACKSLASH = 92;
const NEWLINE = 10;

export const mathInlineParser: InlineParser = {
  name: "otMath",
  parse(cx, next, pos) {
    if (next !== DOLLAR) return -1;

    const display = cx.char(pos + 1) === DOLLAR;
    const open = display ? 2 : 1;
    const start = pos + open;

    for (let i = start; i < cx.end; i++) {
      const c = cx.char(i);
      if (c === BACKSLASH) {
        i++; // skip escaped char
        continue;
      }
      if (c === DOLLAR) {
        const closes =
          display ? cx.char(i + 1) === DOLLAR : i > start; // non-empty inline
        if (closes && i > start) {
          const end = i + (display ? 2 : 1);
          cx.addElement(cx.elt(display ? "DisplayMath" : "InlineMath", pos, end));
          return end;
        }
        if (!display) break; // "$$" opening found where "$" expected
      }
      if (!display && (c === NEWLINE || c === -1)) break; // inline stays on one line
    }
    return -1;
  },
};

/** Extract the TeX body from a math node's source text. */
export function mathBody(text: string): { tex: string; display: boolean } {
  if (text.startsWith("$$") && text.endsWith("$$") && text.length >= 4) {
    return { tex: text.slice(2, -2).trim(), display: true };
  }
  return { tex: text.slice(1, -1).trim(), display: false };
}
