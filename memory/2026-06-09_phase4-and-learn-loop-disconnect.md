## Session: Rich Word-Detail Phase 4 + learn-loop disconnect (P0) found (2026-06-09)

**What happened:** Shipped Phase 4 of the Rich Word-Detail Plan (multi-sense UI in `LearnCardScreen`, commit `b42504a`). Then, scoping "what next," discovered a **P0 launch blocker**: the core learn loop is disconnected — SRS is never seeded. Wrote [`plans/LEARN_LOOP_WIRING_PLAN.md`](../plans/LEARN_LOOP_WIRING_PLAN.md) + synced both roadmaps (commit `ca6a0e1`). No fix yet — Ryan wanted plans, not execution ("you worked enough").

**Decisions:**
- Rich Word-Detail mobile stack is DONE (Phases 1/3/4 ✅). Phase 2 paid enrichment + Phase 1 content-tool remainder are **Ryan's tasks**, not the agent's.
- Roadmap phase structure (Phases 0–6) left intact — it explicitly defers to `plans/RELEASE_PLAN.md` as task-level truth. Added an **"Active Front" dated block** on top of both roadmaps instead of rewriting phases (honest "where we actually are" layer that doesn't fight the hierarchy).
- Learn-loop fix uses `router.replace` (not `push`) for card→quick-check so Back can't re-enter seen cards. Flagged as the one review judgment call.

**Bugs / gotchas:**
- **🔴 P0 — learn loop open-circuit, SRS never seeds.** `LearnQuickCheckScreen` is the *only* place the learn flow writes SRS rows (`services.answerQuestion.execute`). It's fully built with its own route `/learn-check`. But `LearnCardScreen.handleGotIt` still has a stub (`// Stub until Screen 6 is built: call onComplete directly`) and `app/learn.tsx` wires `onComplete → router.replace('/')` (straight to Home). **`/learn-check` has ZERO referrers** (grep-verified) → unreachable → new words never enter spaced repetition. Root cause: `onComplete: () => void` carries no batch payload, so the route can't forward the just-learned words even if it wanted to. Fix = thread batch out via `onComplete(batch: Word[])` + push `/learn-check` with `JSON.stringify(batch)`. Presentation/routing only, **no `domain/srs` diff** — the SRS code works, it was just never reached.
- "Screen 6 is built" — don't trust stub comments. A `// Stub until X is built` comment outlived the thing it waited on; X existed and tested. Grep for referrers before believing a screen is wired.

**Patterns / lessons:**
- **Phase 4 render layer:** senses fetched lazily per *displayed* card via the Phase-3 `getWordDetail(id)` fail-soft seam, cached in `Record<wordId, WordSense[]>` (batch/quiz reads stay flat — senses only for the card on screen). >1 sense → numbered `MEANING n · POS` blocks; single/undefined/[] → flat fallback. a11y label switches felt↔flat. NO TextInput held.
- **No RTL render harness exists** — repo has no `react-native-testing-library`; all screen tests are logic-only. Presentation changes are verified by typecheck + lint + the underlying data-layer unit tests, NOT a render test. Adding RTL is a separate infra decision, not in-scope for a screen change.
- Per-sense **image is data-only** — no dynamic-`require` vocab-image map yet (flat layout also omits `word.imagePath`; Figma shows a placeholder). Deferred.
- **Dependabot reality check:** 16 alerts (1 critical) on `main` are mostly transitive **dev-only** — the "critical" vitest isn't even a direct dependency (grep: no matches in any `package.json`) and never ships; runtime ones (tar/xmldom/postcss/uuid) come from Expo/build tooling and likely need an SDK bump. Severity labels overstate real risk for an offline RN app. Triage, don't panic.

**Deferred:**
- **Execute** [`plans/LEARN_LOOP_WIRING_PLAN.md`](../plans/LEARN_LOOP_WIRING_PLAN.md) — the P0 fix (2 files: `LearnCardScreen.tsx` + `app/learn.tsx`). Next code task.
- Phase 2 paid enrichment ("real seedings", top-N by freq, top-tier model) + Phase 1 content-tool remainder (Ryan's).
- Dependabot triage session; RTL render-guard (issue #10, post-launch); vocab-image asset map → per-sense images.
