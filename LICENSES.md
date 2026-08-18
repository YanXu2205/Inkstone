# Licensing

Inkstone is dual-licensed on purpose.

| Part | License | Why |
| --- | --- | --- |
| The application — everything except the paths listed below | **AGPL-3.0-or-later** (see [LICENSE](LICENSE)) | Keeps the editor open. Anyone may fork, sell or host it, but the source of what they ship must stay available under the same terms. |
| The editor core — `src/editor/**` (see [src/editor/LICENSE-MIT](src/editor/LICENSE-MIT)) | **MIT** | The live-preview engine should be embeddable in anything, including closed-source products. A permissive core grows the ecosystem; a permissive *app* would just invite a closed repackage. |

## Contributing

Contributions are accepted under the license of the file you are touching,
certified by a `Signed-off-by` line ([DCO](https://developercertificate.org/)).
There is no CLA — we are not reserving the option to relicense.

## Planned structure

The MIT core will move out of `src/editor/` into a published
`packages/core/` workspace so it can be consumed as a real dependency. Until
then the directory boundary *is* the license boundary: keep application
concerns (file dialogs, settings storage, AI, workspace) out of
`src/editor/`.

## Third-party

Runtime dependencies keep their own licenses; CodeMirror, KaTeX, Mermaid and
markdown-it are all MIT or similarly permissive. `npm ls --all` lists the
current set.
