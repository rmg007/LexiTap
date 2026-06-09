## Session: Figma Hi-Fi Redesign + Tooling (2026-06-09)

**What happened:** Redesigned screens 12/14/15 in Figma to match the new word-learning model. Renamed default branch master → main. Created `/snip` slash command.

**Decisions:**

- **Word-learning paradigm changed** (screens 12, 14, 15): No mandatory image per word. Each word gets multiple meaning blocks (one per sense). Per-meaning: full explanation, 2+ examples, "when to use" context, register note, collocations. Quiz tests context understanding via real-world scenario text, NOT synonym recognition. Feedback is teaching-first — "why this word fits" before any XP/streak celebration.
- **Default branch renamed `master` → `main`**: GitHub default branch updated, protection removed from master, master deleted both remote and local. All docs updated.
- **`/snip` slash command**: Created `.claude/commands/snip.md`. Run at end of every session before `/clear` to extract decisions/bugs/patterns into memory. Hot-loads on next session start — not available in the session it was created.

**Figma state (file `Jx0TLmVpgmsjtMA3uB6uS4`, page `✨ Hi-Fi`):**

Three redesigned frames exist at y=4200:
- `12 · Learn Card (Redesign)` — node `136:2` — x=1385, 375×1340
- `14 · Quiz (Redesign)` — node `137:2` — x=1820, 375×900
- `15 · Feedback Correct (Redesign)` — node `138:2` — x=2255, 375×1040

Stacked duplicates exist beneath each (older iterations: `131:2`, `129:2`, `132:2`). Test boxes at x=5000 (`123:2` red, `140:2` green). All need manual deletion in Figma UI — plugin cannot delete nodes created in the current session (stale snapshot).

Original wrong screens remain at y=2180 for comparison (`63:2667`, `63:2813`, `63:2906`).

**Bugs / gotchas:**

- **Figma `use_figma` stale snapshot**: Plugin loads a frozen 15-frame snapshot at session start. `figma.getNodeById()` and `pg.children` ONLY see pre-session nodes. New-session nodes return 'not-found'. `get_screenshot` with specific nodeId reads the LIVE doc — always use this for creation verification.
- **Delete + recreate in same code block**: Deletion succeeds but recreation times out. Never combine in one call.
- **Opacity on fills**: `{type:'SOLID', color:TEAL, opacity:0.08}` — opacity at fill level, NOT inside the color object.
- **`textAutoResize='HEIGHT'` must precede `resize()`** for text nodes that wrap.
- **New slash commands**: Not hot-reloaded mid-session. Take effect on next `claude` session start.

**Deferred:**

- Manual cleanup of duplicate/test Figma frames (needs Figma UI, not plugin).
- Review and polish of all other Hi-Fi screens beyond 12/14/15 (a dedicated prompt was written for this — see next session).
- Uncommitted restore-staging-fix work still in working tree (`container.ts`, `BackupPort.ts`, etc.) — needs clean sequenced commit separate from DIAG-A hunks.
