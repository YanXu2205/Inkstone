# CLAUDE.md — working on Inkstone

Inkstone (中文名「砚」) is a free, open-source, local-first WYSIWYG Markdown
editor inspired by Typora. The document **is** the Markdown text; live preview
is CodeMirror 6 decorations that hide syntax and swap in widgets. There is no
second rendering surface and no AST re-serialization on save.

## Commands

```bash
npm install
npm run dev          # http://localhost:1420
npm run check        # tsc --noEmit
npm test             # vitest run (must stay green)
npm run test:watch
npm run build
```

Desktop shell needs Rust + Tauri CLI; the web app is the source of truth and
can be developed without them.

## Layout

| Path | Role | License |
| --- | --- | --- |
| `src/editor/**` | CM6 live-preview engine (embeddable core) | MIT |
| `src/ai/**` | Optional AI copilot, lazy-loaded | AGPL-3.0 |
| `src/main.ts` | App chrome: tabs, menus, workspace wiring | AGPL-3.0 |
| `src/fileio.ts` | FSA / Tauri / download backends | AGPL-3.0 |
| `src/export*.ts` | HTML / PDF / Word / LaTeX / ePub | AGPL-3.0 |
| `src-tauri/` | Tauri 2 shell (dialogs + fs only) | AGPL-3.0 |
| `tests/fixtures/` | Fidelity corpus — byte-identical round-trips | — |

`src/editor/**` must not import from outside itself (license + embed boundary).
App concerns inject hooks (`setImageResolver`, etc.) instead.

CSS class prefix is still `ot-` (historical). Do not mass-rename it.

## Hard rules

1. **Your bytes are yours.** The buffer is the file. Never re-serialize the
   whole document from an AST. Fidelity tests in `tests/fidelity.test.ts`
   guard this — add a fixture when you teach the parser something new.
2. **AI is off by default** and lives behind `import("./ai")`. Five red lines
   (see `docs/PROPOSAL.zh-CN.md` §6 and `src/ai/`): no silent edits, send
   preview, secrets scan, key defaults to memory-only, local audit log.
   Output is always a reviewable diff (or comments-only for "review").
3. **No network unless the user asked.** Offline is the default. AI and image
   hosts are user-initiated.
4. **No new runtime dependency** without a clear size/security reason.
5. **After any change:** `npm run check && npm test && npm run build`.

## Conventions

- TypeScript strict, 2-space indent, double quotes, semicolons.
- Default to no comments. Comment only a non-obvious *why*.
- UI strings go through `t()` in `src/i18n.ts`. Feature modules may call
  `addMessages()` so their strings load with the feature.
- Storage keys live in `src/storage.ts` (`ink.*`). Migrate, don't invent.
- Prefer `textContent` over `innerHTML`. KaTeX/Mermaid are the known exceptions
  and are locked down (`throwOnError`, `securityLevel: "strict"`).

## Out of scope

See [NON_GOALS.md](NON_GOALS.md). Do not implement cloud sync, accounts,
bidirectional links, collaboration, telemetry, or a first-party AI backend.

## Product direction

Longer rationale and roadmap: [docs/PROPOSAL.zh-CN.md](docs/PROPOSAL.zh-CN.md).
Licensing: [LICENSES.md](LICENSES.md).
