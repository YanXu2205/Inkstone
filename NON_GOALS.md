# Non-goals

Inkstone is a **writing tool**, not a note-taking system and not a cloud service.
This list is the project's immune system — if a feature lands here, the answer
is no until the list itself is revised by maintainers.

## Not before 1.0

- **Cloud sync, accounts, or a hosted backend.** Users bring their own iCloud /
  Syncthing / Git / 坚果云. We will never host your files.
- **Bidirectional links, block references, or a knowledge graph.** Wiki-link
  *syntax* may be parsed so files coexist with an Obsidian vault; the product
  itself is not a PKM app.
- **Real-time collaborative editing.** Architecture leaves a door open for a
  future CRDT layer; it is not on the 1.0 roadmap.
- **A first-party mobile app.** Tauri 2 can target iOS/Android; evaluation
  starts only after desktop 1.0 is solid.
- **A built-in AI service, proxy, or account.** Users bring their own key and
  talk to their own endpoint. We never see either.
- **Any telemetry**, anonymous or not. Crash logs stay on the device.
- **Feature gating behind a paywall.** If we ever charge (App Store convenience
  builds), the free source-built version has the same features.

## Never

- Silently rewriting the user's Markdown to match our preferred style.
- Shipping the user's text anywhere without an explicit, reviewable confirmation.
- Letting a plugin reach the network or the filesystem without a declared,
  user-granted capability (plugin system lands later; this rule is already set).
- Collecting, selling, or "improving the product with" user documents.

If you open an issue asking for one of the above, expect a polite close that
points here. The right place for most of them is a different project.
