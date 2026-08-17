/**
 * Image asset management.
 *
 * When a folder workspace is connected, pasted/dropped images are
 * written to `assets/` inside it and referenced by relative path
 * (Typora-style). Relative references can't be loaded from disk by
 * the browser directly, so the renderer resolves them through the
 * directory handle into cached blob URLs.
 */

let baseDir: FileSystemDirectoryHandle | null = null;

const blobCache = new Map<string, string>();

export function setAssetBase(dir: FileSystemDirectoryHandle | null): void {
  baseDir = dir;
}

function uniqueName(name: string, type: string): string {
  const extMatch = name.match(/\.[A-Za-z0-9]+$/);
  const ext = (extMatch?.[0] ?? `.${type.split("/")[1] ?? "png"}`).toLowerCase();
  const stem = (name.replace(/\.[A-Za-z0-9]+$/, "") || "image")
    .replace(/[^\w\-]+/g, "-")
    .slice(0, 30);
  const d = new Date();
  const pad = (n: number) => String(n).padStart(2, "0");
  const stamp = `${d.getFullYear()}${pad(d.getMonth() + 1)}${pad(d.getDate())}-${pad(
    d.getHours(),
  )}${pad(d.getMinutes())}${pad(d.getSeconds())}`;
  return `${stem || "image"}-${stamp}${ext}`;
}

/**
 * Save an image into the workspace's `assets/` folder.
 * Returns the relative markdown reference, or null when no workspace
 * is connected (caller should fall back to a data URL).
 */
export async function saveImageToWorkspace(
  file: File,
): Promise<string | null> {
  if (!baseDir) return null;
  try {
    const assetsDir = await baseDir.getDirectoryHandle("assets", { create: true });
    const name = uniqueName(file.name || "image", file.type || "image/png");
    const fh = await assetsDir.getFileHandle(name, { create: true });
    const w = await fh.createWritable();
    await w.write(await file.arrayBuffer());
    await w.close();
    return `assets/${name}`;
  } catch (e) {
    console.error("[assets] save failed:", e);
    return null;
  }
}

/**
 * Resolve a relative image reference (e.g. `assets/pic.png`) against
 * the workspace into a blob URL. Returns null when not resolvable.
 */
export async function resolveImageSrc(src: string): Promise<string | null> {
  if (
    !baseDir ||
    !src ||
    /^[a-z]+:/i.test(src) ||
    src.startsWith("/") ||
    src.startsWith("data:")
  ) {
    return null;
  }
  const cached = blobCache.get(src);
  if (cached) return cached;
  try {
    const parts = src.split("/").filter(Boolean);
    let dir: FileSystemDirectoryHandle = baseDir;
    for (let i = 0; i < parts.length - 1; i++) {
      dir = await dir.getDirectoryHandle(parts[i]);
    }
    const fh = await dir.getFileHandle(parts[parts.length - 1]);
    const blob = await fh.getFile();
    const url = URL.createObjectURL(blob);
    blobCache.set(src, url);
    return url;
  } catch {
    return null;
  }
}
