import "./styles/base.css";
import "./styles/editor.css";
import "./styles/themes.css";
import "./styles/theme-compat.css";

import { EditorView } from "@codemirror/view";
import { createEditor, createEditorState, setSourceMode } from "./editor/editor";
import { serializeView } from "./editor/serialize";
import { openCommandPalette, type Command } from "./commands";
import { extractHeadings, renderOutline } from "./outline";
import {
  isTauri,
  openMarkdown,
  readDroppedFile,
  readTauriFile,
  saveMarkdown,
} from "./fileio";
import { exportHTML, printPDF, mdInstance } from "./export";
import { exportWord, exportLatex, exportEpub } from "./export-extra";
import { resolveImageSrc, saveImageToWorkspace, setAssetBase } from "./assets";
import { setImageResolver } from "./editor/imageResolver";
import { toast } from "./toast";
import { isEnabled } from "./ai/config";
import { WELCOME_MD, MERMAID_DEMO_MD } from "./welcome";
import { TabManager } from "./tabs";
import { listRecents, saveRecent, removeRecent, type RecentEntry } from "./idb";
import { refreshDecos } from "./editor/livePreview";
import { Workspace } from "./workspace";
import { applySettings, buildSettingsModal, loadSettings } from "./settings";
import { initLang, t } from "./i18n";
import { K, migrateLegacyKeys } from "./storage";

migrateLegacyKeys();
setImageResolver(resolveImageSrc);
initLang();

/* ---------------- state ---------------- */

const DRAFT_KEY = K.draft;
const THEME_KEY = K.theme;
const TYPEWRITER_KEY = K.typewriter;

const THEMES: { id: string; tone: "light" | "dark" }[] = [
  { id: "auto", tone: matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light" },
  { id: "light", tone: "light" },
  { id: "dark", tone: "dark" },
  { id: "solarized", tone: "light" },
  { id: "nord", tone: "dark" },
  { id: "dracula", tone: "dark" },
];

let view: EditorView;
let tabman: TabManager;
let typewriter = localStorage.getItem(TYPEWRITER_KEY) === "1";
let sourceMode = false;
let focusMode = false;
let editorCb: Parameters<typeof createEditor>[2];

/* ---------------- dom ---------------- */

const $ = <T extends HTMLElement = HTMLElement>(sel: string) =>
  document.querySelector(sel) as T;

const titleEl = $("#doc-title");
const dirtyEl = $("#doc-dirty");
const sidebar = $("#sidebar");
const outlineEl = $("#outline");
const recentsEl = $("#recents");
const filetreeEl = $("#filetree");
const tabstrip = $("#tabstrip");
const stPos = $("#st-pos");
const stCount = $("#st-count");
const stMode = $("#st-mode");

/* ---------------- theme ---------------- */

let themeId = localStorage.getItem(THEME_KEY) || "auto";

// ?theme=<id> — deep-linkable theme override (also used for testing)
{
  const urlTheme = new URLSearchParams(location.search).get("theme");
  if (urlTheme && THEMES.some((th) => th.id === urlTheme)) {
    themeId = urlTheme;
    localStorage.setItem(THEME_KEY, urlTheme);
  }
}

function themeMeta(id: string) {
  return THEMES.find((th) => th.id === id) ?? THEMES[0];
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
    THEMES.map((th) => [
      (th.id === themeId ? "● " : "○ ") + t(`theme.${th.id}`),
      () => {
        themeId = th.id;
        localStorage.setItem(THEME_KEY, th.id);
        applyTheme();
        toast(t("toast.themeSet", t(`theme.${th.id}`)));
      },
    ]),
  );
});

$("#btn-export").addEventListener("click", (e) => {
  e.stopPropagation();
  const title = docTitle();
  const src = () => serializeView(view);
  showMenu(e.currentTarget as HTMLElement, [
    [t("menu.exportHtml"), () => exportHTML(title, src())],
    [t("menu.exportWord"), () => exportWord(title, src())],
    [t("menu.exportLatex"), () => exportLatex(mdInstance, title, src())],
    [t("menu.exportEpub"), () => void exportEpub(title, src())],
    [t("menu.printPdf"), () => printPDF(title, src())],
  ]);
});

/* ---------------- sidebar ---------------- */

$("#btn-sidebar").addEventListener("click", () => sidebar.classList.toggle("collapsed"));
const toggleSidebar = () => sidebar.classList.toggle("collapsed");

/* ---------------- AI copilot (off by default, loaded on demand) ---------------- */

const btnAI = $<HTMLButtonElement>("#btn-ai");

function refreshAIButton() {
  btnAI.hidden = !isEnabled();
}

btnAI.addEventListener("click", (e) => {
  e.stopPropagation();
  void import("./ai").then((ai) => {
    const items: [string, () => void][] = ai.ACTIONS.map((a) => [
      t(`ai.act.${a.id}`),
      () => void ai.runAction(view, a.id),
    ]);
    items.push([`⚙ ${t("ai.title")}`, () => ai.openSettings(refreshAIButton)]);
    showMenu(btnAI, items);
  });
});

/* ---------------- folder workspace ---------------- */

let workspace: Workspace;

function wireWorkspace() {
  const btnOpen = $("#btn-ws-open") as HTMLButtonElement;
  const btnNew = $("#btn-ws-new") as HTMLButtonElement;
  const btnRefresh = $("#btn-ws-refresh") as HTMLButtonElement;

  workspace = new Workspace(filetreeEl, recentsEl, view);
  workspace.cb.onOpenFile = (name, text, handle) => {
    tabman.openTab({ name, doc: text, handle });
    localStorage.removeItem(DRAFT_KEY);
    refreshAll();
    view.focus();
    void (async () => {
      await saveRecent({ key: `fsa:${name}`, name, handle });
      renderRecents(await listRecents());
    })();
  };

  btnOpen.addEventListener("click", () =>
    void workspace.connect().then(() => setAssetBase(workspace.root)),
  );
  btnNew.addEventListener("click", () => void workspace.newFile());
  btnRefresh.addEventListener("click", () => void workspace.refresh());
  setAssetBase(workspace.root);

  void workspace.restore().then(() => {
    const connected = !!workspace.root;
    btnNew.hidden = !connected;
    btnRefresh.hidden = !connected;
    setAssetBase(workspace.root);
  });
}

/* ---------------- image paste/drop ---------------- */

async function pasteImage(file: File) {
  const name = (file.name || "image").replace(/\.[A-Za-z0-9]+$/, "");
  const rel = await saveImageToWorkspace(file);
  if (rel) {
    view.dispatch(view.state.replaceSelection(`![${name}](${rel})`), {
      scrollIntoView: true,
    });
    toast(t("toast.imageSaved", rel));
    return;
  }
  const reader = new FileReader();
  reader.onload = () => {
    view.dispatch(
      view.state.replaceSelection(`![${name}](${reader.result})`),
      { scrollIntoView: true },
    );
  };
  reader.readAsDataURL(file);
}

/* ---------------- settings ---------------- */

$("#btn-settings").addEventListener("click", () => {
  document.body.appendChild(
    buildSettingsModal(() => {
      refreshAIButton();
      view.focus();
    }),
  );
});

/* ---------------- typewriter mode ---------------- */

function setTypewriter(on: boolean) {
  typewriter = on;
  localStorage.setItem(TYPEWRITER_KEY, on ? "1" : "0");
  $("#btn-typewriter").classList.toggle("on", on);
  $("#btn-typewriter").style.color = on ? "var(--accent)" : "";
  refreshModeStatus();
}

$("#btn-typewriter").addEventListener("click", () => {
  setTypewriter(!typewriter);
  toast(t("toast.typewriter", t(typewriter ? "common.on" : "common.off")));
});

$("#btn-source")?.addEventListener("click", () => setSource(!sourceMode));
$("#btn-focus")?.addEventListener("click", () => setFocus(!focusMode));
$("#btn-palette")?.addEventListener("click", (e) => {
  e.stopPropagation();
  openPalette();
});

/* ---------------- status / outline ---------------- */

function docTitle(): string {
  return tabman.active?.name || "Untitled.md";
}

function refreshStatus() {
  const sel = view.state.selection.main;
  const line = view.state.doc.lineAt(sel.head);
  stPos.textContent = t("status.lineCol", sel.head - line.from + 1, line.number);
  refreshCounts();
}

function refreshCounts() {
  const doc = serializeView(view);
  const cjk = (doc.match(/[\u3400-\u4dbf\u4e00-\u9fff]/g) || []).length;
  const words = (doc.match(/[A-Za-z0-9][A-Za-z0-9'’\-_]*/g) || []).length;
  stCount.textContent = t("status.words", cjk + words, doc.length);
}

function refreshOutline() {
  renderOutline(
    extractHeadings(serializeView(view)),
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
    close.title = t("common.close");
    close.onclick = (e) => {
      e.stopPropagation();
      if (tab.dirty && !confirm(t("confirm.closeDirty", tab.name))) return;
      tabman.close(tab.id);
    };
    el.appendChild(close);
    el.onclick = () => tabman.activate(tab.id);
    tabstrip.appendChild(el);
  }
  const plus = document.createElement("button");
  plus.className = "ot-tab-new";
  plus.textContent = "+";
  plus.title = t("tabs.newTab");
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
    empty.textContent = t("sidebar.recentEmpty");
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
        toast(t("toast.permissionDenied"));
        return;
      }
      const file = await h.getFile();
      const text = await file.text();
      tabman.openTab({ name: file.name, doc: text, handle: entry.handle });
      localStorage.removeItem(DRAFT_KEY);
      refreshAll();
      toast(t("toast.opened", file.name));
    } else if (entry.tauriPath && isTauri()) {
      const text = await readTauriFile(entry.tauriPath);
      tabman.openTab({ name: entry.name, doc: text, tauriPath: entry.tauriPath });
      refreshAll();
    }
  } catch (e) {
    console.error(e);
    toast(t("toast.reopenFailed", entry.name));
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
    if (!cur?.isWelcome) return;
    const text = serializeView(view);
    // An unedited welcome should never shadow future welcome updates.
    if (text === WELCOME_MD) localStorage.removeItem(DRAFT_KEY);
    else localStorage.setItem(DRAFT_KEY, text);
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
  toast(t("toast.opened", doc.name));

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
  toast(t("toast.opened", doc.name));
}

async function saveFile() {
  const cur = tabman.active;
  const saved = await saveMarkdown(serializeView(view), cur);
  if (saved) {
    Object.assign(cur ?? {}, saved);
    tabman.markDirty(false);
    refreshAll();
    toast(t("toast.saved", saved.name));
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


/* ---------------- source / focus / palette ---------------- */

function refreshModeStatus() {
  if (sourceMode) stMode.textContent = t("status.modeSource");
  else if (focusMode) stMode.textContent = t("status.modeFocus");
  else if (typewriter) stMode.textContent = t("status.modeTypewriter");
  else stMode.textContent = t("status.mode");
  $("#btn-source")?.classList.toggle("on", sourceMode);
  $("#btn-focus")?.classList.toggle("on", focusMode);
  document.documentElement.classList.toggle("ot-source", sourceMode);
  document.documentElement.classList.toggle("ot-focus", focusMode);
}

function setSource(on: boolean) {
  sourceMode = on;
  setSourceMode(view, on);
  refreshModeStatus();
  toast(t(on ? "toast.sourceOn" : "toast.sourceOff"));
  view.focus();
}

function setFocus(on: boolean) {
  focusMode = on;
  refreshModeStatus();
  toast(t(on ? "toast.focusOn" : "toast.focusOff"));
  view.focus();
}

function openPalette() {
  const cmds: Command[] = [
    { id: "open", label: t("cmd.open"), hint: "Ctrl+O", run: () => void openFile() },
    { id: "save", label: t("cmd.save"), hint: "Ctrl+S", run: () => void saveFile() },
    {
      id: "new",
      label: t("cmd.newTab"),
      run: () => tabman.openTab({ name: "Welcome.md", doc: WELCOME_MD, isWelcome: true }),
    },
    { id: "sidebar", label: t("cmd.toggleSidebar"), hint: "Ctrl+\\", run: toggleSidebar },
    {
      id: "source",
      label: t("cmd.toggleSource"),
      hint: "Ctrl+/",
      run: () => setSource(!sourceMode),
    },
    {
      id: "focus",
      label: t("cmd.toggleFocus"),
      run: () => setFocus(!focusMode),
    },
    {
      id: "typewriter",
      label: t("cmd.toggleTypewriter"),
      run: () => setTypewriter(!typewriter),
    },
    {
      id: "export-html",
      label: t("cmd.exportHtml"),
      run: () => exportHTML(docTitle(), serializeView(view)),
    },
    {
      id: "export-pdf",
      label: t("cmd.exportPdf"),
      run: () => printPDF(docTitle(), serializeView(view)),
    },
    {
      id: "settings",
      label: t("cmd.settings"),
      run: () =>
        document.body.appendChild(
          buildSettingsModal(() => {
            refreshAIButton();
            view.focus();
          }),
        ),
    },
    {
      id: "ai",
      label: t("cmd.ai"),
      run: () => void import("./ai").then((ai) => ai.openSettings(refreshAIButton)),
    },
    ...THEMES.map((th) => ({
      id: `theme-${th.id}`,
      label: t("cmd.theme", t(`theme.${th.id}`)),
      run: () => {
        themeId = th.id;
        localStorage.setItem(THEME_KEY, th.id);
        applyTheme();
      },
    })),
    ...extractHeadings(serializeView(view)).map((h, i) => ({
      id: `h-${i}`,
      label: `${"#".repeat(h.level)} ${h.text}`,
      hint: t("sidebar.outline"),
      run: () => {
        view.dispatch({
          selection: { anchor: h.pos },
          effects: EditorView.scrollIntoView(h.pos, { y: "center" }),
        });
        view.focus();
      },
    })),
  ];
  openCommandPalette(cmds);
}

/* ---------------- boot ---------------- */

const demo = new URLSearchParams(location.search).get("demo");
const initialDoc =
  demo === "mermaid"
    ? MERMAID_DEMO_MD
    : (localStorage.getItem(DRAFT_KEY) ?? WELCOME_MD);
const isFreshWelcome = initialDoc === WELCOME_MD;

editorCb = {
  onSave: saveFile,
  onOpen: openFile,
  onToggleSidebar: toggleSidebar,
  onCommandPalette: () => openPalette(),
  onToggleSource: () => setSource(!sourceMode),
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
  onPasteImage: (file) => void pasteImage(file),
};

view = createEditor($("#editor"), initialDoc, editorCb);

tabman = new TabManager(view, (doc) => createEditorState(doc, editorCb));
tabman.openTab({ name: "Welcome.md", doc: initialDoc, isWelcome: isFreshWelcome });
tabman.onChanged = () => {
  renderTabs();
  // Source mode is a view-level compartment; re-apply after every state swap.
  if (sourceMode) setSourceMode(view, true);
};
tabman.markDirty(false);
renderTabs();
wireWorkspace();

applySettings(loadSettings());
applyTheme();
refreshAIButton();
setTypewriter(typewriter);
refreshModeStatus();
refreshAll();
renderRecents(await listRecents());
view.focus();

// PWA: offline app shell (production builds only).
if (import.meta.env.PROD && "serviceWorker" in navigator) {
  navigator.serviceWorker.register("./sw.js").catch(console.error);
}
