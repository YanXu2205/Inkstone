import {
  crosshairCursor,
  drawSelection,
  dropCursor,
  EditorView,
  highlightSpecialChars,
  keymap,
  rectangularSelection,
} from "@codemirror/view";
import { EditorState, type Extension } from "@codemirror/state";
import { defaultKeymap, history, historyKeymap, indentWithTab } from "@codemirror/commands";
import { search, searchKeymap } from "@codemirror/search";
import { markdown, markdownLanguage } from "@codemirror/lang-markdown";
import { languages } from "@codemirror/language-data";
import { indentUnit, syntaxHighlighting } from "@codemirror/language";

import { livePreview } from "./livePreview";
import { otHighlight } from "./theme";
import {
  insertLink,
  toggleBold,
  toggleInlineCode,
  toggleItalic,
  toggleStrike,
} from "./keymap";

export interface EditorCallbacks {
  /** Ctrl+S */
  onSave(): void;
  /** Ctrl+O */
  onOpen(): void;
  /** Ctrl+\ — toggle outline sidebar */
  onToggleSidebar(): void;
  /** Called after every document change. */
  onDocChanged?(doc: string): void;
  /** Called after caret/selection moves. */
  onSelectionChanged?(view: EditorView): void;
  /** User dropped a .md file onto the editor. */
  onOpenDroppedFile?(file: File): void;
}

export function createEditor(
  parent: HTMLElement,
  initialDoc: string,
  cb: EditorCallbacks,
): EditorView {
  const view = new EditorView({
    parent,
    state: EditorState.create({
      doc: initialDoc,
      extensions: [
        baseExtensions(),
        interactiveHandlers(cb),
        keymapLayer(cb),
        updateListener(cb),
      ],
    }),
  });
  return view;
}

function baseExtensions(): Extension[] {
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
    // markdownLanguage = CommonMark + GFM (tables, task lists, strikethrough…)
    markdown({ base: markdownLanguage, codeLanguages: languages }),
    syntaxHighlighting(otHighlight),
    livePreview,
  ];
}

/** Paste images & drop .md files. */
function interactiveHandlers(cb: EditorCallbacks): Extension {
  return EditorView.domEventHandlers({
    paste(event, view) {
      const items = event.clipboardData?.items;
      if (!items) return false;
      for (const item of items) {
        if (item.type.startsWith("image/")) {
          const file = item.getAsFile();
          if (!file) continue;
          event.preventDefault();
          const reader = new FileReader();
          reader.onload = () => {
            const name = file.name || "pasted-image.png";
            view.dispatch(view.state.replaceSelection(`![${name}](${reader.result})`), {
              scrollIntoView: true,
            });
          };
          reader.readAsDataURL(file);
          return true;
        }
      }
      return false;
    },
    drop(event) {
      const file = event.dataTransfer?.files?.[0];
      if (file && /\.(md|markdown|txt)$/i.test(file.name)) {
        event.preventDefault();
        cb.onOpenDroppedFile?.(file);
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
    { key: "Mod-b", preventDefault: true, run: toggleBold },
    { key: "Mod-i", preventDefault: true, run: toggleItalic },
    { key: "Mod-e", preventDefault: true, run: toggleInlineCode },
    { key: "Mod-Shift-x", preventDefault: true, run: toggleStrike },
    { key: "Mod-k", preventDefault: true, run: insertLink },
    ...searchKeymap,
    ...historyKeymap,
    ...defaultKeymap,
    indentWithTab,
  ]);
}

function updateListener(cb: EditorCallbacks): Extension {
  return EditorView.updateListener.of((update) => {
    if (update.docChanged) cb.onDocChanged?.(update.state.doc.toString());
    if (update.selectionSet) cb.onSelectionChanged?.(update.view);
  });
}
