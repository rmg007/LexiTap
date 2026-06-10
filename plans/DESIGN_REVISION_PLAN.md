# Design Revision Plan — post-finalization review

**Status:** A done · B done (Ryan chose "fix both") · C accepted (2026-06-09)

> **Update 2 (2026-06-09) — B APPLIED.** Ryan chose "fix both." Done in canonical order (tokens.ts → docs → Figma → verify): `textTertiary` dark `#6E777B`→`#838E92` (4.67–5.64:1) + light `#6B7378`→`#676F73` (4.6–5.1:1); added **`accentText`** token (dark `#20B2AA`, light `#0F6E68`) so accent-colored TEXT passes AA while the `accent` *fill* stays the brand teal. `mobile npm run check` GREEN (46 suites / 455 tests). Figma ported 1:1: `text/tertiary` var updated both modes, new `accent/text` var created (TEXT_FILL scope), **all accent-colored text rebound** to it — 12 free nodes + 13 component-master nodes (propagated to instances) + 4 instance overrides = **0 accent-bound text left on any of 10 pages**. Re-audit: **dark mode 0 text AA failures; accent/text passes AA both modes; the only sub-4.5 `accent` rows are the fill role (3.55–3.95:1 ≥ the 3:1 bar for fills/focus rings — correct).** Gate still PASS, screenshots clean.


> **Update 2026-06-09:** Section A APPLIED + verified — 8 glyphs added (32→40), 13 instances swapped, gate re-run PASS on all 4 touched pages (0 raw fills), screenshots confirm signal/graduation-cap/accessibility/activity/type/contrast/cloud-download/refresh-cw/user render on the canonical rebuilt screens. The toggle-row Accessibility screen seen mid-verify was an *archived original* (Archive SECTION, excluded from gate) — not a duplicate defect. Minor IA note: that archived original carried "Auto-play audio" + "Haptic feedback" toggles the rebuilt Accessibility screen omits — preserved in Archive, needs a home if still wanted (low priority).

**File:** Figma `8YT6PYWnpX6nqkT2mxXOwi` (pages 01–10). Canonical tokens = `mobile/src/presentation/theme/tokens.ts`.
**Method:** read-only audit of all 10 screen pages — every Icon-instance glyph + its row label, off-scale spacing, and a WCAG contrast sweep resolving every text/bg token pair in both modes. Gate (`.design-specs/figma-binding-audit.js`) re-confirmed **PASS** before any change.

This is a *grounded* revision: each item below came from the audit, not from open-ended "improve it." Open-ended parallel "revision chats" were rejected — N agents writing the same file collide on shared components/variables and can't be verified. Review fans out read-only; revision is applied by one owner.

---

## A. Wrong-icon defects — FIX (Figma-only, in scope)

Generic `gear`/`search`/`check` glyphs used as filler where a correct glyph exists or should be added. 13 instances; 8 new Lucide glyphs (32→40). Correct gears (Settings tab, Account settings row) left untouched.

| Page | Row(s) | old glyph | new glyph |
|---|---|---|---|
| 01 Onboarding | CEFR band rows A1–C1 (×5) | settings | **signal** (new) |
| 03 Home | "Prepping for IELTS or TOEFL?" | settings | **graduation-cap** (new) |
| 08 Profile | "Sign in to sync progress" empty | search | **user** (exists) |
| 10 Settings | Accessibility | settings | **accessibility** (new) |
| 10 Settings | Reduce motion | settings | **activity** (new) |
| 10 Settings | Larger text | search | **type** (new) |
| 10 Settings | High contrast | check | **contrast** (new) |
| 10 Settings | Restore backup | settings | **cloud-download** (new) |
| 10 Settings | Catch-up mode | settings | **refresh-cw** (new) |

New glyphs built from real Lucide v1.17.0 sources, conformed to convention (1.75px ROUND stroke, fills cleared, stroke bound to `text/primary` 252:9), appended as `glyph=<name>` variants.

*Honest note:* "Reduce motion" has no perfect Lucide glyph — `activity` (waveform = motion/animation) is the least-bad available; revisit if a better one ships.

## B. Contrast — WCAG AA failures — FLAGGED (needs token decision, NOT auto-applied)

Real failures (noise filtered: `on-accent` belongs on the accent fill; `*/subtle` are bg tints not text; `border/strong` is a 3:1 border):

| Token (as text) | Mode | Ratio | AA (4.5) | Fix |
|---|---|---|---|---|
| `text/tertiary` #6e777b | **Dark** (canonical) | 3.43–4.28 | ✗ | lighten the dark-mode gray to ≥4.5:1 on `bg/surface` |
| `text/tertiary` #6b7378 | Light | 4.34 on sunken | ✗ (marginal) | minor nudge |
| `accent` #178f88 | Light | 3.8–3.95 | ✗ (passes large 3:1) | use `accent/pressed` #0f6e68 for accent *text*, or restrict accent text to ≥18px |

These are `tokens.ts` value changes (canonical source — Figma ports, never invents). A foundation-token change ripples to every screen and the accent one touches brand. **Not auto-applied — Ryan's call.**

## C. Off-scale spacing — ACCEPTED (not blocking)

6/10/20px micro-gaps (icon↔label) across pages 04/07/08/10. No token at those values; binding/forcing would shift layout. Deliberate, documented, left as-is (same call as the finalization pass).

---

## Exit criteria
- A applied; gate re-run = **PASS**; screenshot proof of Settings + Onboarding.
- B presented to Ryan with exact remediation; applied only on his decision.
- Docs synced: `code-connect-map.md` (40 glyphs), `MEMORY.md`, this plan → done.
