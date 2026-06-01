---
name: LexiTap Website — Agent Conventions
version: 1.0
last_updated: 2026-05-31
audience: coding agents
---

# LexiTap Website — Agent Conventions

**Static marketing + legal site for lexitap.app** (Cloudflare Pages). Plain HTML/CSS, no build step. **Design source: Builder.io.**

## Stack & Tools

| Component | Specification |
|-----------|---|
| **Runtime** | Static HTML/CSS (no JS framework) |
| **Deployment** | Cloudflare Pages via Wrangler |
| **Dev Server** | `npm run dev` → `wrangler pages dev public` (localhost:8788) |
| **Design Source** | Builder.io (Ryan provides design specs/exports) |
| **Asset Delivery** | Cloudflare CDN; files in `public/assets/` |
| **Version Control** | Git; branches auto-deploy to staging, `main` → production |

## File Structure

```
website/
├── public/                    # Served directly by Cloudflare Pages
│   ├── index.html            # Homepage
│   ├── legal/                # Legal pages (nested routes)
│   │   ├── privacy.html
│   │   ├── terms.html
│   │   └── delete-account.html
│   ├── assets/               # Images, fonts, icons, animations
│   │   ├── img/
│   │   ├── fonts/
│   │   └── css/              # Global + page-specific stylesheets
│   └── 404.html              # Fallback (auto-served by Pages)
├── docs/                      # Agent documentation (this file)
├── package.json
└── wrangler.toml             # Cloudflare Pages config
```

## Builder.io → Code Workflow

### What the Agent Receives

1. **Design spec** (text description or link to Builder.io preview)
2. **Component list** (headers, CTAs, sections, forms if any)
3. **Color/typography/spacing values** (from the design system)
4. **Content copy** (headlines, body text, button labels)

### What the Agent Builds

1. **Semantic HTML** — no divitis; use `<header>`, `<nav>`, `<main>`, `<section>`, `<article>`, `<footer>`, etc.
2. **Single CSS file per page** in `public/assets/css/` (e.g., `privacy.css` for privacy.html)
3. **Global styles** in `public/assets/css/global.css` (shared by all pages)
4. **Images** placed in `public/assets/img/` with descriptive filenames
5. **Mobile-first responsive design** (mobile → tablet → desktop)
6. **Accessibility** — WCAG AA compliant (alt text, semantic HTML, color contrast ≥4.5:1, keyboard nav)

### Static Constraints (Do Not Break)

- ✅ **Plain HTML/CSS only** — no JavaScript frameworks, no build transpilation
- ✅ **No external CDNs except Cloudflare** — self-host fonts, icons, images
- ✅ **No form backends yet** — CTA buttons may link to email or Slack for now (Ryan will wire later if needed)
- ✅ **Routing via file paths** — `/legal/privacy.html` is served as `/legal/privacy`; Cloudflare Pages auto-maps
- ✅ **Single deploy command** — `npm run deploy` must "just work" after edits

## Coding Patterns

### HTML

```html
<!-- DO: semantic HTML -->
<header class="site-header">
  <nav class="navbar">
    <a href="/">LexiTap</a>
    <a href="/legal/privacy">Privacy</a>
  </nav>
</header>

<main>
  <section class="hero">
    <h1>Your heading</h1>
    <p>Body copy</p>
  </section>
</main>

<footer class="site-footer">
  <p>&copy; 2026 LexiTap. All rights reserved.</p>
</footer>

<!-- DON'T: divitis -->
<div class="container">
  <div class="row">
    <div class="col">...</div>
  </div>
</div>
```

### CSS

- **Mobile-first:** Base styles for mobile, then `@media (min-width: 768px) { }` for tablets/desktop
- **CSS custom properties** for color/spacing (define in `:root` in global.css)
- **BEM naming** for classes: `.block`, `.block__element`, `.block--modifier`
- **No IDs** (unless a form field needs `id="email"` for `<label for="email">`)

```css
/* global.css */
:root {
  --color-primary: #2563eb;
  --color-text: #1f2937;
  --spacing-lg: 2rem;
}

body {
  font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
  color: var(--color-text);
  line-height: 1.6;
}

/* privacy.css (page-specific) */
.privacy-section {
  margin: var(--spacing-lg) 0;
}

.privacy-section__title {
  font-size: 1.5rem;
  font-weight: 600;
}

@media (min-width: 768px) {
  .privacy-section__title {
    font-size: 2rem;
  }
}
```

### Images & Assets

- Use **descriptive filenames:** `cta-button-arrow.svg`, `hero-banner-mobile.png` (not `img1.png`)
- **Compress images** before committing (optimize via TinyPNG, Squoosh, or similar)
- **SVGs for icons** (scalable, small); PNGs/JPGs for photos
- **All images must have alt text** in `<img alt="...">` or aria-label if purely decorative

### Accessibility

- **Color contrast:** min 4.5:1 for body text, 3:1 for large text
- **Touch targets:** min 48×48px (mobile), 44×44px (tablet/desktop)
- **Keyboard navigation:** all interactive elements reachable via Tab
- **ARIA labels** for icon-only buttons: `<button aria-label="Close menu">`
- **Link text descriptive:** `<a href="...">Learn more about privacy</a>` not `<a href="...">click here</a>`

## What NOT to Do

| ❌ | Why |
|---|---|
| Add JavaScript (except minimal analytics, handled separately) | Static site; keep complexity low |
| Use CSS-in-JS or CSS preprocessors (SASS/Less) | Plain CSS only; no build step |
| Link to external CDNs (Google Fonts, Bootstrap CDN) | Self-host everything; Cloudflare handles delivery |
| Create form handlers in this repo | CTA buttons → email/Slack for now; Ryan wires backends later |
| Hardcode content | Copy comes from Ryan or Builder.io; build the layout, not the words |
| Add custom fonts without bundling them | Fonts must be `public/assets/fonts/` and @font-face loaded |

## Testing Before Commit

1. **Run dev server:** `npm run dev` → http://localhost:8788
2. **Test all pages** in mobile + desktop viewports (resize browser, use DevTools)
3. **Check accessibility:** lighthouse score ≥90, or manual WCAG AA audit
4. **Verify links:** all internal links point to correct files (no 404s)
5. **Check images:** all load, no broken paths, alt text present
6. **Validate HTML:** run `npx html-validate public/**/*.html` (optional; Ryan has tooling)

## Deployment

```bash
# Local preview
npm run dev

# Deploy to staging (auto-deploy on PR / non-main branch)
# (Cloudflare Pages handles this; just push)

# Deploy to production
git checkout main && git pull
npm run deploy:prod
# Or: git push origin branch && merge PR → auto-deploys to production
```

**Note:** Production deploys to `lexitap.app`. Staging is branch-based (e.g., `feature/landing-redesign` → `https://feature-landing-redesign.lexitap.pages.dev`).

## Design System (from Builder.io)

The agent will receive color, typography, and spacing values from Ryan or the Builder.io export. Define these as CSS custom properties in `public/assets/css/global.css`:

```css
:root {
  /* Colors */
  --color-primary: #...; /* Primary CTA button, links */
  --color-secondary: #...; /* Secondary buttons, accents */
  --color-text-primary: #...; /* Body text */
  --color-text-secondary: #...; /* Secondary text, captions */
  --color-bg: #...; /* Page background */
  --color-border: #...; /* Borders, dividers */
  
  /* Typography */
  --font-sans: ...; /* System font stack or custom font */
  --font-size-body: 1rem;
  --font-size-lg: 1.25rem;
  --font-size-xl: 1.5rem;
  --font-size-2xl: 2rem;
  --line-height-tight: 1.3;
  --line-height-normal: 1.6;
  
  /* Spacing */
  --spacing-xs: 0.5rem;
  --spacing-sm: 1rem;
  --spacing-md: 1.5rem;
  --spacing-lg: 2rem;
  --spacing-xl: 3rem;
}
```

Use these variables throughout your CSS. If Ryan updates the design, only `global.css` needs edits.

## Questions & Clarifications

If the Builder.io spec is ambiguous or missing details:
- **Ask Ryan directly** (not the agent's responsibility to guess)
- **Assume mobile-first** responsive design
- **Assume WCAG AA** accessibility baseline
- **Assume semantic HTML** and clean CSS (no bootstrap-style utility classes)
- **Assume Cloudflare CDN** for all asset delivery

---

**Last updated:** 2026-05-31 | **Next review:** after first Builder.io design import
