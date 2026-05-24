---
title: CI/CD Pipeline Spec
category: engineering-process
status: active
updated: 2026-05-24
priority: P1
tags: [ci-cd, github-actions, eas-build, eas-submit, ship-and-watch, free-tier, ios, android]
---

# CI/CD Pipeline Spec

The continuous-integration and delivery pipeline for LexiTap. Two pieces: a lightweight GitHub Actions check that gates every PR (ESLint + TypeScript), and the EAS Build/Submit pipeline that produces and ships the iOS and Android binaries. On top of both sits the autonomous "Ship and Watch" loop. Everything here is shaped by the Year-1 budget of roughly $144 — free tiers only where possible. Day-1 setup context is in [../02-product-definition/ROADMAP.md](../02-product-definition/ROADMAP.md).

## Table of Contents

- [PR Check: ESLint + tsc](#pr-check-eslint--tsc)
- [Ship and Watch Loop](#ship-and-watch-loop)
- [EAS Build and Submit](#eas-build-and-submit)
- [Free-Tier Constraints](#free-tier-constraints)
- [Secrets](#secrets)
- [Open Questions](#open-questions)

## PR Check: ESLint + tsc

Every pull request runs lint and typecheck. This is the same gate the agent runs locally (`npm run check`), enforced in CI so nothing merges red. Tests can be added to this job once the test suite exists; the locked Day-1 requirement is ESLint + TypeScript on every PR.

`.github/workflows/ci.yml`:

```yaml
name: CI

on:
  pull_request:
    branches: [main, "track/**"]

jobs:
  check:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - uses: actions/setup-node@v4
        with:
          node-version: 20
          cache: npm

      - name: Install dependencies
        run: npm ci

      - name: Lint
        run: npm run lint

      - name: Typecheck
        run: npm run typecheck

      - name: Test
        run: npm test --if-present
```

Notes:

- Triggers on PRs into `main` and any `track/**` branch, matching the two-track worktree model in [GIT_WORKFLOW.md](./GIT_WORKFLOW.md).
- `ubuntu-latest` runners are free for public repos and the cheapest for private ones — never use macOS runners for the lint/typecheck job (10x minute cost). macOS is only needed for native iOS builds, which run on EAS, not here.
- `npm ci` with `cache: npm` keeps installs fast and deterministic.

## Ship and Watch Loop

"Ship and Watch" is the autonomous PR monitor-and-fix loop: after the agent opens a PR, it does not wait idle for a human. It watches CI status and, on failure, reads the logs, fixes the cause, and pushes again — closing the loop without the founder typing a command. This satisfies the governing autonomy constraint (see [AGENTS_CLAUDE.md](./AGENTS_CLAUDE.md)).

Loop shape:

1. Agent opens a PR referencing its `plan_id`.
2. CI runs the `check` job above.
3. Agent polls/receives the CI result (via the Claude Code GitHub Actions integration).
4. **Green:** proceed to the Adversarial Review Gate and merge per [GIT_WORKFLOW.md](./GIT_WORKFLOW.md).
5. **Red:** agent pulls the failing job logs, diagnoses the lint/type/test failure, fixes it, pushes a new commit to the same branch. Return to step 2.
6. Loop is bounded — after a small number of failed fix attempts on the same root cause, the agent stops and surfaces the issue rather than thrashing.

The loop never bypasses the gate (no `--no-verify`, no disabling checks). A red CI is fixed, not skipped.

## EAS Build and Submit

Native binaries are produced by EAS Build (cloud) and shipped by EAS Submit, for both iOS and Android. These run on demand at milestones (TestFlight/Internal Testing in Phase 2, store submission in Phase 5), not on every PR — EAS build minutes are limited on the free tier.

`eas.json` (target shape):

```json
{
  "cli": { "version": ">= 5.0.0" },
  "build": {
    "preview": {
      "distribution": "internal",
      "ios": { "simulator": false },
      "android": { "buildType": "apk" }
    },
    "production": {
      "autoIncrement": true,
      "ios": { "buildConfiguration": "Release" },
      "android": { "buildType": "app-bundle" }
    }
  },
  "submit": {
    "production": {}
  }
}
```

Commands:

```bash
# Internal test builds (Phase 2: TestFlight + Play Internal Testing)
eas build --profile preview --platform all

# Production builds (Phase 5: store submission)
eas build --profile production --platform all

# Submit the built binaries to the stores
eas submit --profile production --platform ios
eas submit --profile production --platform android
```

A GitHub Actions workflow can trigger `eas build` on a tag (e.g. `v*`) so releases are cut from a pushed tag rather than a manual local command, keeping with the autonomy constraint:

```yaml
name: Release Build
on:
  push:
    tags: ["v*"]
jobs:
  build:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with: { node-version: 20, cache: npm }
      - run: npm ci
      - uses: expo/expo-github-action@v8
        with:
          eas-version: latest
          token: ${{ secrets.EXPO_TOKEN }}
      - run: eas build --profile production --platform all --non-interactive --no-wait
```

## Free-Tier Constraints

Year-1 budget is roughly $144. The pipeline is designed to stay near-free:

- **GitHub Actions:** free for public repos; the free private-repo minute allotment is ample for lint+typecheck on `ubuntu-latest`. Keep macOS runners out of routine CI.
- **EAS Build:** the free plan grants a limited number of cloud builds per month. Reserve them for milestones — do not build on every PR. Local `eas build --local` is a fallback if free builds run out.
- **Store fees (unavoidable, planned):** Apple Developer Program $99/year, Google Play one-time $25. These are the bulk of the budget.
- **Supabase:** free tier covers auth + sync to roughly 50K users; cost is $0/month until then (see the cloud-sync rationale in [../02-product-definition/ROADMAP.md](../02-product-definition/ROADMAP.md)).

## Secrets

- **Dev:** `.env` (git-ignored), never committed.
- **CI/Production:** GitHub Actions secrets (`EXPO_TOKEN`) and EAS secrets for anything the build needs (`eas secret:create`). Never hardcode credentials in `eas.json`, workflow YAML, or source.

```bash
eas secret:create --name SUPABASE_URL --value "https://xxxx.supabase.co"
eas secret:create --name SUPABASE_ANON_KEY --value "..."
```

## Open Questions

- Whether `words.db` is built in CI and attached as an artifact or committed to the repo affects whether the Track A build needs its own CI job. Tracked as an open question in [GIT_WORKFLOW.md](./GIT_WORKFLOW.md); resolve before the first content build.
- Adding the Jest suite to the required PR check is gated on the suite existing; flip `npm test --if-present` to a hard `npm test` once Track B has tests.
