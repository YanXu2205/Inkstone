/** Outbound secret scan: nothing reaches a remote model before this module has looked at it. */

export interface Finding {
  kind: string;
  line: number;
  column: number;
  excerpt: string;
  start: number;
  end: number;
}

interface Hit {
  start: number;
  text: string;
}

interface Detector {
  kind: string;
  re: RegExp;
  /** Marker-only patterns (a PEM banner) are never placeholder-filtered — the banner itself is the signal. */
  structural?: boolean;
  pick?: (m: RegExpExecArray) => Hit | null;
}

export const REDACTION = "«redacted»";

const ASSIGNED_VALUE =
  /(?<![A-Za-z0-9])(?:api[-_]?key|apikey|secret(?:[-_]?(?:key|token))?|access[-_]?token|token|password|passwd|private[-_]?key)\s*[:=]\s*(["'`]?)([^\s"'`,;]+)\1/gi;

function looksLikeToken(value: string): boolean {
  if (!/^[A-Za-z0-9+/=_.-]+$/.test(value)) return false;
  if (/^[0-9a-f]{32,}$/i.test(value)) return true;
  if (value.length < 20) return false;
  return /[A-Za-z]/.test(value) && /[0-9]/.test(value);
}

function pickAssignedValue(m: RegExpExecArray): Hit | null {
  const quote = m[1];
  const value = m[2];
  if (!looksLikeToken(value)) return null;
  return { start: m.index + m[0].length - quote.length - value.length, text: value };
}

const DETECTORS: Detector[] = [
  { kind: "anthropic-key", re: /\bsk-ant-[A-Za-z0-9_-]{16,}/g },
  // `sk-ant-` is a strictly better match, so exclude it here rather than letting the shorter prefix win.
  { kind: "openai-key", re: /\bsk-(?!ant-)(?:proj-)?[A-Za-z0-9_-]{20,}/g },
  { kind: "aws-access-key-id", re: /\b(?:AKIA|ASIA)[0-9A-Z]{16}\b/g },
  {
    kind: "github-token",
    re: /\b(?:gh[posur]_[A-Za-z0-9]{20,}|github_pat_[A-Za-z0-9_]{20,})/g,
  },
  {
    kind: "pem-private-key",
    re: /-----BEGIN (?:[A-Z0-9]+ )*PRIVATE KEY-----/g,
    structural: true,
  },
  // Anchored on `eyJ` (base64 of `{"`) so ordinary dotted identifiers cannot look like a JWT.
  { kind: "jwt", re: /\beyJ[A-Za-z0-9_-]{8,}\.[A-Za-z0-9_-]{8,}\.[A-Za-z0-9_-]{8,}/g },
  { kind: "assigned-secret", re: ASSIGNED_VALUE, pick: pickAssignedValue },
  {
    kind: "cn-id",
    re: /(?<![0-9A-Za-z_])[1-9]\d{5}(?:19|20)\d{2}(?:0[1-9]|1[0-2])(?:0[1-9]|[12]\d|3[01])\d{3}[0-9Xx](?![0-9A-Za-z_])/g,
  },
  {
    kind: "cn-mobile",
    re: /(?<![0-9A-Za-z_])1[3-9]\d{9}(?![0-9A-Za-z_])/g,
  },
];

const PLACEHOLDER_HINTS = [
  "your",
  "example",
  "placeholder",
  "changeme",
  "change-me",
  "change_me",
  "dummy",
  "redacted",
  "xxx",
  "...",
];

function isPlaceholder(value: string): boolean {
  const lower = value.toLowerCase();
  if (PLACEHOLDER_HINTS.some((hint) => lower.includes(hint))) return true;
  if (/^<.*>$/.test(value)) return true;
  // Six identical characters in a row never happens in a real key but is how people fake one.
  return /(.)\1{5,}/.test(value);
}

function excerptOf(value: string): string {
  return `${value.slice(0, 4)}…`;
}

function lineStarts(text: string): number[] {
  const starts = [0];
  for (let i = 0; i < text.length; i++) {
    if (text[i] === "\n") starts.push(i + 1);
  }
  return starts;
}

function lineOf(starts: number[], offset: number): number {
  let low = 0;
  let high = starts.length - 1;
  while (low < high) {
    const mid = (low + high + 1) >> 1;
    if (starts[mid] <= offset) low = mid;
    else high = mid - 1;
  }
  return low;
}

export function scanForSecrets(text: string): Finding[] {
  const hits: Array<{ kind: string; start: number; end: number; text: string }> = [];
  for (const detector of DETECTORS) {
    detector.re.lastIndex = 0;
    let m = detector.re.exec(text);
    while (m !== null) {
      if (m[0].length === 0) {
        detector.re.lastIndex++;
      } else {
        const hit = detector.pick ? detector.pick(m) : { start: m.index, text: m[0] };
        if (hit && (detector.structural || !isPlaceholder(hit.text))) {
          hits.push({
            kind: detector.kind,
            start: hit.start,
            end: hit.start + hit.text.length,
            text: hit.text,
          });
        }
      }
      m = detector.re.exec(text);
    }
  }

  hits.sort((a, b) => a.start - b.start || b.end - b.start - (a.end - a.start));

  const starts = lineStarts(text);
  const findings: Finding[] = [];
  let consumed = -1;
  for (const hit of hits) {
    if (hit.start < consumed) continue;
    const line = lineOf(starts, hit.start);
    findings.push({
      kind: hit.kind,
      line: line + 1,
      column: hit.start - starts[line] + 1,
      excerpt: excerptOf(hit.text),
      start: hit.start,
      end: hit.end,
    });
    consumed = hit.end;
  }
  return findings;
}

export function redact(text: string, findings: Finding[]): string {
  const ordered = [...findings].sort((a, b) => a.start - b.start);
  let out = "";
  let cursor = 0;
  for (const finding of ordered) {
    if (finding.start < cursor) continue;
    out += text.slice(cursor, finding.start) + REDACTION;
    cursor = finding.end;
  }
  return out + text.slice(cursor);
}
