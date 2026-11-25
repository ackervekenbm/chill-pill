# Chill Pill — Deployment

Chill Pill is one container: the web app and its API in a single node
process, with your readings in one SQLite file. CI publishes it as
`ghcr.io/ackervekenbm/chill-pill:latest` for `amd64` and `arm64`. The image is
public, so pulling it needs no login.

What every route shares:

- **Any 64-bit Docker host**, a Raspberry Pi included. The reference
  deployment is **OpenMediaVault** with its Compose plugin;
  [plain Docker Compose](#plain-docker-compose) works the same.
- **Nothing to configure.** No keys, no accounts. Every setting has a default.
- **Container port `3000`**, data in **`/app/data`**. Only the host side of
  both is yours to choose.
- **No login in the app.** Keep it on your LAN or tailnet; never forward a
  port to it from the internet.

## OpenMediaVault (Compose plugin)

Prerequisites: omv-extras with the **`openmediavault-compose`** plugin, and
the plugin's *Compose Files* and *Data* shared folders set in **Services →
Compose → Settings**.

1. **Services → Compose → Files → Create** (`+`).
2. **Name**: `chill-pill` (a stack name, not a filename).
3. **File**: paste

   ```yaml
   services:
     chill-pill:
       image: ghcr.io/ackervekenbm/chill-pill:latest
       ports:
         - "8184:3000"
       volumes:
         - CHANGE_TO_COMPOSE_DATA_PATH/chill-pill-data:/app/data
       logging:
         driver: json-file
         options:
           max-size: "10m"
           max-file: "3"
       restart: unless-stopped
   ```

4. **Save**, select the entry, **Up**. Open `http://<server-ip>:8184`.

Verify: **Services → Compose → Services** shows the container running (and
healthy after half a minute), and `http://<server-ip>:8184/api/health`
returns `{"ok":true}`.

What the file does:

- **`CHANGE_TO_COMPOSE_DATA_PATH/chill-pill-data`**: the plugin fills in the
  *Data* shared folder's path, so `<Data folder>/chill-pill-data/chill-pill.db`
  is the whole server-side state: an ordinary folder you can browse, copy and
  back up, which **Prune → Volume** can't delete.
- **Ownership is automatic.** The app runs as the unprivileged user uid 1000.
  Each time the container starts it gives `chill-pill-data` and the files in
  it to that user, also a folder a restore left owned by root. The folder must
  sit on a Linux filesystem (ext4, btrfs, xfs, what OMV formats with): NTFS,
  exFAT and FAT can't store an owner, and the app then can't open its database.
- **Port `8184`**: any free host port works; change the left-hand number only.
  Behind a [reverse proxy](#https--reverse-proxy) on the same Docker network
  you can drop `ports:` altogether.
- **`logging`**: caps the container log at 30 MB, so it can't fill the disk.

## Plain Docker Compose

The repo's [`docker-compose.yml`](../docker-compose.yml) is the same stack with
a named volume (`chill-pill-data`) instead of the OMV folder:

```bash
docker compose up -d
curl http://localhost:8184/api/health     # {"ok":true}
```

## Settings

All optional. The image already sets them; change one with an `environment:`
entry in the compose file only if you have a reason to.

| Variable | Default | What it does |
|---|---|---|
| `PORT` | `3000` | Port the app listens on inside the container |
| `HOST` | `0.0.0.0` | Address the app listens on |
| `DATA_DIR` | `/app/data` | Folder that holds `chill-pill.db` |

Theme and target values are chosen in the app (**Settings**) and stored in the
database.

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

## Updating

OMV: select the stack → **Pull** → **Up**. Plain compose:
`docker compose pull && docker compose up -d`. An unchanged image is a no-op;
the data folder is untouched either way. The app shell is served with
`no-cache`, so a normal refresh (or reopening the home-screen app) shows the
new build.

To pin a version instead of tracking `:latest`, use a commit tag,
`ghcr.io/ackervekenbm/chill-pill:<sha7>`: every image published from `main` is
also tagged with its 7-character commit SHA (listed on the repo's *Packages*
page). Editing that line and pressing **Up** is also how you roll back.

## Backups

`chill-pill.db` in the data folder is the only state (the database runs in WAL
mode, so `chill-pill.db-wal` and `-shm` sit next to it). Stop the container,
copy the folder, start it again; on OMV, a **Services → Compose → Schedule**
job with *Backup* enabled does exactly that. Never copy the folder while the
container runs: you can catch a half-written WAL file.

For a copy you can open anywhere, **Settings → Export CSV** downloads every
reading and medication change as one spreadsheet-friendly file.

## HTTPS / reverse proxy

Any reverse proxy works: point it at the container's port `3000` (e.g.
`reverse_proxy chill-pill:3000` in Caddy with both containers on one Docker
network). Give it its own host name: the app calls `/api/...` from the root,
so it can't live under a sub-path. No headers or base-URL setting needed.
HTTPS also makes "Add to Home Screen" on an iPhone feel most at home. It still
has no login, so keep the proxied name inside your LAN.

## Troubleshooting

| Symptom | Fix |
|---|---|
| The container restarts with `SqliteError: unable to open database file` | The data folder can't be handed to uid 1000: it is on NTFS/exFAT/FAT, or on a read-only mount. The log line starting with `chill-pill: could not give` says which folder. Move it to a Linux filesystem |
| The app says "Couldn't load your readings" | The server isn't reachable from the phone: check it's running (`/api/health`) and that the phone is on the home network |
| **Pull** is denied | The package was made private on GitHub. Set it back to public (Packages → chill-pill → Package settings), or `docker login ghcr.io` once with a classic token that has `read:packages` |
| Logs | OMV: **Services → Compose → Services** → the container → **Logs**. Plain: `docker compose logs chill-pill` |
