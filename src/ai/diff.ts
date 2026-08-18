/** Line-level diff for the AI review pane: model output is a suggestion, so the document is rebuilt from the hunks the user accepted. */

export interface Hunk {
  kind: "same" | "add" | "del" | "replace";
  oldLines: string[];
  newLines: string[];
  oldStart: number;
  newStart: number;
}

const MAX_LINES = 2000;

/** Split on the two terminators an editor can produce; a lone `\r` stays inside the line so it survives the join untouched. */
function splitLines(text: string): string[] {
  return text.split(/\r\n|\n/);
}

function detectEol(text: string): string {
  return text.includes("\r\n") ? "\r\n" : "\n";
}

type Tag = "same" | "del" | "add";

interface Step {
  tag: Tag;
  oldIndex: number;
  newIndex: number;
}

function lcsSteps(a: string[], b: string[]): Step[] {
  const n = a.length;
  const m = b.length;
  const width = m + 1;
  const dp = new Int32Array((n + 1) * width);
  for (let i = n - 1; i >= 0; i--) {
    for (let j = m - 1; j >= 0; j--) {
      dp[i * width + j] =
        a[i] === b[j]
          ? dp[(i + 1) * width + j + 1] + 1
          : Math.max(dp[(i + 1) * width + j], dp[i * width + j + 1]);
    }
  }

  const steps: Step[] = [];
  let i = 0;
  let j = 0;
  while (i < n && j < m) {
    if (a[i] === b[j]) {
      steps.push({ tag: "same", oldIndex: i, newIndex: j });
      i++;
      j++;
    } else if (dp[(i + 1) * width + j] >= dp[i * width + j + 1]) {
      steps.push({ tag: "del", oldIndex: i, newIndex: j });
      i++;
    } else {
      steps.push({ tag: "add", oldIndex: i, newIndex: j });
      j++;
    }
  }
  while (i < n) {
    steps.push({ tag: "del", oldIndex: i, newIndex: j });
    i++;
  }
  while (j < m) {
    steps.push({ tag: "add", oldIndex: i, newIndex: j });
    j++;
  }
  return steps;
}

function group(a: string[], b: string[], steps: Step[]): Hunk[] {
  const hunks: Hunk[] = [];
  let run: Hunk | null = null;
  let runTag: Tag | null = null;

  const flush = (): void => {
    if (!run) return;
    const last = hunks[hunks.length - 1];
    if (last && last.kind === "del" && run.kind === "add") {
      last.kind = "replace";
      last.newLines = run.newLines;
    } else if (last && last.kind === "add" && run.kind === "del") {
      last.kind = "replace";
      last.oldLines = run.oldLines;
    } else {
      hunks.push(run);
    }
    run = null;
    runTag = null;
  };

  for (const step of steps) {
    let current: Hunk | null = run;
    if (current === null || runTag !== step.tag) {
      flush();
      current = {
        kind: step.tag,
        oldLines: [],
        newLines: [],
        oldStart: step.oldIndex,
        newStart: step.newIndex,
      };
      run = current;
      runTag = step.tag;
    }
    if (step.tag === "same") {
      current.oldLines.push(a[step.oldIndex]);
      current.newLines.push(b[step.newIndex]);
    } else if (step.tag === "del") {
      current.oldLines.push(a[step.oldIndex]);
    } else {
      current.newLines.push(b[step.newIndex]);
    }
  }
  flush();
  return hunks;
}

export function diffLines(before: string, after: string): Hunk[] {
  const a = splitLines(before);
  const b = splitLines(after);

  if (before === after) {
    return [{ kind: "same", oldLines: a, newLines: b, oldStart: 0, newStart: 0 }];
  }
  // Quadratic DP would stall the review pane on whole-book documents; degrade to one all-or-nothing hunk instead.
  if (a.length > MAX_LINES || b.length > MAX_LINES) {
    return [{ kind: "replace", oldLines: a, newLines: b, oldStart: 0, newStart: 0 }];
  }
  return group(a, b, lcsSteps(a, b));
}

export function applyHunks(
  before: string,
  hunks: Hunk[],
  accepted: ReadonlySet<number>,
): string {
  const out: string[] = [];
  hunks.forEach((hunk, index) => {
    const take =
      hunk.kind === "same" || !accepted.has(index) ? hunk.oldLines : hunk.newLines;
    for (const line of take) out.push(line);
  });
  return out.join(detectEol(before));
}

export function hunkStats(hunks: Hunk[]): {
  added: number;
  removed: number;
  changed: number;
} {
  let added = 0;
  let removed = 0;
  let changed = 0;
  for (const hunk of hunks) {
    if (hunk.kind === "add") added += hunk.newLines.length;
    else if (hunk.kind === "del") removed += hunk.oldLines.length;
    // A replace has two line counts, so it is reported as one changed block rather than folded into added/removed.
    else if (hunk.kind === "replace") changed++;
  }
  return { added, removed, changed };
}
