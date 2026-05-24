---
title: Environment Setup Guide
category: engineering-process
status: active
updated: 2026-05-24
priority: P1
tags: [environment-setup, day-1, node, expo, eas, worktrees, supabase, dotenv, simulator]
---

# Environment Setup Guide

Step-by-step Day-1 setup to get both tracks of LexiTap running on a fresh machine: tooling, repo and worktree init, environment variables, the Supabase project, running the content CLI, and running the app on a simulator or device. This is the concrete companion to the Day-1 infrastructure checklist in [../../notion-docs/IMPLEMENTATION_ROADMAP.md](../../notion-docs/IMPLEMENTATION_ROADMAP.md). The two-track worktree model it sets up is detailed in [GIT_WORKFLOW.md](./GIT_WORKFLOW.md).

## Table of Contents

- [1. Install Tooling](#1-install-tooling)
- [2. Initialize Repo and Worktrees](#2-initialize-repo-and-worktrees)
- [3. Environment Variables](#3-environment-variables)
- [4. Supabase Project Setup](#4-supabase-project-setup)
- [5. Run the Content CLI (Track A)](#5-run-the-content-cli-track-a)
- [6. Run the App (Track B)](#6-run-the-app-track-b)
- [7. Verify the Setup](#7-verify-the-setup)

## 1. Install Tooling

| Tool | Version | Install |
|------|---------|---------|
| Node.js | 20.x LTS | `nvm install 20 && nvm use 20` |
| npm | bundled with Node | (comes with Node) |
| Expo CLI | latest | use `npx expo` (no global install needed) |
| EAS CLI | latest | `npm install -g eas-cli` |
| Watchman (macOS) | latest | `brew install watchman` |
| Xcode (iOS) | latest from App Store | provides the iOS Simulator |
| Android Studio | latest | provides the Android Emulator + SDK |

Verify:

```bash
node -v        # v20.x
npm -v
eas --version
npx expo --version
```

Log in to Expo/EAS (free account):

```bash
eas login
```

## 2. Initialize Repo and Worktrees

From an empty `LexiTap/` parent directory:

```bash
mkdir lexitap && cd lexitap
git init
git branch -M main

# scaffold the mobile app in the main repo (or in the mobile worktree — see below)
npx create-expo-app@latest . --template

# commit the baseline
git add . && git commit -m "chore(repo): initialize LexiTap repository"

# create the two track worktrees
git worktree add ../lexitap-content track/content-cli   # Track A: content CLI
git worktree add ../lexitap-mobile  track/mobile-mvp     # Track B: mobile app
```

Layout after this step:

```
LexiTap/
├── lexitap/            # main (integration)
├── lexitap-content/    # track/content-cli
└── lexitap-mobile/     # track/mobile-mvp
```

Install dependencies in each worktree you will work in:

```bash
cd ../lexitap-mobile && npm install
cd ../lexitap-content && npm install
```

## 3. Environment Variables

Secrets live in a git-ignored `.env` in development and in EAS secrets in production — never hardcoded (see [CI_CD_PIPELINE.md](./CI_CD_PIPELINE.md)). Confirm `.env` is in `.gitignore` before adding anything to it.

`.env.example` (committed template — copy to `.env` and fill in):

```bash
# Supabase (cloud sync + auth) — Expo exposes EXPO_PUBLIC_* to the client bundle
EXPO_PUBLIC_SUPABASE_URL=https://YOUR-PROJECT.supabase.co
EXPO_PUBLIC_SUPABASE_ANON_KEY=your-anon-key

# Content CLI enrichment providers (Track A only, never bundled in the app)
OPENAI_API_KEY=
ELEVENLABS_API_KEY=
```

```bash
cp .env.example .env   # then edit .env with real values
```

The Supabase URL and anon key are safe to ship in the client (the anon key is public by design, protected by row-level security). The OpenAI/ElevenLabs keys are CLI-only and must never reach the app bundle.

## 4. Supabase Project Setup

Supabase provides auth and progress cloud sync (free to roughly 50K users). One-time setup:

1. Create a project at the Supabase dashboard. Note the project URL and `anon` public key into `.env`.
2. Enable **Email/Password** and **Google** auth providers (Auth -> Providers).
3. Create the sync tables for user progress backup (mirrors the device's `user.db`: progress, entitlements). Apply via the SQL editor or a migration.
4. Enable **Row Level Security** on every user-data table so a user can read/write only their own rows. This is mandatory — the anon key is public.
5. Keep the service-role key server-side only; it never goes in `.env` or the app.

Sync is non-blocking and offline-tolerant: the device's SQLite is the source of truth, and a sync failure is a silent no-op (see the offline-first rules in [../../notion-docs/AGENTS_MOBILE_CONVENTIONS.md](../../notion-docs/AGENTS_MOBILE_CONVENTIONS.md)).

## 5. Run the Content CLI (Track A)

The CLI generates the bundled `words.db`. Full command reference is in [../../notion-docs/CONTENT_PIPELINE_ARCHITECTURE.md](../../notion-docs/CONTENT_PIPELINE_ARCHITECTURE.md).

```bash
cd ../lexitap-content

# import a sourced word list
npx lexitap-tool import --source data/input/foundation.csv --tier foundation

# validate (gate: no orphan words, required fields, blanks in examples)
npx lexitap-tool validate

# export to SQLite
npx lexitap-tool export --output data/output/words.db

# or the one-command build
npm run build:db
```

Output lands in `data/output/words.db` (+ `data/output/assets/`). Hand it to Track B per the integration steps in [GIT_WORKFLOW.md](./GIT_WORKFLOW.md).

## 6. Run the App (Track B)

```bash
cd ../lexitap-mobile

# copy the latest content DB into the app bundle (hand-off from Track A)
cp ../lexitap-content/data/output/words.db ./assets/words.db
cp -R ../lexitap-content/data/output/assets/. ./assets/vocab/

# start the dev server
npx expo start
```

From the Expo dev server:

- Press `i` to open the **iOS Simulator** (requires Xcode).
- Press `a` to open the **Android Emulator** (requires Android Studio + a running AVD).
- Scan the QR code with the **Expo Go** app (or a dev build) to run on a physical device.

Critical features must be checked on **both** iOS Simulator and Android Emulator before a UI task is marked complete (per the per-task checklist in [AGENTS_CLAUDE.md](./AGENTS_CLAUDE.md)).

For a native dev client (needed once libraries with native code like IAP are added):

```bash
eas build --profile preview --platform all   # cloud build
```

## 7. Verify the Setup

Run the combined gate in the mobile worktree — all three must exit 0:

```bash
cd ../lexitap-mobile
npm run check    # lint + typecheck + test
npx expo start   # dev server boots, app loads bundled words.db, Home screen renders
```

A green `npm run check` plus a booting app on at least one simulator confirms the environment is ready.

## Open Questions

- The exact Supabase sync table schema is not yet pinned (no code). Define it alongside the device `user.db` schema in `DATABASE_SCHEMA.md` when Track B sync lands.
- Whether the Track A -> Track B `words.db` copy is a manual `cp`, an npm script, or a CI artifact download is tied to the open question in [GIT_WORKFLOW.md](./GIT_WORKFLOW.md).
