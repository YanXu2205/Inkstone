import { readFileSync, readdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it, vi } from "vitest";
import { EditorState } from "@codemirror/state";
import { EditorView } from "@codemirror/view";
import { baseExtensions } from "../src/editor/editor";
import { lineSeparatorExt, serializeDoc } from "../src/editor/serialize";
import { blockWidgets, livePreview } from "../src/editor/livePreview";
import {
  toggleBold,
  toggleInlineCode,
  toggleItalic,
  toggleStrike,
} from "../src/editor/keymap";

const fixturesDir = join(dirname(fileURLToPath(import.meta.url)), "fixtures");
const fixtures = readdirSync(fixturesDir)
  .filter((name) => name.endsWith(".md"))
  .sort();

function source(name: string): string {
  return readFileSync(join(fixturesDir, name), "utf8");
}


function mount(doc: string): EditorView {
  const parent = document.createElement("div");
  document.body.appendChild(parent);
  return new EditorView({
    parent,
    state: EditorState.create({
      doc,
      extensions: [lineSeparatorExt(doc), ...baseExtensions()],
    }),
  });
}

/** The decoration builders swallow their own exceptions, so watch the log. */
function watchDecorationFailures() {
  const spy = vi.spyOn(console, "error").mockImplementation(() => {});
  return () =>
    spy.mock.calls
      .map((args) => String(args[0]))
      .filter((first) => first.startsWith("[livePreview]") || first.startsWith("[blockWidgets]"));
}

describe("the fixture corpus", () => {
  it("covers the constructs the fidelity guard is meant to protect", () => {
    const all = fixtures.map(source);
    const some = (pred: (doc: string) => boolean) => all.some(pred);

    expect(fixtures.length).toBeGreaterThanOrEqual(8);
    expect(some((d) => d.startsWith("---\n"))).toBe(true);
    expect(some((d) => /^=+$/m.test(d))).toBe(true);
    expect(some((d) => /^#{1,6} /m.test(d))).toBe(true);
    expect(some((d) => /^\s+[*+-] /m.test(d))).toBe(true);
    expect(some((d) => /\|\s*:-+:?\s*\|/.test(d))).toBe(true);
    expect(some((d) => /^- \[[ x]\] /m.test(d))).toBe(true);
    expect(some((d) => /^\[\^[^\]]+\]:/m.test(d) && /\[\^[^\]]+\]/.test(d))).toBe(true);
    expect(some((d) => /\$[^$\n]+\$/.test(d) && /\$\$/.test(d))).toBe(true);
    expect(some((d) => d.includes("```mermaid"))).toBe(true);
    expect(some((d) => /^<div /m.test(d) && /<kbd>/.test(d))).toBe(true);
    expect(some((d) => /^\[[^\]]+\]: \S+/m.test(d) && /!\[[^\]]*\]\[[^\]]+\]/.test(d))).toBe(true);
    expect(some((d) => d.includes("  \n"))).toBe(true);
    expect(some((d) => d.includes("=="))).toBe(true);
    expect(some((d) => d.includes("\r\n"))).toBe(true);
    expect(some((d) => !d.endsWith("\n"))).toBe(true);
    expect(some((d) => d.includes("\t"))).toBe(true);
    expect(some((d) => /[一-鿿]/.test(d) && /[A-Za-z]/.test(d))).toBe(true);
  });
});

describe("loading a document with the app's own extension set", () => {
  for (const name of fixtures) {
    it(`reads ${name} back out byte-identically`, () => {
      const doc = source(name);
      const state = EditorState.create({
        doc,
        extensions: [lineSeparatorExt(doc), ...baseExtensions()],
      });
      expect(serializeDoc(state)).toBe(doc);
    });
  }

  it("preserves CRLF byte-for-byte when the line separator is pinned", () => {
    const doc = source("crlf.md");
    expect(doc).toContain("\r\n");
    const state = EditorState.create({
      doc,
      extensions: [lineSeparatorExt(doc), ...baseExtensions()],
    });
    expect(serializeDoc(state)).toBe(doc);
    expect(state.lineBreak).toBe("\r\n");
  });
});

describe("building the live preview over a document", () => {
  for (const name of fixtures) {
    it(`decorates ${name} without failing or mutating the document`, async () => {
      const failures = watchDecorationFailures();
      const view = mount(source(name));
      const loaded = serializeDoc(view.state);

      try {
        expect(view.plugin(livePreview)).not.toBeNull();
        expect(view.state.field(blockWidgets)).toBeDefined();

        // Every caret position rebuilds the decorations with a different set of
        // constructs "opened up", so walk the whole document line by line.
        for (let line = 1; line <= view.state.doc.lines; line++) {
          const { from, to } = view.state.doc.line(line);
          view.dispatch({ selection: { anchor: from } });
          view.dispatch({ selection: { anchor: Math.floor((from + to) / 2) } });
          view.dispatch({ selection: { anchor: from, head: to } });
        }
        await Promise.resolve();
        await new Promise((resolve) => setTimeout(resolve, 0));

        expect(failures()).toEqual([]);
        expect(serializeDoc(view.state)).toBe(loaded);
      } finally {
        view.destroy();
      }
    });
  }

  it("produces decorations rather than silently rendering the raw source", () => {
    const view = mount(source("front-matter-setext.md"));
    try {
      const plugin = view.plugin(livePreview);
      expect(plugin?.decorations.size).toBeGreaterThan(0);
      expect(view.contentDOM.innerHTML).toContain("ot-h1");
    } finally {
      view.destroy();
    }
  });

  it("replaces mermaid fences and [toc] lines with block widgets", async () => {
    const view = mount("```mermaid\ngraph TD\n  A-->B\n```\n\n[toc]\n\n# Heading\n");
    try {
      view.dispatch({ selection: { anchor: view.state.doc.length } });
      // blockWidgets recomputes from a microtask dispatched by blockWatcher.
      await new Promise((resolve) => setTimeout(resolve, 0));
      expect(view.state.field(blockWidgets).size).toBe(2);
    } finally {
      view.destroy();
    }
  });

  it("renders a multi-line display math block without breaking the view", async () => {
    const doc = "text\n\n$$\n\\begin{aligned}\na &= b\n\\end{aligned}\n$$\n\ntail\n";
    const view = mount(doc);
    try {
      view.dispatch({ selection: { anchor: view.state.doc.length } });
      await new Promise((resolve) => setTimeout(resolve, 0));
      expect(view.state.field(blockWidgets).size).toBe(1);
      expect(serializeDoc(view.state)).toBe(doc);
    } finally {
      view.destroy();
    }
  });
});

const COMMANDS = {
  toggleBold: { run: toggleBold, marker: "**" },
  toggleItalic: { run: toggleItalic, marker: "*" },
  toggleInlineCode: { run: toggleInlineCode, marker: "`" },
  toggleStrike: { run: toggleStrike, marker: "~~" },
} as const;

const EDIT_CASES = [
  { fixture: "front-matter-setext.md", line: "Some prose under the setext heading.", word: "prose" },
  {
    fixture: "footnotes.md",
    line: "A second reference to the same note[^1] should not disturb anything.",
    word: "reference",
  },
  { fixture: "table-alignment.md", line: "Prose after the tables.", word: "after" },
  { fixture: "line-breaks.md", line: "Inkstone Project  ", word: "Project" },
  { fixture: "highlight-cjk.md", line: "日本語も同じように扱われます。ひらがな、カタカナ、漢字。", word: "日本語" },
];

function selectWord(view: EditorView, lineText: string, word: string): number {
  const lines = view.state.doc.toString().split("\n");
  const index = lines.indexOf(lineText);
  expect(index, `fixture no longer contains the line ${JSON.stringify(lineText)}`).toBeGreaterThan(-1);
  const lineStart = view.state.doc.line(index + 1).from;
  const offset = lineText.indexOf(word);
  expect(offset).toBeGreaterThan(-1);
  view.dispatch({
    selection: { anchor: lineStart + offset, head: lineStart + offset + word.length },
  });
  return index;
}

describe("formatting a word inside a paragraph", () => {
  for (const { fixture, line, word } of EDIT_CASES) {
    for (const [name, { run, marker }] of Object.entries(COMMANDS)) {
      it(`leaves every other line of ${fixture} byte-identical when ${name} runs`, () => {
        const doc = source(fixture);
        const view = mount(doc);
        try {
          const touchedLine = selectWord(view, line, word);
          expect(run(view)).toBe(true);

          const before = doc.split("\n");
          const after = view.state.doc.toString().split("\n");
          expect(after).toHaveLength(before.length);
          for (let i = 0; i < before.length; i++) {
            if (i === touchedLine) continue;
            expect(after[i], `line ${i + 1} of ${fixture} was rewritten`).toBe(before[i]);
          }
          expect(after[touchedLine]).toBe(
            before[touchedLine].replace(word, `${marker}${word}${marker}`),
          );
        } finally {
          view.destroy();
        }
      });
    }
  }

  it("restores the original bytes when the same command is applied twice", () => {
    const doc = source("front-matter-setext.md");
    for (const { run } of Object.values(COMMANDS)) {
      const view = mount(doc);
      try {
        selectWord(view, "Some prose under the setext heading.", "prose");
        run(view);
        expect(view.state.doc.toString()).not.toBe(doc);
        run(view);
        expect(serializeDoc(view.state)).toBe(doc);
      } finally {
        view.destroy();
      }
    }
  });

  it("wraps the last word of a document that has no trailing newline", () => {
    const doc = "one two three";
    const view = mount(doc);
    try {
      view.dispatch({ selection: { anchor: 8, head: 13 } });
      expect(toggleBold(view)).toBe(true);
      expect(view.state.doc.toString()).toBe("one two **three**");
    } finally {
      view.destroy();
    }
  });
});
