import {
  Decoration,
  DecorationSet,
  EditorView,
  ViewPlugin,
  ViewUpdate,
} from "@codemirror/view";
import { StateEffect } from "@codemirror/state";
import { syntaxTree } from "@codemirror/language";
import { EditorSelection, EditorState, Range, StateField } from "@codemirror/state";import type { SyntaxNodeRef } from "@lezer/common";
import {
  FootnoteRefWidget,
  HrWidget,
  ImageWidget,
  MathWidget,
  MermaidWidget,
  TaskCheckboxWidget,
  TocWidget,
} from "./widgets";
import { mathBody } from "./math";
import { extractHeadings } from "../outline";

/**
 * The heart of Inkstone: a Typora-style "seamless live preview".
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

          // ```mermaid blocks are handled by the mermaidBlocks state field
          // (block replaces may not come from view plugins).

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
            const label = doc.sliceString(open.to, close.from);
            // `[^label]` footnote reference → superscript chip widget
            if (label.startsWith("^")) {
              ranges.push(
                Decoration.replace({
                  widget: new FootnoteRefWidget(n.from, label.slice(1)),
                }).range(n.from, n.to),
              );
              break;
            }
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

        /* ---------------- tables ---------------- */

        case "Table": {
          // Column alignment from the `| :---: | ---: |` delimiter row
          // (a direct child of Table, sibling of TableHeader).
          const aligns: ("left" | "center" | "right")[] = [];
          for (let ch = n.firstChild; ch; ch = ch.nextSibling) {
            if (ch.name !== "TableDelimiter") continue;
            const raw = doc.sliceString(ch.from, ch.to);
            for (const seg of raw.split("|")) {
              const s = seg.trim();
              if (!s || !/^-+:?-*:?-*$/.test(s)) continue;
              const l = s.startsWith(":");
              const r = s.endsWith(":");
              aligns.push(l && r ? "center" : r ? "right" : "left");
            }
          }
          for (let row = n.firstChild; row; row = row.nextSibling) {
            const isHeader = row.name === "TableHeader";
            let col = 0;
            for (let cell = row.firstChild; cell; cell = cell.nextSibling) {
              if (cell.name !== "TableCell") continue;
              if (cell.to > cell.from) {
                ranges.push(
                  Decoration.mark({
                    class: isHeader ? "ot-th" : "ot-td",
                    attributes: { style: `text-align:${aligns[col] ?? "left"}` },
                  }).range(cell.from, cell.to),
                );
              }
              col++;
            }
          }
          // Ruled look: light bottom border under every table line.
          for (let pos = n.from; pos <= n.to; ) {
            const line = doc.lineAt(pos);
            addLineClass(line.from, "ot-table-line");
            if (line.to >= n.to) break;
            pos = line.to + 1;
          }
          break;
        }

        case "TableDelimiter":
          // Hide the `---|---` separator row while the caret is outside.
          {
            let table = parent;
            while (table && table.name !== "Table") table = table.parent;
            if (table && !touched(sel, table.from, table.to)) {
              hide(n.from, n.to);
            }
          }
          break;

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

        case "InlineMath":
        case "DisplayMath": {
          if (touched(sel, n.from, n.to)) break;
          const { tex, display } = mathBody(doc.sliceString(n.from, n.to));
          if (!tex) break;
          ranges.push(
            Decoration.replace({
              widget: new MathWidget(n.from, tex, display),
            }).range(n.from, n.to),
          );
          break;
        }

        case "Highlight": {
          ranges.push(Decoration.mark({ class: "ot-hl" }).range(n.from, n.to));
          if (!touched(sel, n.from, n.to)) {
            hide(n.from, n.from + 2);
            hide(n.to - 2, n.to);
          }
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

  // Footnote definition lines (`[^label]: text`) — small & faint.
  {
    let inFence = false;
    for (let i = 1; i <= doc.lines; i++) {
      const line = doc.line(i);
      if (/^\s*(```|~~~)/.test(line.text)) inFence = !inFence;
      if (!inFence && /^\s*\[\^[^\]]+\]:/.test(line.text)) {
        addLineClass(line.from, "ot-fn-def");
      }
    }
  }

  return Decoration.set(ranges, true);
}

/** Dispatch to force a decoration rebuild (e.g. after a theme switch). */
export const refreshDecos = StateEffect.define<void>();

/**
 * Block-level widgets — Mermaid diagrams and `[toc]` tables of
 * contents.
 *
 * Block replace decorations may not be provided by view plugins, so
 * they live in a StateField. Because the syntax tree parses
 * asynchronously, a small watcher plugin signals the field (via a
 * microtask dispatch — plugins may not dispatch inside update) every
 * time the tree, doc, selection or theme changes.
 */
const recomputeBlocks = StateEffect.define<void>();

export const blockWatcher = ViewPlugin.fromClass(
  class {
    update(u: ViewUpdate) {
      if (
        u.docChanged ||
        u.selectionSet ||
        u.viewportChanged ||
        syntaxTree(u.startState) !== syntaxTree(u.state) ||
        u.transactions.some((tr) => tr.effects.some((e) => e.is(refreshDecos)))
      ) {
        const view = u.view;
        queueMicrotask(() => view.dispatch({ effects: recomputeBlocks.of() }));
      }
    }
  },
);

export const blockWidgets = StateField.define<DecorationSet>({
  create(state) {
    return safeBuildBlocks(state);
  },
  update(value, tr) {
    for (const e of tr.effects) if (e.is(recomputeBlocks)) return safeBuildBlocks(tr.state);
    return value;
  },
  provide: (field) => EditorView.decorations.from(field),
});

function safeBuildBlocks(state: EditorState): DecorationSet {
  try {
    const ranges: Range<Decoration>[] = [];
    const doc = state.doc;
    const sel = state.selection;

    syntaxTree(state).iterate({
      enter: (ref) => {
        if (ref.name !== "FencedCode") return;
        const n = ref.node;
        const info = n.getChild("CodeInfo");
        const lang = info ? doc.sliceString(info.from, info.to).trim() : "";
        if (lang !== "mermaid" || touched(state.selection, n.from, n.to)) return;
        const first = doc.lineAt(n.from);
        const last = doc.lineAt(n.to);
        const code = doc.sliceString(first.to + 1, last.from);
        ranges.push(
          Decoration.replace({
            widget: new MermaidWidget(
              n.from,
              code,
              document.documentElement.dataset.tone === "dark",
            ),
            block: true,
          }).range(first.from, last.to),
        );
      },
    });

    // `[toc]` lines → auto table of contents
    for (let i = 1; i <= doc.lines; i++) {
      const line = doc.line(i);
      if (!/^\s*\[toc\]\s*$/i.test(line.text)) continue;
      if (touched(sel, line.from, line.to)) continue;
      const headings = extractHeadings(doc.toString());
      ranges.push(
        Decoration.replace({
          widget: new TocWidget(line.from, headings),
          block: true,
        }).range(line.from, line.to),
      );
    }

    return Decoration.set(ranges, true);
  } catch (e) {
    console.error("[blockWidgets] build failed:", e);
    return Decoration.none;
  }
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
        syntaxTree(u.startState) !== syntaxTree(u.state) ||
        u.transactions.some((tr) => tr.effects.some((e) => e.is(refreshDecos)))
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
