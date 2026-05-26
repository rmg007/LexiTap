---
title: Word Detail Browser Spec
screen_id: word-detail-browser
category: ux-design
status: active
updated: 2026-05-26
priority: P2
tab: Progress
target_file: TBD
related_flows: []
tags: [screen, progress, browser, vocabulary, list, keyset-pagination]
---

# Word Detail Browser

> AI-buildable spec. Tokens from [DESIGN_SYSTEM.md](../DESIGN_SYSTEM.md). Surfaces the vocabulary list from `words.db` for the active content tier, joined with runtime mastery overlays from the `user_progress` table in `user.db` via an attached SQL query. Keyset pagination ensures lightning-fast load times even on lower-end devices.

## 1. Purpose

Allows learners to browse all active vocabulary words in their currently focused or selected tier, seeing their exact progress/mastery levels at a glance. Helps users self-evaluate their learning achievements in a pressure-free environment.

## 2. Entry & exit

| Direction | From / To | Trigger |
|---|---|---|
| Enter | Progress → Tap Unlocked Tier card | User clicks to browse the tier's vocabulary |
| Exit | Progress | Tap Back (`←`) |

## 3. Layout

```
┌─────────────────────────────┐
│ ←   Foundation Words        │  ← back (A) + title (B)
│     3,000 words total       │  ← total words count (C)
│                             │
│ ┌─────────────────────────┐ │
│ │ frugal            ◕     │ │  ← word label (D) + mastery indicator (E)
│ │ adjective               │ │  ← POS (F)
│ │ careful with money;     │ │  ← definition (G)
│ │ not wasteful            │ │
│ ├─────────────────────────┤ │
│ │ candid            ◑     │ │
│ │ adjective               │ │
│ │ honest and direct       │ │
│ └─────────────────────────┘ │
│      [ Load more ]          │  ← pagination CTA (H), keyset page boundary
└────────────────────────────────┘
```

## 4. Anatomy

| Ref | Region | Component | Tokens | Content source |
|---|---|---|---|---|
| A | Back | Icon button | `text.secondary` | navigation trigger |
| B | Title | Text `headline` | `text.primary` | active tier title |
| C | Total | Text `caption` | `text.tertiary` | active tier word count |
| D | Word label | Text `body.lg` | `text.primary` | `words.word` |
| E | Mastery | Ring glyph (e.g. `◑`) | `accent` arc | `user_progress.mastery_level` |
| F | POS | Text `caption` | `text.tertiary` | `words.word_type` |
| G | Definition | Text `body` | `text.secondary` | `words.definition` |
| H | Load more | Secondary button | `border.subtle`, `text.secondary`| keyset pagination trigger |

## 5. Data requirements

### Primary Pagination Query
Executed against the bundled, read-only `words.db` (main) with the read-write `user.db` (userdb) attached:
```sql
SELECT
  w.id, w.word, w.definition, w.cefr_level, w.difficulty,
  w.word_type, w.audio_path,
  COALESCE(p.mastery_level, 0)   AS mastery_level,
  p.next_review_date
FROM words w
LEFT JOIN userdb.user_progress p ON w.id = p.word_id
WHERE
  w.tier_id = ?
  AND w.deleted_at IS NULL
  AND (? IS NULL OR w.word > ?)   -- keyset anchor; NULL on first page
ORDER BY w.word ASC
LIMIT 50;
```

- **Use Case Boundary:** `BrowseWordListUseCase` in `application/vocabulary/`; infrastructure query implemented in `infrastructure/db/queries/wordQueries.ts`.
- **Active Invariant:** Strictly filters `w.deleted_at IS NULL` to hide content removed from active study paths.

## 6. States

| State | Trigger | Rendering |
|---|---|---|
| **Loading** | Initial fetch | Skeletal list items render; title and back button are visible immediately. |
| **Data Loaded** | Query returns data | Paginated list of 50 items displayed with mastery overlays; Load More button enabled at page bottom. |
| **No Mastery / New** | `mastery_level IS NULL` | Mastery ring is blank (mastery level 0). |
| **End of List** | Returned items < 50 | Load More button is hidden. |
| **Offline** | Default | Fully functional offline from local SQLite databases. No error banners. |

## 7. Interactions

| Element | Trigger | Result | Haptic |
|---|---|---|---|
| Back (A) | tap | Return to Progress screen | none |
| Row | tap | Play pronunciation (if audio available on tier) | `selection` |
| Load More (H) | tap | Fetch next 50 words using keyset anchor; append to list | none |

## 8. Copy

| Key | String | Notes |
|---|---|---|
| title | "{Tier} Words" | e.g. "Foundation Words" |
| count | "{total} words total" | |
| btn.load | "Load more" | |

## 9. Accessibility

- Read order: back → title → count → list items (word → mastery → definition) → Load More.
- Each list item announces word, part of speech, definition, and mastery state (e.g. "frugal, adjective, careful with money, mastery level 3 out of 5").
- Tap targets ≥ 48×48.

## 10. Motion

- Keyset appends slide in from the bottom with `motion.fast` (120ms).
- Reduce Motion instantly appends new items.

## 11. Acceptance criteria

- [ ] Keyset pagination implemented strictly using alphabetical order (`w.word > ?`). No high-cost offset queries.
- [ ] Joins `words.db` and attached `user.db` progress tables correctly in a single, non-blocking query.
- [ ] Strictly filters `deleted_at IS NULL` for active vocabulary.
- [ ] No `TextInput` is introduced on this browser screen.
- [ ] All visual styling respects `DESIGN_SYSTEM.md` token values.
- [ ] Scroll performance remains buttery-smooth on 50-item pages.

## 12. Open questions

- **Muting/Archiving:** Can a user archive/mute a word directly from this browser screen? (Decision: Defer to post-launch/Phase 2 as this requires writing new schema fields to `user.db` which is outside the scope of MVP).
