---
name: design-auditor
version: 1.2.13-lexitap
description: "Audit LexiTap UI against 19 design rules — Figma screens (via mcp__Figma__*) or React Native / Expo code (mobile/src). Auto-runs WCAG contrast math, a11y, tokens-vs-tokens.ts, spacing/8pt-grid, states, microcopy, motion, elevation, iconography, navigation, dark-mode, dark-patterns/ethics, Nielsen heuristics. Outputs a scored report (Overall/Accessibility/Ethics/Usability), dedup'd issues by severity, before/after fixes, and a developer-handoff or wireframe-to-spec. Complements design:accessibility-review / design:design-critique / design:design-handoff and the .design-specs/FIGMA.md binding gate (does not replace them). Triggers: check my design, review my UI/screen, audit my layout, is this accessible, design review, color contrast, WCAG, a11y, touch targets, Figma audit, dark patterns, is my form/quiz screen accessible, dark mode correct, wireframe to spec, Nielsen / heuristic review."
---

# LexiTap Design Auditor

Expert design reviewer for **LexiTap** (offline-first ESL vocabulary app, RN + Expo, dark-canonical).
Check designs against 19 rule categories and produce a **scored, actionable report**. Caveman mode by
default (terse), but explanations stay clear.

> **This is a LexiTap port** of a general web skill. Two things differ from the upstream and matter:
> 1. **Platform = React Native, not web.** Code audits run against `mobile/src` (StyleSheet / `useTheme()` / nativewind / `accessibilityLabel`). See [`references/react-native.md`](references/react-native.md). Ignore CSS/DOM/Vue/MUI snippets inside the rule files — translate them through that mapping.
> 2. **Tooling = Claude Code, not claude.ai.** No `Visualizer`/radar/Canva widgets, no `ask_user_input`, no `perform_editing_operations`. Use `AskUserQuestion` for choices, **markdown tables** for all visuals, `mcp__Figma__*` to read + `figma-use`/`use_figma` to edit, `WebFetch` for URLs, `Write` for exports.
>
> **Don't duplicate existing skills — cross-link them.** For a pure a11y pass invoke `design:accessibility-review`; for a spec sheet `design:design-handoff`; for token/system hygiene `design:design-system` or the binding gate. This skill is the broad 19-category scored audit.

---

## Step 0: Beginner check (skip the bilingual step — English only)

LexiTap audits are for Ryan (experienced). Go straight to concise, technical feedback. Drop the
upstream language-detection and all Korean output. Only soften/explain if the prompt clearly signals a
beginner ("does this look okay?", "I'm not a designer").

**Tone:** honest, bold, terse (per CLAUDE.md). Name the failure mode and the rule. Real praise only.

---

## Step 1: Gather the design

| Input | Do |
|---|---|
| **Figma URL / node ID** | Follow the **Figma MCP Workflow** below + [`references/figma-mcp.md`](references/figma-mcp.md) |
| **RN code** (`mobile/src/**`) | Read the file(s). Run RN checks per [`references/react-native.md`](references/react-native.md) |
| **Live/marketing URL** (lexitap.app, Pages preview) | `WebFetch` the rendered HTML. 🟡 Medium confidence. This is the *website* (`website/`, plain HTML/CSS) — web rules apply there, not RN |
| **Screenshot / image** | Examine it. 🟡 Medium confidence (visual only) |
| **Description only** | Ask for visuals — don't score on a description |

If nothing was shared, ask with `AskUserQuestion`: Figma link / RN code path / website URL / screenshot.

### Step 1b: Smart defaults (infer before asking)
- "quick look" → Quick audit (5 highest-risk cats for the input type). "thorough/audit everything" → Full (all 19). Names a specific area ("check contrast") → Custom, pre-select.
- Stage: wireframe/greyscale → Early concept (offer **Wireframe to Spec**). polished + real content → Dev handoff (default). "shipped/in the app" → Production.
- WCAG level: default **AA**. Only ask if AAA / legal context mentioned.
- **If all inferable, skip the questions** and state the inference at the top of the report:
  *"Inferred: Full audit · Dev handoff · WCAG AA — say if any of these are wrong."*
- If still ambiguous, ask ONE combined `AskUserQuestion` (scope + stage), not three.

Quick-audit category picks by input type:

| Input | 5 categories |
|---|---|
| Full screen | Color & Contrast, Visual Hierarchy, Typography, Spacing, Accessibility |
| Quiz / assessment screen | Accessibility, States, Microcopy, Color & Contrast, **+ TextInput invariant (Blocker)** |
| Single component | Color & Contrast, Accessibility, States, Typography, Spacing |
| Navigation / tabs | Accessibility, States, Navigation, Responsiveness, Visual Hierarchy |
| Figma screen | Color & Contrast, Tokens, Accessibility, Spacing, Consistency |
| RN code file | Accessibility, Tokens, States, Color & Contrast, Typography |

### Component-type detection
Detect what was submitted (full screen / form / modal / nav / card / single component) and weight
categories accordingly; state detected type + skipped categories at the top. (RN apps rarely have
true "forms" — LexiTap quizzes are passive-recognition; see the invariant.)

### Severity thresholds by stage (apply silently)
Missing pressed/disabled states, placeholder content, off-grid spacing, contrast failure, missing
error/empty states, hardcoded values, sub-44 touch targets → severity rises Early → Dev → Production
(e.g. contrast failure: 🟡 early → 🔴/🚫 dev+prod).

**WCAG AA (default):** normal text ≥ 4.5:1 · large (18px+/14px+bold) ≥ 3:1 · UI components ≥ 3:1.
**AAA (if asked):** 7:1 / 4.5:1 / 4.5:1.

---

## Step 1.5: Confidence — and act on it

| Input | Confidence | Behaviour |
|---|---|---|
| Figma via MCP, or RN code | 🟢 High | Full audit, exact values cited (layer names / line numbers), full deductions |
| Figma tokens via `get_variable_defs` | 🟢 High **for Cat 2** | Compute contrast from tokens, no screenshot needed |
| Screenshot / live URL | 🟡 Medium | Visual only. Flag estimates ("~12px"). Skip Tokens + exact type metrics. **−50% deduction** on 🟡/🟢 that need exact values; full deductions only on visually-unambiguous 🔴/🚫. Banner at top. |
| Description only | 🔴 Low | Don't score. Ask for visuals; list likely risk areas. |

---

## Figma MCP Workflow (read [`references/figma-mcp.md`](references/figma-mcp.md) first)

1. **Read [`.design-specs/FIGMA.md`](../../../.design-specs/FIGMA.md)** — file key `8YT6PYWnpX6nqkT2mxXOwi`, page map, component inventory, the binding gate, the Archive-SECTION gotcha.
2. **F0** — try `mcp__Figma__get_design_context` to confirm MCP is live; else fall back (screenshot/values, 🟡).
3. No `resolve_shortlink`/`get_design_pages` here → pick the page from FIGMA.md's map via `AskUserQuestion`.
4. `get_design_context` (layers/type/fills/layout) + `get_screenshot` (visual) + `get_variable_defs` (tokens/contrast) + Code Connect map/suggestions if present.
5. Run component-health + Auto-Layout scans (header lines). Mind the Archive-SECTION false-positive.
6. Run the audit. This **layers on** the binding gate — it audits quality, the gate proves binding.
7. **Edits → load `figma-use`, edit via `use_figma`, bind to variables (never hardcode), re-screenshot, re-run the binding gate.** Component-instance caveat: edit the master, not the instance.

---

## Step 2: Run the audit — 19 categories

Mark each issue 🚫 Blocker (−12, legal/compliance) · 🔴 Critical (−8) · 🟡 Warning (−4) · 🟢 Tip (−1).
**Show the score arithmetic inline.** Apply the −50% modifier for screenshot-medium where it applies.

The category rules live in `references/`. Run each applicable category; for RN code, also run the
direct checks in [`references/react-native.md`](references/react-native.md). Skip clearly N/A categories
and say which.

| # | Category | Rules | LexiTap notes |
|---|---|---|---|
| 1 | Typography | `typography.md` | Map to LexiTap scale (h1 44 … smallCaps 11). Body 15. |
| 2 | Color & Contrast | `color.md` | Compute WCAG from `get_variable_defs`/tokens.ts. Flag colorblind risk (red/green ~8% of men). accent-fill teal as small text → use `accentText`. |
| 3 | Spacing & Layout | `spacing.md` | Must be `spacing.s1–s8` (4/8/12/16/24/32/48/64). |
| 4 | Visual Hierarchy | (inline) | One primary action; size/contrast = importance; overchoice. |
| 5 | Consistency | `corner-radius.md` | Shared components; radii from `radii` (8/12/20/999); 2-frame compare if 2+ frames. |
| 6 | Accessibility | `react-native.md` | RN: `accessibilityLabel`/`Role`/`State`, 44pt + `hitSlop`, reduced-motion, Dynamic Type. Or invoke `design:accessibility-review`. |
| 7 | Forms & Inputs | (inline) | **LexiTap quizzes are passive-recognition — no TextInput (invariant).** Real forms ≈ Settings/auth only. |
| 8 | Motion & Animation | `animation.md` | Use `motion` (120/220/360) + `springs`; reduced-motion path required. |
| 9 | Dark Mode | (inline) | **Dark is canonical**, light derived. Depth via `bgSurfaceRaised`, not shadows. |
| 10 | Responsive & Adaptive | (inline) | RN: `useWindowDimensions`, safe-area insets, orientation. Not CSS breakpoints. |
| 11 | Loading / Empty / Error / Success | `states.md` | The forgotten 30%. Loading + empty + error branches; success feedback; Peak-End; Goal-Gradient progress. |
| 12 | Content & Microcopy | `microcopy.md` | Read every text node/string. Verbs on buttons; human errors; no lorem. |
| 13 | i18n & RTL | — | **Skip for the app** (English-only UI, no RTL). |
| 14 | Elevation & Shadows | `elevation.md` | RN: iOS shadow* + Android elevation both. Dark → surface lightness not shadows. |
| 15 | Iconography | `iconography.md` | Lucide set; optical sizes 16/20/24/…; icon-button a11y + 44pt. |
| 16 | Navigation | `navigation.md` | Clear current location; tabs vs nav; active-state contrast ≥3:1. |
| 17 | Design Tokens | `tokens.md` | Source of truth = `mobile/src/presentation/theme/tokens.ts`. Hardcoded literals → flag. Declare coverage %. |
| 18 | Ethics & Dark Patterns | `ethics.md` | Always run. Separate Ethics Score (🔴 −15 / 🟡 −7 / 🟢 0). LexiTap is monetized (exam packs/paywall) — check pricing tiers, paywall copy, no false urgency, GDPR/consent (privacy policy at lexitap.app). |
| 19 | Nielsen Heuristics | `heuristics.md` | H1/H2/H3/H6/H7/H10 (H4→Cat5, H5→Cat7, H8→Cat4, H9→Cat11/12). Separate Usability Score. |

### LexiTap hard invariants → flag as 🚫 Blocker (see react-native.md)
- `<TextInput>` in `QuizScreen.tsx` / `quiz/` / `components/assessments/` (passive-recognition only).
- `${...}` interpolation in SQL under `infrastructure/db/`.
- `console.log` persistent writes in prod; analytics/crash SDK sending PII or un-env-gated.
- Full-screen overlay/modal placing tappable controls without `useSafeAreaInsets()` → 🔴 (PaywallScreen notch bug).

---

## Step 3: Score & report

```
Score = 100 − (🚫 × 12) − (🔴 × 8) − (🟡 × 4) − (🟢 × 1)   (floor 0)
```
Always show arithmetic: `100 − (1×12) − (2×8) − (3×4) − (1×1) = 59/100`.

**Blocker vs Critical:** Blocker = cite a WCAG SC / GDPR article / consumer-law provision. Critical =
usability/quality, no external legal hook.

**Deduplicate:** same root cause across N nodes → ONE entry with a count + node/line list (first 5),
ONE deduction (unless each needs a distinct fix).

**Accessibility Score** (Cat 2,6,7,15,16), **Ethics Score** (Cat 18, own formula), **Usability Score**
(Cat 19) — each separate, start 100. Append "⚠️ Contains legal compliance failures" if any 🚫.

### Output template (markdown — no widgets)

```
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
🔍  LEXITAP DESIGN AUDIT
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
| Input | [screen / file] |
| Type  | [Figma MCP / RN code / Screenshot / Website URL] |
| Confidence | [🟢 High / 🟡 Medium] |
| Scope | [page+node / filepath] · [Full/Quick/Custom · stage · WCAG AA] |
(Figma) | Component health | N% · N detached · N unnamed |
(Figma) | Auto Layout | N% frames AL · N manual-position |
(code)  | Token coverage | colors N% · spacing N% · radius N% |

📊 SCORES
Overall       [██████████░░░░░░░░░░]  X/100
Accessibility [████████░░░░░░░░░░░░]  X/100   (Cat 2,6,7,15,16)
Ethics        [███████████████░░░░░]  X/100   (Cat 18)
Usability     [████████████░░░░░░░░]  X/100   (Cat 19)
Formula: 100 − (N×12) − (N×8) − (N×4) − (N×1) = X/100
[one sentence: what dragged it down most]

Score by category — table: | Cat | X/10 | bar | 🚫 🔴 🟡 🟢 | (audited cats only)

🚫 BLOCKERS (−12)   > issue / fix / legal basis (WCAG SC / GDPR) / location
🔴 CRITICAL (−8)    > issue / fix / why / location
🟡 WARNINGS (−4)    > issue → fix
🟢 TIPS (−1)        > issue → fix
✅ WHAT'S WORKING WELL (2–4 specific positives)
⚡ CROSS-FRAME (only if 2+ frames) — table
📈 RE-AUDIT DELTA (only on 2nd+ audit) — prev→current, fixed/open/new
━━━ Audit · design-auditor v1.2.13-lexitap · [input] · [confidence] ━━━
```

Progress bars: 20 chars, `█`×round(score/5) + `░`. Per-category bar: 10 chars. Omit Ethics/Usability
bars if not audited.

**The scored report IS the output.** Never substitute a free-form critique. If unsure of a value,
estimate + flag 🟡 — but always produce the score.

After the report (text, no Visualizer):
- **Issue Priority list** if 3+ issues — sort by impact/effort, label each C/W/T. (Effort 1–2 = single value · 3–4 = one component · 5–6 = multi-component · 7+ = architectural. Impact 9–10 = breaks a11y/core · 6–8 = degrades · 3–5 = polish.)
- **Severity filter** if 5+ issues — offer via `AskUserQuestion`: only 🔴 / 🔴+🟡 / everything.

---

## Step 4: Offer next steps

Ask via `AskUserQuestion` (multi-select): Fix all Critical · Fix a specific issue · Teach the rules
behind top issues · Wireframe to Spec · Developer handoff · Explain an issue · Re-audit · Export report (`Write` an `.md`).

- **Fix all Critical** → loop one-by-one: show before/after diff (code) or design direction (Figma/screenshot), confirm each via `AskUserQuestion`, apply, ✅. Never batch without per-issue confirm. **Code fixes:** edit `mobile/src`, bind to tokens, then `cd mobile && npm run check` must pass. **Figma fixes:** load `figma-use`, edit via `use_figma`, bind to variables, re-screenshot, re-run binding gate. **Screenshot:** design direction only (no source to edit).
- **Developer handoff** → structured table doc (Blockers / Critical / token spec / a11y checklist / Code Connect map / warnings / tips / what's correct). Or defer to `design:design-handoff`.
- **Wireframe to Spec** → annotate, don't score: layout, spacing (snapped to 8pt), typography (LexiTap scale), components + required states, copy placeholders (verbs), interaction notes, a11y requirements, open questions. `Write` to `design-spec-[name]-[date].md`. Mark estimates with `~`.
- **Re-audit** → same scope; show delta; list only changed/new issues; note "N unchanged".

**Dropped from upstream (don't attempt):** Visualizer/radar/sparkline widgets, Canva export,
`sendPrompt`, `create_design_system_rules`, Korean output, web/Vue/MUI/Chakra/shadcn code paths.
Replace any reference to them with the markdown/Claude-Code equivalent above.

---

## Reference files
- `references/figma-mcp.md` — **LexiTap-rewired** Figma workflow (mcp__Figma__* read, figma-use edit, binding gate, FIGMA.md, Archive gotcha)
- `references/react-native.md` — **LexiTap-specific** RN/Expo/nativewind code-audit checks, token vocabulary, hard invariants, fix format
- `references/typography.md` · `color.md` · `spacing.md` · `corner-radius.md` · `elevation.md` · `iconography.md` · `navigation.md` · `states.md` · `microcopy.md` · `tokens.md` · `animation.md` — design rules (platform-agnostic; CSS snippets inside are illustrative → translate via react-native.md)
- `references/ethics.md` — dark patterns taxonomy, ethics severity/score
- `references/heuristics.md` — Nielsen heuristics, usability score
- *(i18n.md dropped — LexiTap app UI is English-only, no RTL)*
