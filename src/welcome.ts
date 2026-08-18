/**
 * The welcome document doubles as a feature tour and live test case —
 * every construct below is rendered by the live-preview engine.
 */

const ICON =
  "data:image/svg+xml;utf8," +
  encodeURIComponent(
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64"><defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#6366f1"/><stop offset="1" stop-color="#a855f7"/></linearGradient></defs><rect width="64" height="64" rx="14" fill="url(#g)"/><rect x="14" y="18" width="36" height="5" rx="2.5" fill="#fff" opacity=".95"/><rect x="14" y="29.5" width="24" height="5" rx="2.5" fill="#fff" opacity=".8"/><rect x="14" y="41" width="30" height="5" rx="2.5" fill="#fff" opacity=".65"/></svg>`,
  );

export const MERMAID_DEMO_MD = `# Mermaid demo

\`\`\`mermaid
graph LR
  M[One Markdown buffer] --> L{Live preview}
  L -->|Typora| P[Paid & closed]
  L -->|Inkstone| F[Free & open]
\`\`\`

\`\`\`mermaid
flowchart TD
  A[Start] --> B{Editor open?}
  B -- no --> C[Open a .md file]
  B -- yes --> D[Type beautiful prose]
  C --> D
  D --> E[Save locally]
\`\`\`
`;

export const WELCOME_MD = `# Welcome to Inkstone 👋

[toc]

A **free, open-source, local-first** Markdown editor with a seamless live preview —
the community successor to Typora & MarkText.

> Move your caret anywhere and the raw syntax appears **in place**, just like Typora.
> Move away and it melts back into beautiful prose.

## ✨ What you're looking at

This whole page is one editable Markdown buffer — there is no separate preview pane.
Try it: click into the line below, then click away.

## 🖋 Inline styles

**Bold**, *italic*, ~~strikethrough~~, \`inline code\`, ==highlight==, [a link](https://github.com),
and emoji 🙂 — all render live. Footnotes too[^1].

[^1]: This is a footnote definition — click the little chip above to jump here.

## 🧮 Math, rendered live by KaTeX

Euler's identity inline — $e^{i\\pi} + 1 = 0$ — and the Gaussian integral:

$$\\int_{-\\infty}^{\\infty} e^{-x^2}\\,dx = \\sqrt{\\pi}$$

Click into a formula to edit its raw TeX; click away and it renders again.

## ⌨️ Shortcuts

| Shortcut       | Action         |
| -------------- | -------------- |
| \`Ctrl+B\` / \`Ctrl+I\` | Bold / italic |
| \`Ctrl+K\`     | Insert link    |
| \`Ctrl+S\`     | Save           |
| Ctrl+Backslash | Toggle outline |

## ✅ Task lists (click the boxes!)

- [x] WYSIWYG editing — no split pane
- [x] Works offline, files stay on your disk
- [ ] Try typing after this item
- [ ] Press \`Ctrl+B\` / \`Ctrl+I\` / \`Ctrl+K\` anywhere

## 📦 Code blocks with real highlighting

\`\`\`ts
// the live-preview engine in one sentence:
const view = new EditorView({ doc: markdown, extensions: [livePreview] });
\`\`\`

## 🧜 Mermaid diagrams render inline

\`\`\`mermaid
graph LR
  M[One Markdown buffer] --> L{Live preview}
  L -->|Typora| P[Paid & closed]
  L -->|Inkstone| F[Free & open]
\`\`\`

## 🖼 Images render inline

![Inkstone](${ICON})

Paste an image from your clipboard — it embeds instantly, fully offline.

## 📋 Tables

| Feature        | Typora | MarkText | Inkstone |
| -------------- | :----: | :------: | :--------: |
| WYSIWYG        |   ✅   |    ✅    |     ✅     |
| Price          |  paid  |  free*   |   free     |
| Maintained     |   ✅   |   ❌†    |     ✅     |
| Local-first    |   ✅   |    ✅    |     ✅     |

\\* last release 2022 &nbsp; · &nbsp; † [unmaintained](https://github.com/marktext/marktext/issues/3597)

---

## 🚀 Get started

1. Press \`Ctrl+O\` to open a \`.md\` file, or just start typing here
2. \`Ctrl+S\` saves — in-place on Chrome/Edge & in the desktop app
3. The **⇩** button exports a self-contained HTML file or prints to PDF
4. The **✨** button adds AI polish / translate / summarize — your own API key, your own privacy

*This welcome file is just a draft in your browser — nothing is written to disk until you save.*
`;
