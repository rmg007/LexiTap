# Metadata Templates — LexiTap

Fill these, respect every limit in `platform-rules.md`, print a char count per field, then write results into `website/assets/STORE_COPY.md`. These are starting structures — tune the actual words against the keyword research, don't ship the placeholders.

## Title (Apple ≤30) — brand + top keyword
Pattern: `LexiTap: <top keyword phrase>`
- `LexiTap: Learn English Words` (28)
- `LexiTap — English Vocabulary` (28)
- `LexiTap: ESL Vocabulary` (23)

Pick based on which keyword phrase the research ranks highest. Title carries the most search weight — spend it on your #1 winnable phrase, not decoration.

## Subtitle (Apple ≤30) — second phrase + benefit, no title repeats
- `Spaced repetition for exams` (27)
- `Offline word trainer & TOEFL` (28)
- `Build vocabulary, pass exams` (28)

## Apple keyword field (≤100, comma-separated, NO spaces, no title/subtitle repeats)
Assemble from `keyword-strategy.md` atoms. Example skeleton (replace after research, count chars):
```
spaced,repetition,flashcard,toefl,ielts,exam,fluency,cefr,offline,beginner,intermediate,memorize,practice,frequency
```
Rules reminder: drop any atom already in title/subtitle; singular only; no brands; no spaces.

## Promotional text (Apple ≤170, editable without update)
Launch / seasonal hook. e.g.:
`New: adaptive placement finds your level in 2 minutes — then learns the exact words you're missing. Works fully offline. Pay once for exam packs, no subscription.`

## Description (Apple ≤4000, NOT indexed → pure conversion)
First 2–3 lines show above the "more" fold — front-load the hook. Structure:

```
Learn the English words that actually matter — ranked by how often they appear, tuned to your level, and drilled with spaced repetition so they stick. Works 100% offline.

WHY LEXITAP
• Adaptive start — a 2-minute check places you at your real level (no guessing, no rote level-picking).
• Spaced repetition — review exactly when you're about to forget, so words move into long-term memory.
• Frequency + CEFR ranked — learn high-impact words first, aligned to A1–C2.
• Built for exams — focused TOEFL / IELTS / academic packs when you need them.
• Fully offline — learn on the train, on a flight, anywhere. No connection required.
• Pay once — exam packs are one-time purchases. No subscription.

HOW IT WORKS
1. Take the 2-minute adaptive placement.
2. LexiTap maps what you know and targets your frontier — the words just beyond your current range.
3. Practice with quick tap/match exercises; spaced repetition schedules each review.

FOR EVERY LEARNER
Whether you're reaching B2 for university, prepping for an exam, or strengthening everyday English — LexiTap meets you where you are. Designed for non-native English learners, ages 13+.

Start free. Upgrade only if you want exam packs.
```
Keep English **B1-readable** (your users are ESL). Short sentences. No idioms that block comprehension.

## What's New (Apple ≤4000) — real changes only
Lead with the user-facing win, not the version number. e.g.:
`Faster placement, smoother reviews, and a new IELTS pack. Thanks for the reviews — keep them coming.`

## Visual assets (conversion — drives SCREENSHOTS_SPEC.md)
- **Icon:** simple, legible at 1× (small). One strong mark, brand teal. **Final icon ships as a vector with Ryan's sign-off** (see `scripts/README.md`) — never an AI PNG.
- **Screenshots (first 2 are ~80% of the decision):**
  1. The hook + value: "Learn the English words that matter" over the adaptive-placement or knowledge-map screen.
  2. Mechanism proof: spaced-repetition / progress, "Remember words for good."
  3. Exam packs: "Ready for TOEFL & IELTS."
  4. Offline: "Learn anywhere — no internet."
  5. Social proof / breadth once available.
  Each screenshot needs a **caption** (don't ship bare device frames) — captions are read more than the description. Keep captions B1-readable.
- **App preview video (optional):** 15–30s, show the placement → learn → remember loop in the first 5s.

## After producing metadata
Write the final strings into `website/assets/STORE_COPY.md` (canonical), update `SCREENSHOTS_SPEC.md` with caption copy, and note the version in `mobile/app.config.ts`.
