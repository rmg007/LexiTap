# Design Level-Up — full execution (2026-07-06)

**Commits:** `f72d879`…`4b79aa1` on `main` (18 commits, each independently pushed after `npm run check` green). Plan: [`plans/DESIGN_LEVELUP_PLAN.md`](../plans/DESIGN_LEVELUP_PLAN.md) (Tiers 0–5) + [`plans/UI_UX_FIXES_PLAN.md`](../plans/UI_UX_FIXES_PLAN.md) (24 tactical phases, absorbed where overlapping). Triggered by a standing `/goal` ("finish UI/UX improvement once and for all") — executed to completion in one continuous session, no interruption.

**68 suites / 614 tests green** at the end (started at 570/62). Every phase landed as its own commit with its own tests; no phase skipped.

## What shipped

**Tier 1 — Foundation** (7 phases): fonts finally loaded (P0 — `useFonts` + `expo-splash-screen`, every screen had silently been rendering in the system font since launch, no test could catch it); `usePressScale` hook extracted from Button; `Card` gained `interactive`/`onPress`; `ProgressBar` animated + `tone` prop; `DailyCapMeter` + `KnowledgeMapBar` (new components, backed by a new pure `knowledgeMapSegments()` in `domain/gamification/mastery.ts`); `Screen` gained a `footer` slot; `ListRow`/`EmptyState`/`SectionHeader` (new shared primitives).

**Tier 2 — Home + Progress realigned to Figma** (`300:2`/`360:2`): fixed the real dual-primary-CTA bug (Resume + Start review both `variant="primary"` simultaneously); Progress rebuilt around `KnowledgeMapBar` as the hero, stats as `ListRow`s, first-run encouragement card, tappable Foundation Pack.

**Tier 3 — LearnCard + session closure**: two-tier header, sunken-well bolded examples, cross-fade word transitions (replaced a numeric ref-remount hack), forward/back word nav (new, tactical Phase 7), "Got it" → "Next", a new learn-flow recap (`SessionCompleteScreen` gained a `variant="learn"` instead of a separate component — reused the Phase-3.3 earned-moment polish for free), SessionComplete wrapped in one raised Card with a synced check-icon spring.

**Tier 4 — Voice + hygiene**: ExitSessionSheet reframed as a decision ("Take a break?"/"Keep studying"/"Pause for now") + tap-outside-to-dismiss (previously only 2 buttons could dismiss it despite the component's own doc comment claiming otherwise); Settings rows migrated onto shared `ListRow`/`SectionHeader` (local duplicates deleted), Delete Account moved out of Legal, analytics double-negative fixed (**presentation-only** — `infrastructure/analytics/` untouched, confirmed no High-Risk Path crossed); SavedWords empty state, Home/Progress first-run endowed copy (`estimateKnownCount`, same helper the onboarding reveal already used); unified empty/done copy voice — found and fixed a **real silent copy-bank fork**: `LearnQuickCheckScreen` had hand-duplicated `FeedbackLayer`'s `AFFIRM_BANK`/`CORRECTION_BANK` and drifted on dash punctuation, unnoticed until this audit.

**Tier 5 + coverage gaps**: discovered `app/onboarding/knowledge-map-reveal.tsx` already existed (predating this session, hand-rolling its own bar+legend) — refactored onto the new shared `KnowledgeMapBar` instead of re-deriving from Figma. Paywall audit found the SAME dual-primary bug as Home but worse — 3 simultaneous paid tiers each hardcoded `variant="primary"` — fixed (only the highlighted/Bundle pack keeps the primary gradient).

## Key decisions made without stopping to ask

- **Figma MCP was unauthenticated all session** (non-interactive session, can't OAuth). Proceeded on the plan's own already-recorded ground truth (Home/Progress frames were read live in a prior session) rather than blocking; for the two items that explicitly needed a fresh Figma read (Tier 5 onboarding reveal, Quiz/Paywall coverage gaps), did code-level audits + reused already-shipped/verified components instead of inventing new visual design blind. Flagged in each relevant commit message as a follow-up once MCP access returns.
- **SessionCompleteScreen got a `variant` prop, not a separate `LearnSessionCompleteScreen`** — the tactical plan's own default was "separate screen," but the richer Level-up plan explicitly framed the learn recap as "optional variant: 'learn'" on the same component, and building a duplicate screen would have meant duplicating the Phase 3.3 earned-moment Card+spring polish twice. Went with the richer plan.
- **Maestro E2E (`learn-loop.yaml`) was updated in lockstep** with the "Got it"→"Next" rename — switched from a text selector to `testID="learn-card-next"` because the new header nav also has a "Next word" chevron whose accessibility label would ambiguously substring-match a plain "Next" text selector. The onboarding reveal's OWN "Start learning" button (a different screen, also Maestro-selected by text) was deliberately left untouched.

## Gotchas hit this session (for the next agent)

- **RTL/react-test-renderer's `root.queryAll`/`findAllByType` don't reliably match composite components by type reference** in this test setup (hit twice: `ExitSessionSheet`'s scrim `Pressable`, and an abandoned attempt to count `LinearGradient` instances on Paywall). Workaround used both times: add a `testID` (scrim) or find an indirect, robust proxy signal instead (Paywall: count `Button`'s primary-only `onAccent` text color rather than reaching into `Button`'s internal Pressable/LinearGradient tree shape).
- **TS control-flow narrowing does not persist into a nested function *declaration*'s closure**, even for a `const` binding already narrowed by an earlier `if (x === undefined) return`. Hit in `LearnCardScreen.tsx`'s `exampleCard` helper — fixed by capturing `word.word` into a local `const` before defining the closure, rather than referencing `word.word` inside it.
- **This project's eslint config has no `react-hooks/exhaustive-deps` rule registered** — an `eslint-disable-next-line react-hooks/exhaustive-deps` comment fails lint with "rule not found" (not silently ignored). Don't add that suppression comment here; it's dead weight that breaks the build.
- **Bash tool cwd does not reliably persist across calls in this session** — several `npm run check` invocations silently ran from repo root instead of `mobile/` after an unrelated `cd /Users/ryan/Desktop/LexiTap && git ...` call. Always `cd` explicitly (or check `pwd`) rather than relying on a prior `cd` from several calls back.
- **A concurrent, unrelated session was actively modifying `content-tool/` files throughout** (`words_master.jsonl`, `enrich-master.ts`, etc.) — never staged/touched, confirmed via explicit `git add <mobile files only>` every commit, never `git add -A`.

## Not done (explicitly out of scope, not silently dropped)

- **Light-theme AA pass, Dynamic Type reflow, loading-state skeletons** — named coverage gaps in the plan, not touched this session (would need their own dedicated pass).
- **A fresh on-device screenshot pass** — several "Done means" lines in the plan call for device screenshots (font rendering, Reduce-Motion static-mount, meter fill states); this session's verification is `npm run check` (67→68 suites) + targeted render tests throughout. No simulator/device was available in this environment. Font loading + `expo-splash-screen` are native-module changes — need a new EAS build to verify on-device, same as the SDK-56-era Icon system before it.

## Docs updated this session

- [`lexitap-docs/03-ux-design/DESIGN_SYSTEM.md`](../lexitap-docs/03-ux-design/DESIGN_SYSTEM.md) — new "Empty & Done-State Voice" section (6 rules); "Progress rings and bars" corrected (stale "Mastery ring" entry removed — it was cut for `KnowledgeMapBar`/`DailyCapMeter` back when the plan was written, doc hadn't caught up); new "Layout primitives" subsection (`ListRow`/`SectionHeader`/`EmptyState`).
- [`AGENTS.md`](../AGENTS.md) — new Hard Rules bullet: the Reduce-Motion hook-vs-raw-withSpring distinction + pointer to the new shared primitives (don't hand-roll a duplicate — this session found one, `LearnQuickCheckScreen`'s copy-bank fork).
