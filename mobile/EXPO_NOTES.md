# Expo / React Native Notes — LexiTap

Stack-specific gotchas and **already-decided** conventions for the mobile app. Read before touching rendering, lists, images, animation, or styling. Purpose: stop a future agent from "fixing" something that's already correct, and flag the few forward-looking traps.

Source: harvested from MiniMax `react-native-dev` skill (2026-06-09), then reconciled against the actual codebase — most items were **already satisfied**. Kept only what's load-bearing here.

---

## Already correct — do NOT "fix" these

| Convention | State in repo | Why |
|---|---|---|
| **`expo-image`, not RN `Image`** | ✅ In use (`assessments/ImageMatch.tsx`) | Better caching, memory, perf. Don't import `Image` from `react-native`. |
| **Reanimated 3** | ✅ `~3.16.1` | Animate `transform` / `opacity` only on the UI thread; never animate layout props (`width`/`height`/`top`) — they jump to the JS thread and drop frames. Respect Reduce Motion (already wired in onboarding reveal). |
| **Barrel `src/domain/index.ts` (`export *`)** | ✅ Intentional, **KEEP** | MiniMax's skill says "no barrels — bundle bloat." That advice is for app/screen code in a tree-shaking-sensitive web bundle. Here the domain barrel is the deliberate public surface for the app/presentation layers and Metro handles it fine. **This contradiction is decided: keep the barrel.** Do not flatten it citing "bundle bloat." |

## Forward-looking traps (not hit yet — guard when you add the feature)

- **Long lists → `@shopify/flash-list`, not `FlatList`.** The app currently uses only `ScrollView` (short, bounded content — fine). The moment a screen renders a long/unbounded list (e.g. a full word browser, review history), reach for FlashList + memoized row components, not `FlatList`, and never a `.map()` inside a `ScrollView` for >~20 rows.
- **The `{count && <X/>}` zero-render trap.** `{items.length && <List/>}` renders a literal `0` when empty (and can crash on some RN versions). Always `{items.length > 0 && <List/>}` or a ternary.
- **High-frequency local reads.** AsyncStorage is async + JSON-serialized; fine for the current low-frequency keys (`last_backup_ms`, onboarding flags). If a hot read path appears (per-keystroke / per-frame), that's the signal to consider MMKV — not before. Don't add MMKV preemptively.
- **No memoization without evidence.** Never add `useMemo` / `useCallback` / `React.memo` speculatively — they carry their own cost and usually don't pay off. Add them only when a profiler (or a measured frame drop) shows a real problem, on the specific slow component. Measure → optimize → re-measure. (Harvested from callstack RN best-practices, 2026-06-09.)

## Styling (nativewind) — token discipline beats migrating

We use **nativewind 4**, locked to the WCAG-AA-audited design system. We evaluated `react-native-unistyles` v3 and **rejected it** (2026-06-09): it's a Nitro native module + mandatory babel plugin + Fabric — *more* transform/native-resolution surface, the same failure family as the dual-react Metro bug we already fixed, for a perf win an offline flashcard app never feels. See `memory/` session note.

The real lesson kept from that eval: **styles derive from one typed token theme, not scattered ad-hoc strings.**
- Keep colors / spacing / touch-targets in `tailwind.config` tokens that mirror the design system.
- **Avoid arbitrary values** (`className="...[6px]..."`) — they bypass the token system and drift from the audit. One exists today (`[6px]`); don't add more, prefer a scale token.

## Known test gap — passive-recognition invariant (deferred post-launch)

The "no `TextInput` in quiz/assessments" hard rule is enforced at the **tool boundary** (the `guardrails.mjs` PreToolUse hook blocks an agent from *writing* it) but **never verified at the render boundary** — nothing asserts the *shipped* quiz/assessment tree contains zero text-entry fields. A regression via a path the hook's regex misses, or a third-party component that renders an input, would not be caught (only the manual iOS `npm run smoke` exercises real rendering).

**Closing it needs `@testing-library/react-native`** + `react-test-renderer`, pinned carefully against the resolved React version (RTL v14 dropped React 18; we carry the dual-React hazard below). Deliberately **deferred to post-launch** (2026-06-09) — pre-launch the smoke test is adequate and the dep add isn't worth the React-version fight close to shipping. First test to write when picked up: render `QuizScreen` + each `components/assessments/*` and assert **zero `TextInput`** in the tree. Tracked as a GitHub issue.

## The dual-React / Metro fragility (history — don't reintroduce)

nativewind nested `react@19` vs root `react@18` caused a `$$typeof` mismatch → iOS black-screen crash. Fixed via a scoped `metro.config` shim redirecting `react`/`react/*` (and `@posthog/core/surveys`). **Don't remove that shim.** Any new dependency that nests its own `react` / transform layer is suspect — test a real iOS launch (`npm run smoke`), not just `npm run check`.
