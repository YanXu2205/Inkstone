# Contributing to OpenTypora

Thanks for helping build the successor Typora deserves! 🎉

## Getting started

```bash
git clone https://github.com/open-typora/open-typora
cd open-typora
npm install
npm run dev      # http://localhost:1420
```

`npm run check` runs TypeScript; `npm test` runs the offline exporter unit tests; `npm run build` produces the production bundle.

> Releasing: bump the version in `package.json` + `src-tauri/tauri.conf.json`, bump `CACHE` in `public/sw.js`, then push a `v*` tag — CI builds the desktop installers.

## Ground rules

- **Match the architecture.** All editor behavior belongs in the CodeMirror layer (`src/editor/`); app chrome lives in `src/main.ts`. The document buffer is the single source of truth — never add a second rendering surface.
- **Keep the core tiny.** Think twice before adding a runtime dependency.
- **Local-first & private.** Features must work offline; network access is only allowed for user-configured, user-initiated actions (e.g. the AI key).
- **Cross-platform.** Windows, macOS, Linux and the browser are all first-class.

## Good first issues

- New live-preview decorations (footnotes, `==highlight==`, math, Mermaid)
- UI themes & font settings
- i18n strings
- Workspace / multi-tab infrastructure

Feel free to open an issue before large changes so we can align early.
