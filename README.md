<div align="center">

<img src="public/icon.svg" width="96" alt="Inkstone logo" />

# Inkstone · 砚

**A free, open-source, local-first WYSIWYG Markdown editor.**  
Inspired by [Typora](https://typora.io) — not affiliated with it.

[![License: MIT](https://img.shields.io/badge/License-MIT-6366f1.svg)](LICENSE)
[![PRs Welcome](https://img.shields.io/badge/PRs-welcome-brightgreen.svg)](CONTRIBUTING.md)

*English · [简体中文](README.zh-CN.md)*

</div>

---

![Inkstone in light mode](docs/screenshot-light.png)

Type Markdown in one pane. When the caret leaves a construct, markers hide and
the text looks like the finished document. No split preview.

![Caret reveals the raw syntax](docs/screenshot-caret.png)

<details>
<summary><b>More screenshots</b></summary>

![Dark theme](docs/screenshot-dark.png)
![Dracula theme](docs/screenshot-dracula.png)
![Mermaid](docs/screenshot-mermaid.png)
![简体中文](docs/screenshot-zh.png)

</details>

## What it is

Inkstone is a **single-document writing app** for `.md` files:

- The buffer **is** the Markdown source (CodeMirror 6). Live preview is
  decorations and widgets — not a second HTML document that gets re-exported
  on save.
- Runs in the **browser** (Vite + optional PWA) and has an optional **Tauri 2**
  desktop shell.
- **No account, no cloud sync, no telemetry.** Files stay on your disk (or in
  the browser’s sandboxed file handles).

It is **not** a knowledge base (no bi-directional links, graph, or sync
service). If you need that, use Obsidian / Logseq / etc.

## Features (what actually ships today)

- Live preview: headings, emphasis, links, images, task lists, horizontal rules
- GFM tables (alignment from the delimiter row; separator hidden until edited)
- KaTeX math: `$…$` and `$$…$$`
- Mermaid fenced blocks (loaded on demand)
- `==highlight==`, footnotes, `[toc]`
- Multi-tab editing; recent files; folder workspace (File System Access API)
- Paste image → `assets/` when a folder is open, otherwise data URL
- Five themes + system; typewriter mode; outline sidebar
- Editor prefs: font, size, column width, custom CSS
- Export: HTML, Word (`.doc`), LaTeX, ePub 3, print/PDF
- UI languages: English, 简体中文, 日本語
- Optional AI (see below)

## Optional AI (bring your own key)

Off by default (Settings → AI). You provide an OpenAI-compatible endpoint and
key (presets include Ollama / LM Studio on localhost).

Actions: polish, concise, expand, continue, translate, summarize, review.

**How it behaves in this release:**

- Disabled until you turn it on; the toolbar entry stays hidden while off.
- Key defaults to **memory only** for the session; optional localStorage is
  opt-in and warned.
- Every call shows a **send preview** (exact text + destination + size).
- Model output is a **reviewable diff** (accept/reject hunks), except
  **review** which only shows comments.
- A local **secret scan** runs before send; there is a local audit log.
- The app has no Inkstone cloud or proxy.

## Download

Desktop installers (Windows / macOS / Linux):  
https://github.com/YanXu2205/Inkstone/releases

## Quick start

```bash
git clone https://github.com/YanXu2205/Inkstone.git
cd Inkstone
npm install
npm run dev          # http://localhost:1420
```

Chrome / Edge: in-place save via the File System Access API.  
Firefox / Safari: download / upload fallback.

### Desktop (optional)

Needs [Rust](https://rustup.rs) and Tauri CLI:

```bash
npm run build
cd src-tauri && cargo tauri build
```

### Checks

```bash
npm run check        # TypeScript
npm test             # export smoke tests (LaTeX / ePub)
npm run build
```

## Stack

| Layer | Choice |
| --- | --- |
| Editor | CodeMirror 6 + Lezer Markdown |
| Math / diagrams | KaTeX, Mermaid |
| Export | markdown-it, JSZip (ePub) |
| Desktop | Tauri 2 (dialogs + fs) |
| License | MIT |

## Contributing

See [CONTRIBUTING.md](CONTRIBUTING.md). Keep the editor local-first; don’t add
telemetry or a required network backend.

## Trademark

“Typora” is a trademark of its owner. Inkstone is an independent project and is
not affiliated with, endorsed by, or a product of Typora. “Inspired by Typora”
is descriptive only.

## License

[MIT](LICENSE) © Inkstone contributors
