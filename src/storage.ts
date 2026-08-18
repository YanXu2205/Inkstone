/**
 * localStorage keys, all `ink.` prefixed.
 *
 * Keys were `ot.*` before the project was renamed from OpenTypora to
 * Inkstone; `migrateLegacyKeys()` moves them over once on boot. The old
 * AI key is deliberately *dropped* rather than migrated — it held an API
 * key in plaintext, which the current AI module no longer does.
 */

export const K = {
  draft: "ink.draft.v2",
  theme: "ink.theme",
  typewriter: "ink.typewriter",
  settings: "ink.settings",
  lang: "ink.lang",
  ai: "ink.ai",
} as const;

const MIGRATED = "ink.migrated.v1";

const RENAMES: [legacy: string, next: string][] = [
  ["ot.draft.v2", K.draft],
  ["ot.theme", K.theme],
  ["ot.typewriter", K.typewriter],
  ["ot.settings", K.settings],
  ["ot.lang", K.lang],
];

/** Plaintext secrets from older versions — purge, never carry forward. */
const PURGE = ["ot.ai"];

export function migrateLegacyKeys(): void {
  try {
    if (localStorage.getItem(MIGRATED)) return;
    for (const [legacy, next] of RENAMES) {
      const value = localStorage.getItem(legacy);
      if (value !== null && localStorage.getItem(next) === null) {
        localStorage.setItem(next, value);
      }
      localStorage.removeItem(legacy);
    }
    for (const key of PURGE) localStorage.removeItem(key);
    localStorage.setItem(MIGRATED, "1");
  } catch (e) {
    console.error("[storage] migration failed:", e);
  }
}
