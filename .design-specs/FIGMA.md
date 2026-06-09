# FIGMA.md — the LexiTap design file, for agents who've never seen it

**If you are about to touch the design, read this first.** A cold-start agent has no
idea this file exists, where it lives, or how it's organized. This doc is the map.

---

## The file

| | |
|---|---|
| **File key** | `Jx0TLmVpgmsjtMA3uB6uS4` |
| **URL** | `https://www.figma.com/design/Jx0TLmVpgmsjtMA3uB6uS4/` |
| **Node URL form** | `…/Jx0TLmVpgmsjtMA3uB6uS4/?node-id=<id-with-dash>` (e.g. node `359:2` → `?node-id=359-2`) |
| **How to access** | Figma MCP is connected at the app level (no install). **Load the `figma-use` skill before any `use_figma` call** — mandatory. For building/extending full screens also load `figma-generate-design`; for building components load `figma-generate-library`. |
| **Editor mode** | Design (`/design/` URL) — full node-type set available. |

There is **one** design file. It is the source of truth for all app UI. It is NOT in
git — changes live in Figma. This repo holds the *specs around* it (tokens, gate, this map).

---

## Source-of-truth rule (do not violate)

**Design tokens are owned by code, not Figma.** `mobile/src/presentation/theme/tokens.ts`
is canonical; `lexitap-docs/03-ux-design/DESIGN_SYSTEM.md` is intent. **Figma ports those
1:1 — it never invents a token.** A token change goes **tokens.ts → DESIGN_SYSTEM.md →
Figma → verify**, never Figma-first. Brand = single teal `#20B2AA`, **dark mode is
canonical**, light is derived. Icons = Lucide.

---

## Page map (14 pages)

Get the live list any time with `get_metadata` (no nodeId) or
`figma.root.children.map(p => ({id:p.id, name:p.name}))`.

| Page id | Name | What's on it |
|---|---|---|
| `10:2`   | 🎨 Tokens | Color/space/radius **variables** (the `color`/`space`/`radius` collections). |
| `10:51`  | ✏️ Typography | Text styles (`type/*`). |
| `12:2`   | 🧩 Components | **The component library** — instantiate from here, don't rebuild primitives. |
| `238:2`  | 01 · Onboarding | |
| `238:3`  | 02 · Auth | |
| `238:4`  | 03 · Home | |
| `238:5`  | 04 · Learn Loop | |
| `238:6`  | 05 · Session | |
| `238:7`  | 06 · Curriculum | |
| `238:8`  | **07 · Words & Review** | Word Detail, Review Queue, Review History, SRS Schedule, empty/not-found states. |
| `238:9`  | 08 · Profile & Progress | |
| `238:10` | 09 · Purchase | |
| `238:11` | 10 · Settings, Support & System | |
| `0:1`    | 🗄️ Archive — Original Wireframes | **Superseded. Do not ship, do not edit. Never delete (Never-Lose-Work).** |

**Pages 01–10 are the shippable screens.** Each finished screen frame is named
`… — Rebuilt`. Each page also carries an **`Archive — pre-rebuild originals (do not ship)`
SECTION** and an `Annotations` SECTION.

### ⚠️ The single biggest gotcha: SECTIONs poison page-wide searches

The binding gate and any audit must look at **top-level FRAMEs only**
(`page.children.filter(c => c.type === 'FRAME')`). A page-wide `findAll`/`findOne`/`query`
sweeps the **Archive SECTION** too — which still holds pre-rebuild originals with raw fills,
emoji, and unbound text — and returns **false failures / false duplicates**. If a screen
looks like it has a broken twin, you're almost certainly looking at its archived original.
The rebuilt frame is the real one; the gate (top-level frames) is the truth.

---

## Component library (page `12:2`) — instantiate, don't rebuild

| Component | node id | Component | node id |
|---|---|---|---|
| Icon (set, 40 glyphs) | `273:2` | ListRow | `288:87` |
| Button | `278:18` | TopBar | `288:110` |
| Card | `279:15` | EmptyState | `290:97` |
| Streak | `282:30` | Field (non-quiz only) | `291:97` |
| Chip | `282:35` | Sheet | `291:98` |
| TabBar | `283:130` | AnswerOption (no TextInput) | `281:20` |
| DailyCapMeter | `284:66` | Banner | `290:96` |
| DragChip / DropZone | `285:58` / `285:70` | Avatar | `312:90` |
| MasteryRing | `287:55` | PackCard | `312:107` |
| KnowledgeMapBar | `287:58` | | |

Figma↔RN mapping (and which RN components exist yet) lives in
[`code-connect-map.md`](code-connect-map.md).

---

## What "code-ready" means — the binding gate

A screen is shippable when, per top-level frame:

```
rawFills === 0            every color is a bound color variable (no raw hex)
textBound === textTotal   every text node's fill is a bound variable
emojiTextNodes === 0      no emoji used as UI icons (use Icon instances)
detachedInstances === 0   no detached component instances
```

**Run it:** paste the body of [`figma-binding-audit.js`](figma-binding-audit.js) into the
`use_figma` tool (`skillNames:'figma-use'`). Set `TARGET_PAGE` inside it, or leave `null`
for the current page. It returns the objective PASS/FAIL numbers. Run it **before and after**
any screen change; "done" for a screen = `gate: PASS`.

---

## Conventions when you edit

- **Every fill** → bound to a `color/*` variable. **Every text fill** → bound variable. No raw hex.
- **Accent as TEXT** uses `accent/text` (`498:2`), NOT `accent` (`252:12`) — different WCAG bar
  (text needs 4.5:1, fill needs 3:1). Don't bind body/link text to the accent *fill*.
- **Icons** = instances of the Icon set (`273:2`), `glyph=<name>` variant. To add a glyph: fetch
  the **real** Lucide v1.17.0 SVG (`curl -sL https://unpkg.com/lucide-static@latest/icons/<name>.svg`
  — the `-L` matters), conform (1.75px stroke, ROUND cap/join, fills cleared, stroke bound to
  `text/primary` `252:9`), `createComponentFromNode`, `iconSet.appendChild` (auto-registers the
  variant). Never hand-type Lucide path data.
- **Text edits need the font loaded first**: `for (const seg of node.getStyledTextSegments(['fontName'])) await figma.loadFontAsync(seg.fontName)`.
- **Never delete an original.** Move superseded frames into the page's `Archive` SECTION.
- **Passive-recognition invariant:** NO `TextInput`/free-type field on any quiz/assessment screen.
- **One owner per page.** Parallel agents must not write the same page's node tree — they collide
  on shared components/variables. Fan out read-only; apply writes single-owner.
- Work **incrementally** (≤10 ops per `use_figma` call), and **`return` every created/mutated
  node id**.

---

## Key colour variable ids (the ones you'll reach for)

`accent` `252:12` · `accent/text` `498:2` · `text/primary` `252:9` · `text/secondary` `252:10`
· `text/tertiary` `252:11`. Collection `color`; modes Dark `252:0`, Light `252:1`. Resolve
the rest live with `figma.variables.getLocalVariablesAsync('COLOR')`.

---

## History / decisions

The design was finalized + revised across several sessions (all 10 pages rebuilt to `gate:
PASS`, icon set grown to 40, WCAG AA text-contrast fixed). The narrative + decisions are in
[`memory/MEMORY.md`](../memory/MEMORY.md) (search "Design Finalization" / "Design Revision")
and the plans under [`plans/`](../plans/). Read those before a large design change so you
don't re-litigate settled calls (proficiency screen CUT, drag-drop KEPT, non-punitive quiz
feedback, etc.).
