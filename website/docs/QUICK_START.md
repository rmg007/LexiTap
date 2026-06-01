# Quick Start — Implement a Builder.io Design

**You've been asked to build a page from Builder.io.** Follow this checklist.

---

## Step 0: Get the Specification (5 min)

- [ ] You have a `PLAN_*.yaml` file for this task (or `PLAN_TEMPLATE.yaml` to fill in)
- [ ] The plan includes:
  - Builder.io preview URL or design export
  - Color palette and typography values
  - Layout description (mobile → tablet → desktop)
  - Content copy (headlines, CTAs, etc.)
  - Any images or assets (URLs or files)

**If you're missing any of these, ask Ryan before proceeding.**

---

## Step 1: Prepare Your Environment (10 min)

```bash
cd website

# Make sure dependencies are installed
npm install

# Start the dev server
npm run dev
# Opens http://localhost:8788

# In another terminal, check the current page list
ls public/
```

- [ ] Dev server is running on localhost:8788
- [ ] You can see `index.html` or other existing pages in the browser
- [ ] No console errors

---

## Step 2: Create Your New Page File (5 min)

Decide where your page goes:

| Page Type | Path | URL |
|-----------|------|-----|
| Homepage | `public/index.html` | `/` |
| Privacy policy | `public/legal/privacy.html` | `/legal/privacy` |
| Terms of service | `public/legal/terms.html` | `/legal/terms` |
| Other legal | `public/legal/[page].html` | `/legal/[page]` |
| Custom page | `public/[page].html` | `/[page]` |

Create an empty HTML file or copy from an existing page as a template:

```bash
# If creating a new legal page
mkdir -p public/legal
touch public/legal/[page].html

# Start with this boilerplate
cat > public/legal/[page].html << 'EOF'
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>LexiTap — [Page Title]</title>
  <link rel="stylesheet" href="/assets/css/global.css">
  <link rel="stylesheet" href="/assets/css/[page].css">
</head>
<body>
  <header class="site-header">
    <nav class="navbar">
      <a href="/">LexiTap</a>
      <a href="/legal/privacy">Privacy</a>
      <a href="/legal/terms">Terms</a>
    </nav>
  </header>

  <main>
    <!-- Your content goes here -->
  </main>

  <footer class="site-footer">
    <p>&copy; 2026 LexiTap. All rights reserved.</p>
  </footer>
</body>
</html>
EOF
```

- [ ] HTML file created at the correct path
- [ ] Boilerplate includes `<head>` with charset, viewport, title, CSS links
- [ ] Boilerplate includes `<header>`, `<main>`, `<footer>`

---

## Step 3: Convert Builder.io Design to HTML (30 min)

From the plan's `design_tokens` and `content_elements`:

1. **Read the layout description** — understand the structure (hero, cards, sections, etc.)

2. **Write semantic HTML:**
   ```html
   <header class="site-header">
     <!-- Navigation -->
   </header>

   <main>
     <section class="hero">
       <h1>Headline</h1>
       <p>Subheading or body text</p>
       <a href="#" class="cta-button">Call to Action</a>
     </section>

     <section class="features">
       <article class="feature-card">
         <h2>Feature 1</h2>
         <p>Description</p>
       </article>
       <article class="feature-card">
         <h2>Feature 2</h2>
         <p>Description</p>
       </article>
     </section>
   </main>

   <footer class="site-footer">
     <!-- Footer content -->
   </footer>
   ```

3. **Add images:**
   - Place images in `public/assets/img/` with descriptive filenames
   - Add alt text to every `<img>` tag
   ```html
   <img src="/assets/img/hero-banner.jpg" alt="App home screen showing vocabulary flashcards">
   ```

4. **Use semantic elements:** `<header>`, `<nav>`, `<main>`, `<section>`, `<article>`, `<footer>`, `<aside>`

5. **Avoid divitis:**
   ```
   ❌ DON'T:
   <div class="section">
     <div class="row">
       <div class="col">
         <div class="card">...</div>
       </div>
     </div>
   </div>

   ✅ DO:
   <section class="features">
     <article class="feature-card">...</article>
   </section>
   ```

- [ ] All content from Builder.io is in the HTML (no placeholder text, unless marked TBD)
- [ ] All images have alt text or aria-label
- [ ] HTML is semantic; no divitis
- [ ] No inline styles (all CSS in external stylesheets)

---

## Step 4: Create CSS (30 min)

Create `public/assets/css/[page].css`:

```bash
touch public/assets/css/[page].css
```

Start with mobile-first styles:

```css
/* public/assets/css/[page].css */

/* Mobile-first: base styles for 320px and up */
.hero {
  padding: var(--spacing-lg);
  text-align: center;
}

.hero h1 {
  font-size: var(--font-size-xl);
  margin-bottom: var(--spacing-md);
}

.features {
  display: flex;
  flex-direction: column;
  gap: var(--spacing-md);
}

.feature-card {
  padding: var(--spacing-md);
  border: 1px solid var(--color-border);
  border-radius: 8px;
}

/* Tablet and up: 768px */
@media (min-width: 768px) {
  .hero {
    padding: var(--spacing-xl);
  }

  .features {
    flex-direction: row;
  }

  .feature-card {
    flex: 1;
  }
}

/* Desktop: 1024px */
@media (min-width: 1024px) {
  .hero h1 {
    font-size: var(--font-size-2xl);
  }
}
```

**Use the design tokens from the plan:**
- Colors: `var(--color-primary)`, `var(--color-text)`, etc. (defined in global.css)
- Spacing: `var(--spacing-sm)`, `var(--spacing-md)`, etc.
- Typography: `var(--font-size-body)`, `var(--font-size-lg)`, etc.

**If new design tokens are needed (colors, fonts, sizes not in global.css), add them there.**

- [ ] CSS is mobile-first (base styles, then @media queries)
- [ ] All color values are CSS variables (not hardcoded hex)
- [ ] All spacing uses CSS variables
- [ ] No Bootstrap, Tailwind, or utility-class frameworks
- [ ] Classes use BEM naming (`.block`, `.block__element`, `.block--modifier`)
- [ ] No IDs except for form field labels

---

## Step 5: Test Locally (15 min)

### In the browser:

1. **Navigate to your page:** http://localhost:8788/[page-path]
   - If you created `public/legal/privacy.html`, visit `http://localhost:8788/legal/privacy`
   - Cloudflare Pages auto-strips `.html` from the URL

2. **Test on mobile (375px width):**
   - DevTools → toggle device toolbar (Ctrl+Shift+M / Cmd+Shift+M)
   - Select "iPhone 12" or similar
   - Verify layout looks good, no horizontal scroll

3. **Test on tablet (768px):**
   - Resize DevTools to 768px width
   - Verify layout adapts

4. **Test on desktop (1440px):**
   - Resize DevTools to 1440px width or larger
   - Verify layout looks correct at full width

5. **Test images:**
   - All images load (no broken-image icons)
   - Images look correct (right size, right aspect ratio)

6. **Test links:**
   - All internal links work (no 404 errors)
   - External links open in a new tab (add `target="_blank"` + `rel="noopener"`)

7. **Test accessibility:**
   - Open DevTools → Lighthouse
   - Click "Analyze page load"
   - Target score: ≥90 for Accessibility
   - Note any warnings and fix before committing

8. **Keyboard navigation:**
   - Press Tab repeatedly through the page
   - All interactive elements (links, buttons) should be reachable
   - Tab order should be logical (left-to-right, top-to-bottom)

9. **Color contrast:**
   - DevTools → color picker (eyedropper icon)
   - Check text color against background color
   - Target: ≥4.5:1 ratio for body text, ≥3:1 for large text

- [ ] Page renders without layout shifts (no CLS issues)
- [ ] No horizontal scroll on mobile
- [ ] Images load correctly
- [ ] All links work
- [ ] Lighthouse Accessibility score ≥90
- [ ] Keyboard navigation works (all interactive elements reachable via Tab)
- [ ] Color contrast ≥4.5:1 for body text

---

## Step 6: Commit & Push (5 min)

```bash
# Stage your changes
git add public/[page].html public/assets/css/[page].css public/assets/img/

# Commit with a descriptive message
git commit -m "feat: [Page Name] from Builder.io design"
# Example: "feat: privacy policy page from Builder.io"

# Push to your branch
git push origin [branch-name]
```

Wait for Cloudflare Pages to auto-deploy (takes ~1-2 minutes):
- Staging URL appears in GitHub (under the commit or PR)
- Visit the staging URL to final-check the live page

- [ ] Changes committed with a clear message
- [ ] Branch pushed to GitHub
- [ ] Cloudflare Pages deployed to staging
- [ ] Staging URL tested in a real browser

---

## Step 7: Code Review Readiness (2 min)

Before handing off to Ryan:

- [ ] All acceptance criteria from the plan are checked
- [ ] Dev server runs without errors: `npm run dev`
- [ ] Page renders correctly on mobile, tablet, desktop
- [ ] Lighthouse Accessibility score ≥90
- [ ] No console errors or warnings
- [ ] All content from Builder.io is implemented (no placeholders)
- [ ] All images have alt text
- [ ] All links are tested and work
- [ ] Commit message is clear and concise

---

## Troubleshooting

| Problem | Solution |
|---------|----------|
| Page doesn't load (404) | Check file path: if you created `public/legal/privacy.html`, URL is `/legal/privacy` (no `.html` extension) |
| CSS doesn't load | Check link in HTML: should be `<link rel="stylesheet" href="/assets/css/[page].css">` |
| Images don't load | Check file paths: images must be in `public/assets/img/` and linked as `/assets/img/[filename]` |
| Colors look wrong | Verify you're using CSS variables (e.g., `var(--color-primary)`) defined in global.css |
| Lighthouse score is low | Check for: missing alt text, low color contrast, poor mobile layout, slow image load |
| Layout breaks on tablet | Make sure you have `@media (min-width: 768px)` rules; mobile-first means base styles work on mobile, then you add tablet/desktop overrides |
| Links break DevTools | External links should have `target="_blank" rel="noopener"` to avoid security issues |

---

## Questions?

If anything is unclear:

1. Re-read [AGENTS.md](AGENTS.md) — it has detailed patterns and examples
2. Re-read your `PLAN_*.yaml` — every field is important
3. Look at existing pages in `public/` as examples
4. Ask Ryan (don't guess or guess wrong)

---

**Estimated time:** 1–2 hours for a typical page (hero + 3 sections + footer, mobile-first responsive, Lighthouse ≥90)

**Ready to start?** Open Step 1 ☝️
