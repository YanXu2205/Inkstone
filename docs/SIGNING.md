# Code signing (optional)

Inkstone release builds on GitHub Actions ship **unsigned** installers by
default. That is enough for open-source distribution; Windows SmartScreen and
macOS Gatekeeper may warn until you add real certificates.

This document is the checklist for when you are ready. Nothing here runs unless
the matching repository secrets exist.

## What you need

| Platform | Certificate | Typical cost | Where it is used |
| --- | --- | --- | --- |
| Windows | Authenticode (OV or EV) `.pfx` | paid CA | `tauri-action` / `signtool` |
| macOS | Apple Developer ID Application | Apple Developer Program | `codesign` + notarization |
| Linux | usually none | — | AppImage/deb work unsigned |

Inkstone does **not** require signing to build or run from source.

## GitHub secrets

Settings → Secrets and variables → Actions. Create only what you have:

### Windows

| Secret | Content |
| --- | --- |
| `WINDOWS_CERTIFICATE` | Base64-encoded `.pfx` |
| `WINDOWS_CERTIFICATE_PASSWORD` | PFX password |

Encode on a trusted machine:

```bash
# PowerShell
[Convert]::ToBase64String([IO.File]::ReadAllBytes("cert.pfx")) | Set-Clipboard
```

### macOS

| Secret | Content |
| --- | --- |
| `APPLE_CERTIFICATE` | Base64 `.p12` Developer ID Application |
| `APPLE_CERTIFICATE_PASSWORD` | P12 password |
| `APPLE_SIGNING_IDENTITY` | e.g. `Developer ID Application: Name (TEAMID)` |
| `APPLE_ID` | Apple ID email for notarization |
| `APPLE_PASSWORD` | App-specific password |
| `APPLE_TEAM_ID` | 10-character team id |

### Optional Tauri updater signatures

| Secret | Content |
| --- | --- |
| `TAURI_SIGNING_PRIVATE_KEY` | `tauri signer generate` private key |
| `TAURI_SIGNING_PRIVATE_KEY_PASSWORD` | key password if any |

Public key goes in `src-tauri/tauri.conf.json` under `plugins.updater` when you
enable the updater (not on by default).

## How CI behaves

`.github/workflows/release.yml`:

- Always builds installers for Windows, Linux, macOS (arm + intel).
- If Windows certificate secrets are present, the Windows job imports the PFX
  and signs the produced `.msi` / `.exe`.
- If Apple secrets are present, the macOS jobs sign and notarize.
- If secrets are missing, the job **skips signing** and still uploads unsigned
  assets (current default).

## Local signing (Windows)

```powershell
signtool sign /fd SHA256 /f cert.pfx /p PASS /tr http://timestamp.digicert.com /td SHA256 path\to\Inkstone_x64-setup.exe
```

## Verify

After a signed release:

- Windows: right-click installer → Properties → Digital Signatures.
- macOS: `spctl --assess --verbose Inkstone.app`

## Cost / ops note

Certificates expire. Put a calendar reminder before renewal, or releases will
quietly go unsigned again when the cert dies mid-pipeline.
