import MarkdownIt from "markdown-it";
import { downloadText } from "./fileio";

/** Render `- [ ]` / `- [x]` as real checkboxes (export only). */
function taskLists(md: MarkdownIt) {
  md.core.ruler.after("inline", "ot-task-lists", (state) => {
    const tokens = state.tokens;
    for (let i = 2; i < tokens.length; i++) {
      if (
        tokens[i].type !== "inline" ||
        tokens[i - 1].type !== "paragraph_open" ||
        tokens[i - 2].type !== "list_item_open"
      ) {
        continue;
      }
      const inline = tokens[i];
      const m = /^\[([ xX])\]\s+/.exec(inline.content);
      if (!m) continue;

      const checked = m[1] !== " ";
      inline.content = inline.content.slice(m[0].length);
      if (inline.children?.length) {
        const first = inline.children[0];
        first.content = first.content.slice(m[0].length);
      }
      tokens[i - 2].attrJoin("class", checked ? "ot-task-done" : "ot-task");
      tokens[i - 1].attrJoin("class", "ot-task-p");

      const box = new state.Token("html_inline", "", 0);
      box.content = `<input type="checkbox" class="ot-task-box" disabled${
        checked ? " checked" : ""
      }> `;
      inline.children?.unshift(box);
    }
  });
}

const md = new MarkdownIt({
  html: true,
  linkify: true,
  typographer: true,
})
  .use(taskLists)
  .use((api) => {
    // ==highlight== → <mark>
    api.inline.ruler.before("emphasis", "ot_highlight", (state, silent) => {
      const src = state.src;
      const start = state.pos;
      if (src.charCodeAt(start) !== 0x3d /* = */ || src.charCodeAt(start + 1) !== 0x3d) {
        return false;
      }
      const end = src.indexOf("==", start + 2);
      if (end < 0 || end === start + 2) return false;
      if (!silent) {
        state.push("mark_open", "mark", 1);
        const text = state.push("text", "", 0);
        text.content = src.slice(start + 2, end);
        state.push("mark_close", "mark", -1);
      }
      state.pos = end + 2;
      return true;
    });
  });

export function renderMarkdown(src: string): string {
  return md.render(src);
}

/** shared instance for advanced exporters (LaTeX walks the token stream). */
export const mdInstance = md;

const EXPORT_CSS = String.raw`
:root { color-scheme: light dark; }
* { box-sizing: border-box; }
body {
  font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", "PingFang SC",
    "Microsoft YaHei", system-ui, sans-serif;
  color: #24292f; background: #fff;
  max-width: 830px; margin: 0 auto; padding: 48px 28px;
  line-height: 1.75; font-size: 16px;
}
@media (prefers-color-scheme: dark) {
  body { color: #e6edf3; background: #0d1117; }
  a { color: #58a6ff; } code, pre { background: #161b22 !important; }
  h1, h2 { border-color: #21262d !important; }
}
h1, h2, h3, h4, h5, h6 { font-weight: 650; line-height: 1.35; margin: 1.4em 0 .5em; }
h1 { font-size: 1.85em; border-bottom: 1px solid #d8dee4; padding-bottom: .3em; }
h2 { font-size: 1.4em; border-bottom: 1px solid #d8dee4; padding-bottom: .3em; }
h3 { font-size: 1.2em; } h4 { font-size: 1.05em; }
a { color: #0969da; }
img { max-width: 100%; border-radius: 6px; }
code {
  font-family: ui-monospace, Consolas, Menlo, monospace; font-size: .88em;
  background: #f0f2f5; border-radius: 4px; padding: 1.5px 5px;
}
pre { background: #f6f8fa; border-radius: 8px; padding: 14px 16px; overflow-x: auto; }
pre code { background: none; padding: 0; font-size: .85em; }
blockquote {
  border-left: 3px solid #d0d7de; color: #57606a;
  margin: .8em 0; padding: .1em 1em;
}
table { border-collapse: collapse; margin: 1em 0; }
th, td { border: 1px solid #d8dee4; padding: 6px 12px; }
th { background: #f6f8fa; }
hr { border: none; border-top: 1.5px solid #d8dee4; margin: 2em 0; }
ul.contains-task-list { list-style: none; padding-left: 6px; }
.ot-task-box { margin-right: 6px; }
.ot-task-done { color: #8b949e; }
mark { background: #fff3ad; padding: 0 3px; border-radius: 3px; }
@media print {
  body { padding: 0; max-width: none; }
  .ot-export-note { display: none; }
}
`;

function standaloneHTML(title: string, src: string): string {
  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="generator" content="Inkstone">
<title>${escapeHTML(title)}</title>
<style>${EXPORT_CSS}</style>
</head>
<body>
${renderMarkdown(src)}
<p class="ot-export-note" style="margin-top:4em;font-size:11px;color:#8b949e">
  Exported from Inkstone — the free, open-source WYSIWYG Markdown editor.
</p>
</body>
</html>`;
}

function escapeHTML(s: string): string {
  return s.replace(/[&<>"]/g, (c) =>
    ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c]!,
  );
}

export function exportHTML(title: string, src: string) {
  const name = (title || "untitled").replace(/\.md$/i, "") + ".html";
  downloadText(name, standaloneHTML(title, src), "text/html");
}

/** Open the print dialog with the rendered document (→ Save as PDF). */
export function printPDF(title: string, src: string) {
  const iframe = document.createElement("iframe");
  iframe.style.cssText = "position:fixed;right:0;bottom:0;width:0;height:0;border:0;";
  iframe.srcdoc = standaloneHTML(title, src);
  iframe.onload = () => {
    iframe.contentWindow?.focus();
    iframe.contentWindow?.print();
    setTimeout(() => iframe.remove(), 60_000);
  };
  document.body.appendChild(iframe);
}
