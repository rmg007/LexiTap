# Figma MCP Workflow Reference — LexiTap

> **LexiTap port.** This file replaces the upstream skill's Figma workflow, which
> assumed the Figma Desktop MCP (`resolve_shortlink`, `get_design_pages`,
> `perform_editing_operations`, `create_design_system_rules`). **None of those exist
> in this environment.** Here the read tools are `mcp__Figma__*` and *editing is done
> through the `figma-use` skill + `use_figma`*, never `perform_editing_operations`.

---

## Cold-start: read FIGMA.md FIRST

Before any Figma call, read [`.design-specs/FIGMA.md`](../../../../.design-specs/FIGMA.md).
It is the canonical map of the LexiTap design file:

- File key: `8YT6PYWnpX6nqkT2mxXOwi`
- All 14 page IDs + the 20-component inventory with node IDs
- The **binding gate** (rawFills 0 · text bound · emoji 0) — the project's real "design is code-ready" bar
- The token source-of-truth rule (`mobile/src/presentation/theme/tokens.ts` wins; Figma ports 1:1, never invents)
- The SECTION/Archive false-positive gotcha (page-wide searches sweep archived originals)

This audit skill **layers on top of** the binding gate — it does not replace it. The gate
proves token binding; this skill audits design *quality* (hierarchy, contrast, states, copy, a11y).

---

## Available read tools (this environment)

| Tool | Use |
|---|---|
| `mcp__Figma__get_metadata` | File/node info. Confirm the right file (`8YT6PYWnpX6nqkT2mxXOwi`). |
| `mcp__Figma__get_design_context` | **Primary read.** Layer tree, type, fills, layout, padding/gap, component refs. |
| `mcp__Figma__get_screenshot` | Visual render — catches crowding/contrast/hierarchy that data misses. Always pair with context. |
| `mcp__Figma__get_variable_defs` | Bound variables/tokens (`color/...`, `space/...`, `radius/...`). Drives Cat 2 contrast + Cat 17 tokens. |
| `mcp__Figma__get_code_connect_map` | Confirmed Figma→code mappings (if configured). |
| `mcp__Figma__get_code_connect_suggestions` | AI-suggested mappings. Skip silently if empty. |

**No `resolve_shortlink`:** if given a short URL, ask the user to paste the full
`figma.com/design/<fileKey>/...?node-id=<n-n>` URL, or the node ID directly.

**No `get_design_pages`:** the page map is in FIGMA.md. To pick a page, read FIGMA.md's
page table and ask the user with `AskUserQuestion` which page/screen to audit.

### F0 — Check MCP availability
Attempt `get_design_context` on the target node. If it fails/unavailable, tell the user
plainly and offer the fallback: screenshot export or the Figma right-panel CSS/values, then
run the audit at **🟡 Medium confidence**. Never hallucinate layer values.

---

## Reading: what to extract per category

### Component health scan (run on every Figma audit)
Classify each non-hidden layer: named component instance ✅ · meaningfully-named frame ⚠️ ·
generic name ("Frame 12"/"Rectangle"/"Group 7") 🔴 · detached (no `componentId`) 🟡.

```
component_pct = named instances / total × 100
unnamed_pct   = unnamed layers  / total × 100
≥60% ✅ · 30–59% 🟡 · <30% 🔴
Header line: "Component health: N% coverage · N detached · N unnamed"
Flag: unnamed_pct>20% 🟡 · detached>0 🟡 · component_pct<30% 🔴
```

> **LexiTap reality:** the design file was rebuilt to a 20-component library at `gate: PASS`
> across all 10 screen pages (see memory). Expect **high** component coverage. Low coverage on a
> screen page is a regression worth flagging; on the `🧩 Components` or `🗄️ Archive` pages it is
> expected (see the SECTION gotcha below).

### Auto-Layout scan
Frames with 2+ row/column children but no `layoutMode` → 🟡 (convert to Auto Layout).
`itemSpacing`/padding off the 8pt grid → 🟡 (same as Cat 3). Auto-Layout + `FILL`/`Min W`
constraints → ✅.

### Typography / Color / Spacing
- Typography: `fontSize` < 14 body 🔴; two sizes within 2px 🟡; >5 distinct sizes 🟡. Map sizes to
  LexiTap's scale (`h1 44 · display 34 · title 28 · headline 18 · bodyLg 18 · body 15 · label 14 · caption 13 · smallCaps 11`).
- Color: pull pairs from `get_variable_defs`; compute WCAG contrast (see `color.md`). Token-based
  contrast = 🟢 High confidence even without a screenshot.
- Spacing: padding/gap should be `spacing.s1–s8` (4/8/12/16/24/32/48/64). Off-scale → 🟡.

### The SECTION / Archive gotcha (LexiTap-specific)
The real gate audits **top-level FRAMEs only** (`page.children.filter(type==='FRAME')`).
Page-wide `findAll` sweeps `Archive — pre-rebuild originals` and `Annotations` SECTIONs — those
contain pre-rebuild originals with raw fills + emoji and will produce **false FAILs**. When a node
looks like a regression, confirm it is a live top-level frame, not an archived original.

---

## Tokens & contrast (Cat 2 + Cat 17)

`get_variable_defs` is the source. A value in `get_design_context` that matches a variable = tokenized ✅;
no match = hardcoded 🔴. Declare coverage: "4 of 7 color values tokenized (57%)".

**Token source of truth = `mobile/src/presentation/theme/tokens.ts`.** If a Figma value diverges from
tokens.ts, tokens.ts wins — flag the Figma node, never "fix" tokens.ts to match Figma. LexiTap brand is
a single teal (`accent #20B2AA` dark / `#178F88` light); accent-as-*text* uses `accentText`
(`#20B2AA` / `#0F6E68`) because the light fill teal fails AA as small text. Flag accent-fill teal used
as small body text → should be `accentText`.

---

## Editing in Figma — via `figma-use`, NOT `perform_editing_operations`

There is **no `perform_editing_operations`** here. To apply a fix in the Figma file:

1. **Load the `figma-use` skill first** (mandatory prerequisite for any `use_figma` call).
2. Apply edits by running JS in the file context via `use_figma` (set fill to a bound variable,
   set fontSize, set padding, rename layer, etc.).
3. **Re-bind to variables, don't hardcode** — a fix that writes a raw hex/px re-breaks the binding
   gate. Bind to the `color/`/`space/`/`radius/` variable that matches tokens.ts.
4. After each edit, `get_screenshot` the node to verify.
5. Re-run the binding gate (`.design-specs/figma-binding-audit.js`) on the touched page — a fix that
   passes this audit but fails the gate is not done.

### Safety rules (unchanged in spirit)
- Confirm before editing; list what you'll change, then execute.
- Target node IDs from `get_design_context` — never guess IDs.
- One risky change at a time (color/layout); verify before continuing.
- **Component-instance caveat:** you cannot edit layers *inside* an `INSTANCE`. Edit the **main
  component** (its `componentId`) so the change propagates. If the master is in a shared library you
  can't reach, give design direction instead. Editing component *masters* propagates to instances;
  only true instance-level overrides need per-node fixes (the design-revision session hit exactly this).
- If `use_figma` editing is unavailable or the file is view-only → fall back to **design direction**:
  describe the change + give the exact Figma right-panel value + the matching token name. Never silently skip.

### Common fixes → token to bind
| Issue | Bind to |
|---|---|
| Off-grid padding/gap | `space/s1…s8` (4/8/12/16/24/32/48/64) |
| Off-scale radius | `radius/sm 8 · md 12 · lg 20 · full 999` |
| Low-contrast text | the `color/text/*` or `color/accentText` var that passes AA |
| Font size off scale | nearest `typography` level (see scale above) |
| Touch target < 44px | width/height ≥ 44 (or add `hitSlop` in RN — see `react-native.md`) |
| Unnamed layer | `RENAME` to `Component/Variant/State` convention |

---

## Code Connect (if available)

Call `get_code_connect_map` + `get_code_connect_suggestions` on the node. Use to enrich Cat 5 /
Cat 17 and the handoff table. LexiTap's mappings live in `code-connect-map.md` (icon row etc.).
Flag Figma components with no code equivalent → 🟡 (handoff gap). Skip silently if both return empty.
**There is no `create_design_system_rules`** — for design-system enforcement, point the user at the
binding gate + `figma:figma-generate-library` skill instead.

---

## When Figma MCP isn't available
Ask the user to export a screenshot, paste right-panel values, or paste Figma's Inspect → CSS
(contains exact sizes/colors/spacing). Run at 🟡 Medium confidence.
