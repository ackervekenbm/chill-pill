# Security policy

## Reporting a vulnerability

Please report security problems privately, not in a public issue:

- Use **Report a vulnerability** on the repository's **Security** tab (GitHub
  private vulnerability reporting).
- If that option isn't available, open an issue that only asks for a private
  contact, without any details of the problem.

You'll get an answer within a week. Fixes land on `main` and ship in the next
`ghcr.io/ackervekenbm/chill-pill:latest` image; there are no older release
lines to patch.

## Scope and design notes

Chill Pill is built to run on a home network for one person. Keep that in mind
when judging impact:

- **No login, by design.** Anyone who can reach the app can read, add, change
  and delete readings. It is meant for a home network or tailnet only; never
  expose it to the internet, not even behind a reverse proxy, unless that
  proxy adds authentication.
- **Your health data stays on your own server.** Readings, notes, medication
  changes and settings live in one SQLite file (`/app/data/chill-pill.db` in
  the container). The app makes no outbound requests: no telemetry, no
  analytics, no third-party fonts or scripts. The browser keeps nothing but
  the page itself.
- **No secrets.** The app needs no API keys or passwords, so there are none to
  leak.
- **CSV export opens in spreadsheets.** Notes and medication labels are
  exported exactly as typed (quoted per RFC 4180, not rewritten). A note that
  starts with `=`, `+`, `-` or `@` may be read as a formula by a spreadsheet
  program; only you can write notes, so this matters only if someone else
  could reach your instance.
- **Never commit health data.** The repository, the image and the
  screenshots contain made-up demo numbers only.

Reports about exposing the app to the internet without authentication are
expected behaviour, not vulnerabilities; reports about stored notes or labels
running as script in the browser, or data leaving the server, are very
welcome.
