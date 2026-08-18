import type { EditorView } from "@codemirror/view";
import {
  createFileInDir,
  pickDirectory,
  readDir,
  readTextFromHandle,
  hasFSA,
} from "./fileio";
import { kvGet, kvSet } from "./idb";
import { toast } from "./toast";
import { t } from "./i18n";

/**
 * Folder workspace: a persisted directory handle rendered as a lazy
 * file tree in the sidebar. Clicking a file opens it as a tab.
 */

export interface WorkspaceCallbacks {
  onOpenFile(name: string, text: string, handle: FileSystemFileHandle): void;
}

const WS_KEY = "workspace";

type PermHandle = FileSystemDirectoryHandle & {
  queryPermission?: (d: { mode: "read" | "readwrite" }) => Promise<PermissionState>;
  requestPermission?: (d: { mode: "read" | "readwrite" }) => Promise<PermissionState>;
};

export class Workspace {
  root: FileSystemDirectoryHandle | null = null;
  openDirs = new Set<string>();
  cb: WorkspaceCallbacks;

  constructor(
    private container: HTMLElement,
    private emptyHint: HTMLElement,
    view: EditorView,
  ) {
    void view;
    this.cb = { onOpenFile: () => {} };
  }

  async restore(): Promise<void> {
    if (!hasFSA()) return;
    const saved = await kvGet<FileSystemDirectoryHandle>(WS_KEY);
    if (!saved) return;
    const h = saved as PermHandle;
    const perm = (await h.queryPermission?.({ mode: "readwrite" })) ?? "granted";
    if (perm === "granted") {
      this.root = saved;
      this.render();
    } else {
      // Needs a user gesture — show a reconnect chip instead.
      this.renderReconnect(saved);
    }
  }

  async connect(): Promise<void> {
    const dir = await pickDirectory();
    if (!dir) return;
    this.root = dir;
    this.openDirs.clear();
    await kvSet(WS_KEY, dir);
    this.render();
    toast(t("toast.wsConnected", dir.name));
  }

  async reconnect(saved: FileSystemDirectoryHandle): Promise<void> {
    const h = saved as PermHandle;
    const perm = (await h.requestPermission?.({ mode: "readwrite" })) ?? "granted";
    if (perm === "granted") {
      this.root = saved;
      this.render();
    } else {
      toast(t("toast.permissionDenied"));
    }
  }

  async refresh(): Promise<void> {
    if (this.root) this.render();
  }

  async newFile(): Promise<void> {
    if (!this.root) return;
    const name = prompt(t("ws.newFileName"), "untitled.md");
    if (!name) return;
    const finalName = /\.(md|markdown|txt)$/i.test(name) ? name : `${name}.md`;
    const handle = await createFileInDir(this.root, finalName);
    if (!handle) {
      toast(t("toast.createFailed"));
      return;
    }
    this.cb.onOpenFile(finalName, "", handle);
    this.render();
  }

  private renderReconnect(saved: FileSystemDirectoryHandle) {
    this.container.textContent = "";
    const btn = document.createElement("button");
    btn.className = "ot-outline-item";
    btn.textContent = t("sidebar.reconnect", saved.name);
    btn.onclick = () => this.reconnect(saved);
    this.container.appendChild(btn);
    this.emptyHint.hidden = true;
  }

  async render(): Promise<void> {
    const c = this.container;
    c.textContent = "";
    if (!this.root) return;
    this.emptyHint.hidden = true;
    await this.renderLevel(this.root, c, 0, "");
  }

  private async renderLevel(
    dir: FileSystemDirectoryHandle,
    parent: HTMLElement,
    depth: number,
    path: string,
  ): Promise<void> {
    const entries = await readDir(dir);
    for (const e of entries) {
      const el = document.createElement("div");
      el.className = "ot-file-item" + (e.dir ? " ot-file-dir" : "");
      el.style.paddingLeft = `${8 + depth * 13}px`;
      el.textContent = (e.dir ? "▸ " : "📄 ") + e.name;
      el.title = e.name;

      if (e.dir) {
        const dirPath = path ? `${path}/${e.name}` : e.name;
        const childWrap = document.createElement("div");
        childWrap.hidden = true;
        const toggle = async () => {
          if (this.openDirs.has(dirPath)) {
            this.openDirs.delete(dirPath);
            childWrap.hidden = true;
            el.textContent = "▸ " + e.name;
          } else {
            this.openDirs.add(dirPath);
            childWrap.hidden = false;
            el.textContent = "▾ " + e.name;
            childWrap.textContent = "";
            await this.renderLevel(
              e.handle as FileSystemDirectoryHandle,
              childWrap,
              depth + 1,
              dirPath,
            );
          }
        };
        el.onclick = toggle;
        if (this.openDirs.has(dirPath)) {
          childWrap.hidden = false;
          el.textContent = "▾ " + e.name;
          await this.renderLevel(
            e.handle as FileSystemDirectoryHandle,
            childWrap,
            depth + 1,
            dirPath,
          );
        }
        parent.appendChild(el);
        parent.appendChild(childWrap);
      } else {
        el.onclick = async () => {
          try {
            const text = await readTextFromHandle(e.handle as FileSystemFileHandle);
            this.cb.onOpenFile(e.name, text, e.handle as FileSystemFileHandle);
            this.markActive(e.name);
          } catch (err) {
            console.error(err);
            toast(t("toast.openFailed", e.name));
          }
        };
        parent.appendChild(el);
      }
    }
  }

  private markActive(name: string) {
    this.container.querySelectorAll(".ot-file-item").forEach((el) => {
      el.classList.toggle("active", el.textContent?.endsWith(name) ?? false);
    });
  }
}
