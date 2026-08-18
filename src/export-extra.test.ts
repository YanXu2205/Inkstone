import { describe, expect, it } from "vitest";
import JSZip from "jszip";
import MarkdownIt from "markdown-it";
import { buildEpubZip, toLatex } from "./export-extra";

const LATEX_DOC = [
  "# Hello",
  "",
  "World **bold**, *italic*, `code` and [link](https://x.y).",
  "Math: $x^2$ inline and $$\\int x\\,dx$$ display.",
  "",
  "- a",
  "- b",
  "",
  "```ts",
  "const x = 1;",
  "```",
  "",
  "> a quote",
  "",
  "| A | B |",
  "|---|---|",
  "| 1 | 2 |",
  "",
  "---",
  "",
  "## Section two",
].join("\n");

describe("the LaTeX exporter", () => {
  const tex = toLatex(new MarkdownIt(), "Test Doc", LATEX_DOC);

  it("emits a titled article preamble", () => {
    expect(tex).toContain("\\documentclass[11pt]{article}");
    expect(tex).toContain("\\title{Test Doc}");
  });

  it("maps heading levels onto sectioning commands", () => {
    expect(tex).toContain("\\section{Hello}");
    expect(tex).toContain("\\subsection{Section two}");
  });

  it("maps inline markup onto LaTeX equivalents", () => {
    expect(tex).toContain("\\textbf{bold}");
    expect(tex).toContain("\\emph{italic}");
    expect(tex).toContain("\\texttt{code}");
    expect(tex).toContain("\\href{https://x.y}");
  });

  it("maps block constructs onto their environments", () => {
    expect(tex).toContain("\\begin{itemize}");
    expect(tex).toContain("\\item a");
    expect(tex).toContain("\\begin{verbatim}");
    expect(tex).toContain("\\begin{quote}");
    expect(tex).toContain("\\begin{tabular}{ll}");
    expect(tex).toContain("\\textbf{A} & \\textbf{B}");
    expect(tex).toContain("\\rule{\\textwidth}");
  });

  it("passes math through untouched", () => {
    expect(tex).toContain("$x^2$");
    expect(tex).toContain("$$\\int x\\,dx$$");
  });

  it("escapes underscores outside of math", () => {
    const proseOnly = tex.replace("x^2", "").replace("dx", "");
    expect(/(?<!\\)_/.test(proseOnly)).toBe(false);
  });
});

describe("the ePub exporter", () => {
  async function pack(title: string, src: string) {
    const buffer = await buildEpubZip(title, src).generateAsync({
      type: "nodebuffer",
      mimeType: "application/epub+zip",
    });
    const zip = await JSZip.loadAsync(buffer);
    return {
      names: Object.keys(zip.files),
      read: (name: string) => zip.file(name)!.async("string"),
    };
  }

  const doc = "# One\n\ntext\n\n## Two\n\nmore $x$\n";

  it("writes the mimetype as the very first entry", async () => {
    const { names } = await pack("Test Book", doc);
    expect(names[0]).toBe("mimetype");
  });

  it("contains the container, package, nav and chapter documents", async () => {
    const { names } = await pack("Test Book", doc);
    expect(names).toContain("META-INF/container.xml");
    expect(names).toContain("OEBPS/content.opf");
    expect(names).toContain("OEBPS/nav.xhtml");
    expect(names).toContain("OEBPS/chapter.xhtml");
  });

  it("declares an OPF package that points at the chapter", async () => {
    const { read } = await pack("Test Book", doc);
    const opf = await read("OEBPS/content.opf");
    expect(opf).toContain("<package");
    expect(opf).toContain('<dc:title>Test Book</dc:title>');
    expect(opf).toContain('<itemref idref="chapter"/>');
  });

  it("links every nav entry to an anchor that exists in the chapter", async () => {
    const { read } = await pack("Test Book", doc);
    const nav = await read("OEBPS/nav.xhtml");
    const chapter = await read("OEBPS/chapter.xhtml");
    const targets = [...nav.matchAll(/href="chapter\.xhtml#([^"]+)"/g)].map((m) => m[1]);
    expect(targets).toEqual(["h-0", "h-1"]);
    for (const id of targets) {
      expect(chapter).toContain(`id="${id}"`);
    }
  });

  it("escapes XML metacharacters coming from the title and headings", async () => {
    const { read } = await pack("A & B <tag>", "# One & <two>\n\ntext\n");
    const nav = await read("OEBPS/nav.xhtml");
    expect(nav).toContain("A &amp; B &lt;tag&gt;");
    expect(nav).toContain("One &amp; &lt;two&gt;");
  });
});
