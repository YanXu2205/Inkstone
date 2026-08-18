import JSZip from "jszip";
import MarkdownIt from "markdown-it";
import { renderMarkdown } from "./export";
import { downloadText } from "./fileio";
import { extractHeadings } from "./outline";

/** markdown-it token type (resolved lazily from an instance). */
type Token = ReturnType<InstanceType<typeof MarkdownIt>["parse"]>[number];

/**
 * Extra export targets: Word (.doc), LaTeX (.tex) and ePub 3.
 * All fully offline.
 */

/* ---------- Word (.doc) — Word-compatible HTML ---------- */

export function exportWord(title: string, src: string): void {
  const html = `<!doctype html>
<html xmlns:o="urn:schemas-microsoft-com:office:office"
      xmlns:w="urn:schemas-microsoft-com:office:word"
      xmlns="http://www.w3.org/TR/REC-html40">
<head>
<meta charset="utf-8">
<title>${escapeXml(title)}</title>
<!--[if gte mso 9]><xml>
<w:WordDocument><w:View>Print</w:View><w:Zoom>100</w:Zoom></w:WordDocument>
</xml><![endif]-->
<style>
body { font-family: Calibri, "Segoe UI", sans-serif; font-size: 11pt; line-height: 1.6; }
h1 { font-size: 20pt; } h2 { font-size: 16pt; } h3 { font-size: 13pt; }
code { font-family: Consolas, monospace; background: #f0f0f0; }
pre { background: #f6f8fa; padding: 10px; border: 1px solid #ddd; }
blockquote { border-left: 3px solid #ccc; margin-left: 0; padding-left: 12px; color: #555; }
table { border-collapse: collapse; }
th, td { border: 1px solid #999; padding: 5px 10px; }
img { max-width: 100%; }
</style>
</head>
<body>
${renderMarkdown(src)}
</body>
</html>`;
  const blob = new Blob(["\ufeff", html], { type: "application/msword" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `${baseName(title)}.doc`;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 5000);
}

/* ---------- LaTeX (.tex) ---------- */

const LATEX_ESC = /([&%$#_{}~^\\])/g;

function texEscape(s: string): string {
  return s
    .replace(LATEX_ESC, (c) =>
      ({
        "&": "\\&",
        "%": "\\%",
        $: "\\$",
        "#": "\\#",
        _: "\\_",
        "{": "\\{",
        "}": "\\}",
        "~": "\\textasciitilde{}",
        "^": "\\textasciicircum{}",
        "\\": "\\textbackslash{}",
      })[c] ?? c,
    )
    .replace(/…/g, "\\ldots{}")
    .replace(/[“”]/g, "''")
    .replace(/[‘’]/g, "'");
}

const SECTION = [
  "",
  "\\section",
  "\\subsection",
  "\\subsubsection",
  "\\paragraph",
  "\\subparagraph",
  "\\subparagraph",
];

interface TableBuf {
  rows: string[][];
  row: string[];
  inCell: string[];
}

export function toLatex(md: MarkdownIt, title: string, src: string): string {
  // Markdown-it consumes backslash escapes (\, \; …) before we ever see
  // the tokens, so math spans are swapped for placeholders up front and
  // restored verbatim at emission time.
  const mathSpans: string[] = [];
  const protectedSrc = src.replace(/\$\$[^$]+\$\$|\$[^$\n]+\$/g, (m) => {
    mathSpans.push(m);
    return `%%MATH${mathSpans.length - 1}%%`;
  });
  const restoreMath = (s: string): string =>
    s
      .split(/(%%MATH\d+%%)/)
      .map((part) => {
        const m = /^%%MATH(\d+)%%$/.exec(part);
        return m ? mathSpans[Number(m[1])] ?? "" : texEscape(part);
      })
      .join("");

  const tokens = md.parse(protectedSrc, {});
  const out: string[] = [];
  const listStack: string[] = [];
  let inQuote = false;
  let table: TableBuf | null = null;

  const inline = (toks: readonly Token[]): string => {
    let s = "";
    for (const t of toks) {
      switch (t.type) {
        case "text":
          s += restoreMath(t.content);
          break;
        case "escape":
          // markdown consumed the backslash; LaTeX wants it back
          s += `\\${t.content}`;
          break;
        case "code_inline":
          s += `\\texttt{${texEscape(t.content)}}`;
          break;
        case "strong_open":
          s += "\\textbf{";
          break;
        case "strong_close":
        case "em_close":
        case "s_close":
        case "link_close":
        case "mark_close":
          s += "}";
          break;
        case "em_open":
          s += "\\emph{";
          break;
        case "s_open":
          s += "\\sout{";
          break;
        case "mark_open":
          s += "\\underline{";
          break;
        case "link_open": {
          const href = t.attrGet("href");
          s += href ? `\\href{${href}}{` : "{";
          break;
        }
        case "softbreak":
        case "hardbreak":
          s += "\\\\";
          break;
        case "image": {
          const href = t.attrGet("src") ?? "";
          s += `\\includegraphics[width=0.85\\textwidth]{${href}}`;
          break;
        }
        case "html_inline":
        case "html_block":
          break;
        default:
          if (t.children?.length) s += inline(t.children);
      }
    }
    return s;
  };

  for (let i = 0; i < tokens.length; i++) {
    const t = tokens[i];
    const next = tokens[i + 1];

    switch (t.type) {
      case "heading_open": {
        const level = Number(t.tag.slice(1));
        out.push(`\n${SECTION[Math.min(level, 6)]}{${inline(next?.children ?? [])}}\n`);
        if (next?.type === "inline") i += 2; // skip inline + heading_close
        else i += 1; // skip heading_close only
        break;
      }
      case "paragraph_open":
        if (!listStack.length && !inQuote) out.push("\n");
        break;
      case "paragraph_close":
        if (!listStack.length && !inQuote) out.push("\n");
        break;
      case "fence":
      case "code_block":
        if (t.info?.trim() === "mermaid") {
          out.push("\n% mermaid diagram (source preserved as comment)\n");
          out.push(`% ${t.content.split("\n").join("\n% ")}\n`);
        } else {
          out.push(
            `\n\\begin{verbatim}\n${t.content.replace(/\\end\{verbatim\}/g, "")}\\end{verbatim}\n`,
          );
        }
        break;
      case "bullet_list_open":
        listStack.push("itemize");
        out.push("\n\\begin{itemize}\n");
        break;
      case "ordered_list_open":
        listStack.push("enumerate");
        out.push("\n\\begin{enumerate}\n");
        break;
      case "bullet_list_close":
      case "ordered_list_close":
        out.push(`\\end{${listStack.pop() ?? "itemize"}}\n`);
        break;
      case "list_item_open":
        out.push("\\item ");
        break;
      case "list_item_close":
        out.push("\n");
        break;
      case "blockquote_open":
        inQuote = true;
        out.push("\n\\begin{quote}\n");
        break;
      case "blockquote_close":
        inQuote = false;
        out.push("\\end{quote}\n");
        break;
      case "hr":
        out.push("\n\\noindent\\rule{\\textwidth}{0.4pt}\n");
        break;
      case "table_open":
        table = { rows: [], row: [], inCell: [] };
        break;
      case "tr_open":
        if (table) table.row = [];
        break;
      case "tr_close":
        if (table) {
          table.rows.push(table.row);
          table.row = [];
        }
        break;
      case "th_open":
      case "td_open":
        if (table) table.inCell = [];
        break;
      case "th_close":
      case "td_close":
        if (table) table.row.push(table.inCell.join(""));
        break;
      case "table_close": {
        if (table) {
          const cols = table.rows[0]?.length ?? 1;
          const spec = "l".repeat(cols);
          out.push(`\n\\begin{tabular}{${spec}}\n\\hline\n`);
          table.rows.forEach((row, ri) => {
            out.push(
              row.map((c) => (ri === 0 ? `\\textbf{${c}}` : c)).join(" & ") + " \\\\\n",
            );
            if (ri === 0) out.push("\\hline\n");
          });
          out.push("\\hline\n\\end{tabular}\n");
          table = null;
        }
        break;
      }
      default:
        if (t.type === "inline") {
          if (table) table.inCell.push(inline(t.children ?? []));
          else out.push(inline(t.children ?? []));
        }
    }
  }

  return `\\documentclass[11pt]{article}
\\usepackage[utf8]{inputenc}
\\usepackage{graphicx}
\\usepackage{hyperref}
\\usepackage[normalem]{ulem}
\\title{${texEscape(title)}}
\\author{Inkstone}
\\date{\\today}
\\begin{document}
\\maketitle
${out.join("")}
\\end{document}
`;
}

export function exportLatex(md: MarkdownIt, title: string, src: string): void {
  downloadText(`${baseName(title)}.tex`, toLatex(md, title, src), "application/x-tex");
}

/* ---------- ePub 3 ---------- */

export async function exportEpub(title: string, src: string): Promise<void> {
  const zip = new JSZip();
  const name = baseName(title);
  const uuid = `urn:uuid:${crypto.randomUUID()}`;

  // mimetype must be the first, uncompressed entry
  zip.file("mimetype", "application/epub+zip", { compression: "STORE" });
  zip.file(
    "META-INF/container.xml",
    `<?xml version="1.0"?>
<container version="1.0" xmlns="urn:oasis:names:tc:opendocument:xmlns:container">
  <rootfiles><rootfile full-path="OEBPS/content.opf" media-type="application/oebps-package+xml"/></rootfiles>
</container>`,
  );

  const headings = extractHeadings(src);

  // render, then inject sequential ids onto headings in document order
  let chapterHtml = renderMarkdown(src);
  let hIdx = 0;
  chapterHtml = chapterHtml.replace(/<h([1-6])>/g, (_m, lvl) => `<h${lvl} id="h-${hIdx++}">`);

  const navList = headings
    .map(
      (h, i) =>
        `      <li><a href="chapter.xhtml#h-${i}">${escapeXml(h.text)}</a></li>`,
    )
    .join("\n");

  zip.file(
    "OEBPS/nav.xhtml",
    `<?xml version="1.0" encoding="utf-8"?>
<html xmlns="http://www.w3.org/1999/xhtml" xmlns:epub="http://www.idpf.org/2007/ops">
<head><meta charset="utf-8"/><title>${escapeXml(title)}</title></head>
<body>
<nav epub:type="toc" id="toc"><h1>${escapeXml(title)}</h1>
  <ol>
${navList}
  </ol>
</nav>
</body>
</html>`,
  );

  zip.file(
    "OEBPS/chapter.xhtml",
    `<?xml version="1.0" encoding="utf-8"?>
<html xmlns="http://www.w3.org/1999/xhtml">
<head><meta charset="utf-8"/><title>${escapeXml(title)}</title>
<link rel="stylesheet" type="text/css" href="style.css"/></head>
<body>
${chapterHtml}
</body>
</html>`,
  );

  zip.file(
    "OEBPS/style.css",
    `body { font-family: serif; line-height: 1.6; margin: 1em; }
h1,h2,h3 { line-height: 1.3; }
pre { background: #f4f4f4; padding: 0.6em; overflow-x: auto; font-size: 0.85em; white-space: pre-wrap; }
code { font-family: monospace; }
blockquote { border-left: 3px solid #bbb; padding-left: 1em; color: #555; }
table { border-collapse: collapse; } th, td { border: 1px solid #999; padding: 0.3em 0.6em; }
img { max-width: 100%; }`,
  );

  const modified = new Date().toISOString().replace(/\.\d+Z$/, "Z");
  zip.file(
    "OEBPS/content.opf",
    `<?xml version="1.0" encoding="utf-8"?>
<package xmlns="http://www.idpf.org/2007/opf" version="3.0" unique-identifier="book-id">
  <metadata xmlns:dc="http://purl.org/dc/elements/1.1/">
    <dc:identifier id="book-id">${uuid}</dc:identifier>
    <dc:title>${escapeXml(title)}</dc:title>
    <dc:language>en</dc:language>
    <dc:creator>Inkstone export</dc:creator>
    <meta property="dcterms:modified">${modified}</meta>
  </metadata>
  <manifest>
    <item id="nav" href="nav.xhtml" media-type="application/xhtml+xml" properties="nav"/>
    <item id="chapter" href="chapter.xhtml" media-type="application/xhtml+xml"/>
    <item id="css" href="style.css" media-type="text/css"/>
  </manifest>
  <spine>
    <itemref idref="chapter"/>
  </spine>
</package>`,
  );

  const blob = await zip.generateAsync({
    type: "blob",
    mimeType: "application/epub+zip",
  });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `${name}.epub`;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 8000);
}

/* ---------- helpers ---------- */

function baseName(title: string): string {
  return (title || "untitled").replace(/\.md$/i, "").replace(/[\\/:*?"<>|]/g, "-");
}

function escapeXml(s: string): string {
  return s.replace(/[&<>"]/g, (c) =>
    ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c]!,
  );
}
