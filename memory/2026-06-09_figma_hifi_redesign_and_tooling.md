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

**Polish-pass additions (later same session):**

Polished column at x=7200+ on page `✨ Hi-Fi`:
- `14 · CEFR Level Map (Polished)` — `171:2` — home for the full A1–C2 list (6 level cards, A1→C2 difficulty ladder, B1 = frontier "You're here", overall progress).
- `03 · List Selection (Polished)` — `162:2` — **now the 03 onboarding step, replacing the cut Goal screen.** Top 3,000 (RECOMMENDED) / Top 9,000 / By level (A1–C2). Correct exam-pack copy (TOEFL/IELTS/SAT, not Cambridge).
- Exam-pack **standalone study-mode** course homes: `PU-1 IELTS` `179:2` (teal/navy), `PU-2 TOEFL` `180:2` (indigo), `PU-3 SAT` `181:2` (purple). Each = self-contained course: progress %/streak, done/active/locked units, "what's inside" strip (8 units · 6 mock tests · audio · review). **No bottom nav inside a pack** — that's the deliberate signal it's a contained world separate from daily vocab.
- Annotations: onboarding flow revised (Goal CUT, List Selection takes 03) + Exam-Packs model (`183:2`).

**Decisions locked this pass:**
- **Goal screen CUT** (`85:2`). Its only job — "personalises your word list" — is done directly by List Selection, which also seeds the diagnostic band + surfaces the 3 exam packs + is switchable in Settings. One fewer screen, zero lost function.
- **Exam packs = standalone study modes, NOT word lists.** A pack is a course (own units/quizzes/mock-tests/review/progress). Words are many-to-many: a word can be in a pack AND in the 3k/9k/CEFR lists, tracked independently. One-time purchase ($9.99/pack, $29.99 All-Exams), no subscription.

**Consistency fixes (later same pass) — DONE:**
- **IELTS store page reframed** → new `PU-1 · IELTS Store Page — Course Pitch (Polished)` `184:2` (x=7200, y=9040). Stat tiles now "8 Units / 6 Mock tests / Audio" (was "800 Words / 6 Topics / Audio"); features sell the course (guided units, mock tests, review queue, own progress) not a word list. Buy CTA + "$9.99 one-time, no subscription" kept. **Original `95:3` left intact** (not overwritten).
- **Home `156:2` reframed** — keep-learning card "Everyday English / Frequency Band 2 · 1,000–2,000 / 62%" → "Top 3,000 / 1,240 / 3,000 words learned / 41%". List model now on the most-seen screen.
- **Settings `170:2` nav fixed** — removed the center teal FAB "blob" (was a 5-slot nav with a protruding circle); now a clean 4-item flat nav matching Home. Renamed label **"Stats" → "Progress"** for consistency. (Nav is auto-layout HORIZONTAL/SPACE_BETWEEN; removing the `Margin` child `170:111` that held the FAB auto-redistributed the 4 tabs.)

**C-1 / C-2 / C-3 rebuild around 3k/9k/A1–C2 + packs — DONE:**
Polished column, x=7200/7620/8040, y=10200, 390×880 each. Originals (`101:3`/`121:50`/`101:34`) left intact.
- **`197:2` C-1 · Library** — hub. "YOUR LISTS" = 3 free-list cards (Top 3,000 RECOMMENDED · Top 9,000 · All levels A1–C2 by CEFR, B1 frontier), each w/ progress bar. "EXAM PREP · STANDALONE COURSES" = IELTS (In-progress chip) / TOEFL ($9.99) / SAT ($9.99) rows + All-Exams Bundle strip ($29.99). Bottom nav, Learn active. Replaces old Foundation/Academic word-list split.
- **C-2 · Word List (Top 3,000)** — list opened as flat ranked set (NOT units). Header "Top 3,000" + 41% bar. Status filter tabs All/Learned/Learning/New. Word rows: word, POS·CEFR, status chip (✓ Learned green / Learning teal / New grey). Sample word **vibrant** (adj·B2·Learning) included.
- **C-3 · Search** — search all 9k. Chips = list+level (All/Top 3k/Top 9k/A1–A2/B1–B2/C1–C2). Each result row shows **membership badges** (3k/9k/IELTS/TOEFL/SAT) → many-to-many model made visible.
- **Annotation `C-1/2/3 Rebuild — Browse Model`** at x=8470, y=10200 documents the model + a **⚠ PRICING FLAG**.
- ✅ **PRICING — RESOLVED:** All-Exams bundle dropped **$29.99 → $24.99** (3×$9.99 = $29.97 → now a real $4.98 saving). C-1 `197:2` bundle price node `198:28` = `$24.99`, subtitle `198:26` = "Save $4.98 vs buying all three". Revisit if a 4th pack is added. Ryan can override the number before store copy ships — flagged, not silently chosen.

**05 / 06 polished — DONE (2026-06-09, continued session):**
- **`206:2` 05 · Diagnostic — Band-Walk (Polished)** — x=7200, y=8160, 390×844. Replaces the off-model **synonym-MCQ** Hi-Fi diagnostic (`63:1754`, "Choose the synonym for Vibrant") — synonym quizzes contradict the new context-first model AND the real DIAG-A is a Yes/No band-walk. New screen: "Do you know this word?" + Yes-I-know-it / Not-sure / No-new-to-me, progress 7/12, word **vibrant** (Adjective), subtitle ties to **Top 9,000** ("Finding your place in the Top 9,000"), footer explains the up/down band-walk. Original `63:1754` left intact.
- **`207:2` 06 · Knowledge Map (Polished)** — x=7620, y=8160, 390×844. "~3,200" reveal + Known/Learning/New segmented bar, plus the **deferred list-tie fix**: a "What that means for your lists" card → "You already know most of the Top 3,000 — and have a head start on the Top 9,000. We'll drop you in right at your edge." American spelling **"personalized"** (old Hi-Fi `64:3410` had British "personalised"). CTA "Start learning". Original `64:3410` left intact.

**Deferred (polish pass):**
- Manual cleanup of duplicate/test Figma frames (needs Figma UI, not plugin).
- Review and polish of all other Hi-Fi screens beyond 12/14/15 (a dedicated prompt was written for this — see next session).
- Uncommitted restore-staging-fix work still in working tree (`container.ts`, `BackupPort.ts`, etc.) — needs clean sequenced commit separate from DIAG-A hunks.
