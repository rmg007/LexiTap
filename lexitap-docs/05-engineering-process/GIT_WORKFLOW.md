---
title: Git Workflow
category: engineering-process
status: active
updated: 2026-05-24
priority: P0
tags: [git, worktrees, two-track, branching, pull-requests, commits, merge]
---

# Git Workflow

LexiTap is built as two parallel tracks from Day 1, each in its own git worktree, each driven by an independent autonomous agent. This doc gives the exact setup commands, branch/PR/commit conventions, and the integration strategy between Track A (content CLI) and Track B (mobile app). It expands the Day-1 setup in [../02-product-definition/ROADMAP.md](../02-product-definition/ROADMAP.md) and is the canonical source for branch, commit, and PR conventions referenced by the repo-root operating doc [../../CLAUDE.md](../../CLAUDE.md).

## Why Two Worktrees

Two independent Claude Code instances run concurrently — one per track — from Week 2 onward. Worktrees let each instance hold its own checked-out branch and working directory off a single shared `.git`, so the two agents never collide on a working tree or step on each other's uncommitted changes. Setting this up retroactively is messier than doing it on Day 1, so it is Day-1 infrastructure.

- **Track A — Content CLI** (`track/content-cli`): the Node.js + TypeScript + SQLite tool that produces `words.db`. Must ship first; the mobile app needs its output. Timeline 1-2 weeks.
- **Track B — Mobile MVP** (`track/mobile-mvp`): the React Native (Expo) app. Timeline 8-12 weeks MVP.

## Day-1 Setup Commands

Run from an empty `LexiTap/` parent directory. This creates the main repo plus two sibling worktrees.

```bash
# 1. Initialize the main repository (this becomes the integration / main branch)
mkdir lexitap && cd lexitap
git init
git branch -M main
# create CLAUDE.md, .gitignore, docs/ etc., then:
git add . && git commit -m "chore(repo): initialize LexiTap repository"

# 2. Create the two long-lived track branches and their worktrees
git worktree add ../lexitap-content track/content-cli   # Track A
git worktree add ../lexitap-mobile  track/mobile-mvp     # Track B
```

Resulting layout:

```
LexiTap/
├── lexitap/            # main repo, branch: main (integration)
├── lexitap-content/    # worktree, branch: track/content-cli (Track A agent)
└── lexitap-mobile/     # worktree, branch: track/mobile-mvp  (Track B agent)
```

Useful worktree commands:

```bash
git worktree list                 # see all worktrees and their branches
git worktree remove ../lexitap-content   # tear down when a track is archived
```

`.gitignore` must exclude `.env`, `node_modules/`, `data/output/words.db` build artifacts where appropriate, and EAS local credentials. Secrets are never committed (see [ENVIRONMENT_SETUP.md](./ENVIRONMENT_SETUP.md)).

## Branch Naming

Two kinds of branches:

- **Track branches (long-lived):** `track/content-cli`, `track/mobile-mvp`. Each track's feature work branches off its track branch.
- **Feature/fix branches (short-lived):** `<type>/<short-slug>`, matching the commit types.
  - `feat/drag-drop-widget`
  - `fix/streak-timezone-boundary`
  - `chore/eas-build-config`

A short-lived branch is cut from its track branch, worked, and merged back via PR. It does not live long enough to drift.

## Commit Style

Conventional-commits format, per the operating-layer doc:

```
<type>(<scope>): <subject>
```

- **Types:** `feat`, `fix`, `chore`, `refactor`, `docs`, `test`, `ui`.
- **Scope:** the feature area (`quiz`, `srs`, `cli`, `sync`, `iap`, `db`).
- **Subject:** imperative, lower-case, no trailing period.

Examples:

```
feat(quiz): add drag-drop assessment widget
fix(srs): anchor streak boundary to user timezone
chore(cli): add validate gate for orphan words
test(srs): replay 30-day fixed-interval schedule
```

The commit body, when present, explains *why*. Append `Co-Authored-By` only when the founder requests it.

## Pull Request Conventions

- **Every PR targets its own track branch**, not `main` directly, during track development.
- **PR description must reference the `plan_id`** from the `docs/plans/NNN_*.yaml` that authorized the work. A PR without a plan reference has skipped the Planning Gate.
- The PR description states: what changed, which layers, which reviewer personas were invoked (see the Adversarial Review Protocol in [AGENTS_CLAUDE.md](./AGENTS_CLAUDE.md)), and the test evidence (`npm run check` green).
- CI must pass: ESLint + `tsc --noEmit` on every PR (see [CI_CD_PIPELINE.md](./CI_CD_PIPELINE.md)). The "Ship and Watch" loop monitors the PR and auto-fixes CI failures.

## Merge Strategy

- **Squash-merge** short-lived feature/fix branches into their track branch. One feature equals one clean commit on the track branch; the messy intermediate history stays out of the permanent log.
- **Track-to-main integration** uses a regular merge (no squash) so the integration history shows when each track landed.

## How Track A and Track B Integrate

The tracks are decoupled by a single artifact: `words.db`.

1. **Track A produces it.** The content CLI runs `npm run build:db` to generate `data/output/words.db` (plus `assets/`). See [../06-content-data/CONTENT_PIPELINE_ARCHITECTURE.md](../06-content-data/CONTENT_PIPELINE_ARCHITECTURE.md).
2. **Hand-off across tracks.** The generated `words.db` is copied into the mobile app's bundle at `assets/words.db` (and `assets/vocab/` for audio/images). This is the only coupling point — Track B treats the DB as a read-only input it did not author.
3. **Two-DB runtime split.** On device, the bundled `words.db` (read-only words/tiers) is kept separate from the user's `user.db` (read-write progress/entitlements); they are joined at query time via `ATTACH DATABASE`. This means a content drop can replace `words.db` without touching user progress.
4. **Integration to `main`.** Track A merges to `main` first (it must ship first). Track B merges once the MVP milestone is reached. After launch, content drops flow Track A -> rebuild `words.db` -> Track B bundle update -> app release, with Premium Pass auto-unlocking new tiers.

## Open Questions

- `unresolved` — Whether `words.db` is committed to the repo (binary in git) or produced in CI as an artifact. Leaning CI-produced to keep the repo lean, but committed simplifies Track B bundle step. Resolve before the first content build.
