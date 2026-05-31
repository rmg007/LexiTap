# P-1 Presentation States — Verification Checklist

**Goal:** Quiz/Progress/Home handle service failures gracefully, never crash on network errors, show calm empty states instead.

## QuizScreen

- [x] **No words in tier** → `NoWordsAvailableError` caught, phase becomes 'empty'
  - UI: "All caught up / You're done for today. Nice work."
  - A11y: header role on "All caught up", primary button
  - Network: not assumed
  - File: `QuizScreen.tsx:60-68`

- [x] **DB read failure during start** → any error caught, phase becomes 'empty'
  - Same calm "All caught up" state as above
  - File: `QuizScreen.tsx:60-68`

- [x] **Answer write failure (offline)** → error caught, local advance
  - Answer still recorded (offline-first), quiz continues
  - No blocking UI or error toast
  - File: `QuizScreen.tsx:104-108`

- [x] **Loading state** — "Preparing your session…" while fetching
  - File: `QuizScreen.tsx:113-120`

- [x] **Defensive null check** — if word index past end, show "Back to Home" button
  - File: `QuizScreen.tsx:155-163`

## ProgressScreen

- [x] **Stats read failure** → setStats(null), show defaults
  - File: `ProgressScreen.tsx:38-42`

- [x] **Mastery levels read failure** → empty array fallback
  - Each tier shows 0 mastered of 0 total (calm, not error)
  - File: `ProgressScreen.tsx:46-51`

- [x] **Active tiers list empty** → no cards rendered, just header + empty state
  - File: `ProgressScreen.tsx:92-104` (loop is conditional on tiers.length)

## HomeScreen

- [x] **Stats read failure** → setStats(null), show defaults
  - Streak shows 0, sessions 0, mastered 0
  - File: `HomeScreen.tsx:45-51`

- [x] **Daily progress query failure** → fallback metrics
  - Reviews: 0/40, New words: 0/10 budget left
  - File: `HomeScreen.tsx:53-67`

- [x] **No active tier** → gracefully skip tier line or show fallback
  - File: `HomeScreen.tsx:111-115` (conditional render)

## Cross-cutting

- [x] **Error boundaries** — no unhandled exceptions escape to Sentry (offline-first principle)
  - Every service call wrapped in try-catch
  - Never re-thrown, always fallback to zero-state

- [ ] **A11y on empty states**
  - Verify ≥44pt button targets on QuizScreen empty/complete
  - Verify role+label on all text in empty states
  - Check: accessible labels on empty cards (ProgressScreen)
  - Check: contrast on "All caught up" text (QuizScreen)

- [ ] **Test coverage**
  - QuizScreen empty-state path (test file created: QuizScreen.test.tsx, needs flesh-out)
  - ProgressScreen error-handling path (query failures)
  - HomeScreen error-handling path (query failures)

## Known issues to verify

- ✅ C0 (words.db) proven on iOS simulator, physical device build pending
  - If words.db is missing/empty on device: tier will have 0 words → NoWordsAvailableError
  - This is covered by QuizScreen.empty state above

## Acceptance criteria (P-1 gate)

- [ ] All three screens (Quiz/Progress/Home) show calm, friendly empty states on any service failure
- [ ] No unhandled exceptions in logs or Sentry
- [ ] A11y verified on all empty/error states
- [ ] Cold-launch test on physical iOS + low-end Android with broken/missing data succeeds

## Status

**Code:** ~95% done (error handling implemented)
**Testing:** 0% (needs test flesh-out)
**A11y verify:** 0% (needs review)
**Device verify:** Pending C0 device build
