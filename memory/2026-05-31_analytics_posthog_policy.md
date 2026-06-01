# Analytics / PostHog Policy — Prod-Allowed, App-Improvement-Only (2026-05-31)

**Resolved a doc contradiction, not a new build.** CLAUDE.md Forbidden Patterns banned analytics SDKs in prod ("dev/test only"), but `plans/RELEASE_PLAN.md` A7 made **PostHog Retention the keystone of the P2 D7 gate during external beta** — external testers = real end-users = "production" for privacy-label/GDPR. The two could not both hold. Same contradiction class as the Sentry crash-SDK one ([[2026-05-31_sentry_crash_reporting]]).

**Decision (Ryan, 2026-05-31): "Allow in production ONLY if it benefits app improvement."** → PostHog **allowed in prod**, but **purpose-limited to app improvement** (GDPR Art. 5(1)(b) purpose-limitation). Conditions, all required:
- env-gated key `EXPO_PUBLIC_POSTHOG_API_KEY` — **Noop if unset** (`createAnalyticsService` defaults to `NoopAnalyticsService`);
- **`anon_id` pseudonymity only** (device UUID; never email/Supabase id);
- **no PII** in event payloads; autocapture **off** (explicit events);
- **EU host**; in-Settings **opt-out**; privacy-policy **sub-processor disclosure**;
- **never** advertising, ad-SDK coupling, cross-app tracking, IDFA/AAID, or selling data → store labels stay "Tracking: No".

Any analytics SDK that sends identity/PII, autocaptures, tracks for ads, or serves a non-improvement purpose stays **forbidden**.

## Why this resolution (not dev/staging-only)
Mirrors the Sentry *method* (let the operational plan + drafted privacy policy settle it), but the call was Ryan's — it was a genuine fork, not foregone:
- **For prod-allow:** RELEASE_PLAN A7 needs prod retention data; the PostHog adapter is already built + wired (`container.ts` → quiz use-cases); A7 is "S (config)" on PostHog.
- **The real alternative existed** (unlike Sentry): ANALYTICS_PLAN documents a zero-vendor Supabase `metrics_daily` rollup that could power D7 with no third party. Kept documented as fallback, **not** the v1 path.
- **Counter-signal that made it a real question:** the *drafted privacy policy* was written for the on-device-only world (§2 said "aggregate metrics only leave device"; §5 did **not** list PostHog). Under prod-allow those were factually wrong → had to fix.

## Docs changed (this session — DOCS/POLICY ONLY)
- **CLAUDE.md** — Forbidden-Patterns analytics row: flat ban → conditional allow (above). Added `mobile/src/infrastructure/analytics/` to High-Risk Paths (PII boundary). Footer rewritten (was "analytics still not").
- **`.claude/settings.json`** — added `Edit(mobile/src/infrastructure/analytics/**)` to deny list (restriction-tightening; mirrors crash/). **This now blocks analytics-code edits without confirmation.**
- **`mobile/.env.example`** — analytics comment "dev/staging only — omit in production" → prod-allowed conditions; value emptied (Noop-by-default signal).
- **RELEASE_PLAN.md** — Track A "POLICY RESOLVED" callout; A3 flags the US→EU host code drift; §E open-question bullet → resolved; LEGAL-3 adds PostHog DPA + EU host.
- **ANALYTICS_PLAN.md** — two Open Questions resolved (PostHog vs rollup → PostHog; cohort computation → PostHog Retention in-tool); Tooling section states prod-allowed conditions + pins EU host. Consent gating (opt-out vs opt-in) stays counsel-pending but is now a **hard pre-EU-beta gate**.
- **PRIVACY_POLICY_TERMS_OF_SERVICE.md** — §2 usage-analytics row rewritten (pseudonymous events go to PostHog EU unless opted out); §5 **adds PostHog (EU) sub-processor**; §3/§4 wording made accurate + app-improvement-only.
- **Sentry memo** — superseding note appended to the "analytics still not" line + the flagged-PostHog note marked resolved.

## Code follow-up status (analytics/ is deny-listed — confirm before editing)

### ✅ DONE (verified in code, not re-attempt)
1. **~~US→EU host bug~~** — ~~`PostHogAnalyticsService.ts:12` hardcoded `https://us.i.posthog.com`~~ — **Already fixed.** Line 17 reads `host: 'https://eu.i.posthog.com'`. Do not re-apply.
2. **~~Stale comment~~** in `createAnalyticsService.ts` — **Already fixed.** Comment now correctly says "prod-allowed if key is configured, compliant with GDPR + opt-out". No "dev/staging only" text remains.

### Still open
3. **A6 opt-out toggle** ("Share anonymous usage data") does not exist yet — **hard pre-EU-beta gate**.
4. Code today: `track()` only (no `identify`/opt-out/flush in the port); per-event `anon_id`/`session_id` enrichment (A2/A4) still pending.

## Gotchas
- `createAnalyticsService` keeps PostHog out of the module graph via dynamic `require` when the key is absent — Noop has zero SDK overhead. **Keep Noop-by-default.**
- Deny-list addition takes effect **mid-session** — it blocked the very comment fix above. Expect a confirmation prompt for any future analytics/ edit.
- "Tracking: No" on store labels is still truthful: pseudonymous product analytics ≠ Apple's IDFA/cross-app "tracking". Don't let a reviewer or a future agent conflate them.

## Verify
Docs-only — no `npm run check` impact (no code touched). Code follow-ups (host fix) will need a build + device-verify once a real PostHog project + EU key exist.
