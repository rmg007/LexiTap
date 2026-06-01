# LexiTap Website — Implementation Guide

**Status:** Redesign locked. HTML/CSS enhanced for mobile-first UX, accessibility, and performance.

## What Changed

### CSS Enhancements (in `public/styles.css`)

✅ **Design tokens:** Added spacing variables (`--s10`, `--s20`, `--s24`)  
✅ **Hero section:** Linear gradient background, larger heading (32–56px fluid), improved eyebrow styling  
✅ **Badges/CTAs:** Now 48px min-height touch targets, accent-colored, cursor pointers  
✅ **Feature cards:** Improved hover states (border + subtle lift), larger icons (32px), better spacing  
✅ **Legal docs:** Better typography hierarchy, improved table styling, larger headings, scannable layout  
✅ **Footer:** Mobile-friendly layout with flex wrap, better responsive behavior  
✅ **Motion:** Respects `prefers-reduced-motion`  
✅ **Accessibility:** All text ≥4.5:1 contrast, touch targets ≥48×48px  

### Homepage Content (`public/index.html`)

✅ **Headline:** "Learn English words that actually stick." (outcome-focused, benefit-driven)  
✅ **Subheading:** "LexiTap uses spaced repetition to help you master TOEFL & IELTS vocabulary. No typing. No internet. Just five minutes a day."  
✅ **Feature order:** Reordered for cognitive priority (science → offline → UX → exams → privacy → progress)  
✅ **Feature copy:** Stronger, benefit-driven language  
✅ **CTAs:** Two download buttons (App Store, Google Play), accessible with proper `aria-label`  

## Current Page Inventory

| Page | Path | Status | Notes |
|------|------|--------|-------|
| **Homepage** | `/index.html` | ✅ Enhanced | Redesigned hero, stronger copy, better cards |
| **Privacy Policy** | `/privacy.html` | ✅ Improved | Better table styling, improved callout, scannable layout |
| **Terms of Service** | `/terms.html` | ✅ Improved | Clearer headings, better spacing |
| **Contact Sales** | `/contact-sales.html` | 📋 TODO | Link exists; page TBD (B2B schools funnel) |
| **Delete Account** | N/A | 📋 TODO | GDPR/CCPA compliance; step-by-step instructions |

## Copy Spec

### Homepage

**Eyebrow (uppercase, accent color):**
```
Offline-first ESL vocabulary
```

**H1 (Playfair Display, 32–56px):**
```
Learn English words that actually stick.
```

**Subheading (body text, secondary color):**
```
LexiTap uses spaced repetition to help you master TOEFL & IELTS vocabulary.
No typing. No internet. Just five minutes a day.
```

**CTAs:**
- Primary: "App Store — Coming soon"
- Secondary: "Google Play — Coming soon"

**Feature Cards (6 cards, 3-column responsive):**

1. **Spaced repetition science**
   - Icon: 🧠
   - Copy: "Our algorithm learns what you forget and quizzes you at the perfect time — backed by 100 years of cognitive science."

2. **Works fully offline**
   - Icon: 📶
   - Copy: "Download once, learn anywhere. No internet, no data plan, no frustration on your commute or classroom."

3. **Tap-only recall**
   - Icon: 👆
   - Copy: "Multiple-choice recognition quizzes. No typing. Designed for small screens and minutes you actually have."

4. **Exam-focused packs**
   - Icon: 🎯
   - Copy: "Core CEFR vocabulary free. TOEFL & IELTS exam packs unlock with a one-time purchase—no subscriptions."

5. **Your data, your device**
   - Icon: 🔒
   - Copy: "All progress lives on your phone. Backups are encrypted. No ads. No tracking. No selling your data."

6. **See real progress**
   - Icon: 📈
   - Copy: "Visual rings, daily streaks, and mastery levels show you exactly how far you've come."

### Legal Pages

Copy is already locked in `/privacy.html` and `/terms.html`. Key principles:
- **Plain language:** No legal jargon where possible; explain the "why" to non-lawyers
- **Scannable:** Short paragraphs, bullet points, clear headings
- **Links:** Email addresses are `support@lexitap.app` and `privacy@lexitap.app`

## Asset Requirements

### Images (all self-hosted in `public/assets/`)

| Asset | Size (px) | Format | Purpose |
|-------|-----------|--------|---------|
| `og-image.png` | 1200×630 | PNG | Social media card (Open Graph) |
| `favicon.svg` | 32×32 | SVG | Browser tab icon |

**Note:** Existing placeholder `og-image.png` should be replaced before public launch.

### Icons
Currently using emoji (semantic, no file dependency). If custom icons needed later, store in `public/assets/icons/` as SVG.

## Responsive Breakpoints (tested)

- **375px (iPhone SE, small phones):** Single-column layout, full-width badges
- **768px (iPad, tablets):** Two-column card grid, increased padding
- **1440px+ (desktop):** Three-column grid, max-width constrained

CSS Grid auto-fit: `grid-template-columns: repeat(auto-fit, minmax(280px, 1fr))`

## Accessibility Checklist

- ✅ WCAG AA contrast (4.5:1 minimum on all text)
- ✅ Touch targets ≥48×48px (buttons, links)
- ✅ Keyboard navigation (tab, enter, focus visible)
- ✅ Skip-to-content link (top left, visible on focus)
- ✅ Semantic HTML (`<header>`, `<nav>`, `<main>`, `<section>`, `<footer>`)
- ✅ Image alt text (none needed; emoji + `aria-hidden` on decorative)
- ✅ Form labels (N/A yet; no contact form on homepage)
- ✅ Motion: Respects `prefers-reduced-motion: reduce`
- ✅ Color not sole conveyor of info (accent + text used together)
- ✅ Theme toggle accessible (`aria-label="Switch theme"`)

## Performance Targets

- **Lighthouse Accessibility:** ≥95
- **Lighthouse Performance:** ≥90
- **Page size:** <100KB (no external scripts, self-hosted fonts)
- **First contentful paint:** <1.2s (CDN serves from Cloudflare)

## Build & Deploy

No build step. Files are deployed verbatim via Cloudflare Pages.

**Local testing:**
```bash
cd website && npm run dev
# Serves on http://localhost:8788
```

**Staging deploy:**
```bash
npm run deploy
```

**Production:** Merge to main → auto-deploys to lexitap.app (Cloudflare Pages workflow).

## Dark / Light Theme

- **Default:** Dark theme (canonical)
- **System preference:** Respected; light theme applied if `prefers-color-scheme: light`
- **User toggle:** Button in header (`☀` light, `☽` dark); preference saved to localStorage
- **Theme switching:** Zero layout shift; only colors change

## Notes for Next Agent

1. **Homepage is final.** No more major rewrites; only polish/bug fixes.
2. **Legal pages:** Privacy & Terms are locked for compliance. Update copy sparingly.
3. **Contact Sales page:** Design and build next (TBD spec).
4. **Delete Account page:** GDPR/CCPA flow; work with Ryan on exact steps.
5. **Assets:** Before public launch, replace placeholder `og-image.png`.
6. **Testing:** Always check Lighthouse (DevTools → Lighthouse tab).

## Resources

- **Design tokens:** `DESIGN_TOKENS.md`
- **Architecture:** See root `AGENTS.md` and `CLAUDE.md`
- **Figma link:** (To be provided by Ryan if design reviews needed)

---

**Last updated:** 31 May 2026  
**Status:** Ready for agent testing & refinement  
**Next:** Copy review + staging deploy
