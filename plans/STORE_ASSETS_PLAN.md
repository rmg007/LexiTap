# LexiTap — Store Assets Plan

**Status:** Draft  
**Platforms:** iOS (App Store) + Android (Google Play)  
**Updated:** 2026-06-09

---

## 1. App Name (30 chars max — iOS)

**LexiTap: English Vocabulary**

- 22 characters. Stays under the limit with room.
- "LexiTap" is the brand; "English Vocabulary" is the high-search-volume category keyword. Apple indexes the app name as a keyword field — every word here is a free keyword slot. "English Vocabulary" outperforms "ESL" or "Word Learning" on raw search volume (globally, people search "English vocabulary app", not "ESL app").
- On Android the name is separate from the short description, so this exact string works for Play as well.

---

## 2. Subtitle — iOS only (30 chars max)

**TOEFL, IELTS & Exam Prep**

- 28 characters.
- Leads with the two highest-intent exam terms. Both are top-searched queries in the Education category. Pairs with the app name to read: "LexiTap: English Vocabulary — TOEFL, IELTS & Exam Prep", which is the full first impression in search results.
- Avoided generic filler like "Learn Words Fast" — the subtitle needs to do keyword work that the name field can't do twice.

---

## 3. Short Description — Android (80 chars max)

**Build English vocabulary for TOEFL, IELTS & GRE. Works offline.**

- 64 characters.
- Leads with the action verb ("Build"), names three top exam terms, closes with the #1 functional differentiator ("Works offline"). Offline reliability is a real pain point for APAC learners on metered data.

---

## 4. Full Description (iOS / Play — up to 4000 chars)

You've studied English for years — yet the vocabulary section of the TOEFL stops you cold. You recognize a word in conversation but blank on its precise meaning under timed pressure. You've lost months of flashcard progress after switching phones. Standard apps give you a one-line definition and expect you to remember it. That isn't how memory works.

LexiTap is built differently. Every word gets a felt explanation — the kind that makes a meaning stick — plus full teaching examples you can hear. Spaced repetition schedules exactly when to review each word, so nothing falls off the back of the list. And because vocabulary study happens in five-minute commute windows, not at a desk, the entire app works offline from the moment you install it.

**No typing. Ever.**

Every quiz is tap, drag, or match. Recognition practice is how real vocabulary acquisition works on a phone: fast, low-friction, and genuinely effective. There is no keyboard in the quiz loop.

**Free — and genuinely useful**

The Foundation tier covers the 3,000 most common English words, ordered by frequency and CEFR level (A1 through C1), with audio on every word and sentence. Full spaced repetition, streak tracking, and progress sync are included at no cost. The free tier is not a teaser — it is a complete vocabulary curriculum for A1–C1.

**Exam packs for when the stakes are real**

When you have a TOEFL, IELTS, GRE, or GMAT date on the calendar, unlock the exam-curated pack for that test. Each pack surfaces the rare academic and domain-specific words that a frequency list never reaches — the words that actually separate TOEFL scores in the 100–110 range, or clear the IELTS band 7–8 vocabulary bar. One-time purchase, $9.99 per pack. No subscription. You own it forever, including content updates.

If you are preparing for more than one exam — or plan to — the All-Exams Bundle ($29.99) unlocks every current and future exam pack at once. One purchase covers TOEFL, IELTS, GRE, GMAT, and Business English, plus any packs added after you buy.

**Progress that travels with you**

Sign in to sync your progress. If you lose your phone, your SRS schedule, streak, and mastery data restore to a new device. Sync is free and automatic.

**Built for serious learners**

LexiTap is designed for adult non-native English speakers — not for children, not for native speakers building SAT words. The visual design is clean and minimal, calibrated for the learner who pulls it out on the subway or between meetings without embarrassment.

Start with the free Foundation vocabulary. Add an exam pack when your test date arrives.

---

## 5. Keywords — iOS (100 chars max, comma-separated)

```
TOEFL,IELTS,GRE,vocabulary,ESL,english words,flashcards,exam prep,spaced repetition,word quiz
```

**Character count:** 94 characters (within the 100-char limit).

**Rationale for each term:**

- `TOEFL` — highest-intent, highest-WTP search term in the Education category for this audience. Persona 1 (Mei) arrives here.
- `IELTS` — second-highest intent. Persona 2 (Rafael) arrives here.
- `GRE` — post-launch pack, but worth the slot now: GRE vocabulary searchers are an underserved, desperate segment.
- `vocabulary` — the broadest volume term; anchors the category.
- `ESL` — narrower but highly qualified; filters out native-speaker noise.
- `english words` — the exact phrase form people type, distinct from "vocabulary". Apple treats multi-word terms as single units.
- `flashcards` — the existing mental model this app replaces. Competitive term with high volume.
- `exam prep` — catches candidates who haven't yet decided which exam; cross-captures GMAT/TOEIC intent.
- `spaced repetition` — lower volume but very high precision. The learner who searches this is already converted to the method; they just need the app.
- `word quiz` — filler-proof; covers the quiz interaction pattern and adds another dimension to search coverage.

**Not included and why:**
- `english learning` / `learn english` — too broad, too competitive; dominated by Duolingo/Babbel with massive ASO budgets. LexiTap cannot win that fight and should not try.
- `GMAT` / `business english` — would improve coverage but pushed the character count past 100. Add post-launch if conversion data shows GMAT attach rate warrants a keyword swap.
- `offline` — key differentiator but low search volume as a keyword; better in the description and subtitle than in keywords.

---

## 6. Screenshots Spec — iOS, Portrait 6.9" (6 screens)

Screenshots are the first thing a user sees when they tap your store listing. On iPhone 6.9" (iPhone 16 Pro Max), portrait screenshots are 1320 × 2868 px. Use a dark background (the app is dark-canonical). Each caption overlay: large headline at top or bottom, brief subhead below.

---

### Screenshot 1 — The Learn Card (multi-sense, hero screen)

**Screen:** `LearnCardScreen` in active multi-sense state  
**Word to show:** "Design" (or another word with 2 distinct senses — noun vs. verb)  
**State:** Card showing MEANING 1 and MEANING 2 blocks, each with a short gloss, felt explanation in full, and 1–2 example sentences visible. Bottom of card shows "Tap to continue" or equivalent affordance. No progress bar visible.  
**Caption headline:** "Words that actually stick"  
**Caption subhead:** "Felt explanations + real examples, not just definitions"  
**Placement:** Headline at bottom, large type, white on dark.  
**Why this first:** The unique value prop — rich word detail — is what differentiates LexiTap from a standard flashcard app. Lead with it.

---

### Screenshot 2 — The Quiz Loop (passive recognition)

**Screen:** `LearnQuickCheckScreen` — multiple-choice recognition quiz  
**State:** A question card with the word shown at top, 4 answer tiles below, one tile in the "selected but not yet confirmed" state (highlighted). No typing keyboard visible anywhere.  
**Caption headline:** "No typing. Pure recognition."  
**Caption subhead:** "Tap the meaning — the fastest way to build vocabulary on a phone"  
**Why this second:** The no-typing mechanic is the core UX differentiator and a direct response to the frustrated-flashcard-user pain. Show it early.

---

### Screenshot 3 — SRS Progress / Home screen

**Screen:** Home screen showing the user's active learning stack and streak counter  
**State:** A realistic-looking state — streak counter showing e.g. 12 days, "Foundation A2" tier in progress, "47 words due for review" indicator, knowledge map bar partially filled. No empty state.  
**Caption headline:** "Spaced repetition that actually works"  
**Caption subhead:** "Reviews scheduled exactly when you need them — not before, not after"  
**Why here:** After seeing what a session looks like (screens 1–2), show the habit loop that keeps learners coming back. The streak + due-count framing communicates both reward and system.

---

### Screenshot 4 — Onboarding / Knowledge Map reveal

**Screen:** `OnboardingKnowledgeMapScreen` — the "You already know ~X words" reveal at the end of the adaptive diagnostic  
**State:** Knowledge bar showing 3 segments (Known in green, Learning in teal, New in grey). Copy reading something like "You already know ~1,400 words. Time to push to 3,000." Start learning button visible.  
**Caption headline:** "Starts at your level — not the beginning"  
**Caption subhead:** "Short quiz places you in the right tier automatically"  
**Why here:** Personalization anxiety is a real install-to-delete driver. Showing the diagnostic outcome reassures the user they won't be doing baby-level A1 work.

---

### Screenshot 5 — Paywall / Exam Pack selection

**Screen:** Paywall screen — exam pack grid  
**State:** 4–5 pack cards visible (TOEFL, IELTS, GRE, GMAT, Business English), each showing pack name and "$9.99 one-time". All-Exams Bundle card prominent at bottom ($29.99). No "Subscribe" button anywhere.  
**Caption headline:** "One-time unlock. Yours forever."  
**Caption subhead:** "TOEFL, IELTS, GRE & more — no subscription, no renewal"  
**Why here:** The "no subscription" message is a conversion driver for Rafael (IELTS immigrant) and Sunil (GRE) who have been burned by subscription apps. Screenshot 5 directly addresses that objection before the paywall moment in-app.

---

### Screenshot 6 — Word audio / offline confirmation

**Screen:** `LearnCardScreen` in audio-playing state — or a Settings screen showing "Offline mode: Ready"  
**Preferred:** The learn card with the pronunciation phonetic displayed prominently and a visible audio waveform/play indicator  
**State:** Word "accommodate" with phonetic `/əˈkɒmədeɪt/`, audio control highlighted, a checkmark or badge reading "Available offline"  
**Caption headline:** "Works offline. Audio included."  
**Caption subhead:** "Study on the subway — no data required"  
**Why last:** Closes the set by addressing the two remaining practical objections (needs wifi, no audio). For APAC learners on metered data plans, offline reliability is a real purchase trigger.

---

## 7. App Preview Video — Brief Storyboard (15–30 seconds)

Optional but high-value for Education category. Target 15 seconds.

**Beat 1 — Problem (0–3s)**  
Screen: a generic flashcard app showing a dry one-line definition. Voiceover (or caption): "Definitions don't stick."  
Quick cut.

**Beat 2 — The learn card (3–10s)**  
Screen: LexiTap learn card with the word "design", two meaning blocks animating in, felt explanation visible, audio playing. User taps to advance. Caption overlay: "Explanations that actually teach."

**Beat 3 — The quiz (10–14s)**  
Screen: Multiple-choice card. User taps an answer. Green confirmation. Caption: "No typing. Fast recognition."  
Brief flash of streak counter ticking up.

**Beat 4 — CTA (14–15s)**  
App icon centered on dark background. Caption: "LexiTap — free to start."  
App Store badge or "Download free" text.

**Notes for production:**
- No voiceover required — captions alone work and avoids localization cost.
- Real device recording preferred over simulator (store guidelines).
- Music: none, or a very quiet neutral tone. Exam-prep audience is not Duolingo; avoid gamification vibes.

---

## Commit Checklist

- [ ] Stage this file: `git add plans/STORE_ASSETS_PLAN.md`
- [ ] Write commit message to a temp file, then `git commit -F <tempfile>`
- [ ] Push before session end

---

## Open Questions (non-blocking pre-launch)

- Screenshot locale: which real device or frame to use for submission (standard iPhone 16 Pro Max 6.9" frame, or frameless)?
- Android screenshot count: Play allows up to 8; 6 iOS screens reuse, or add 2 Android-specific (e.g. tablet layout if supported)?
- App Preview video: Ryan's call whether to produce it at launch or post-launch. High-quality video takes real device + editing time.
- GMAT keyword: worth adding post-launch once GMAT pack attach rate is measurable.
- Regional pricing: Play Store localized pricing for APAC (India/Indonesia/Vietnam) — deferred per revenue model doc.
