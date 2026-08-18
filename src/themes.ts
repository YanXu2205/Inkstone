/**
 * User / bundled document themes (CSS files).
 *
 * Built-in color shells stay in themes.css (data-theme=…). This module
 * loads *document* CSS — the Typora-style layer that paints #write — either
 * from public/themes/*.css or a file the user imports.
 */

import { K } from "./storage";

const STYLE_ID = "ot-doc-theme";
const KEY_ACTIVE = `${K.settings}.docTheme`;
const KEY_IMPORTED = `${K.settings}.docThemeCss`;

export interface DocThemeMeta {
  id: string;
  label: string;
  /** URL under public/, or null for "none" / imported */
  href: string | null;
}

/** Shipped with the app. Paths are relative to the site root. */
export const BUNDLED_DOC_THEMES: DocThemeMeta[] = [
  { id: "none", label: "Default", href: null },
  { id: "github", label: "GitHub", href: "./themes/github.css" },
  { id: "paper", label: "Paper", href: "./themes/paper.css" },
  { id: "ink-dark", label: "Ink Dark", href: "./themes/ink-dark.css" },
];

export function getActiveDocThemeId(): string {
  return localStorage.getItem(KEY_ACTIVE) || "none";
}

export function getImportedCss(): string {
  return localStorage.getItem(KEY_IMPORTED) || "";
}

function ensureStyleEl(): HTMLStyleElement {
  let el = document.getElementById(STYLE_ID) as HTMLStyleElement | null;
  if (!el) {
    el = document.createElement("style");
    el.id = STYLE_ID;
    document.head.appendChild(el);
  }
  return el;
}

async function fetchCss(href: string): Promise<string> {
  const res = await fetch(href);
  if (!res.ok) throw new Error(`theme HTTP ${res.status}`);
  return res.text();
}

/** Apply bundled theme id, or "imported" to use the last imported CSS. */
export async function applyDocTheme(id: string): Promise<void> {
  const style = ensureStyleEl();
  if (id === "none") {
    style.textContent = "";
    localStorage.setItem(KEY_ACTIVE, "none");
    return;
  }
  if (id === "imported") {
    style.textContent = getImportedCss();
    localStorage.setItem(KEY_ACTIVE, "imported");
    return;
  }
  const meta = BUNDLED_DOC_THEMES.find((t) => t.id === id);
  if (!meta?.href) {
    style.textContent = "";
    localStorage.setItem(KEY_ACTIVE, "none");
    return;
  }
  const css = await fetchCss(meta.href);
  style.textContent = css;
  localStorage.setItem(KEY_ACTIVE, id);
}

/** Store raw CSS (e.g. a Typora theme file) and activate it. */
export function importDocThemeCss(css: string, label = "Imported"): void {
  localStorage.setItem(KEY_IMPORTED, css);
  localStorage.setItem(KEY_ACTIVE, "imported");
  localStorage.setItem(`${KEY_IMPORTED}.label`, label);
  ensureStyleEl().textContent = css;
}

export function importedThemeLabel(): string {
  return localStorage.getItem(`${KEY_IMPORTED}.label`) || "Imported";
}

export async function restoreDocTheme(): Promise<void> {
  const id = getActiveDocThemeId();
  try {
    await applyDocTheme(id);
  } catch (e) {
    console.error("[themes] restore failed:", e);
    await applyDocTheme("none");
  }
}
