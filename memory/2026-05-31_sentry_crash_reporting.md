# Sentry Crash Reporting — B1 + Scrub Core (2026-05-31)

**Resolved a doc contradiction, not a new decision.** CLAUDE.md Forbidden Patterns banned crash SDKs in prod, but `plans/RELEASE_PLAN.md` (B1–B3) + the drafted privacy policy (§2/§5) already assumed Sentry in prod. Release plan + privacy policy win → Sentry **allowed in production**, env-gated + PII-scrubbed. CLAUDE.md crash rule rewritten accordingly. Distinction locked: **crash reporting allowed in prod (scrubbed); analytics still not.** **(Superseded 2026-05-31: analytics is now ALSO allowed in prod — env-gated + `anon_id`-only + no-PII + autocapture-off + EU-host + opt-out + disclosed, purpose-limited to app improvement. The two are now parallel; see [[2026-05-31_analytics_posthog_policy]].)**

Also locked: **no 13–16 age bifurcation** — uniform PII scrub for all users (age gates unenforceable; uniform scrub satisfies GDPR worst-case by default; one code path).

## What shipped (B1 + B2 scrub)
- `@sentry/react-native@~6.10` installed via `expo install`.
- Adapter isolated in `mobile/src/infrastructure/crash/` (hexagonal: SDK imports only in infrastructure):
  - `scrub.ts` — pure `scrubEvent`/`scrubBreadcrumb`, **type-only** SDK import (erased → tests load no native module). Strips `user`/`server_name`/`request`/`extra`; redacts email/JWT/bearer in messages+exceptions; drops `http`/`xhr`/`fetch`/`sync` breadcrumbs; drops console `data`.
  - `sentry.ts` — ONLY file importing the real SDK. `initCrashReporting()`, `wrapRoot` (=`Sentry.wrap`), `captureException`. **Fail-closed**: scrub throws in `beforeSend`/`beforeBreadcrumb` → return null (drop, never send unscrubbed).
  - `index.ts` barrel; `scrub.test.ts` (security regression net).
- `app/_layout.tsx`: `initCrashReporting()` at **module top** (NOT useEffect — catches startup crashes); `export default wrapRoot(RootLayout)`; container-init `.catch` → `captureException`.
- Init opts: `enabled: !__DEV__ && !!dsn`, `tracesSampleRate:0`, `attachScreenshot:false`, `sendDefaultPii:false`, `enableAutoSessionTracking:true`. Auto-session-tracking = the crash-free-rate signal (feeds A7). Inert until `EXPO_PUBLIC_SENTRY_DSN` set.
- `mobile/src/infrastructure/crash/**` added to high-risk deny list (scrub is PII-load-bearing).

## Env vars (now in `mobile/.env.example`)
- `EXPO_PUBLIC_SENTRY_DSN` — runtime DSN, safe to ship, inert if unset.
- `SENTRY_ORG`, `SENTRY_PROJECT`, `SENTRY_AUTH_TOKEN` — build-time only (EAS secrets), for B3 source-map upload.

## Deferred (with reasons)
- **B2 enrichment tags** (`anon_id`/`session_id`/release/free-paid/locale/online): `getOrCreateAnonId` already exists in `infrastructure/analytics/AnonIdStore` — so NOT blocked on storage as the plan guessed. Deferred because the scrub deletes ALL `event.user`; wiring anon_id means whitelisting a pseudonymous id through the scrub. Pick this up when doing B2 enrichment.
- **B3 source maps + alerts**: needs a real Sentry org/project + `SENTRY_AUTH_TOKEN` EAS secret. To activate: set `SENTRY_ORG`/`SENTRY_PROJECT` + token, then add `@sentry/react-native` (**bare** — has `app.plugin.js`; NOT `@sentry/react-native/expo`, which doesn't exist in v6.10) to `app.config.ts` `plugins`, conditional on those env vars so credential-less builds don't break.
- **app.config.ts plugin NOT added** this session: source-maps-only (B3), inert without creds, native module autolinks without it. JS+native crash capture works now; only symbolication needs it.

## Gotchas
- `beforeSend` is typed for `ErrorEvent` (not `Event`) in SDK v8/v9 → made `scrubEvent` generic `<T extends Event>` + inlined the `beforeSend` arrow so it picks up the contextual `ErrorEvent` type. `ErrorEvent` is NOT re-exported from `@sentry/react-native` (only `Event`/`Breadcrumb`/`Exception` etc. are).
- Jest: `@sentry/react-native` is outside the `transformIgnorePatterns` allowlist → added `moduleNameMapper` + `src/__mocks__/@sentry/react-native.ts` so any future test importing the barrel/container won't load native code. `scrub.test.ts` needs none of this (type-only import erased).
- **Deny-rule fix**: `Edit(.env*)` over-matched the committed `.env.example` template (not a secret) and blocked editing it. Narrowed (with Ryan's OK) to explicit secret files (`**/.env`, `**/.env.local`, `**/.env.production`, …) so the template stays editable while every real secret file stays denied. NOTE: self-permission-widening settings edits are auto-denied unless the user explicitly authorizes. `.env.example` now documents the Sentry vars.

## Verify
`cd mobile && npm run check` green (155 tests, incl. `scrub.test.ts`). Device send-path + offline disk cache = device-verify later (needs a real DSN).

## Related / flagged
PostHog/analytics (RELEASE_PLAN A1–A7) is the same contradiction class vs CLAUDE.md's analytics ban — but PostHog is Noop-by-default + `.env.example` gates it "dev/staging only". Flagged via spawn-task for explicit doc reconciliation; not touched here. **✅ RESOLVED 2026-05-31 — PostHog allowed in prod, conditioned + purpose-limited to app improvement; see [[2026-05-31_analytics_posthog_policy]].** See [[2026-05-31_monetization_rethink]] context for the broader privacy posture.
