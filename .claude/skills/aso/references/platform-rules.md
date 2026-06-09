# Platform Rules — field limits & constraints

Hard character limits and indexing rules. Violating a limit = truncation or rejection. **Always print a live character count next to each field you produce.**

## Apple App Store (optimize NOW — iOS-first)

| Field | Limit | Indexed for search? | Notes |
|---|---|---|---|
| **App Name (Title)** | **30 chars** | **Yes (highest weight)** | Brand + top keyword phrase. e.g. `LexiTap: Learn English Words`. |
| **Subtitle** | **30 chars** | **Yes (high weight)** | Second keyword phrase / benefit. Don't repeat title words. |
| **Keyword field** | **100 chars** | **Yes** | Comma-separated, **NO spaces**. Hidden from users. See rules below. |
| **Promotional Text** | 170 chars | No | Editable **without** app update — use for launch/seasonal hooks. |
| **Description** | 4,000 chars | **No** (Apple doesn't index it) | Conversion, not ranking. First 2–3 lines matter (above "more"). |
| **What's New** | 4,000 chars | No | Re-engagement; announce real changes. |
| **In-App Purchase names** | 30 chars | **Yes** | Exam-pack IAP display names ARE indexed — use keywords (e.g. "TOEFL Vocabulary Pack"). |

### Apple keyword-field rules (the 100 chars — get this exactly right)
- **No spaces after commas.** `english,vocabulary,esl` not `english, vocabulary, esl` — spaces waste characters.
- **No plurals if singular is present.** Apple stems; `word` covers `words`. Don't spend chars on both.
- **Don't repeat words already in Title or Subtitle** — they're already indexed. The keyword field is for *additional* terms.
- **No competitor brand names** (e.g. Duolingo, Anki) — grounds for rejection.
- **Singular terms combine** — Apple auto-combines keyword-field words with each other and with title/subtitle into phrases. So list atoms (`learn,english,vocabulary,exam,toefl`) — it forms "learn english", "english vocabulary", etc.
- **No need for "app", "the", connector words, or your category name** — wasted.
- Use **commas only**; the whole field is one comma-separated string.

### Apple specifics for LexiTap
- **Primary category:** Education. **Secondary:** Reference (or Education only — see keyword-strategy).
- **Age rating:** target **4+** content-wise, but app serves **13+** (privacy/account). Confirm against actual content questionnaire; ESL vocab is generally 4+.
- **Localization:** each storefront locale has its OWN title/subtitle/keyword field. Even with an English-only UI, localizing the **keyword field** per major ESL market (es, pt-BR, ja, ko, zh-Hans, ar, tr, vi, id, fr) multiplies discoverable terms — highest-ROI Apple ASO lever for a global app.

## Google Play (Android on hold — for later)

| Field | Limit | Indexed? | Notes |
|---|---|---|---|
| **Title** | 50 chars | Yes (highest) | More room than Apple. |
| **Short description** | 80 chars | Yes | Strong ranking + conversion weight. |
| **Full description** | 4,000 chars | **Yes** (unlike Apple) | Keyword **density** matters; 3–5 natural uses of top terms. No keyword stuffing (penalized). |
| **No keyword field** | — | — | Play extracts keywords from title + descriptions. |

Play strategy differs from Apple: there's no hidden keyword field, so keywords must live naturally in the title + short + full description. Don't port the Apple comma-list into Play.
