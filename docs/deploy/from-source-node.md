# Bare Node (from a checkout)

Part of the [deployment guides](README.md).

Run the built server directly under Node, with systemd keeping it alive. Use
this when the host already runs Node and you'd rather not add Docker.

## What you need

- **Node 22 or newer** and `git`. Check with `node -v`; if your distribution's
  Node is older, install a current LTS from
  [NodeSource](https://github.com/nodesource/distributions).
- **A 64-bit OS**: `node -p process.arch` must print `x64` or `arm64`
  ([why](README.md#the-contract-every-route-shares)).
- No C compiler, Python or `make`: the repo's `.npmrc` turns install scripts
  off and the SQLite library ships its binary.

## Install as a service

The checkout lives in `/opt/chill-pill`, the database in
`/var/lib/chill-pill`, and a system user `chill-pill` owns both.

**1. Create the service user:**

```bash
sudo useradd --system --user-group --create-home --home-dir /var/cache/chill-pill \
  --shell /usr/sbin/nologin chill-pill
sudo install -d -o chill-pill -g chill-pill /opt/chill-pill
```

**2. Clone and build as that user** (`-H` keeps npm's cache in its home):

```bash
sudo -u chill-pill -H git clone https://github.com/ackervekenbm/chill-pill.git /opt/chill-pill
sudo -u chill-pill -H bash -c 'cd /opt/chill-pill && npm ci && npm run build'
```

**3. Write the unit:**

```bash
sudo tee /etc/systemd/system/chill-pill.service >/dev/null <<'EOF'
[Unit]
Description=Chill Pill (blood pressure tracker)
After=network-online.target
Wants=network-online.target

[Service]
Type=simple
User=chill-pill
Group=chill-pill
# The server serves dist/ from its working directory.
WorkingDirectory=/opt/chill-pill
Environment=NODE_ENV=production
Environment=PORT=8184
Environment=DATA_DIR=/var/lib/chill-pill
# Creates /var/lib/chill-pill for User=, readable by it only.
StateDirectory=chill-pill
StateDirectoryMode=0700
ExecStart=/usr/bin/node dist-server/server/index.js
Restart=on-failure
NoNewPrivileges=true
ProtectSystem=strict
ProtectHome=true
PrivateTmp=true

[Install]
WantedBy=multi-user.target
EOF
sudo systemctl daemon-reload
sudo systemctl enable --now chill-pill
```

Any other [setting](operations.md#settings) goes in as another
`Environment=` line.

Check: `curl http://127.0.0.1:8184/api/health` → `{"ok":true}`, then open
`http://<server-ip>:8184`.

The server listens on every interface (`HOST=0.0.0.0`), like the container.
Behind a [reverse proxy](https.md) on the same machine, add
`Environment=HOST=127.0.0.1` so only the proxy reaches it.

## Updating

```bash
sudo -u chill-pill -H bash -c 'cd /opt/chill-pill && git pull && npm ci && npm run build'
sudo systemctl restart chill-pill
```

To roll back, `git checkout <commit>` instead of `git pull`, then build and
restart the same way.

## Logs

`journalctl -u chill-pill -f`.

## Next

- [https.md](https.md): a host name and HTTPS
- [operations.md](operations.md): settings, backups, importing a spreadsheet
- [troubleshooting.md](troubleshooting.md): when something doesn't work
- Back to the overview: [README.md](README.md)
