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
