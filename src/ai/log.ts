import { K } from "../storage";

/** Local, inspectable record of every AI call. Never leaves the machine. */

export interface LogEntry {
  at: number;
  action: string;
  host: string;
  model: string;
  local: boolean;
  inTokens: number;
  outTokens: number;
  status: "ok" | "cancelled" | "error";
}

const LOG_KEY = `${K.ai}.log`;
const MAX = 100;

export function readLog(): LogEntry[] {
  try {
    const raw = JSON.parse(localStorage.getItem(LOG_KEY) || "[]");
    return Array.isArray(raw) ? (raw as LogEntry[]) : [];
  } catch {
    return [];
  }
}

export function appendLog(entry: LogEntry): void {
  try {
    const next = [entry, ...readLog()].slice(0, MAX);
    localStorage.setItem(LOG_KEY, JSON.stringify(next));
  } catch {
    /* log is a convenience, never block a call on it */
  }
}

export function clearLog(): void {
  try {
    localStorage.removeItem(LOG_KEY);
  } catch {
    /* ignore */
  }
}
