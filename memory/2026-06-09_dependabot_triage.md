# Session: Dependabot Triage — 16 alerts, 5 patched, 11 expo-pinned (2026-06-09)

**What happened:** Triaged all 16 Dependabot alerts (1 critical, 11 high, 4 moderate). Patched 5 incl. the critical, commit `93d7500`, pushed. Both checks GREEN (mobile 46/459, content-tool 99).

**Decisions:**
- **Remaining 11 mobile alerts (tar ×6 high, @xmldom/xmldom ×4 high, uuid mod) = ACCEPTED, deferred to next Expo SDK bump.** All transitive under `@expo/cli`/`@expo/config-plugins` in expo@52. Real exposure nil: CLI/prebuild tooling only (tar = template extraction, xmldom/uuid = own-plist parsing), never in RN app bundle — lockfile "runtime" scope label lies. npm audit's only fix = expo@56 (forbidden major). Did NOT force tar@7/xmldom@0.8 overrides — would risk silent EAS prebuild breakage weeks later for zero security gain. Do NOT re-investigate these 11; option open: dismiss via `gh api` as "vulnerable code not used."
- postcss fixed via root `overrides: {"postcss": "^8.5.10"}` in mobile/package.json — `@expo/metro-config` pins `~8.4.32`, override is the only non-breaking path. Resolved 8.5.15.
- content-tool: vitest 2.1.9 → 3.2.6 (dev-only major, zero test changes needed) — clears the critical (GHSA-5xrq-8626-4rwp Vitest UI file read/exec) + vite path-traversal + esbuild dev-server moderates.

**Bugs / gotchas:**
- **Plain `npm audit fix` (no --force) in mobile made things WORSE:** nested a duplicate expo@56.0.9 under expo-keep-awake, vuln count 20→22. Recovery: `git checkout package-lock.json && npm ci`. Never trust npm audit fix on an Expo tree — use targeted bumps/overrides only.
- Triage shortcut: `gh api repos/rmg007/LexiTap/dependabot/alerts --paginate` + `npm explain <pkg>` per project gives full picture in 2 commands.

**Patterns / lessons:**
- Concurrent-session hygiene held: another session was editing LearnCardScreen/ROADMAP/plans mid-run; staged only the 4 package files by name, no entanglement.

---

## Re-triage 2026-06-10 (post SDK-56)

**Trigger:** SDK-52→56 upgrade shipped (commit `556606c`). The 11 "deferred to next Expo SDK bump" alerts were re-evaluated. Also 1 new open alert (#16) at session start.

**Open alerts at start:** 1 (alert #16 — uuid <11.1.1, moderate, path: mobile/package-lock.json)

**tar ×6 and @xmldom/xmldom ×4:** Resolved — all gone from the open alert list post SDK-56. The Expo SDK upgrade cleared them automatically (expo@56's updated @expo/cli / @expo/config-plugins deps pulled in safe versions). No manual action needed.

**Alert #16 — uuid (moderate, "Missing buffer bounds check in v3/v5/v6 when buf provided"):**
- Chain: `expo@56 → @expo/config-plugins@56.0.8 → xcode@3.0.1 → uuid@7.0.3`
- `xcode` uses only `uuid.v4()` (generates GUID for .xcodeproj file entries). The vulnerability is in `v3`/`v5`/`v6` when a caller supplies a `buf` argument — that code path does not exist in xcode.
- Independently verified: downloaded xcode@3.0.1 source, confirmed only `uuid.v4()` is called (`pbxProject.js:90`).
- uuid@11.1.1 CJS exports `v4` with the same API signature — override is safe.
- **Fix:** Added `"uuid": "^11.1.1"` to `mobile/package.json` `overrides`. `npm install` resolved to uuid@11.1.1, `npm audit: 0 vulnerabilities`.
- Commit: `6020aa9` on `dep-triage`, merged to main (`133e5db`), pushed.
- Dependabot auto-dismissed #16 after scanning the updated lockfile.

**Final state:** 0 open Dependabot alerts. `npm run check` green in both projects (mobile 54 suites / 520 tests; content-tool 13 files / 216 tests).

**npm ls verdict:** Clean — no extraneous packages, no duplicate expo instances, no broken peers.

**Gotcha:** GitHub's push response still showed the alert warning immediately after push — Dependabot rescans asynchronously. Waited ~15s, re-queried: alert was gone. Don't interpret the push warning as "fix failed."
