/** Offline unit test for the LaTeX exporter (bundled via esbuild). */
import MarkdownIt from "markdown-it";
import { toLatex } from "../src/export-extra";

const doc = [
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

const tex = toLatex(new MarkdownIt(), "Test Doc", doc);

const checks: [string, boolean][] = [
  ["title", tex.includes("\\title{Test Doc}")],
  ["section", tex.includes("\\section{Hello}")],
  ["subsection", tex.includes("\\subsection{Section two}")],
  ["bold", tex.includes("\\textbf{bold}")],
  ["emph", tex.includes("\\emph{italic}")],
  ["texttt", tex.includes("\\texttt{code}")],
  ["href", tex.includes("\\href{https://x.y}")],
  ["itemize", tex.includes("\\begin{itemize}") && tex.includes("\\item a")],
  ["verbatim", tex.includes("\\begin{verbatim}")],
  ["quote", tex.includes("\\begin{quote}")],
  ["tabular", tex.includes("\\begin{tabular}{ll}")],
  ["table row", tex.includes("\\textbf{A} & \\textbf{B}")],
  ["rule", tex.includes("\\rule{\\textwidth}")],
  ["inline math kept", tex.includes("$x^2$")],
  ["display math kept", tex.includes("$$\\int x\\,dx$$")],
  ["underscore escaped", !/(?<!\\)_/.test(tex.replace("x^2", "").replace("dx", ""))],
];

let fail = 0;
for (const [name, ok] of checks) {
  console.log(`${ok ? "PASS" : "FAIL"}  ${name}`);
  if (!ok) fail++;
}
console.log(fail === 0 ? "ALL PASS" : `${fail} FAILURES`);
if (fail) {
  console.log("---- output ----");
  console.log(tex);
}
process.exit(fail ? 1 : 0);
