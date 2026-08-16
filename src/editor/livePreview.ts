import {
  Decoration,
  DecorationSet,
  EditorView,
  ViewPlugin,
  ViewUpdate,
} from "@codemirror/view";
import { syntaxTree } from "@codemirror/language";
import { EditorSelection, EditorState, Range } from "@codemirror/state";
import type { SyntaxNodeRef } from "@lezer/common";
import { HrWidget, ImageWidget, TaskCheckboxWidget } from "./widgets";

/**
 * The heart of OpenTypora: a Typora-style "seamless live preview".
 *
 * The document always IS markdown — there is no second rendering
 * surface. Instead we walk the lezer syntax tree and decorate the
 * single CodeMirror view:
 *
 *   - syntax markers (#, **, `, >, ](url) …) are collapsed via
 *     Decoration.replace whenever the caret is outside their block,
 *   - headings/quotes/code fences get block-level line styling,
 *   - images, task checkboxes and rules become interactive widgets.
 *
 * When the caret enters a construct, its raw syntax re-appears in
 * place — exactly like Typora.
 */

/** Does the selection touch [from, to)? Empty cursors count at the start edge. */
function touched(sel: EditorSelection, from: number, to: number): boolean {
  for (const r of sel.ranges) {
    if (r.empty ? r.from >= from && r.from < to : r.to > from && r.from < to) {
      return true;
    }
  }
  return false;
}

/** Extend a hiding range over trailing spaces (e.g. `# ` and `> `). */
function eatSpaces(state: EditorState, from: number, to: number): number {
  const doc = state.doc;
  let end = to;
  while (
    end < doc.length &&
    doc.sliceString(end, end + 1) === " " &&
    doc.lineAt(end).number === doc.lineAt(from).number
  ) {
    end++;
  }
  return end;
}

const HIDDEN = Decoration.replace({});

function buildDecorations(view: EditorView): DecorationSet {
  const state = view.state;
  const sel = state.selection;
  const ranges: Range<Decoration>[] = [];
  const doc = state.doc;

  const hide = (from: number, to: number) => {
    if (to > from) ranges.push(HIDDEN.range(from, to));
  };

  const addLineClass = (pos: number, cls: string, attrs?: Record<string, string>) => {
    const line = doc.lineAt(pos);
    ranges.push(Decoration.line({ class: cls, attributes: attrs }).range(line.from));
  };

  syntaxTree(state).iterate({
    enter: (ref: SyntaxNodeRef) => {
      const n = ref.node;
      const parent = n.parent;

      switch (n.name) {
        /* ---------------- block styling ---------------- */

        case "ATXHeading1":
        case "SetextHeading1":
          addLineClass(n.from, "ot-h1");
          break;
        case "ATXHeading2":
        case "SetextHeading2":
          addLineClass(n.from, "ot-h2");
          break;
        case "ATXHeading3":
          addLineClass(n.from, "ot-h3");
          break;
        case "ATXHeading4":
          addLineClass(n.from, "ot-h4");
          break;
        case "ATXHeading5":
          addLineClass(n.from, "ot-h5");
          break;
        case "ATXHeading6":
          addLineClass(n.from, "ot-h6");
          break;

        case "Blockquote": {
          for (let pos = n.from; pos <= n.to; ) {
            const line = doc.lineAt(pos);
            addLineClass(line.from, "ot-quote-line");
            if (line.to >= n.to) break;
            pos = line.to + 1;
          }
          break;
        }

        case "FencedCode":
        case "CodeBlock": {
          const first = doc.lineAt(n.from);
          const last = doc.lineAt(n.to);
          const info = n.getChild("CodeInfo");
          const lang = info ? doc.sliceString(info.from, info.to).trim() : "";
          for (let line = first; ; line = doc.line(line.number + 1)) {
            const cls = ["ot-code-line"];
            const attrs: Record<string, string> = {};
            if (line.number === first.number) {
              cls.push("ot-code-first");
              if (lang) attrs["data-lang"] = lang;
            }
            if (line.number === last.number) cls.push("ot-code-last");
            addLineClass(line.from, cls.join(" "), attrs);
            if (line.number === last.number || line.to >= doc.length) break;
          }
          break;
        }

        /* ---------------- hidden syntax markers ---------------- */

        case "HeaderMark":
          if (parent && !touched(sel, parent.from, parent.to)) {
            hide(n.from, eatSpaces(state, n.from, n.to));
          }
          break;

        case "QuoteMark":
          if (parent && !touched(sel, parent.from, parent.to)) {
            hide(n.from, eatSpaces(state, n.from, n.to));
          }
          break;

        case "EmphasisMark":
        case "StrikethroughMark":
          if (parent && !touched(sel, parent.from, parent.to)) {
            hide(n.from, n.to);
          }
          break;

        case "CodeMark":
          // Inline backticks — fence marks are handled with FencedCode.
          if (parent && (parent.name === "InlineCode" || parent.name === "FencedCode")) {
            if (!touched(sel, parent.from, parent.to)) hide(n.from, n.to);
          }
          break;

        case "CodeInfo":
          if (parent && !touched(sel, parent.from, parent.to)) {
            hide(n.from, n.to);
          }
          break;

        /* ---------------- links & images ---------------- */

        case "Link": {
          if (touched(sel, n.from, n.to)) break;
          // Structure: `[` label `]` `(` URL `)` — the parens are LinkMarks too.
          const marks: SyntaxNodeRef[] = [];
          for (let ch = n.firstChild; ch; ch = ch.nextSibling) {
            if (ch.name === "LinkMark") marks.push(ch);
          }
          if (marks.length >= 2) {
            const [open, close] = marks;
            hide(open.from, open.to);
            ranges.push(
              Decoration.mark({ class: "ot-t-link" }).range(open.to, close.from),
            );
            hide(close.from, n.to);
          }
          break;
        }

        case "Image": {
          if (touched(sel, n.from, n.to)) break;
          const urlNode = n.getChild("URL");
          let src = urlNode ? doc.sliceString(urlNode.from, urlNode.to) : "";
          src = src.replace(/^\(/, "").replace(/\)[ \t]*$/, "").trim();
          let alt = "";
          const marks: SyntaxNodeRef[] = [];
          for (let ch = n.firstChild; ch; ch = ch.nextSibling) {
            if (ch.name === "LinkMark") marks.push(ch);
          }
          if (marks.length >= 2) alt = doc.sliceString(marks[0].to, marks[1].from);
          ranges.push(
            Decoration.replace({
              widget: new ImageWidget(n.from, src, alt),
              block: false,
            }).range(n.from, n.to),
          );
          break;
        }

        /* ---------------- interactive widgets ---------------- */

        case "TaskMarker": {
          if (touched(sel, n.from, n.to)) break;
          const text = doc.sliceString(n.from, n.to);
          if (text !== "[ ]" && text !== "[x]") break;
          ranges.push(
            Decoration.replace({
              widget: new TaskCheckboxWidget(n.from, text === "[x]"),
            }).range(n.from, n.to),
          );
          break;
        }

        case "HorizontalRule": {
          if (touched(sel, n.from, n.to)) break;
          ranges.push(
            Decoration.replace({ widget: new HrWidget(n.from) }).range(n.from, n.to),
          );
          break;
        }
      }
    },
  });

  return Decoration.set(ranges, true);
}

export const livePreview = ViewPlugin.fromClass(
  class {
    decorations: DecorationSet;

    constructor(view: EditorView) {
      this.decorations = safeBuild(view);
    }

    update(u: ViewUpdate) {
      if (
        u.docChanged ||
        u.viewportChanged ||
        u.selectionSet ||
        u.focusChanged ||
        syntaxTree(u.startState) !== syntaxTree(u.state)
      ) {
        this.decorations = safeBuild(u.view);
      }
    }
  },
  {
    decorations: (v) => v.decorations,
  },
);

/** Never let a decoration bug take down the whole editor. */
function safeBuild(view: EditorView): DecorationSet {
  try {
    return buildDecorations(view);
  } catch (e) {
    console.error("[livePreview] decoration build failed:", e);
    return Decoration.none;
  }
}
