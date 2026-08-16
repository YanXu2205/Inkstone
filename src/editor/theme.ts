import { HighlightStyle } from "@codemirror/language";
import { tags as t } from "@lezer/highlight";

/**
 * Syntax → CSS class mapping. The actual colors live in editor.css so
 * both themes can restyle everything via CSS variables.
 *
 * Headings are styled by line decorations (see livePreview.ts), not by
 * tags, so heading tags are intentionally unmapped.
 */
export const otHighlight = HighlightStyle.define([
  { tag: t.strong, class: "ot-t-strong" },
  { tag: t.emphasis, class: "ot-t-emphasis" },
  { tag: t.strikethrough, class: "ot-t-strike" },
  { tag: t.link, class: "ot-t-link" },
  { tag: t.url, class: "ot-t-url" },
  { tag: t.monospace, class: "ot-t-code" },
  { tag: t.processingInstruction, class: "ot-t-mark" },
  { tag: t.quote, class: "ot-t-quote" },
  { tag: t.labelName, class: "ot-t-meta" },
  { tag: t.contentSeparator, class: "ot-t-meta" },
  { tag: t.escape, class: "ot-t-mark" },
  { tag: t.character, class: "ot-t-mark" },

  // tokens inside fenced code blocks
  { tag: [t.keyword, t.controlKeyword, t.moduleKeyword, t.definitionKeyword], class: "ot-t-keyword" },
  { tag: [t.string, t.special(t.string), t.character], class: "ot-t-string" },
  { tag: [t.number, t.bool, t.null], class: "ot-t-number" },
  { tag: t.comment, class: "ot-t-comment" },
  { tag: [t.function(t.variableName), t.function(t.definition(t.variableName))], class: "ot-t-func" },
  { tag: [t.typeName, t.className, t.namespace], class: "ot-t-typeName" },
  { tag: t.variableName, class: "ot-t-var" },
]);
