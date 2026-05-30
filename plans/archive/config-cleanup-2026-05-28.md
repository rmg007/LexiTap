# Config & Memory Cleanup Plan

Date: 2026-05-28
Scope: `CLAUDE.md`, `AGENTS.md`, `.claude/settings.local.json`, and memory files at
`/Users/ryan/.claude/projects/-Users-ryan-Desktop-LexiTap/memory/`.
Trigger: 2026-05 architecture review removed sync mirror / teacher referral /
receipt validation subsystems from the ERD. Config and memory layers did not
follow the schema change and are now drifted.

## Problem Statement

Three drift categories exist after the ERD pivot:

1. **Stale memory** that contradicts current reality (claims no code exists,
   teacher referrals are primary GTM, notion-docs/ is canonical).
2. **Stale rules** in CLAUDE.md / AGENTS.md that describe the old sync-mirror
   architecture ("Cloud is a mirror, never authority").
3. **Duplicated config** — CLAUDE.md and AGENTS.md are near-identical files.
   Drift is inevitable; one must become the source.

`next_prompt` at repo root is **NOT cruft** — it is a prepared design-system
scaffolding directive for a future session. Out of scope.

`.design-specs/` is referenced by `next_prompt` and is intentional. Out of scope.

## Goals

- Memory accurately describes current project state on 2026-05-28.
- CLAUDE.md / AGENTS.md describe the post-architecture-review architecture.
- One canonical file holds project rules; the other is a pointer.
- `.claude/settings.local.json` does not retain dead Notion MCP permissions.

## Non-Goals

- Updating `lexitap-docs/` content (separate, larger pass — see
  `project_architecture_review_2026_05.md` memory for the file list).
- Updating `mobile/src/infrastructure/` code (separate larger pass).
- Touching `next_prompt` or `.design-specs/`.

## Plan

### Step 1 — Rewrite `project_lexitap.md` memory

File: `/Users/ryan/.claude/projects/-Users-ryan-Desktop-LexiTap/memory/project_lexitap.md`

Current claims to remove:
- "Currently in Phase 0 — Validation (no code written yet as of 2026-05-23)" — false; mobile/src/ exists.
- "All project context lives in /Users/ryan/Desktop/LexiTap/notion-docs/" — false; that folder was deleted 2026-05-24.
- "Start every session by loading SESSION_STATE.md first" — file does not exist.
- "Teacher referral network is primary GTM" — feature was removed from the ERD on 2026-05-28.

New content shape:
- Phase: post-ERD-cleanup, schema MVP locked, mobile code partially built but not aligned to the new ERD.
- Canonical doc layer: `lexitap-docs/` (8 numbered categories). No notion-docs.
- Locked decisions to retain (still accurate):
  - ESL-only audience, no American-student blend.
  - No typing in quiz flows (tap/drag/match/classify only).
  - Tier model (Free + paid tiers + Premium Pass).
  - SRS forgiveness mechanics required before Phase 1 ships.
  - No AI chatbot at MVP.
  - Dark-mode-first, adult-professional aesthetic.
- Drop: "Cloud sync free for all users (Supabase)" — replace with "Cloud backup
  (encrypted user.db blob to Supabase Storage) free for all users."
- Drop GTM claim about teacher referrals as primary — leave GTM unstated rather
  than asserting a replacement we have not validated.

### Step 2 — Update `CLAUDE.md` / `AGENTS.md` content

Both files currently contain:
> "Two databases: words.db (read-only, bundled, built by Track A) + user.db
> (read-write, on device), joined via ATTACH. Cloud (Supabase) is a mirror,
> never authority."

Replace with:
> "Two databases: words.db (read-only, bundled, built by Track A) + user.db
> (read-write, on device), joined via ATTACH. Cloud (Supabase) holds auth +
> content-error reports + encrypted user.db blob backups. Device is always
> authoritative; cloud is never queried for live state."

Also clarify `event_log` rule:
> Current: "quiz_attempts and event_log are append-only — compensating inserts,
> never UPDATE/DELETE."
> Add: "event_log is scoped to offline pending-writes buffer (e.g.
> content_errors awaiting sync), not a general analytics sink."

Entitlement language: leave `application/` description as-is — "entitlement/paywall
logic here" still applies; RevenueCat SDK is invoked from application via
`infrastructure/iap/` per [[project-iap-decision]].

### Step 3 — Consolidate CLAUDE.md ↔ AGENTS.md

Make `AGENTS.md` the canonical source (cross-tool standard: Codex, Cursor,
Aider, others all read it). Replace `CLAUDE.md` body with a one-line pointer:

```
# CLAUDE.md
See [AGENTS.md](AGENTS.md) — single source of project rules for all coding agents.
```

Rationale: A symlink works on macOS but git-checks-out as a symlink which not
all tools follow; an explicit pointer file is more portable. The user switches
laptops frequently — symlinks risk breaking on a new clone.

Do this AFTER Step 2 so both files briefly agree, then CLAUDE.md collapses to
the pointer.

### Step 4 — Clean `.claude/settings.local.json`

Current contents:
```json
{
  "permissions": {
    "allow": [
      "mcp__6462d799-b3cb-45fa-b3b5-a0ac2c479db3__notion-search",
      "mcp__6462d799-b3cb-45fa-b3b5-a0ac2c479db3__notion-fetch"
    ]
  }
}
```

Both permissions are for a Notion workspace that was deleted on 2026-05-24.
Two options:

**Option A (minimal):** Remove the two dead permissions. File becomes
`{"permissions": {"allow": []}}`.

**Option B (broader):** Replace with a useful project-level allowlist via
`.claude/settings.json` (not `.local.json`) — common safe reads like
`Bash(npm run check:*)`, `Bash(git status)`, `Bash(git diff:*)`,
`Bash(rg:*)`. The user has indicated config must live in the repo (switches
laptops frequently); `.local.json` is typically gitignored, so `.json` is the
correct file.

Default to Option A for this pass. Option B can run as a separate
`/fewer-permission-prompts` exercise once the user has worked in the repo
through Claude Code for a few sessions and seen which permission prompts
recur.

### Step 5 — Verification

- Read all five memory files and grep for "notion-docs", "Phase 0", "teacher
  referral", "SESSION_STATE" — these strings should not appear as current truth.
- Confirm CLAUDE.md is a pointer to AGENTS.md.
- Confirm AGENTS.md has the updated cloud-as-backup wording and event_log scope
  clarification.
- Confirm `.claude/settings.local.json` no longer references the deleted Notion
  workspace.

## Risk

- **Low.** All changes are documentation / configuration. No code touched. No
  database touched. No git history rewritten.
- One risk worth naming: changing CLAUDE.md to a pointer file means any tool
  that reads CLAUDE.md but NOT AGENTS.md (rare) loses the rules. Claude Code
  reads CLAUDE.md natively, but it also follows the pointer when the pointer
  is a clean one-line reference. No known tool reads CLAUDE.md exclusively and
  refuses to follow links.

## Out-of-Scope Follow-ups (DO NOT do in this pass)

These exist and need their own plan/session:

1. Mobile code cleanup — entitlement queries, sync service, IAP stub still
   reference removed tables. See `project_architecture_review_2026_05.md`
   memory for file list.
2. `lexitap-docs/04-technical-architecture/DATABASE_SCHEMA.md` rewrite to match
   new ERD.
3. `lexitap-docs/03-ux-design/screens/TeacherCodeRedemption.md` likely deletes
   entirely; other screens (Paywall, Progress, Settings, USER_FLOWS) need
   sweeps.
4. `ROADMAP.md` and existing plans that reference teacher referrals.
5. `content-tool/` schema DDL needs `price_usd` removed.
