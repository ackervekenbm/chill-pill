# Operations

Part of the [deployment guides](README.md).

## Settings

All optional. The image already sets them; in Docker change one with an
`environment:` entry in the compose file, for bare Node with an
`Environment=` line in the unit, only if you have a reason to.

| Variable | Default | What it does |
|---|---|---|
| `PORT` | `3000` | Port the server listens on (fixed in Docker; map the host side instead) |
| `HOST` | `0.0.0.0` | Address the server listens on |
| `DATA_DIR` | `./data` (`/app/data` in the image) | Folder that holds `chill-pill.db` |

Theme and target values are chosen in the app (**Settings**) and stored in the
database.

## Which build is running?

**Settings → About** shows the commit and build time. A build without them
(bare Node, or an image built without the build arguments) says
"development build".

## What lives where

`chill-pill.db` in the data folder is the only state: your readings,
medication changes and settings. The database runs in WAL mode, so
`chill-pill.db-wal` and `-shm` sit next to it.

## Health

`GET /api/health` → `200 {"ok":true}`. The image's healthcheck polls it every
30 s.

## Backups

Stop the app, copy the data folder (all three files), start it again. On OMV a
**Services → Compose → Schedule** job with *Backup* enabled does exactly that.
Never copy the folder while the app runs: you can catch a half-written WAL
file.

For a copy you can open anywhere, **Settings → Export CSV** downloads every
reading and medication change as one spreadsheet-friendly file.

## Updating

Per route: [docker-image.md](docker-image.md#updating),
[openmediavault.md](openmediavault.md#updating),
[from-source-docker.md](from-source-docker.md#updating),
[from-source-node.md](from-source-node.md#updating). The data is untouched
either way. The app shell is served with `no-cache`, so a normal refresh (or
reopening the home-screen app) shows the new build.

## Rollback

To pin a version instead of tracking `:latest`, use a commit tag,
`ghcr.io/ackervekenbm/chill-pill:<sha7>`: every image published from `main` is
also tagged with its 7-character commit SHA (listed on the repo's *Packages*
page). Editing the `image:` line and starting the stack again is also how you
roll back.

## Importing a spreadsheet (one time)

Coming from a spreadsheet? Run the importer once from a checkout of this repo
on any computer that can reach the server (Node 22 or newer):

```bash
npm install
npm run import -- path/to/your.xlsx --to http://<server-ip>:8184 --dry-run   # check first
npm run import -- path/to/your.xlsx --to http://<server-ip>:8184
```

It reads the `DATA` tab (a `Date` column and up to three `Sys`/`Dia`/`Pulse`
groups per row), skips empty rows, reports incomplete ones, and sends the
readings to the running app. Imported readings have a date but no time and
count as morning readings. Running it twice doesn't double anything. The
spreadsheet itself never leaves your computer; keep it out of the repo.

## Logs

- Docker: `docker compose logs -f chill-pill`
- OMV: **Services → Compose → Services** → the container → **Logs**
- Bare Node: `journalctl -u chill-pill -f`
