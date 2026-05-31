# C6–C8 Content Pipeline DONE + Concurrent-Session Hazard (2026-05-31)

## C6/C7/C8 — shipped, verified, pushed (in `origin/master`)

Implemented in `content-tool/`, adversarial-verified (verdict: **ship**), 94 tests green (up from 71):

- **C6 · Synonyms** — new env-gated `providers/openaiSynonymProvider.ts` (`OpenAiSynonymProvider`, PORT-conforming). Fail-closed: Noop/zero-network without `OPENAI_API_KEY`; network is an injected `FetchSynonyms` seam so tests exercise the populated path offline. `selectProviders('openai')` swaps it in. Synonyms/antonyms + validator rule #6 (JSON-array) already existed — C6 only added the real provider. **No paid call wired**; running it at 3k scale still costs OpenAI $ + key.
- **C7 · `validate --strict`** — dup-leak #10 (`exampleLeaksAnswer`, whole-token regex, ignores `_` blank), provenance/license #11 (new `words.definition_license` col; allow-set `{original, ai-original, cc0, cc-by-sa}`; default `original` at import), cross-row dup-definition #12. Orphan checks were ALREADY always-on (structural invariants, stricter-than-strict). Export aborts under `--strict` (fail-closed). Proven against real working.db: 2,884 provenance errors → mobile words.db md5 UNCHANGED.
- **C8 · `release` command** (+ npm script) — `import → enrich → validate --strict → export(+version bump) → copy to mobile/assets/vocab/words.db`. Strict validate runs FIRST (throws before export); copy is LAST + only on clean export. Unit-tested fail-closed: failing validate → `copyCalls===0`. Flags `--bump`, `--no-copy`, `--provider`. Enrich offline-Noop unless `--provider openai` + key.

Known non-blocking: release/export strict gate uses `assetExists=()=>true` (unsynthesized offline audio/image paths are copyAssets' warn-and-skip concern, not a content-correctness gate). Matches export semantics.

**Remaining long pole is NOT code** — it's the paid AI-enrich RUN over ~3k words (OpenAI $30–90 + key) + sampled QA. Code path is ready.

## ⚠️ HAZARD: multiple sessions committing to master concurrently

During THIS single session, master moved `e60f9bf → 7d8458f → 8df6cfd → ddd02a3 → 821cbba` — **multiple parallel Claude sessions were committing AND pushing simultaneously.** Consequences observed:
- My C6–C8 code got swept into a **parallel agent's `git commit -a`** under a misleading message (`6c942d1 "test(analytics): streamline event schema"`). No work lost (verified in `origin/master`), but commit history is now entangled/mislabeled.
- `git log @{u}..HEAD` flip-flopped between 0 and 2 unpushed within seconds as other sessions pushed.

**Lesson / rule reinforcement:** the CLAUDE.md "one session = one task, /clear between" rule is being VIOLATED by running concurrent sessions on the same working tree. A parallel agent's blanket `git add -A && commit` will hoover up another agent's uncommitted work. If running multiple agents, isolate them in **git worktrees** (or never use `git add -A`/`commit -a` — stage explicit paths only). Always re-verify `HEAD`/`origin` state live before trusting any earlier git read — the tree moves under you.

## Handoff accuracy note
Two consecutive handoffs now wrong on their "urgent" point. This session's "2 unpushed commits e60f9bf/ed7d4a7" was FALSE at session start (already pushed). Verify `git log @{u}..HEAD` yourself; do not trust handoff git claims.
