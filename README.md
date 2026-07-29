# Notch

Personal stat tracker. Carve entries into stats — push-ups, books read, people invited, weight — and watch the graphs grow.

- **App**: Tauri 2 + React + TypeScript, TailwindCSS v4 + shadcn/ui, Recharts
- **Backend**: PocketBase on Fly.io
- **Targets**: Android (APK) + Windows

Domain vocabulary lives in [CONTEXT.md](./CONTEXT.md); architecture decisions in [docs/adr/](./docs/adr/).

## How it works

Every stat is an event log. An **Entry** is `(value, timestamp)`; totals are always derived, never stored. Stats come in two kinds:

- **Additive** — entries are increments, aggregates sum them (push-ups, books)
- **Measurement** — entries are point-in-time readings (weight)

Logging works offline: entries queue locally (append-only) and sync as plain creates on reconnect — no conflict resolution needed (see [ADR-0001](./docs/adr/0001-append-only-offline-queue.md)). Editing/deleting requires a connection.

## Development

Prereqs: Node 22+, Rust stable, and for Android builds the Android SDK/NDK ([Tauri prerequisites](https://tauri.app/start/prerequisites/)).

```sh
npm install
npm run tauri -- icon app-icon.svg   # once: generate src-tauri/icons from the SVG source
npm run tauri dev                    # desktop dev
npm run tauri android dev            # android dev (device/emulator)
```

CI regenerates icons from `app-icon.svg` on every release build, so committing `src-tauri/icons/` is optional.

## Backend setup (once)

```sh
cd backend
fly launch --no-deploy --copy-config
fly volumes create pb_data --size 1
fly deploy
```

Then open `https://<your-app>.fly.dev/_/`, create the superuser, and add one **user** record in the `users` collection — that's the account the app logs in with. Migrations in `backend/pb_migrations/` create the `stats` and `entries` collections automatically on first boot.

On first app launch, enter the server URL + user credentials.

## Releases

CI (GitHub Actions):

- **Push / PR to `main`** → typecheck, frontend build, `cargo check`
- **Push tag `vX.Y.Z`** → builds signed Android APK (arm64) + Windows installer and attaches both to a GitHub Release

Cutting a release:

1. Bump `version` in `src-tauri/tauri.conf.json` (and `package.json`) to `X.Y.Z` — CI fails the release if the tag and config disagree
2. `git tag vX.Y.Z && git push origin vX.Y.Z`
3. Install the APK from the release page (sideload)

### One-time: Android signing secrets

Generate a keystore (keep it safe — losing it means users must uninstall/reinstall):

```sh
keytool -genkey -v -keystore notch.keystore -alias notch -keyalg RSA -keysize 2048 -validity 10000
```

Repo secrets (Settings → Secrets and variables → Actions):

| Secret | Value |
|---|---|
| `ANDROID_KEYSTORE` | `base64 -w0 notch.keystore` output |
| `ANDROID_KEY_ALIAS` | `notch` |
| `ANDROID_KEYSTORE_PASSWORD` | the keystore password |
