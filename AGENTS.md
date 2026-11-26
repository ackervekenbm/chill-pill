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
  `DATA_DIR` (see `docs/deploy/operations.md`). Keep `.dockerignore` excluding
  `data/`, so a local database never ends up in an image.
- Deployment docs: one guide per route in `docs/deploy/` (`README.md` picks
  the route and states the contract they share): prebuilt image, OpenMediaVault
  (reference), Docker from a checkout, bare Node under systemd. Settings,
  backups, rollback and the spreadsheet import are in `operations.md`, next to
  `https.md` and `troubleshooting.md`.

## Health data (MANDATORY)

Never commit spreadsheets, CSVs, databases or fixtures made from real
readings. `.gitignore` covers `data/`, `*.db*`, `*.xlsx` and `*.csv`; keep it
that way. Tests, fixtures and screenshots use made-up numbers only.

## Working docs stay out of the repo

Plans, specs, design mockups and screenshots are working documents: write them
locally (`docs/superpowers/` is git-ignored) or in the issue/PR, never commit
them. What outlives the work goes into the README, this file or
`docs/deploy/`.

## README upkeep (MANDATORY)

`README.md` is the project's public front page, so it has to match the app.
Before opening a PR, check the README against your change and update it in
the **same PR** when you add, remove or rename a feature, a control or a
setting; change a command, script, port, environment variable or image tag;
or change what is stored where. Keep its style: a banner, one-line tagline
and badges up top, short emoji highlights, detail in collapsible `<details>`
sections, plain user-facing wording, no internal jargon. The banner is
`scripts/banner.html`, rendered to `docs/banner.png` by `scripts/banner.mjs`;
re-render it when its wording or the icon changes. Anything shown in it or in
the screenshots is invented, never real data. If nothing in the README is
affected, say so in the PR description. AGENTS.md and `docs/deploy/` follow
the same rule.

## Issue-first workflow (MANDATORY)

Before starting any new work item, create a GitHub issue:

```bash
gh issue create --title "<what>" --body "..."   # → gives an issue number
```

- Name the branch `fix/...`, `feat/...` or `chore/...` (one per issue).
- Put `Fixes #<n>` on its own line in the PR body so the issue auto-closes on merge.
- One issue, one PR, branched off the latest `main`. Every PR targets `main`
  (`Fixes #<n>` only closes issues from there; CI runs on every PR, stacked
  ones included).
- Don't stack by default. Work that needs an unmerged PR goes into that PR, as
  its own commit with its own `Fixes #<n>` line, or waits until it has merged.
- When a stack is unavoidable, keep it small and say "merge #<n> first" in the
  PR body. A squash lands the lower PR as a new commit, so the next PR conflicts
  wherever it edits those lines again. Right after each merge, rebase the next
  branch with `git fetch && git rebase origin/main` (git skips the commit that
  already landed; add `--update-refs` from the top branch to move the whole
  stack), then `git push --force-with-lease`. If the merged PR had several
  commits, git can't match its squash: use
  `git rebase --onto origin/main <old tip of the merged branch>`.

## Git / PR conventions

- `main` is protected (ruleset `main-branch-protection`): **no direct pushes**,
  linear history, and every change lands via a pull request and a **squash
  merge** (the only merge method). Required checks: `check` and `smoke`, on a
  branch that is up to date with `main` (the PR's **Update branch** button, or
  a rebase).
- After merging, GitHub auto-deletes the head branch (`delete-branch-on-merge` is on).
- Pattern: create branch → implement → update README/docs → `npm run build && npm test` → push → `gh pr create`
  → merge once the checks pass. Use `gh pr merge --squash` when asked to merge.
- **Never merge your own PR.** Ready PRs are handed over to a reviewer to merge;
  if the author merges, the other party reviews the squash only after the fact.
- Commit messages are imperative, single-paragraph (plus context lines), and
  reference the fix: `Fixes #<n>`.
- **Branch hygiene** — keep the workspace tidy:
  - Always branch off the latest `main` before starting new work.
  - After a PR lands (squash merged), GitHub auto-deletes the remote branch.
    Also delete the local branch afterwards:
    `git checkout main && git fetch --prune && git branch -D <branch>`.
  - Periodically prune stale local branches whose remotes are already gone:
    `git fetch --prune && git for-each-ref --format='%(refname:short) %(upstream:track)' refs/heads | grep gone`.
    Keep the workspace down to `main` plus active work branches.

## Dependencies / Dependabot

- Every `updates:` entry in `.github/dependabot.yml` assigns its PRs to
  `ackervekenbm` (`assignees`), so each Dependabot PR notifies the maintainer.
  Keep it on any entry you add.
- Dependabot majors stay enabled. The `typescript` major is ignored in
  `.github/dependabot.yml` (it can outrun typescript-eslint's peer range); lift
  it once typescript-eslint supports it.
- Dependabot also watches GitHub Actions (pinned to commit SHAs, version in a
  comment) and the Docker base image (pinned by digest; Node majors are a
  deliberate move, so they are ignored there).
- Dependabot security alerts and security updates are on; a security update
  opens its own PR outside the weekly group. CodeQL (default setup) scans
  every PR.
- The runtime image is `node:22-alpine` and installs production dependencies
  only; `better-sqlite3` majors that change the native ABI or drop a musl
  prebuild are caught by the smoke job before merge.
