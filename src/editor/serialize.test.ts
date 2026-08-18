import { describe, expect, it } from "vitest";
import { EditorState } from "@codemirror/state";
import { detectLineSeparator, lineSeparatorExt, serializeDoc } from "./serialize";

describe("detectLineSeparator", () => {
  it("picks LF when the document is pure Unix", () => {
    expect(detectLineSeparator("a\nb\n")).toBe("\n");
  });

  it("picks CRLF when that form dominates", () => {
    expect(detectLineSeparator("a\r\nb\r\nc\n")).toBe("\r\n");
  });

  it("defaults to LF on a single-line file", () => {
    expect(detectLineSeparator("no breaks")).toBe("\n");
  });
});

describe("serializeDoc", () => {
  it("round-trips CRLF text when the separator is pinned", () => {
    const doc = "one\r\ntwo\r\nthree\r\n";
    const state = EditorState.create({
      doc,
      extensions: [lineSeparatorExt(doc)],
    });
    expect(serializeDoc(state)).toBe(doc);
  });

  it("round-trips LF text", () => {
    const doc = "one\ntwo\n";
    const state = EditorState.create({
      doc,
      extensions: [lineSeparatorExt(doc)],
    });
    expect(serializeDoc(state)).toBe(doc);
  });
});
