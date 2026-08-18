import { describe, it, expect } from "vitest";
import { diffLines, applyHunks, hunkStats, type Hunk } from "./diff";

function all(hunks: Hunk[]): Set<number> {
  return new Set(hunks.map((_, i) => i));
}

function roundTrip(before: string, after: string): void {
  const hunks = diffLines(before, after);
  expect(applyHunks(before, hunks, all(hunks))).toBe(after);
  expect(applyHunks(before, hunks, new Set())).toBe(before);
}

function rng(seed: number): () => number {
  let s = seed;
  return () => {
    s = (s + 0x6d2b79f5) | 0;
    let t = s;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

describe("diffLines", () => {
  it("reports identical text as a single same hunk", () => {
    const hunks = diffLines("alpha\nbeta\n", "alpha\nbeta\n");
    expect(hunks).toHaveLength(1);
    expect(hunks[0].kind).toBe("same");
    expect(hunkStats(hunks)).toEqual({ added: 0, removed: 0, changed: 0 });
    roundTrip("alpha\nbeta\n", "alpha\nbeta\n");
  });

  it("detects a pure insertion", () => {
    const hunks = diffLines("a\nc", "a\nb\nc");
    expect(hunks.map((h) => h.kind)).toEqual(["same", "add", "same"]);
    expect(hunks[1].newLines).toEqual(["b"]);
    expect(hunks[1].oldLines).toEqual([]);
    expect(hunks[1].oldStart).toBe(1);
    expect(hunks[1].newStart).toBe(1);
    expect(hunkStats(hunks)).toEqual({ added: 1, removed: 0, changed: 0 });
    roundTrip("a\nc", "a\nb\nc");
  });

  it("detects a pure deletion", () => {
    const hunks = diffLines("a\nb\nc", "a\nc");
    expect(hunks.map((h) => h.kind)).toEqual(["same", "del", "same"]);
    expect(hunks[1].oldLines).toEqual(["b"]);
    expect(hunks[1].newLines).toEqual([]);
    expect(hunkStats(hunks)).toEqual({ added: 0, removed: 1, changed: 0 });
    roundTrip("a\nb\nc", "a\nc");
  });

  it("merges an adjacent del and add into one replace hunk", () => {
    const hunks = diffLines("a\nb\nc", "a\nB\nc");
    expect(hunks.map((h) => h.kind)).toEqual(["same", "replace", "same"]);
    expect(hunks[1].oldLines).toEqual(["b"]);
    expect(hunks[1].newLines).toEqual(["B"]);
    expect(hunkStats(hunks)).toEqual({ added: 0, removed: 0, changed: 1 });
  });

  it("never emits a del directly beside an add", () => {
    const before = "one\ntwo\nthree\nfour\nfive\nsix";
    const after = "one\nTWO\nthree\nfour\nSIX\nseven";
    const hunks = diffLines(before, after);
    for (let i = 1; i < hunks.length; i++) {
      const pair = `${hunks[i - 1].kind}+${hunks[i].kind}`;
      expect(pair).not.toBe("del+add");
      expect(pair).not.toBe("add+del");
    }
    roundTrip(before, after);
  });

  it("preserves CRLF line endings", () => {
    const before = "a\r\nb\r\nc";
    const after = "a\r\nB\r\nc";
    const hunks = diffLines(before, after);
    expect(hunks[1].oldLines).toEqual(["b"]);
    expect(applyHunks(before, hunks, all(hunks))).toBe(after);
    expect(applyHunks(before, hunks, new Set())).toBe(before);
    expect(applyHunks(before, hunks, all(hunks))).toContain("\r\n");
  });

  it("keeps LF documents free of CR", () => {
    const hunks = diffLines("a\nb", "a\nB");
    expect(applyHunks("a\nb", hunks, all(hunks))).toBe("a\nB");
    expect(applyHunks("a\nb", hunks, all(hunks))).not.toContain("\r");
  });

  it("handles empty-string edges", () => {
    roundTrip("", "");
    roundTrip("", "hello");
    roundTrip("hello", "");
    roundTrip("", "a\nb");
    roundTrip("a\nb", "");
    roundTrip("\n", "");
    roundTrip("\n\n\n", "\n");
    expect(diffLines("", "").map((h) => h.kind)).toEqual(["same"]);
  });

  it("preserves trailing-newline changes in both directions", () => {
    const added = diffLines("a\nb", "a\nb\n");
    expect(added.map((h) => h.kind)).toEqual(["same", "add"]);
    expect(added[1].newLines).toEqual([""]);
    roundTrip("a\nb", "a\nb\n");

    const removed = diffLines("a\nb\n", "a\nb");
    expect(removed.map((h) => h.kind)).toEqual(["same", "del"]);
    roundTrip("a\nb\n", "a\nb");
    roundTrip("a\nb\n\n", "a\nb\n");
  });

  it("does not invent a trailing newline when the model drops one", () => {
    const before = "# Title\n\nBody text\n";
    const after = "# Title\n\nBody text rewritten";
    const hunks = diffLines(before, after);
    expect(applyHunks(before, hunks, all(hunks))).toBe(after);
    expect(applyHunks(before, hunks, all(hunks)).endsWith("\n")).toBe(false);
  });

  it("keeps hunks a contiguous partition of the old document", () => {
    const before = "a\nb\nc\nd\ne\nf\n";
    const after = "a\nx\nc\nd\nf\ng\n";
    const hunks = diffLines(before, after);
    const oldLines: string[] = [];
    const newLines: string[] = [];
    let oldCursor = 0;
    let newCursor = 0;
    for (const hunk of hunks) {
      expect(hunk.oldStart).toBe(oldCursor);
      expect(hunk.newStart).toBe(newCursor);
      oldCursor += hunk.oldLines.length;
      newCursor += hunk.kind === "same" ? hunk.oldLines.length : hunk.newLines.length;
      oldLines.push(...hunk.oldLines);
      newLines.push(...(hunk.kind === "same" ? hunk.oldLines : hunk.newLines));
    }
    expect(oldLines.join("\n")).toBe(before);
    expect(newLines.join("\n")).toBe(after);
  });
});

describe("applyHunks", () => {
  it("applies a single accepted hunk without touching the others", () => {
    const before = "a\nb\nc\nd";
    const after = "A\nb\nC\nd";
    const hunks = diffLines(before, after);
    const replaces = hunks
      .map((h, i) => ({ h, i }))
      .filter((entry) => entry.h.kind === "replace")
      .map((entry) => entry.i);
    expect(replaces).toHaveLength(2);
    expect(applyHunks(before, hunks, new Set([replaces[0]]))).toBe("A\nb\nc\nd");
    expect(applyHunks(before, hunks, new Set([replaces[1]]))).toBe("a\nb\nC\nd");
    expect(applyHunks(before, hunks, new Set(replaces))).toBe(after);
  });

  it("ignores accepted indices that are out of range", () => {
    const hunks = diffLines("a", "b");
    expect(applyHunks("a", hunks, new Set([99]))).toBe("a");
  });

  it("accepting a same hunk changes nothing", () => {
    const hunks = diffLines("a\nb\nc", "a\nB\nc");
    expect(applyHunks("a\nb\nc", hunks, new Set([0, 2]))).toBe("a\nb\nc");
  });

  it("round trips on randomised documents", () => {
    const next = rng(20260817);
    const pick = (): string => {
      const words = ["alpha", "beta", "gamma", "delta", "", "  indented", "# head"];
      return words[Math.floor(next() * words.length)];
    };
    for (let trial = 0; trial < 40; trial++) {
      const size = 1 + Math.floor(next() * 30);
      const before: string[] = [];
      for (let i = 0; i < size; i++) before.push(pick());
      const after = before
        .filter(() => next() > 0.25)
        .flatMap((line) => (next() > 0.75 ? [line, pick()] : [next() > 0.85 ? pick() : line]));
      roundTrip(before.join("\n"), after.join("\n"));
    }
  });
});

describe("large-input fallback", () => {
  it("collapses to one replace hunk beyond the line guard", () => {
    const before = Array.from({ length: 2500 }, (_, i) => `line ${i}`).join("\n");
    const after = before.replace("line 900", "line 900 edited");
    const hunks = diffLines(before, after);
    expect(hunks).toHaveLength(1);
    expect(hunks[0].kind).toBe("replace");
    expect(hunkStats(hunks)).toEqual({ added: 0, removed: 0, changed: 1 });
    roundTrip(before, after);
  });

  it("still diffs properly below the guard", () => {
    const lines = Array.from({ length: 1500 }, (_, i) => `line ${i}`);
    const before = lines.join("\n");
    const after = [...lines.slice(0, 700), "inserted", ...lines.slice(700)].join("\n");
    const hunks = diffLines(before, after);
    expect(hunks.map((h) => h.kind)).toEqual(["same", "add", "same"]);
    roundTrip(before, after);
  });

  it("treats an unchanged huge document as unchanged", () => {
    const big = Array.from({ length: 5000 }, (_, i) => `line ${i}`).join("\n");
    const hunks = diffLines(big, big);
    expect(hunks.map((h) => h.kind)).toEqual(["same"]);
    roundTrip(big, big);
  });
});
