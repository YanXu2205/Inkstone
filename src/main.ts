import "./styles/base.css";
import "./styles/editor.css";

import { EditorView } from "@codemirror/view";
import { createEditor } from "./editor/editor";
import { extractHeadings, renderOutline } from "./outline";
import { openMarkdown, saveMarkdown, readDroppedFile, type OpenedDoc } from "./fileio";
import { exportHTML, printPDF } from "./export";
import { buildAIPanel, runAI, toast, type AIPanel } from "./ai";
import { WELCOME_MD } from "./welcome";

/* ---------------- state ---------------- */

const DRAFT_KEY = "ot.draft";
const THEME_KEY = "ot.theme";

let view: EditorView;
let currentDoc: OpenedDoc | null = null;
let dirty = false;
let isWelcome = true;

/* ---------------- dom ---------------- */

const $ = <T extends HTMLElement = HTMLElement>(sel: string) =>
  document.querySelector(sel) as T;

const titleEl = $("#doc-title");
const dirtyEl = $("#doc-dirty");
const sidebar = $("#sidebar");
const outlineEl = $("#outline");
const stPos = $("#st-pos");
const stCount = $("#st-count");

/* ---------------- theme ---------------- */

let themeMode: "light" | "dark" | "auto" =
  (localStorage.getItem(THEME_KEY) as "light" | "dark" | "auto") || "auto";

function applyTheme() {
  const dark =
    themeMode === "dark" ||
    (themeMode === "auto" && matchMedia("(prefers-color-scheme: dark)").matches);
  document.documentElement.dataset.theme = dark ? "dark" : "light";
}

matchMedia("(prefers-color-scheme: dark)").addEventListener("change", applyTheme);

$("#btn-theme").addEventListener("click", () => {
  themeMode = themeMode === "light" ? "dark" : themeMode === "dark" ? "auto" : "light";
  localStorage.setItem(THEME_KEY, themeMode);
  applyTheme();
  toast(`Theme: ${themeMode}`);
});
applyTheme();

/* ---------------- sidebar ---------------- */

$("#btn-sidebar").addEventListener("click", () => sidebar.classList.toggle("collapsed"));
const toggleSidebar = () => sidebar.classList.toggle("collapsed");

/* ---------------- export menu ---------------- */

$("#btn-export").addEventListener("click", (e) => {
  e.stopPropagation();
  document.querySelector(".ot-menu")?.remove();
  const menu = document.createElement("div");
  menu.className = "ot-menu";
  const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
  menu.style.top = `${rect.bottom + 6}px`;
  menu.style.right = `${innerWidth - rect.right}px`;

  const items: [string, () => void][] = [
    ["📄 Export HTML", () => exportHTML(docTitle(), view.state.doc.toString())],
    ["🖨 Print / PDF", () => printPDF(docTitle(), view.state.doc.toString())],
  ];
  for (const [label, fn] of items) {
    const b = document.createElement("button");
    b.textContent = label;
    b.onclick = () => {
      menu.remove();
      fn();
    };
    menu.appendChild(b);
  }
  document.body.appendChild(menu);
});

document.addEventListener("click", () => document.querySelector(".ot-menu")?.remove());

/* ---------------- AI panel ---------------- */

let aiPanel: AIPanel | null = null;

$("#btn-ai").addEventListener("click", () => {
  if (aiPanel) {
    aiPanel.close();
    aiPanel = null;
    return;
  }
  aiPanel = buildAIPanel((id) => runAI(view, id));
  aiPanel.el.addEventListener("click", (e) => {
    if (e.target === aiPanel?.el) {
      aiPanel.close();
      aiPanel = null;
    }
  });
  document.body.appendChild(aiPanel.el);
});

/* ---------------- status bar ---------------- */

function docTitle(): string {
  return currentDoc?.name || (isWelcome ? "Welcome.md" : "Untitled.md");
}

function refreshStatus() {
  const sel = view.state.selection.main;
  const line = view.state.doc.lineAt(sel.head);
  stPos.textContent = `Ln ${line.number}, Col ${sel.head - line.from + 1}`;
  refreshCounts();
}

function refreshCounts() {
  const doc = view.state.doc.toString();
  const cjk = (doc.match(/[\u3400-\u4dbf\u4e00-\u9fff]/g) || []).length;
  const words = (doc.match(/[A-Za-z0-9][A-Za-z0-9'’\-_]*/g) || []).length;
  stCount.textContent = `${cjk + words} words · ${doc.length} chars`;
}

function refreshOutline() {
  renderOutline(
    extractHeadings(view.state.doc.toString()),
    outlineEl,
    view,
    view.state.selection.main.head,
  );
}

function setDirty(d: boolean) {
  dirty = d;
  dirtyEl.hidden = !d;
  titleEl.textContent = docTitle();
}

/* ---------------- draft persistence ---------------- */

let draftTimer: ReturnType<typeof setTimeout> | undefined;
function scheduleDraft() {
  clearTimeout(draftTimer);
  draftTimer = setTimeout(() => {
    if (isWelcome || !currentDoc) {
      localStorage.setItem(DRAFT_KEY, view.state.doc.toString());
    }
  }, 800);
}

/* ---------------- file actions ---------------- */

async function openFile() {
  const doc = await openMarkdown();
  if (!doc) return;
  currentDoc = doc;
  isWelcome = false;
  localStorage.removeItem(DRAFT_KEY);
  view.dispatch({
    changes: {
      from: 0,
      to: view.state.doc.length,
      insert: doc.text,
    },
  });
  setDirty(false);
  refreshStatus();
  refreshOutline();
  view.focus();
  toast(`Opened ${doc.name}`);
}

async function openDropped(file: File) {
  const doc = await readDroppedFile(file);
  currentDoc = doc;
  isWelcome = false;
  localStorage.removeItem(DRAFT_KEY);
  view.dispatch({
    changes: { from: 0, to: view.state.doc.length, insert: doc.text },
  });
  setDirty(false);
  refreshStatus();
  refreshOutline();
  toast(`Opened ${doc.name}`);
}

async function saveFile() {
  const saved = await saveMarkdown(view.state.doc.toString(), currentDoc);
  if (saved) {
    currentDoc = saved;
    isWelcome = false;
    setDirty(false);
    toast(`Saved ${saved.name}`);
  }
}

window.addEventListener("beforeunload", (e) => {
  if (dirty) {
    e.preventDefault();
    e.returnValue = "";
  }
});

/* ---------------- boot ---------------- */

const initialDoc = localStorage.getItem(DRAFT_KEY) ?? WELCOME_MD;
isWelcome = initialDoc === WELCOME_MD;

view = createEditor($("#editor"), initialDoc, {
  onSave: saveFile,
  onOpen: openFile,
  onToggleSidebar: toggleSidebar,
  onDocChanged: () => {
    setDirty(true);
    scheduleDraft();
    refreshCounts();
    refreshOutline();
  },
  onSelectionChanged: () => {
    refreshStatus();
    refreshOutline();
  },
  onOpenDroppedFile: openDropped,
});

setDirty(false);
refreshStatus();
refreshOutline();
view.focus();

// PWA: offline app shell (production builds only).
if (import.meta.env.PROD && "serviceWorker" in navigator) {
  navigator.serviceWorker.register("./sw.js").catch(console.error);
}
