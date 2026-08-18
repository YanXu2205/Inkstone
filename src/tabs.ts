import { EditorState } from "@codemirror/state";
import type { EditorView } from "@codemirror/view";

/**
 * Multi-tab workspace. Each tab keeps its own EditorState, so undo
 * history, cursor and viewport survive tab switches.
 */

export interface Tab {
  id: number;
  name: string;
  /** saved on switch-away, restored on activate */
  state?: EditorState;
  /** used when the tab has never been activated yet */
  initialDoc: string;
  handle?: FileSystemFileHandle;
  tauriPath?: string;
  dirty: boolean;
  isWelcome?: boolean;
}

let nextId = 1;

export class TabManager {
  tabs: Tab[] = [];
  activeId = -1;

  /**
   * @param makeState build a full EditorState for a fresh document. Must pin
   *   the line separator of `doc` so opening a CRLF file cannot rewrite it.
   */
  constructor(
    private view: EditorView,
    private makeState: (doc: string) => EditorState,
  ) {}

  get active(): Tab | null {
    return this.tabs.find((t) => t.id === this.activeId) ?? null;
  }

  syncFromView(): void {
    const cur = this.active;
    if (cur) cur.state = this.view.state;
  }

  openTab(opts: {
    name: string;
    doc: string;
    handle?: FileSystemFileHandle;
    tauriPath?: string;
    isWelcome?: boolean;
    activate?: boolean;
  }): Tab {
    const key =
      opts.tauriPath ??
      (opts.handle ? handleKey(opts.handle) : opts.isWelcome ? "welcome" : null);
    if (key) {
      const existing = this.tabs.find(
        (t) =>
          (t.tauriPath ??
            (t.handle ? handleKey(t.handle) : t.isWelcome ? "welcome" : null)) === key,
      );
      if (existing) {
        if (opts.activate !== false) this.activate(existing.id);
        return existing;
      }
    }

    const tab: Tab = {
      id: nextId++,
      name: opts.name,
      initialDoc: opts.doc,
      handle: opts.handle,
      tauriPath: opts.tauriPath,
      dirty: false,
      isWelcome: opts.isWelcome,
    };
    this.tabs.push(tab);
    if (opts.activate !== false) this.activate(tab.id);
    else this.onChanged();
    return tab;
  }

  activate(id: number): void {
    if (id === this.activeId) {
      this.onChanged();
      return;
    }
    this.syncFromView();
    const tab = this.tabs.find((t) => t.id === id);
    if (!tab) return;
    this.activeId = id;
    if (tab.state) {
      this.view.setState(tab.state);
    } else {
      const state = this.makeState(tab.initialDoc);
      this.view.setState(state);
      tab.state = state;
    }
    this.onChanged();
  }

  setActiveContent(text: string): void {
    const cur = this.active;
    if (!cur) return;
    const state = this.makeState(text);
    this.view.setState(state);
    cur.state = state;
    cur.initialDoc = text;
    cur.dirty = false;
    this.onChanged();
  }

  markDirty(dirty: boolean): void {
    const cur = this.active;
    if (cur && cur.dirty !== dirty) {
      cur.dirty = dirty;
      this.onChanged();
    }
  }

  close(id: number): void {
    const idx = this.tabs.findIndex((t) => t.id === id);
    if (idx < 0) return;
    this.tabs.splice(idx, 1);
    if (this.tabs.length === 0) {
      this.openTab({ name: "Welcome.md", doc: "", isWelcome: true });
      return;
    }
    if (id === this.activeId) {
      const next = this.tabs[Math.min(idx, this.tabs.length - 1)];
      this.activeId = -1;
      this.activate(next.id);
    } else {
      this.onChanged();
    }
  }

  cycle(): void {
    if (this.tabs.length < 2) return;
    const idx = this.tabs.findIndex((t) => t.id === this.activeId);
    this.activate(this.tabs[(idx + 1) % this.tabs.length].id);
  }

  onChanged: () => void = () => {};
}

export function handleKey(h: FileSystemFileHandle): string {
  return `fsa:${h.name}`;
}
