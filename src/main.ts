import "./styles/base.css";
import "./styles/editor.css";
import "./styles/themes.css";

import { EditorView } from "@codemirror/view";
import { createEditor } from "./editor/editor";
import { extractHeadings, renderOutline } from "./outline";
import { openMarkdown, saveMarkdown, readDroppedFile, isTauri } from "./fileio";
import { exportHTML, printPDF } from "./export";
import { buildAIPanel, runAI, toast, type AIPanel } from "./ai";
import { WELCOME_MD, MERMAID_DEMO_MD } from "./welcome";
import { TabManager } from "./tabs";
import { listRecents, saveRecent, removeRecent, type RecentEntry } from "./idb";
import { refreshDecos } from "./editor/livePreview";

/* ---------------- state ---------------- */

const DRAFT_KEY = "ot.draft";
const THEME_KEY = "ot.theme";
const TYPEWRITER_KEY = "ot.typewriter";

const THEMES: { id: string; label: string; tone: "light" | "dark" }[] = [
  { id: "auto", label: "Auto (system)", tone: matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light" },
  { id: "light", label: "Light", tone: "light" },
  { id: "dark", label: "Dark", tone: "dark" },
  { id: "solarized", label: "Solarized", tone: "light" },
  { id: "nord", label: "Nord", tone: "dark" },
  { id: "dracula", label: "Dracula", tone: "dark" },
];

let view: EditorView;
let tabman: TabManager;
let typewriter = localStorage.getItem(TYPEWRITER_KEY) === "1";

/* ---------------- dom ---------------- */

const $ = <T extends HTMLElement = HTMLElement>(sel: string) =>
  document.querySelector(sel) as T;

const titleEl = $("#doc-title");
const dirtyEl = $("#doc-dirty");
const sidebar = $("#sidebar");
const outlineEl = $("#outline");
const recentsEl = $("#recents");
const tabstrip = $("#tabstrip");
const stPos = $("#st-pos");
const stCount = $("#st-count");
const stMode = $("#st-mode");

/* ---------------- theme ---------------- */

let themeId = localStorage.getItem(THEME_KEY) || "auto";

// ?theme=<id> — deep-linkable theme override (also used for testing)
{
  const urlTheme = new URLSearchParams(location.search).get("theme");
  if (urlTheme && THEMES.some((t) => t.id === urlTheme)) {
    themeId = urlTheme;
    localStorage.setItem(THEME_KEY, urlTheme);
  }
}

function themeMeta(id: string) {
  return THEMES.find((t) => t.id === id) ?? THEMES[0];
}

function applyTheme() {
  const meta = themeMeta(themeId);
  const dark =
    themeId === "auto"
      ? matchMedia("(prefers-color-scheme: dark)").matches
      : meta.tone === "dark";
  document.documentElement.dataset.theme = themeId;
  document.documentElement.dataset.tone = dark ? "dark" : "light";
  view?.dispatch({ effects: refreshDecos.of() });
}

matchMedia("(prefers-color-scheme: dark)").addEventListener("change", () => {
  if (themeId === "auto") applyTheme();
});

/* ---------------- dropdown menus ---------------- */

function showMenu(anchor: HTMLElement, items: [string, () => void][]) {
  document.querySelector(".ot-menu")?.remove();
  const menu = document.createElement("div");
  menu.className = "ot-menu";
  const rect = anchor.getBoundingClientRect();
  menu.style.top = `${rect.bottom + 6}px`;
  menu.style.right = `${innerWidth - rect.right}px`;
  for (const [label, fn] of items) {
    const b = document.createElement("button");
    b.textContent = label;
    b.onclick = (e) => {
      e.stopPropagation();
      menu.remove();
      fn();
    };
    menu.appendChild(b);
  }
  document.body.appendChild(menu);
}

document.addEventListener("click", () => document.querySelector(".ot-menu")?.remove());

$("#btn-theme").addEventListener("click", (e) => {
  e.stopPropagation();
  showMenu(
    e.currentTarget as HTMLElement,
    THEMES.map((t) => [
      (t.id === themeId ? "● " : "○ ") + t.label,
      () => {
        themeId = t.id;
        localStorage.setItem(THEME_KEY, t.id);
        applyTheme();
        toast(`Theme: ${t.label}`);
      },
    ]),
  );
});

$("#btn-export").addEventListener("click", (e) => {
  e.stopPropagation();
  showMenu(e.currentTarget as HTMLElement, [
    ["📄 Export HTML", () => exportHTML(docTitle(), view.state.doc.toString())],
    ["🖨 Print / PDF", () => printPDF(docTitle(), view.state.doc.toString())],
  ]);
});

/* ---------------- sidebar ---------------- */

$("#btn-sidebar").addEventListener("click", () => sidebar.classList.toggle("collapsed"));
const toggleSidebar = () => sidebar.classList.toggle("collapsed");

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

/* ---------------- typewriter mode ---------------- */

function setTypewriter(on: boolean) {
  typewriter = on;
  localStorage.setItem(TYPEWRITER_KEY, on ? "1" : "0");
  $("#btn-typewriter").classList.toggle("on", on);
  $("#btn-typewriter").style.color = on ? "var(--accent)" : "";
  stMode.textContent = `Markdown · Live Preview${on ? " · Typewriter" : ""}`;
}

$("#btn-typewriter").addEventListener("click", () => {
  setTypewriter(!typewriter);
  toast(`Typewriter mode: ${!typewriter ? "off" : "on"}`);
});

/* ---------------- status / outline ---------------- */

function docTitle(): string {
  return tabman.active?.name || "Untitled.md";
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

function refreshHeader() {
  const cur = tabman.active;
  titleEl.textContent = cur?.name || "Untitled.md";
  dirtyEl.hidden = !cur?.dirty;
}

/* ---------------- tabs ---------------- */

function renderTabs() {
  tabstrip.textContent = "";
  for (const tab of tabman.tabs) {
    const el = document.createElement("div");
    el.className = "ot-tab" + (tab.id === tabman.activeId ? " active" : "");
    const name = document.createElement("span");
    name.className = "ot-tab-name";
    name.textContent = tab.name;
    el.appendChild(name);
    if (tab.dirty) {
      const dot = document.createElement("span");
      dot.className = "ot-tab-dirty";
      dot.textContent = "●";
      el.appendChild(dot);
    }
    const close = document.createElement("button");
    close.className = "ot-tab-close";
    close.textContent = "×";
    close.title = "Close tab";
    close.onclick = (e) => {
      e.stopPropagation();
      if (tab.dirty && !confirm(`Close ${tab.name} with unsaved changes?`)) return;
      tabman.close(tab.id);
    };
    el.appendChild(close);
    el.onclick = () => tabman.activate(tab.id);
    tabstrip.appendChild(el);
  }
  const plus = document.createElement("button");
  plus.className = "ot-tab-new";
  plus.textContent = "+";
  plus.title = "New tab (welcome doc)";
  plus.onclick = () => tabman.openTab({ name: "Welcome.md", doc: WELCOME_MD, isWelcome: true });
  tabstrip.appendChild(plus);
  refreshHeader();
}

/* ---------------- recent files ---------------- */

function renderRecents(entries: RecentEntry[]) {
  recentsEl.textContent = "";
  if (!entries.length) {
    const empty = document.createElement("div");
    empty.className = "ot-recent-empty";
    empty.textContent = "Ctrl+O to open a file";
    recentsEl.appendChild(empty);
    return;
  }
  for (const entry of entries) {
    const btn = document.createElement("button");
    btn.className = "ot-outline-item ot-recent-item";
    btn.textContent = entry.name;
    btn.title = entry.name;
    btn.onclick = () => openRecent(entry);
    recentsEl.appendChild(btn);
  }
}

async function openRecent(entry: RecentEntry) {
  try {
    if (entry.handle) {
      const h = entry.handle as FileSystemFileHandle & {
        queryPermission?: (d: { mode: string }) => Promise<PermissionState>;
        requestPermission?: (d: { mode: string }) => Promise<PermissionState>;
      };
      let perm = (await h.queryPermission?.({ mode: "readwrite" })) ?? "granted";
      if (perm !== "granted") {
        perm = (await h.requestPermission?.({ mode: "readwrite" })) ?? "denied";
      }
      if (perm !== "granted") {
        toast("Permission denied — reopening from disk");
        return;
      }
      const file = await h.getFile();
      const text = await file.text();
      tabman.openTab({ name: file.name, doc: text, handle: entry.handle });
      localStorage.removeItem(DRAFT_KEY);
      refreshAll();
      toast(`Opened ${file.name}`);
    } else if (entry.tauriPath && isTauri()) {
      const t = window.__TAURI__!;
      const text = await t.fs!.readTextFile(entry.tauriPath);
      tabman.openTab({ name: entry.name, doc: text, tauriPath: entry.tauriPath });
      refreshAll();
    }
  } catch (e) {
    console.error(e);
    toast(`Could not reopen ${entry.name}`);
    await removeRecent(entry.key);
    renderRecents(await listRecents());
  }
}

/* ---------------- draft persistence ---------------- */

let draftTimer: ReturnType<typeof setTimeout> | undefined;
function scheduleDraft() {
  clearTimeout(draftTimer);
  draftTimer = setTimeout(() => {
    const cur = tabman.active;
    if (cur?.isWelcome) localStorage.setItem(DRAFT_KEY, view.state.doc.toString());
  }, 800);
}

/* ---------------- file actions ---------------- */

function refreshAll() {
  refreshStatus();
  refreshOutline();
  renderTabs();
}

async function openFile() {
  const doc = await openMarkdown();
  if (!doc) return;
  tabman.openTab({ name: doc.name, doc: doc.text, handle: doc.handle, tauriPath: doc.tauriPath });
  localStorage.removeItem(DRAFT_KEY);
  refreshAll();
  view.focus();
  toast(`Opened ${doc.name}`);

  const key = doc.tauriPath ?? (doc.handle ? `fsa:${doc.name}` : null);
  if (key) {
    await saveRecent({ key, name: doc.name, handle: doc.handle, tauriPath: doc.tauriPath });
    renderRecents(await listRecents());
  }
}

async function openDropped(file: File) {
  const doc = await readDroppedFile(file);
  tabman.openTab({ name: doc.name, doc: doc.text });
  refreshAll();
  toast(`Opened ${doc.name}`);
}

async function saveFile() {
  const cur = tabman.active;
  const saved = await saveMarkdown(view.state.doc.toString(), cur);
  if (saved) {
    Object.assign(cur ?? {}, saved);
    tabman.markDirty(false);
    refreshAll();
    toast(`Saved ${saved.name}`);
    const key = saved.tauriPath ?? (saved.handle ? `fsa:${saved.name}` : null);
    if (key) {
      await saveRecent({ key, name: saved.name, handle: saved.handle, tauriPath: saved.tauriPath });
      renderRecents(await listRecents());
    }
  }
}

window.addEventListener("beforeunload", (e) => {
  if (tabman.tabs.some((t) => t.dirty)) {
    e.preventDefault();
    e.returnValue = "";
  }
});

/* ---------------- boot ---------------- */

const demo = new URLSearchParams(location.search).get("demo");
const initialDoc =
  demo === "mermaid"
    ? MERMAID_DEMO_MD
    : (localStorage.getItem(DRAFT_KEY) ?? WELCOME_MD);
const isFreshWelcome = initialDoc === WELCOME_MD;

view = createEditor($("#editor"), initialDoc, {
  onSave: saveFile,
  onOpen: openFile,
  onToggleSidebar: toggleSidebar,
  onDocChanged: () => {
    tabman.markDirty(true);
    tabman.syncFromView();
    scheduleDraft();
    refreshCounts();
    refreshOutline();
  },
  onSelectionChanged: () => {
    refreshStatus();
    refreshOutline();
    if (typewriter) {
      const head = view.state.selection.main.head;
      setTimeout(() => {
        view.dispatch({ effects: EditorView.scrollIntoView(head, { y: "center" }) });
      }, 0);
    }
  },
  onOpenDroppedFile: openDropped,
});

tabman = new TabManager(view);
tabman.openTab({ name: "Welcome.md", doc: initialDoc, isWelcome: isFreshWelcome });
tabman.onChanged = renderTabs;
tabman.markDirty(false);
renderTabs();

applyTheme();
setTypewriter(typewriter);
refreshAll();
renderRecents(await listRecents());
view.focus();

// PWA: offline app shell (production builds only).
if (import.meta.env.PROD && "serviceWorker" in navigator) {
  navigator.serviceWorker.register("./sw.js").catch(console.error);
}
