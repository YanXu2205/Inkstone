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

  constructor(private view: EditorView) {}

  get active(): Tab | null {
    return this.tabs.find((t) => t.id === this.activeId) ?? null;
  }

  /** Capture the current editor state into the active tab. */
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
    // dedupe by file identity (or welcome)
    const key = opts.tauriPath ?? (opts.handle ? handleKey(opts.handle) : opts.isWelcome ? "welcome" : null);
    if (key) {
      const existing = this.tabs.find(
        (t) => (t.tauriPath ?? (t.handle ? handleKey(t.handle) : t.isWelcome ? "welcome" : null)) === key,
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
      // Brand-new tab: swap the live document so editor extensions survive.
      this.view.dispatch({
        changes: { from: 0, to: this.view.state.doc.length, insert: tab.initialDoc },
      });
      tab.state = this.view.state;
    }
    this.onChanged();
  }

  /** Replace the active tab's content wholesale (e.g. file reloaded). */
  setActiveContent(text: string): void {
    const cur = this.active;
    if (!cur) return;
    const tr = this.view.state.update({
      changes: { from: 0, to: this.view.state.doc.length, insert: text },
    });
    this.view.dispatch(tr);
    cur.state = this.view.state;
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
      this.activeId = -1; // force activate
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

  /** Hook for UI refresh; assigned by main.ts. */
  onChanged: () => void = () => {};
}

export function handleKey(h: FileSystemFileHandle): string {
  // Handles have no stable string id; name is the best dedupe key we have.
  return `fsa:${h.name}`;
}
