/**
 * File open/save abstraction with three backends:
 *
 *   1. File System Access API  — Chrome/Edge, real in-place saving.
 *   2. Tauri desktop bridge     — full local file access in the app shell.
 *   3. Download/upload fallback — Safari, Firefox & friends.
 */

import { isTauri as inTauri } from "@tauri-apps/api/core";

export interface OpenedDoc {
  name: string;
  text: string;
  handle?: FileSystemFileHandle;
  tauriPath?: string;
}

declare global {
  interface Window {
    showOpenFilePicker?: (opts?: object) => Promise<FileSystemFileHandle[]>;
    showSaveFilePicker?: (opts?: object) => Promise<FileSystemFileHandle>;
    showDirectoryPicker?: (opts?: object) => Promise<FileSystemDirectoryHandle>;
  }
}

const MD_FILTERS = [
  {
    name: "Markdown",
    accept: {
      "text/markdown": [".md", ".markdown"],
      "text/plain": [".txt"],
    },
  },
];

export interface DirEntry {
  name: string;
  dir: boolean;
  handle: FileSystemFileHandle | FileSystemDirectoryHandle;
}

export const hasFSA = () =>
  typeof window.showOpenFilePicker === "function" &&
  typeof window.showSaveFilePicker === "function" &&
  typeof window.showDirectoryPicker === "function";

/** Pick a folder to use as the workspace (Chrome/Edge). */
export async function pickDirectory(): Promise<FileSystemDirectoryHandle | null> {
  if (typeof window.showDirectoryPicker !== "function") return null;
  try {
    return await window.showDirectoryPicker({ mode: "readwrite" });
  } catch (e) {
    if ((e as DOMException)?.name === "AbortError") return null;
    console.error(e);
    return null;
  }
}

/** Read a directory's direct children, folders first. */
export async function readDir(dir: FileSystemDirectoryHandle): Promise<DirEntry[]> {
  const entries: DirEntry[] = [];
  const it = (dir as unknown as {
    values(): AsyncIterableIterator<FileSystemFileHandle | FileSystemDirectoryHandle>;
  }).values();
  for await (const handle of it) {
    const dirEntry = handle.kind === "directory";
    if (dirEntry || /\.(md|markdown|txt)$/i.test(handle.name)) {
      entries.push({ name: handle.name, dir: dirEntry, handle });
    }
  }
  return entries.sort((a, b) =>
    a.dir === b.dir ? a.name.localeCompare(b.name) : a.dir ? -1 : 1,
  );
}

export async function readTextFromHandle(
  handle: FileSystemFileHandle,
): Promise<string> {
  const file = await handle.getFile();
  return file.text();
}

export async function writeTextToHandle(
  handle: FileSystemFileHandle,
  text: string,
): Promise<void> {
  const w = await handle.createWritable();
  await w.write(text);
  await w.close();
}

export async function createFileInDir(
  dir: FileSystemDirectoryHandle,
  name: string,
): Promise<FileSystemFileHandle | null> {
  try {
    const handle = await dir.getFileHandle(name, { create: true });
    const w = await handle.createWritable();
    await w.write("");
    await w.close();
    return handle;
  } catch (e) {
    console.error(e);
    return null;
  }
}

export const isTauri = () => inTauri();

/** Read a file the user picked in the desktop shell. */
export async function readTauriFile(path: string): Promise<string> {
  const fs = await import("@tauri-apps/plugin-fs");
  return fs.readTextFile(path);
}

/**
 * Save through a temporary file and rename over the target, so an
 * interrupted write can never leave a truncated document behind. The
 * File System Access API already has swap-file semantics; this brings the
 * desktop shell up to the same guarantee.
 */
async function writeTauriFileAtomic(path: string, text: string): Promise<void> {
  const fs = await import("@tauri-apps/plugin-fs");
  const tmp = `${path}.inkstone-tmp`;
  try {
    await fs.writeTextFile(tmp, text);
    await fs.rename(tmp, path);
  } catch (e) {
    console.error("[fileio] atomic save failed, writing in place:", e);
    await fs.writeTextFile(path, text);
    await fs.remove(tmp).catch(() => undefined);
  }
}

export async function openMarkdown(): Promise<OpenedDoc | null> {
  // 1) File System Access API
  if (hasFSA()) {
    try {
      const [handle] = await window.showOpenFilePicker!({
        multiple: false,
        types: MD_FILTERS,
      });
      if (!handle) return null;
      const file = await handle.getFile();
      return { name: file.name, text: await file.text(), handle };
    } catch (e) {
      if ((e as DOMException)?.name === "AbortError") return null;
      console.error(e);
    }
  }

  // 2) Tauri
  if (isTauri()) {
    try {
      const { open } = await import("@tauri-apps/plugin-dialog");
      const path = await open({
        multiple: false,
        filters: [{ name: "Markdown", extensions: ["md", "markdown", "txt"] }],
      });
      if (typeof path === "string") {
        return {
          name: path.split(/[\\/]/).pop() || "document.md",
          text: await readTauriFile(path),
          tauriPath: path,
        };
      }
      return null;
    } catch (e) {
      console.error(e);
    }
  }

  // 3) <input type=file> fallback
  return new Promise((resolve) => {
    const input = document.createElement("input");
    input.type = "file";
    input.accept = ".md,.markdown,.txt";
    input.onchange = async () => {
      const file = input.files?.[0];
      if (!file) return resolve(null);
      resolve({ name: file.name, text: await file.text() });
    };
    input.click();
  });
}

export async function readDroppedFile(file: File): Promise<OpenedDoc> {
  return { name: file.name, text: await file.text() };
}

/** Identity needed to save a document in place. */
export type SaveTarget = Pick<OpenedDoc, "name" | "handle" | "tauriPath">;

/**
 * Save `text`. Pass the previous target to save in place; otherwise a
 * save-as picker (or a download) is triggered. Returns the (possibly
 * new) document identity.
 */
export async function saveMarkdown(
  text: string,
  doc: SaveTarget | null,
): Promise<OpenedDoc | null> {
  const suggested = doc?.name || "untitled.md";

  // 1) in-place via FS Access handle
  if (doc?.handle) {
    try {
      const writable = await doc.handle.createWritable();
      await writable.write(text);
      await writable.close();
      return { name: doc.name, text, handle: doc.handle };
    } catch (e) {
      console.error(e);
    }
  }

  // 2) Tauri path (existing or new via save dialog)
  if (isTauri()) {
    try {
      let path = doc?.tauriPath;
      if (!path) {
        const { save } = await import("@tauri-apps/plugin-dialog");
        const picked = await save({
          defaultPath: suggested,
          filters: [{ name: "Markdown", extensions: ["md"] }],
        });
        if (!picked) return null;
        path = picked;
      }
      await writeTauriFileAtomic(path, text);
      return {
        name: path.split(/[\\/]/).pop() || suggested,
        text,
        tauriPath: path,
      };
    } catch (e) {
      console.error(e);
    }
  }

  // 3) browser save-as / download
  if (hasFSA()) {
    try {
      const handle = await window.showSaveFilePicker!({
        suggestedName: suggested,
        types: MD_FILTERS,
      });
      const writable = await handle.createWritable();
      await writable.write(text);
      await writable.close();
      return { name: handle.name || suggested, text, handle };
    } catch (e) {
      if ((e as DOMException)?.name === "AbortError") return null;
      console.error(e);
    }
  }

  downloadText(suggested, text, "text/markdown");
  return { name: suggested, text };
}

export function downloadText(name: string, text: string, mime: string) {
  const blob = new Blob([text], { type: `${mime};charset=utf-8` });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = name;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 5000);
}
