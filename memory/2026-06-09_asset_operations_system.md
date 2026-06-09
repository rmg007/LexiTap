# Asset Operations System — 2026-06-09

Unified, agent-discoverable system so **any** chat/agent can create/update/delete the four visual asset types without reinventing conventions: **designs, CSS, images, icons.**

## Canonical guide

[`scripts/README.md`](../scripts/README.md) is the single front-door. It maps each asset type → tool → canonical home → CRUD workflow → guardrails. No magic dispatcher (would add indirection for no gain); the system = focused tools + one discoverable doc + surfacing in auto-loaded files.

## The four types

| Type | Tool | Canonical home |
|---|---|---|
| **CSS** | edit files | `website/public/styles.css` (web); tokens in `website/DESIGN_TOKENS.md`. App = RN/nativewind, **no CSS**. |
| **Designs / UI** (vector) | **Figma MCP** (load `/figma-use` first) | Figma + `.design-specs/html/screens/` HTML mirrors |
| **Images** (raster) | `scripts/generate-image.js` — OpenAI `gpt-image-1` | `website/public/`, `mobile/assets/vocab/`, `scripts/out/` (scratch, gitignored) |
| **Icons** (deterministic) | `scripts/generate-icon.js` — SVG→PNG via `sharp` | `website/assets/` (web), `mobile/assets/` (app: icon/adaptive-icon/splash) |

## New tooling this session

- **`scripts/generate-image.js`** — AI raster generation. Dependency-light (built-in `fetch`, no openai SDK). Auto-loads `OPENAI_API_KEY` from root `.env`. Flags: `--out --size --quality --n --transparent --model`. Default scratch out = `scripts/out/` (gitignored). Verified end-to-end: auth + key-load + request all work; only blocker is OpenAI account **billing hard limit = $0** (Ryan must fund at platform.openai.com → Billing — NOT a code issue).
- `scripts/generate-icon.js` already existed (SVG→PNG resizer) — documented, not changed.

## Discoverability (the actual point)

Surfaced in **auto-loaded** files so cold agents find it without searching:
- Root `CLAUDE.md` → new "Asset Operations" section (table + hard rules + pointer to scripts/README.md).
- `AGENTS.md` → hard-rule line under Secrets.

## Rule reconciliation — IMPORTANT

The old `feedback_icons.md` rule ("**never** create/generate icons; always ask Ryan") was **absolute and now contradicts this system.** Rewritten to the nuanced rule (in `scripts/README.md`, CLAUDE.md, AGENTS.md, and the home-memory `feedback_icons.md`):

> Generate freely for **og-images, marketing, content illustration**. The **final app store icon + primary logo** are brand-critical → propose/explore freely but the **shipped file gets Ryan's explicit sign-off and ships as a vector, never an AI-generated PNG.**

## Settings / guardrail changes (`.claude/settings.json`)

- **Removed** `Edit(**/.env)` deny → agents can manage local secrets in the gitignored `.env`. Kept `.env.production`/`.staging`/`.test` denied.
- **Added** Bash allow: `node scripts/generate-image.js:*`, `node scripts/generate-icon.js:*`.
- **Deliberately kept** the db/srs/iap/storage/crash/`app.json` denies (data-integrity + PII guardrails, unrelated to assets) — Ryan said "access to everything" but nuking those was out of scope; flagged for explicit opt-in if he wants them gone.

## Smoothness add-ons (same session)

- **Root `package.json`** created — pins `sharp ^0.34.5` + `svgo ^3.3.2`, adds `npm run gen:image|gen:icon|optimize`. **Fixes a real latent bug:** sharp was orphaned in root `node_modules` with no manifest → a fresh `git clone` had no sharp → `generate-icon.js` broke on a new laptop (violated the "clone + npm install is all you need" guarantee). Now reproducible.
- **`scripts/optimize-asset.js`** — PNG (sharp) + SVG (svgo) shrink, in place, CLI + module. Lossless-safe (only writes if smaller; keeps SVG viewBox). Verified: PNG −44%, SVG −36% on real assets. `generate-image.js` auto-runs it on PNG output (`--no-optimize` to skip).
- **`/gen-image` slash command** (`.claude/commands/gen-image.md`) — wraps generate-image.js: infers size/quality/canonical folder from the request, auto-optimizes, enforces the icon/logo sign-off rule.
- **Supabase MCP** wired in `.mcp.json` (`@supabase/mcp-server-supabase`, `--read-only`, `--project-ref=xippwvtmkpskldlmouro`, token via `${SUPABASE_ACCESS_TOKEN}` — documented in `.env.example`, never committed). Read-only by default; drop the flag if writes are ever needed. ⚠️ Ryan must create the PAT + restart Claude Code for the MCP to load.
- Settings: allowed `optimize-asset.js` + `npm run gen:*`/`optimize:*`.

## Enforced guardrails (PreToolUse hook)

Evaluated the `anthropics/claude-code` plugin marketplace. Verdict: only **hookify** was a real fit (turn prose rules → enforced hooks); `frontend-design` situational (conflicts with the locked design system + a11y audience); rest already covered by built-ins. **Did NOT install the hookify plugin** — its `.local.md` rules + per-machine install wouldn't travel across laptops (violates "all config in the repo"). Instead implemented native **`.claude/hooks/guardrails.mjs`** (PreToolUse, matcher `Bash|Edit|Write|MultiEdit`, registered in settings.json). Travels in the repo, zero install.

**Blocks (exit 2):** `git add .env` · `git add -A`/`.`/`commit -a` · `TextInput` in QuizScreen/quiz/assessments · `${}` SQL interpolation under `infrastructure/db/`. **Fails open** (internal error → allow; never blocks real work). Self-tested 12/12 (6 block, 6 allow, 0 false positives). Documented in CLAUDE.md "Enforced at the tool boundary". To extend: edit `guardrails.mjs`.

⚠️ The hook is **live this session** — it blocks `git add -A`/`.`; commit with explicit paths (which is the rule anyway).

## `/aso` skill — vetted ASO (App Store Optimization)

Surveyed 4 external skill repos (anthropics/claude-code, ui-ux-pro-max, awesome-llm-apps, sickn33/antigravity-awesome-skills). Verdict: don't import — generic skills are out-covered by Claude/built-ins; stack-relevant ones (ui-ux-pro-max, the antigravity ASO toolkit) are unvetted third-party code with scripts (`risk: unknown`) and brand/stack conflicts. The exercise surfaced ONE real gap: **no ASO workflow, pre-launch.**

Built native **`.claude/skills/aso/`** (SKILL.md + 5 references) tailored to LexiTap (ESL vocab, 13+, Education, iOS-first, pay-once exam packs). **No third-party scripts** — uses WebSearch/WebFetch for public data, never fabricates metrics (unlike the community ASO skills). References: `platform-rules.md` (Apple/Play field limits + keyword-field rules), `keyword-strategy.md` (ESL keyword pools, competitor map, localization-as-top-lever), `metadata-templates.md` (title/subtitle/desc fill-ins, all ≤limit), `review-management.md`, `launch-checklist.md`. Drives existing `website/assets/STORE_COPY.md` + `SCREENSHOTS_SPEC.md` rather than duplicating. Documented in CLAUDE.md New Machine Setup table. Invoke: `/aso`.

## Second repo-survey wave + EXPO_NOTES.md (same day)

Surveyed 5 more repos (wshobson/agents, tech-leads-club/agent-skills, MiniMax-AI/skills, Jeffallan/claude-skills, **jpudysz/react-native-unistyles**). Same verdict pattern: **import nothing.** All skill repos = generic-dev knowledge Claude already has, none LexiTap-specific; several ship loose maintainer scripts (don't run). Only real harvest = MiniMax `react-native-dev`'s Expo gotchas → distilled into project-owned **`mobile/EXPO_NOTES.md`** (NOT imported their files).

Reality-checked the gotchas vs the actual codebase first — most were **already satisfied** (`expo-image` in use, no `FlatList` anywhere, Reanimated 3 present), so EXPO_NOTES is mostly "decided, don't churn" + a few forward-looking traps (FlashList for future long lists, `{n>0 && …}` zero-render trap, MMKV only if a hot read path appears). Pointer added to AGENTS.md hard rules.

**Two decisions worth not re-litigating:**
- **`react-native-unistyles` v3 = REJECTED.** It's a Nitro native module + mandatory babel plugin + Fabric-required → MORE transform/native-resolution surface, same failure family as the already-fixed dual-react Metro bug, for a styling-perf win an offline flashcard app never feels. Pre-launch total rewrite + re-run WCAG audit = textbook churn. Kept idea only: styles from one typed token theme → tighten `tailwind.config` tokens, ban arbitrary `[...]` values (one `[6px]` exists). **nativewind stays.**
- **`domain/index.ts` barrel = KEEP.** MiniMax skill says "no barrels (bundle bloat)"; that's web-bundle advice. Here the barrel is the deliberate domain public surface, Metro handles it. Recorded in EXPO_NOTES so no agent flattens it.

## Third repo-survey wave — 2 real harvests (same day)

Surveyed 8 more (Microck/ordinary-claude-skills, partme-ai/full-stack-skills, HoangNguyen0403/agent-skills-standard, callstackincubator/agent-skills, kingstinct/react-native-healthkit, AppAndFlow/react-native-ease, callstackincubator/ai, callstack/react-native-testing-library). **Import nothing** (10th survey, same verdict) — 3 skill repos ship unvetted scripts, rest is generic-dev/RN lore Claude has. Hard skips: **healthkit** (zero health data), **callstack/ai on-device LLM** (LexiTap's AI is BUILD-TIME in content-tool; app ships finished 1.18MB words.db — runtime LLM = multi-GB downloads kill offline-first, or iOS-26-gated). **ease** (native animations) = idea-only, v0.7.2 + New-Arch churn pre-launch = no.

**Two harvests taken:**
- **No-memoization-without-evidence rule** (from callstack best-practices) → added to `mobile/EXPO_NOTES.md`. Never add `useMemo`/`useCallback`/`React.memo` speculatively; profile first.
- **RTL render-guard gap (real, LexiTap-specific):** the passive-recognition invariant (no TextInput in quiz/assessments) is enforced at the **tool boundary** (guardrails.mjs blocks writing it) but **never verified at the render boundary** — nothing asserts the shipped tree has zero text fields. Closing it needs `@testing-library/react-native` (the app deliberately has NONE — presentation tests test extracted logic fns, not rendered components). **Ryan's call: DEFER post-launch** — pre-launch the iOS smoke test is adequate; RTL v14 dropped React 18 → would trigger the dual-react pin fight near ship. Documented in EXPO_NOTES "Known test gap" + filed [issue #10](https://github.com/rmg007/LexiTap/issues/10).

## State

- `OPENAI_API_KEY` written to root `.env` (gitignored, confirmed via `git check-ignore`). ⚠️ Key was pasted in plaintext chat → **Ryan to rotate** ("change it later").
- `.env.example` documents the key; `.gitignore` ignores `scripts/out/`.
- Not yet committed at time of writing — CLAUDE.md/AGENTS.md/scripts/settings changes are committable; `.env` is not and won't be.
