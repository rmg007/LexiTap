# LexiTap Memory Index

This directory contains session notes, architectural decisions, and lessons learned. Files here are auto-loaded into CLAUDE.md via `@memory/MEMORY.md`.

## Index

- [AsterKit Integration (2026-05-31)](2026-05-31_asterkit_integration.md) — Rules, patterns, and workflows adopted from AsterKit; what fit, what didn't
- [Repo State Reconciliation (2026-05-31)](2026-05-31_repo_state_reconciliation.md) — Merged the unmerged fix branch (words.db delivery + 3-SKU tiers + green tests); content VOLUME (~7%) + device-verify are the remaining blockers; integrity-sweep doc fixes
- [Monetization Rethink (2026-05-31)](2026-05-31_monetization_rethink.md) — Killed subscriptions: free frequency/CEFR content + audio, one-time exam packs ($9.99) + All-Exams bundle ($29.99), upgrade SKUs, B2B deferred, neural-TTS not ElevenLabs; word↔category many-to-many is the next code task
- [Many-to-Many Schema + tiers.ts (2026-05-31)](2026-05-31_schema_many_to_many.md) — Stage 1 done: `word_tiers` junction, category-independent word IDs, exam-pack tiers.ts; mobile `tier_id` = loaded-under category (distractors unchanged); rebuild gotchas (delete working.db, cp to mobile bundle); DB schema v3.1
- [Onboarding Profile Persistence (2026-05-31)](2026-05-31_onboarding_persistence.md) — `user_stats.onboarding_state` wired end-to-end: `OnboardingState` type → `SaveOnboardingProfileUseCase` → defensive `parseOnboardingState` (corrupt→undefined, never throws). Diagnostic saves `{completedAt}` only; goal/band/frontier pickers + display still TODO. db deny-list toggle gotcha.
