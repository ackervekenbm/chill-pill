# OpenMediaVault (Compose plugin)

Part of the [deployment guides](README.md).

The prebuilt image, run from OMV's web UI. This is the reference setup.

## What you need

- omv-extras with the **`openmediavault-compose`** plugin, and the plugin's
  *Compose Files* and *Data* shared folders set in **Services → Compose →
  Settings**.
- A 64-bit OMV install ([why](README.md#the-contract-every-route-shares)).

## Create the stack

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

## What the file does

- **`CHANGE_TO_COMPOSE_DATA_PATH/chill-pill-data`**: the plugin fills in the
  *Data* shared folder's path, so `<Data folder>/chill-pill-data/chill-pill.db`
  is the whole server-side state: an ordinary folder you can browse, copy and
  back up, which **Prune → Volume** can't delete.
- **Ownership is automatic.** The app runs as the unprivileged user uid 1000.
  Each time the container starts it gives `chill-pill-data` and the files in
  it to that user, also a folder a restore left owned by root. Nothing to set
  up and no SSH needed. The folder must sit on a Linux filesystem (ext4,
  btrfs, xfs, what OMV formats with): NTFS, exFAT and FAT can't store an
  owner, and the app then can't open its database.
- **Port `8184`**: any free host port works; change the left-hand number only.
  Behind a [reverse proxy](https.md) on the same Docker network you can drop
  `ports:` altogether.
- **No `container_name`**: compose names it `chill-pill-chill-pill-1`.
- **`logging`**: caps the container log at 30 MB, so it can't fill the disk.
- **No environment.** Every [setting](operations.md#settings) has a default
  the image already sets.

## Updating

Select the stack → **Pull** → **Up**. An unchanged image is a no-op; the data
folder is untouched either way. Pinning a version and rolling back:
[operations.md](operations.md#rollback).

## Backups

A **Services → Compose → Schedule** job with *Backup* enabled stops the
container, copies the data folder and starts it again. What to copy and why
the container must be stopped: [operations.md](operations.md#backups).

## Logs

**Services → Compose → Services** → the container → **Logs**.

## Next

- [https.md](https.md): a host name and HTTPS
- [operations.md](operations.md): settings, backups, importing a spreadsheet
- [troubleshooting.md](troubleshooting.md): when something doesn't work
- Back to the overview: [README.md](README.md)
