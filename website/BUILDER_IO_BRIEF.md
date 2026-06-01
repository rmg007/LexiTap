# Builder.io Design Brief — LexiTap Website Redesign

**Project:** LexiTap website (lexitap.app)  
**Current state:** Ugly draft (needs full redesign)  
**Audience:** Global ESL learners 13+, teachers, parents  
**Deadline:** No strict deadline; focus on quality first

---

## What LexiTap Is

**LexiTap** is an offline-first ESL vocabulary mobile app for non-native English learners. Key features:

- **Core:** Spaced-repetition vocabulary quizzes (SRS algorithm)
- **Offline:** Works without internet; syncs via encrypted backup
- **Free + paid:** Free tier (limited vocab + frequency-based content); paid tiers for TOEFL/IELTS exam packs
- **Target users:** ESL learners 13+, teachers, corporate training programs
- **Platforms:** iOS first (beta); Android later

The app has a clean, modern design with:
- Clear hierarchy (headings, body text, CTAs)
- Smart use of whitespace
- Accessible color palette (WCAG AA)
- Mobile-first responsive layout
- Semantic, fast-loading interface

**The website should mirror the app's design language** — clean, modern, trustworthy, accessible.

---

## What the Website Does

The **website** (static HTML/CSS, Cloudflare Pages) serves three purposes:

1. **Marketing/Landing:** Why LexiTap exists, who it's for, why it's better than alternatives
2. **App store funnels:** CTAs → Apple App Store (iOS), Google Play (Android) — download links
3. **Legal:** Privacy policy, terms of service, account deletion instructions (GDPR/CCPA compliant)

The website is **not** a full product site — no pricing tables, no feature deep-dives, no user blog. It's a slim, fast funnel: land → learn → download.

---

## Problems with the Ugly Draft

The original Claude-generated draft likely has:

- ❌ Poor visual hierarchy (all text same weight)
- ❌ No mobile optimization (desktop-only layout)
- ❌ Generic or missing branding
- ❌ Weak CTAs (no clear next steps)
- ❌ No whitespace (wall of text)
- ❌ Bad color contrast or inaccessible colors
- ❌ Boring typography (system fonts only, no personality)
- ❌ Broken or missing imagery
- ❌ No animation or visual interest (if applicable)

**Fix all of these.**

---

## Design Requirements

### Pages to Redesign

1. **Homepage** (`/` or `/index.html`)
   - Hero section (headline, subheading, primary CTA: "Download on App Store")
   - Problem statement (Why learn vocabulary? Why SRS? Why offline?)
   - Key features (3–4 feature cards with icons/images)
   - Social proof (optional: reviews, download count, user testimonials)
   - Secondary CTA (Privacy policy, contact, FAQ link)
   - Footer (copyright, legal links)

2. **Privacy Policy** (`/legal/privacy`)
   - Legal compliance (GDPR, CCPA, privacy-focused ESL audience)
   - Clear sections (data collection, processing, user rights, deletion)
   - Plain language where possible (legal + accessible)
   - Dark mode friendly

3. **Terms of Service** (`/legal/terms`)
   - Acceptable use (no hate speech, spam, cheating on exams)
   - Liability limits
   - Dispute resolution
   - Changes to terms
   - Plain language

4. **Optional: Delete Account** (`/legal/delete-account`)
   - Step-by-step instructions for GDPR/CCPA account deletion
   - Clear CTA to start deletion
   - Plain language

### Design Principles

- **Mobile-first:** Design for 375px width first; tablet (768px) and desktop (1440px) are enhancements, not afterthoughts
- **Clean & modern:** Minimal, intentional. No clutter. Whitespace is your friend.
- **Accessible:** WCAG AA (color contrast ≥4.5:1 for body text, 3:1 for large text; touch targets ≥48×48px on mobile)
- **Fast:** Images optimized, no heavy animations, semantic HTML (will be plain HTML/CSS, no JS framework)
- **Trustworthy:** Professional, not flashy. ESL learners are serious about language learning.
- **Offline-first messaging:** Emphasize "works without internet" as a key differentiator

### Color & Typography

You have freedom here, but:

- **Color palette:** 2–3 primary colors (pick one vibrant primary for CTAs), 2–3 neutrals (grays for text/borders), optional accent
- **Contrast:** All text ≥4.5:1 against background (dark text on light OR light text on dark, never gray on gray)
- **Typography:** 
  - System font stack OR 1 custom font (self-hosted, not Google Fonts/CDN)
  - Hierarchy: h1 (2rem+), h2 (1.5rem), body (1rem), captions (0.875rem)
  - Line height: 1.6 for body (readable), 1.3 for headings (tight but clear)
- **No dark mode required yet** (but design should be dark-mode-capable)

### Content & Copy

You'll get final copy from Ryan, but design for:

- **Homepage headline:** ~60 characters (short, punchy, outcome-focused)
- **Subheading:** ~120 characters (why does it matter?)
- **Feature titles:** 2–4 words each
- **CTAs:** "Download on App Store", "Get Started", "Learn More", "Delete My Account"
- **Footer:** Minimal (copyright, links to legal)

**Do NOT hardcode long copy yet.** Use placeholder text of the right length; Ryan will swap in final copy.

### Images & Assets

- **Hero banner:** Might be app screenshot(s), or abstract illustration; TBD with Ryan
- **Feature cards:** Icons or small illustrations (not stock photos)
- **Social proof:** Optional; if included, headshots or testimonial cards
- **No external APIs or dependencies** — all images must be self-hosted (Cloudflare CDN will serve them)

### Technical Constraints

The website will be built as **plain HTML/CSS** (no JavaScript framework, no build step):

- **Do NOT use:** Bootstrap, Tailwind, CSS-in-JS, SASS/LESS, Vue/React, external CDNs
- **Do:** Self-hosted fonts, semantic HTML (`<header>`, `<nav>`, `<main>`, `<section>`, `<footer>`), plain CSS with custom properties (variables)
- **Agents will implement this** — design should be "boring" from a JS standpoint (no modals, accordions, carousels); if interactions are needed, CSS-only solutions (`:hover`, `@media`)

This doesn't limit your *design* — it just means no heavy interactions. Focus on visual design, not functionality.

---

## Design Deliverables

When ready, provide:

1. **Builder.io project link** (so agents can review the design)
2. **Design tokens export** (colors, typography sizes, spacing values) — screenshot or JSON
3. **Content placeholders** (headlines, CTAs, copy blocks in context)
4. **Mobile + tablet + desktop mocks** (show responsive breakpoints)
5. **Accessibility checklist** (color contrast verified, touch targets ≥48×48px, semantic HTML-friendly)

Or just share the Builder.io preview link — we'll extract the rest.

---

## Success Criteria

- [ ] Mobile-first responsive (looks great on 375px, 768px, 1440px+)
- [ ] Accessible (WCAG AA, color contrast, touch targets)
- [ ] Clear visual hierarchy (headline → subheading → features → CTA)
- [ ] Mirrors app design language (clean, modern, trustworthy)
- [ ] Fast (optimized images, no heavy scripts needed)
- [ ] Implementable in plain HTML/CSS (agents will code this)
- [ ] Legal pages are scannable, not wall-of-text
- [ ] CTAs are obvious (large, contrasting, action-oriented)

---

## Timeline & Process

1. **Design phase (now):** You explore in Builder.io, send Ryan previews for feedback
2. **Lock phase:** Ryan approves the design direction
3. **Handoff:** Send Builder.io preview link + design tokens to Ryan
4. **Implementation:** Agents implement in plain HTML/CSS (1–2 hours per page)
5. **Review:** Ryan checks staging site, requests changes if needed
6. **Deploy:** Merge to main → production live on lexitap.app

---

## Questions for Builder.io

If anything is unclear:

- What's the target user's first impression (in 3 seconds)?
- What's the one thing we want users to do (download the app)?
- What's the biggest differentiation vs. Duolingo/Quizlet/Memrise? (Offline + SRS + privacy)
- Should the legal pages match the homepage aesthetic, or be minimal/text-heavy?

---

## Context Links

- **App design:** The mobile app (iOS beta) has clean, modern UI — mirror this
- **Competitor examples:** Duolingo (playful but professional), Quizlet (minimal), AnkiWeb (academic but accessible)
- **Technical setup:** Static site on Cloudflare Pages; no backend, no database, plain HTML/CSS

---

**Go make it beautiful.** The draft is ugly; this is your chance to build something users want to look at.

Questions? Ask Ryan.

---

**Created:** 2026-05-31 | **For:** Builder.io team redesigning lexitap.app
