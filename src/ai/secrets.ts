import { K } from "../storage";
import { loadConfig } from "./config";

/**
 * API key handling.
 *
 * Default is memory-only: the key dies with the page. `persistKey` opts into
 * localStorage, which the settings UI labels as plaintext storage. An OS
 * keychain backend belongs on the Tauri side and is not wired up yet — until
 * it is, we do not pretend the browser has secure storage.
 */

const PERSIST_KEY = `${K.ai}.key`;

let memoryKey = "";

export function getKey(): string {
  if (memoryKey) return memoryKey;
  try {
    return loadConfig().persistKey ? localStorage.getItem(PERSIST_KEY) || "" : "";
  } catch {
    return "";
  }
}

export function setKey(value: string, persist: boolean): void {
  memoryKey = value;
  try {
    if (persist && value) localStorage.setItem(PERSIST_KEY, value);
    else localStorage.removeItem(PERSIST_KEY);
  } catch {
    /* private mode — memory only is still fine */
  }
}

export function clearKey(): void {
  memoryKey = "";
  try {
    localStorage.removeItem(PERSIST_KEY);
  } catch {
    /* ignore */
  }
}
