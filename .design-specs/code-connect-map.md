# Code Connect Map — Figma ⇄ RN (0.8 stub)

**Status:** stub (mapping reconciled against the repo 2026-06-09). **Not yet published** —
`@figma/code-connect` is **not installed** and several RN components don't exist yet (see
"TO CREATE" rows). This file is the source of truth for the intended `figma.connect()` wiring;
turn each row into a `*.figma.tsx` once the package is added and the component exists.

- **Figma file:** `Jx0TLmVpgmsjtMA3uB6uS4`
- **Node URL form:** `https://www.figma.com/design/Jx0TLmVpgmsjtMA3uB6uS4/?node-id=<id-with-dash>`
- **Why thin:** Figma variables/styles/components are named 1:1 with `tokens.ts` + RN components,
  so each mapping is a binding, not a translation. Design edits then surface as code diffs.

## Component mappings

| Figma component | node-id | RN counterpart | Status | Variant → prop |
|---|---|---|---|---|
| `Button` | `278:18` | `src/presentation/components/Button.tsx` | ✅ exists | `kind`→variant, `disabled`→disabled |
| `Card` | `279:15` (`type=base`) | `src/presentation/components/Card.tsx` | ✅ exists | — |
| `WordCard` | `279:15` (`type=word`) | `src/presentation/components/WordCard.tsx` | ⚠️ TO CREATE | — |
| `AnswerOption` | `281:20` | `src/presentation/components/assessments/MultipleChoice.tsx` | ✅ exists (option within) | `state`→{idle,selected,correct,incorrect}. **No TextInput.** |
| `DragChip` / `DropZone` | `285:58` / `285:70` | `src/presentation/components/assessments/DragDrop.tsx` | ✅ exists | chip `state`, zone `state` |
| `Streak` | `282:30` | `src/presentation/components/StreakBadge.tsx` | ✅ exists (plan said `StreakPill` — real name is **StreakBadge**) | `state`→{active,at-risk,frozen} |
| `MasteryRing` | `287:55` | `src/presentation/components/progress/MasteryRing.tsx` | ⚠️ TO CREATE (no `progress/` dir; `ProgressBar.tsx` exists) | — |
| `KnowledgeMapBar` | `287:58` | `src/presentation/components/progress/KnowledgeMapBar.tsx` | ⚠️ TO CREATE | — |
| `DailyCapMeter` | `284:66` | `src/presentation/components/progress/DailyCapMeter.tsx` | ⚠️ TO CREATE | `state`→{in-progress,done} |
| `TabBar` | `283:130` | `app/(tabs)/_layout.tsx` | ✅ exists | `active`→{home,quiz,progress,settings} |
| `Chip` | `282:35` | `src/presentation/components/Chip.tsx` | ⚠️ TO CREATE | `selected`→selected |
| `ListRow` | `288:87` | `src/presentation/components/ListRow.tsx` | ⚠️ TO CREATE | `trailing`→{chevron,toggle,value} |
| `TopBar` | `288:110` | `src/presentation/components/TopBar.tsx` | ⚠️ TO CREATE | `type`→{default,with-action} |
| `Banner` | `290:96` | `src/presentation/components/Banner.tsx` | ⚠️ TO CREATE | `type`→{success,caution,offline} |
| `Sheet` | `291:98` | `src/presentation/components/Sheet.tsx` | ⚠️ TO CREATE | — |
| `Field` | `291:97` | `src/presentation/components/Field.tsx` | ⚠️ TO CREATE | `state`→{default,focus,error}. Non-quiz only. |
| `EmptyState` | `290:97` | `src/presentation/components/EmptyState.tsx` | ⚠️ TO CREATE | — |
| `Icon` (Lucide set, 32 glyphs) | `273:2` | `lucide-react-native` | ⚠️ dep NOT installed | `glyph`→icon name (kebab→PascalCase) |
| `color/*` `type/*` `space/*` `radius/*` | (variables) | `src/presentation/theme/tokens.ts` | ✅ exists | 1:1 token names |

## To publish (post-stub)
1. `cd mobile && npm i -D @figma/code-connect` (+ `lucide-react-native` for icons; pin version, verify `bar-chart`/`circle-check` aliases resolve).
2. Create the ⚠️ TO CREATE components (they're designed + token-specced in Figma already).
3. Author one `<Component>.figma.tsx` per row using the node-id URL + the variant→prop table above.
4. `npx figma connect publish`.

*Reconciliations vs the plan's 0.8 table: `StreakPill`→`StreakBadge`; progress components live under a `progress/` subdir that doesn't exist yet; `WordCard` is a distinct file from `Card`.*
