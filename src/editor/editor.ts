import {
  crosshairCursor,
  drawSelection,
  dropCursor,
  EditorView,
  highlightSpecialChars,
  keymap,
  rectangularSelection,
} from "@codemirror/view";
import { Compartment, EditorState, type Extension } from "@codemirror/state";
import { defaultKeymap, history, historyKeymap, indentWithTab } from "@codemirror/commands";
import { search, searchKeymap } from "@codemirror/search";
import { markdown, markdownLanguage } from "@codemirror/lang-markdown";
import { languages } from "@codemirror/language-data";
import { indentUnit, syntaxHighlighting } from "@codemirror/language";
import { tags as t } from "@lezer/highlight";
import type { MarkdownParser } from "@lezer/markdown";
import "katex/dist/katex.min.css";

import { livePreview, blockWidgets, blockWatcher } from "./livePreview";
import { otHighlight } from "./theme";
import { mathInlineParser, highlightInlineParser } from "./math";
import {
  insertLink,
  toggleBold,
  toggleInlineCode,
  toggleItalic,
  toggleStrike,
} from "./keymap";
import { lineSeparatorExt, serializeDoc } from "./serialize";

export interface EditorCallbacks {
  onSave(): void;
  onOpen(): void;
  onToggleSidebar(): void;
  onCommandPalette?(): void;
  onToggleSource?(): void;
  onDocChanged?(doc: string): void;
  onSelectionChanged?(view: EditorView): void;
  onOpenDroppedFile?(file: File): void;
  onPasteImage?(file: File): void;
}

/** Compartment holding the live-preview decorations — emptied in source mode. */
export const previewCompartment = new Compartment();

/** Everything that is independent of a particular document's line endings. */
export function baseExtensions(): Extension[] {
  return [
    history(),
    drawSelection(),
    dropCursor(),
    highlightSpecialChars(),
    rectangularSelection(),
    crosshairCursor(),
    EditorView.lineWrapping,
    indentUnit.of("  "),
    search(),
    markdown({
      base: {
        parser: (markdownLanguage.parser as MarkdownParser).configure({
          defineNodes: [
            { name: "InlineMath", style: t.monospace },
            { name: "DisplayMath", style: t.monospace },
            { name: "Highlight", style: t.special(t.string) },
          ],
          parseInline: [mathInlineParser, highlightInlineParser],
        }),
      } as unknown as typeof markdownLanguage,
      codeLanguages: languages,
    }),
    syntaxHighlighting(otHighlight),
    previewCompartment.of(previewExtensions()),
  ];
}

export function previewExtensions(): Extension[] {
  return [livePreview, blockWidgets, blockWatcher];
}

export function createEditor(
  parent: HTMLElement,
  initialDoc: string,
  cb: EditorCallbacks,
): EditorView {
  return new EditorView({
    parent,
    state: createEditorState(initialDoc, cb),
  });
}

/**
 * Open a new document in an existing view, pinning the line ending the file
 * arrived with so a later save cannot rewrite every line.
 */
export function createEditorState(doc: string, cb: EditorCallbacks): EditorState {
  return EditorState.create({
    doc,
    extensions: editorExtensions(doc, cb),
  });
}

export function openInEditor(view: EditorView, text: string, cb: EditorCallbacks): void {
  view.setState(createEditorState(text, cb));
}

export function setSourceMode(view: EditorView, source: boolean): void {
  view.dispatch({
    effects: previewCompartment.reconfigure(source ? [] : previewExtensions()),
  });
}

function editorExtensions(doc: string, cb: EditorCallbacks): Extension[] {
  return [
    lineSeparatorExt(doc),
    baseExtensions(),
    interactiveHandlers(cb),
    keymapLayer(cb),
    updateListener(cb),
  ];
}

function interactiveHandlers(cb: EditorCallbacks): Extension {
  return EditorView.domEventHandlers({
    paste(event) {
      const items = event.clipboardData?.items;
      if (!items) return false;
      for (const item of items) {
        if (item.type.startsWith("image/")) {
          const file = item.getAsFile();
          if (!file) continue;
          event.preventDefault();
          cb.onPasteImage?.(file);
          return true;
        }
      }
      return false;
    },
    drop(event) {
      const file = event.dataTransfer?.files?.[0];
      if (!file) return false;
      event.preventDefault();
      if (/\.(md|markdown|txt)$/i.test(file.name)) {
        cb.onOpenDroppedFile?.(file);
        return true;
      }
      if (file.type.startsWith("image/")) {
        cb.onPasteImage?.(file);
        return true;
      }
      return false;
    },
  });
}

function keymapLayer(cb: EditorCallbacks): Extension {
  return keymap.of([
    { key: "Mod-s", preventDefault: true, run: () => (cb.onSave(), true) },
    { key: "Mod-o", preventDefault: true, run: () => (cb.onOpen(), true) },
    { key: "Mod-\\", preventDefault: true, run: () => (cb.onToggleSidebar(), true) },
    {
      key: "Mod-Shift-p",
      preventDefault: true,
      run: () => (cb.onCommandPalette?.(), true),
    },
    {
      key: "Mod-/",
      preventDefault: true,
      run: () => (cb.onToggleSource?.(), true),
    },
    { key: "Mod-b", preventDefault: true, run: toggleBold },
    { key: "Mod-i", preventDefault: true, run: toggleItalic },
    { key: "Mod-e", preventDefault: true, run: toggleInlineCode },
    { key: "Mod-Shift-x", preventDefault: true, run: toggleStrike },
    { key: "Mod-k", preventDefault: true, run: insertLink },
    {
      key: "Mod-End",
      preventDefault: true,
      run: (v) => (
        v.dispatch({ selection: { anchor: v.state.doc.length }, scrollIntoView: true }),
        true
      ),
    },
    {
      key: "Mod-Home",
      preventDefault: true,
      run: (v) => (v.dispatch({ selection: { anchor: 0 }, scrollIntoView: true }), true),
    },
    ...searchKeymap,
    ...historyKeymap,
    ...defaultKeymap,
    indentWithTab,
  ]);
}

function updateListener(cb: EditorCallbacks): Extension {
  return EditorView.updateListener.of((update) => {
    if (update.docChanged) cb.onDocChanged?.(serializeDoc(update.state));
    if (update.selectionSet) cb.onSelectionChanged?.(update.view);
  });
}
