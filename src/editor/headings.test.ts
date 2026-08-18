import { describe, expect, it } from "vitest";
import { extractHeadings } from "./headings";

describe("extractHeadings", () => {
  it("returns one entry per ATX heading with its level and byte offset", () => {
    const doc = "# One\n\ntext\n\n## Two\n\n###### Six\n";
    expect(extractHeadings(doc)).toEqual([
      { level: 1, text: "One", pos: 0 },
      { level: 2, text: "Two", pos: 13 },
      { level: 6, text: "Six", pos: 21 },
    ]);
  });

  it("reports offsets that point at the start of the heading line", () => {
    const doc = "intro\n\n## Section\n";
    const [heading] = extractHeadings(doc);
    expect(doc.slice(heading.pos, heading.pos + 10)).toBe("## Section");
  });

  it("skips headings inside backtick and tilde fenced code blocks", () => {
    const doc = [
      "# Real",
      "",
      "```md",
      "# fake heading",
      "## also fake",
      "```",
      "",
      "~~~",
      "### fake too",
      "~~~",
      "",
      "## Real again",
      "",
    ].join("\n");
    expect(extractHeadings(doc).map((h) => h.text)).toEqual(["Real", "Real again"]);
  });

  it("still finds headings after an indented fence has closed", () => {
    const doc = "  ```\n# hidden\n  ```\n# visible\n";
    expect(extractHeadings(doc).map((h) => h.text)).toEqual(["visible"]);
  });

  it("keeps CJK text intact and strips closing hashes", () => {
    const doc = "## 中文标题 with Latin ##\n\n### 日本語の見出し\n";
    expect(extractHeadings(doc)).toEqual([
      { level: 2, text: "中文标题 with Latin", pos: 0 },
      { level: 3, text: "日本語の見出し", pos: 23 },
    ]);
  });

  it("labels a heading with no text as untitled", () => {
    expect(extractHeadings("#   \n").map((h) => h.text)).toEqual(["(untitled)"]);
  });

  it("ignores seven or more hashes and hashes without a following space", () => {
    expect(extractHeadings("####### Seven\n#NoSpace\n")).toEqual([]);
  });

  it("ignores setext headings, which the outline does not model", () => {
    expect(extractHeadings("Title\n=====\n\nSub\n---\n")).toEqual([]);
  });

  it("returns nothing for a document without headings", () => {
    expect(extractHeadings("just a paragraph\n\nand another\n")).toEqual([]);
  });
});
