# chill-pill

A single-user, self-hosted **blood pressure tracker**. One npm package:
Express + better-sqlite3 backend (`src/server/`), React + Vite frontend
(`src/client/`), code shared by both in `src/shared/`.

## Build, lint, verify

```bash
npm install       # install deps (uses package-lock.json, commit it)
npm run build     # = typecheck && lint && vite build && tsc -p tsconfig.server.json  <- the verify step
npm test          # vitest: server + shared tests in node, client tests in jsdom
```

Installs are **script-free**: `.npmrc` sets `ignore-scripts=true`.
`better-sqlite3` ships `prebuilds/<platform>.node` (glibc + musl, amd64 +
arm64), so nothing needs compiling, but npm would otherwise run its legacy
implicit `node-gyp rebuild` on every install, which wants python3/make/g++ and
discards the shipped binary. A dependency that genuinely needs an install
script cannot be added without revisiting `.npmrc`.

The server compiles with `tsc` (CommonJS) into `dist-server/server/`
(`rootDir` is `src/` because the server imports `src/shared/`), so the entry
point is `dist-server/server/index.js` (`npm start`).

Tests sit next to the code they test (`foo.ts` -> `foo.test.ts`): server and
shared tests run in node, client tests in jsdom (vitest `projects`). Shared
test code lives in `src/server/test/` (`helpers.ts`: temp databases) and
`src/client/test/` (setup). Use those rather than a local copy. The server
build leaves tests and `src/server/test/` out.

**Verification for every change is `npm run build && npm test`.**

Other scripts:

```bash
npm run dev                          # API on :3094 + Vite on :5184 (proxies /api)
npm run seed -- --to <url>           # made-up demo readings into an EMPTY instance
npm run import -- <file.xlsx> --to <url> [--dry-run]   # one-time spreadsheet import
npm run icons                        # regenerate public/ icons from scripts/gen-icons.mjs
node scripts/banner.mjs              # docs/banner.png from scripts/banner.html
node scripts/screenshots.mjs [url]   # docs/screenshots/*.png; seeds the empty instance at url
```

The banner and screenshot scripts need Playwright, which is deliberately **not**
a dependency: `npm i --no-save playwright && npx playwright install chromium`,
and leave `package.json` / `package-lock.json` unchanged. The screenshot script
refuses an instance that already has readings; run it against a fresh
`DATA_DIR` (e.g. `npm run build && DATA_DIR=$(mktemp -d) PORT=3991 npm start`).

## CI and Docker

- `.github/workflows/ci.yml` — job `check`: `npm ci`, `npm run build`,
  `npm test` on every PR and on `main`.
- `.github/workflows/docker-build.yml` — job `smoke` on every PR: builds the
  image, boots it with no settings, polls `/api/health`, asserts
  `/api/readings` is `[]`, the app shell is `no-cache` and `/assets/*` is
  `immutable`, the app runs as `node` (uid 1000), and a root-owned data volume
  is taken over. On `main`, native amd64 + arm64 builds are merged into
  `ghcr.io/ackervekenbm/chill-pill:latest` and `:<sha7>`.
- `check` and `smoke` are the required checks. Actions are pinned by SHA;
  Dependabot (`.github/dependabot.yml`) bumps npm (grouped), actions and the
  digest-pinned `node:22-alpine` base image.
- The image: a two-stage `Dockerfile`, production deps only, data in
  `/app/data` (`chill-pill.db`), port `3000`, `HEALTHCHECK` on `/api/health`.
  `docker-entrypoint.sh` (installed as `chill-pill-entrypoint`) hands the data
  folder to `node` and drops root with `su-exec`. Settings: `PORT`, `HOST`,
  `DATA_DIR` (see `docs/deployment.md`). Keep `.dockerignore` excluding
  `data/`, so a local database never ends up in an image.

## Health data (MANDATORY)

Never commit spreadsheets, CSVs, databases or fixtures made from real
readings. `.gitignore` covers `data/`, `*.db*`, `*.xlsx` and `*.csv`; keep it
that way. Tests, fixtures and screenshots use made-up numbers only.

## README upkeep (MANDATORY)

`README.md` is the project's public front page, so it has to match the app.
Update it in the **same PR** when you add, remove or rename a feature, a
control or a setting; change a command, script, port, environment variable or
image tag; or change what is stored where. If nothing in the README is
affected, say so in the PR description. AGENTS.md and `docs/deployment.md`
follow the same rule.
