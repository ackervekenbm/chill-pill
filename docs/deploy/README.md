# Deploying Chill Pill

Chill Pill runs as **one Node process**: the web app and its API. Your
readings are in one SQLite file. Nothing to configure: no keys, no accounts,
every setting has a default.

## Which route?

New here? Start with the **prebuilt image**.

| Route | Guide | Good for | Needs |
| --- | --- | --- | --- |
| **Prebuilt image** | [docker-image.md](docker-image.md) | Anything with Docker: no build step, easy updates and rollback, `amd64` and `arm64` | Docker, 64-bit OS |
| **OpenMediaVault** | [openmediavault.md](openmediavault.md) | The OMV Compose plugin, all from the web UI (the reference setup) | OMV with the Compose plugin, 64-bit OS |
| **Build from a checkout (Docker)** | [from-source-docker.md](from-source-docker.md) | A version you patch yourself, or a host that shouldn't pull an image | Docker, git, 64-bit OS |
| **Bare Node** | [from-source-node.md](from-source-node.md) | A box that already runs Node 22+, managed by systemd | Node 22+, git, 64-bit OS |

Whichever route you pick:

- [https.md](https.md): a host name and HTTPS with a reverse proxy.
- [operations.md](operations.md): settings, updating, rollback, backups, logs,
  importing a spreadsheet.
- [troubleshooting.md](troubleshooting.md): symptoms and fixes.

## Keep it on your LAN or tailnet

**Chill Pill has no login.** Anyone who can open it can read and change your
readings. Run it on your home network or your tailnet only, and never forward
a port to it from the internet.

## The contract every route shares

| Item | Value |
| --- | --- |
| Port | The app listens on `3000` (`PORT`). In Docker that is fixed; you choose the host side (the examples use `8184`) |
| Listen address | `HOST`, default `0.0.0.0` |
| Data | `DATA_DIR` (default `./data`, `/app/data` in the image) holds `chill-pill.db`. The only state |
| Web app files | `dist/`, next to where the server is started |
| Health | `GET /api/health` → `200 {"ok":true}` |
| Prerequisites | Node **22+** (the image ships it) on a **64-bit** `x64`/`arm64` OS; nothing is compiled during install |

All settings are environment variables; the full list is in
[operations.md](operations.md#settings).

**64-bit only.** The image is published for `amd64` and `arm64` only, and the
SQLite library (`better-sqlite3`) ships no 32-bit ARM build. Check the OS, not
the CPU: `dpkg --print-architecture` must print `arm64` or `amd64`. A
Raspberry Pi with a 64-bit OS is fine.

## Versions and tags

Images are built from every commit on `main` and published to
`ghcr.io/ackervekenbm/chill-pill` as `:latest` and `:<sha7>`, for `amd64` and
`arm64`. The package is public, so pulling needs no login.
[operations.md](operations.md#rollback) has how to pin or roll back.
**Settings → About** in the app shows which commit is running.
