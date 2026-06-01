# Prompt: HTML/CSS Prototypes — Build Now, Ship Today

**To Builder.io team:**

Skip the Builder.io interface. Build the website design as **working HTML/CSS prototypes** today. Agents will iterate on your code, not start from scratch.

---

## What You're Building

Four page templates, fully responsive, accessible, ready to deploy:

1. **Homepage** (`public/index.html`)
   - Hero (headline + subheading + download CTA)
   - Problem statement (why vocabulary, why SRS, why offline)
   - 3–4 feature cards
   - Secondary CTAs (privacy link, etc.)
   - Footer (copyright + legal links)

2. **Privacy Policy** (`public/legal/privacy.html`)
   - Scannable sections (data collection, processing, rights, deletion)
   - Clear headings + short paragraphs
   - Plain language
   - Legal compliance (GDPR, CCPA)

3. **Terms of Service** (`public/legal/terms.html`)
   - Standard legal sections (use, liability, disputes, changes)
   - Enforceable, not threatening
   - Clear structure

4. **Delete Account** (`public/legal/delete-account.html`)
   - Step-by-step instructions (GDPR/CCPA right to erasure)
   - Clear CTA to start deletion
   - Plain language

---

## Technical Spec

### File Structure

```
website/
├── public/
│   ├── index.html                    (homepage)
│   ├── legal/
│   │   ├── privacy.html
│   │   ├── terms.html
│   │   └── delete-account.html
│   └── assets/
│       └── css/
│           ├── global.css            (shared styles, design tokens)
│           ├── homepage.css          (page-specific)
│           ├── legal.css             (shared for all legal pages)
│           └── delete-account.css    (if needed)
```

### HTML Requirements

- **Semantic HTML:** `<header>`, `<nav>`, `<main>`, `<section>`, `<article>`, `<footer>` — no divitis
- **Accessibility:** Alt text on images, ARIA labels on icons, semantic form structure (if forms)
- **Mobile-first structure:** Base HTML works on 375px; CSS handles responsiveness
- **No JavaScript:** Plain HTML/CSS only (no event listeners, no state, no framework)
- **No external dependencies:** Self-hosted fonts (if custom), no CDN links, no Google Fonts

### CSS Requirements

- **Mobile-first:** Base styles for 375px, then `@media (min-width: 768px)` for tablet, `@media (min-width: 1024px)` for desktop
- **CSS custom properties:** Define all colors, fonts, spacing as variables in `global.css`
- **BEM naming:** `.block`, `.block__element`, `.block--modifier`
- **No frameworks:** Plain CSS, no Bootstrap/Tailwind/SASS/Less
- **No IDs:** Classes only (except form field `id` for `<label for="">`)
- **Performance:** No heavy assets, optimize images <100KB each (except hero <500KB)

### Responsiveness

| Breakpoint | Width | Priority |
|-----------|-------|----------|
| Mobile (base) | 375px | 🔴 Do or die |
| Tablet | 768px | 🟡 Refine layout |
| Desktop | 1440px | 🟢 Nice-to-have |

Mobile must be beautiful. Tablet/desktop are progressions, not separate designs.

### Accessibility (WCAG AA)

- **Color contrast:** All text ≥4.5:1 against background (measure it)
- **Touch targets:** All buttons/links ≥48×48px on mobile (CSS: `min-height: 48px; min-width: 48px`)
- **Focus states:** Visible keyboard focus (e.g., `outline: 2px solid #...`)
- **Alt text:** Every image has descriptive alt text (`<img alt="...">`)
- **Form labels:** Every input has a label (`<label for="id">`) or aria-label
- **Heading hierarchy:** h1 (page title) → h2 (sections) → h3 (subsections), no gaps

---

## Design Tokens (You Decide)

Define and document:

```css
/* global.css */
:root {
  /* Colors */
  --color-primary: #...;        /* CTAs, focus states, highlights */
  --color-secondary: #...;      /* Secondary buttons, accents */
  --color-text-primary: #...;   /* Body text */
  --color-text-secondary: #...; /* Captions, muted text */
  --color-bg: #...;             /* Page background */
  --color-border: #...;         /* Borders, dividers */
  --color-error: #...;          /* Error states (if forms) */
  
  /* Typography */
  --font-sans: -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif; /* or custom font */
  --font-size-xs: 0.875rem;
  --font-size-sm: 1rem;
  --font-size-body: 1rem;
  --font-size-lg: 1.25rem;
  --font-size-xl: 1.5rem;
  --font-size-2xl: 2rem;
  --font-size-3xl: 2.5rem;
  --line-height-tight: 1.2;
  --line-height-normal: 1.6;
  --font-weight-regular: 400;
  --font-weight-semibold: 600;
  --font-weight-bold: 700;
  
  /* Spacing */
  --spacing-xs: 0.5rem;
  --spacing-sm: 1rem;
  --spacing-md: 1.5rem;
  --spacing-lg: 2rem;
  --spacing-xl: 3rem;
  --spacing-2xl: 4rem;
  
  /* Borders & Shadows */
  --border-radius: 8px;
  --box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
}
```

**Output a design tokens document** with your choices (colors as hex, font names, spacing scale).

---

## Content & Copy

Use **real copy** (not Lorem Ipsum). You'll provide:

- **Homepage headline:** ~60 chars (e.g., "Learn English Faster, Offline")
- **Subheading:** ~120 chars (e.g., "ESL vocabulary practice that works anywhere, even without internet")
- **Feature titles & descriptions:** 2–4 words + 1–2 sentences per feature
- **CTA buttons:** "Download on App Store", "Get Started", "Learn More", "Delete My Account"
- **Legal page content:** Actual privacy policy, terms, and delete instructions (or placeholders marked `[TODO]`)

**Document the content** in a separate file (e.g., `CONTENT.md`):

```markdown
# Homepage

## Hero
- Headline: "Learn English Faster, Offline"
- Subheading: "ESL vocabulary practice that works anywhere"
- CTA: "Download on App Store"

## Feature 1
- Title: "Works Offline"
- Description: "No internet? No problem. Practice vocabulary anywhere."

...
```

---

## Images & Assets

You decide what images go where. Document:

1. **Hero banner:** What should it show? (app screenshot, illustration, photo?)
2. **Feature icons:** What do the 3–4 features need? (SVG icons or small illustrations?)
3. **Sizing:** What dimensions for each image?
4. **Sourcing guide:** Where should Ryan get these images? (Unsplash, Pexels, custom, etc.)

**Deliver:** An `ASSETS.md` file listing every image, where it goes, size, and alt text.

**Do NOT:** Use external image URLs in HTML. Use placeholder paths (e.g., `/assets/img/hero-banner.jpg`); Ryan will source the actual images.

---

## Deliverables (Ship Today)

1. **HTML files:** `index.html`, `legal/privacy.html`, `legal/terms.html`, `legal/delete-account.html`
2. **CSS files:** `global.css`, `homepage.css`, `legal.css`, `delete-account.css`
3. **Design tokens doc:** Colors, typography, spacing, borders, shadows (screenshot or markdown)
4. **Content doc:** All copy (headlines, body text, CTAs, legal)
5. **Assets guide:** Image list (what, where, size, alt text, where to source)
6. **README:** Setup instructions (how to preview, what assets to add, any notes)

**Format:** ZIP file or GitHub branch push (your choice).

---

## Testing Checklist Before Ship

- [ ] All HTML files are valid (no syntax errors)
- [ ] CSS loads without errors (DevTools console clear)
- [ ] Pages render on mobile (375px), tablet (768px), desktop (1440px)
- [ ] All images load (use placeholder `<img src="/assets/img/...">`)
- [ ] All internal links work (`/legal/privacy`, `/legal/terms`, etc.)
- [ ] Color contrast is ≥4.5:1 for all body text (use DevTools color picker or WebAIM contrast checker)
- [ ] All touch targets are ≥48×48px on mobile
- [ ] Keyboard navigation works (Tab through all interactive elements)
- [ ] Lighthouse audit: Accessibility score ≥90 (run DevTools Lighthouse)
- [ ] No console errors or warnings
- [ ] Mobile layout is responsive (text scales, images adapt, no horizontal scroll)

---

## Success Criteria

- ✅ Four pages, fully responsive, WCAG AA accessible
- ✅ Semantic HTML, plain CSS, no frameworks or external dependencies
- ✅ Mobile-first (beautiful at 375px, scales to 1440px)
- ✅ Design tokens clearly defined (reusable, agentable)
- ✅ Real copy (not placeholders, except legal which can be marked `[TODO]`)
- ✅ Asset guide (clear on what images are needed, where to source)
- ✅ Ready for agents to iterate (clean code, clear structure, documented decisions)
- ✅ Lighthouse Accessibility ≥90 on all pages
- ✅ All links work, all images render, no console errors

---

## Notes

1. **This is fast.** You're not designing in Builder.io; you're coding the design as working HTML/CSS. Should take 4–8 hours for all four pages.

2. **Agents will refine.** Your code is the foundation. Agents will polish, optimize, and add any missing responsiveness. Plan for ~10% rework.

3. **Content can be `[TODO]`.** Legal pages can have placeholder section headings; Ryan will fill in actual legal copy. Homepage and delete account need real copy.

4. **Images are optional.** Use descriptive `<img src="/assets/img/...">` paths. Ryan will source the actual images.

5. **Push to a branch or email a ZIP.** Either works. If you push a branch, we'll create a PLAN file and agents will implement from there.

---

## Questions?

- **Color palette too risky?** Design what you think is best. Ryan will review staging and request changes if needed.
- **Not sure about copy?** Use `[COPY TODO: ...description...]` as placeholder.
- **Need design guidance?** Reference the app: https://github.com/rmg007/LexiTap/tree/master/mobile (it's React Native, but aesthetically mimic it).

---

## Timeline

**Ship by:** End of today  
**Next step:** Agents refine + iterate, ready for production in 1–2 days  
**Success:** Users see a beautiful, fast, accessible site that sells the app

---

**Build it. Test it. Ship it. We'll handle the rest.**
