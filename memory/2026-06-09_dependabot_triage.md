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
