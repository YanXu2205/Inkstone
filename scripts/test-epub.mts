/** Offline unit test for the ePub exporter's package structure. */
import JSZip from "jszip";
import MarkdownIt from "markdown-it";
import { renderMarkdown } from "../src/export";
import { extractHeadings } from "../src/outline";
import { writeFileSync } from "node:fs";

// replicate exportEpub's packaging (without DOM download) to inspect it
async function buildEpub(title: string, src: string) {
  const zip = new JSZip();
  zip.file("mimetype", "application/epub+zip", { compression: "STORE" });
  zip.file(
    "META-INF/container.xml",
    `<?xml version="1.0"?>
<container version="1.0" xmlns="urn:oasis:names:tc:opendocument:xmlns:container">
  <rootfiles><rootfile full-path="OEBPS/content.opf" media-type="application/oebps-package+xml"/></rootfiles>
</container>`,
  );
  const headings = extractHeadings(src);
  let chapterHtml = renderMarkdown(src);
  let hIdx = 0;
  chapterHtml = chapterHtml.replace(/<h([1-6])>/g, (_m, lvl) => `<h${lvl} id="h-${hIdx++}">`);
  const navList = headings
    .map((h, i) => `      <li><a href="chapter.xhtml#h-${i}">${h.text}</a></li>`)
    .join("\n");
  zip.file(
    "OEBPS/nav.xhtml",
    `<?xml version="1.0" encoding="utf-8"?>
<html xmlns="http://www.w3.org/1999/xhtml" xmlns:epub="http://www.idpf.org/2007/ops">
<head><meta charset="utf-8"/><title>${title}</title></head>
<body><nav epub:type="toc" id="toc"><h1>${title}</h1><ol>
${navList}
</ol></nav></body></html>`,
  );
  zip.file("OEBPS/chapter.xhtml", `<?xml version="1.0" encoding="utf-8"?>
<html xmlns="http://www.w3.org/1999/xhtml"><head><meta charset="utf-8"/><title>${title}</title></head>
<body>${chapterHtml}</body></html>`);
  zip.file(
    "OEBPS/content.opf",
    `<?xml version="1.0" encoding="utf-8"?>
<package xmlns="http://www.idpf.org/2007/opf" version="3.0" unique-identifier="book-id">
  <metadata xmlns:dc="http://purl.org/dc/elements/1.1/">
    <dc:identifier id="book-id">urn:uuid:test</dc:identifier>
    <dc:title>${title}</dc:title><dc:language>en</dc:language>
  </metadata>
  <manifest>
    <item id="nav" href="nav.xhtml" media-type="application/xhtml+xml" properties="nav"/>
    <item id="chapter" href="chapter.xhtml" media-type="application/xhtml+xml"/>
  </manifest>
  <spine><itemref idref="chapter"/></spine>
</package>`,
  );
  return zip.generateAsync({ type: "nodebuffer", mimeType: "application/epub+zip" });
}

const doc = "# One\n\ntext\n\n## Two\n\nmore $x$\n";
const buf = await buildEpub("Test Book", doc);
writeFileSync("node_modules/.test.epub", buf);

const reread = await JSZip.loadAsync(buf);
const names = Object.keys(reread.files);
const checks: [string, boolean][] = [
  ["mimetype first", names[0] === "mimetype"],
  ["has container.xml", names.includes("META-INF/container.xml")],
  ["has content.opf", names.includes("OEBPS/content.opf")],
  ["has nav", names.includes("OEBPS/nav.xhtml")],
  ["has chapter", names.includes("OEBPS/chapter.xhtml")],
  ["nav links", (await reread.file("OEBPS/nav.xhtml")!.async("string")).includes("#h-1")],
  ["chapter anchored", (await reread.file("OEBPS/chapter.xhtml")!.async("string")).includes('id="h-1"')],
  ["opf package", (await reread.file("OEBPS/content.opf")!.async("string")).includes("<package")],
];

let fail = 0;
for (const [name, ok] of checks) {
  console.log(`${ok ? "PASS" : "FAIL"}  ${name}`);
  if (!ok) fail++;
}
console.log(fail === 0 ? "ALL PASS" : `${fail} FAILURES`);
process.exit(fail ? 1 : 0);
