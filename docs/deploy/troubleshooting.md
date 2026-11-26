# Troubleshooting

Part of the [deployment guides](README.md). Where to find the logs:
[operations.md](operations.md#logs).

| Symptom | Fix |
|---|---|
| The container restarts with `SqliteError: unable to open database file` | The data folder can't be handed to uid 1000: it is on NTFS/exFAT/FAT, or on a read-only mount. The log line starting with `chill-pill: could not give` says which folder. Move it to a Linux filesystem |
| The app says "Couldn't load your readings" | The server isn't reachable from the phone: check it's running (`/api/health`) and that the phone is on the home network |
| **Pull** is denied | The package was made private on GitHub. Set it back to public (Packages → chill-pill → Package settings), or `docker login ghcr.io` once with a classic token that has `read:packages` |
| The page loads but every action fails | It is served under a sub-path. Give it its own host name or port ([https.md](https.md#rules-for-any-proxy)) |
