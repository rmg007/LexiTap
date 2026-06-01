# LexiTap Website — Agent Documentation

**This folder contains all specifications for coding agents to build the LexiTap website from Builder.io designs.**

## Start Here

Read these in order:

1. **[AGENTS.md](AGENTS.md)** — Project-wide rules, patterns, constraints
   - Tech stack (HTML/CSS, Cloudflare Pages)
   - File structure and how code is organized
   - Coding patterns (HTML, CSS, images, accessibility)
   - What NOT to do
   - Testing checklist before commit

2. **[architecture.md](architecture.md)** — How the website fits together
   - System diagram (Builder.io → code → Cloudflare → user)
   - Component map (homepage, legal pages, assets)
   - Data flow (no backend, all static)
   - Invariants (what must stay true)
   - Deployment pipeline

3. **[PLAN_TEMPLATE.yaml](PLAN_TEMPLATE.yaml)** — Template for implementing a design
   - Copy this file and rename to `PLAN_001_<feature>.yaml`
   - Fill in the Builder.io spec, acceptance criteria, edge cases
   - Agent uses this when building a specific page

## The Workflow

```
Ryan provides Builder.io design spec
    ↓
Agent reads: AGENTS.md + architecture.md
    ↓
Agent copies PLAN_TEMPLATE.yaml → fills in Builder.io details
    ↓
Agent implements page in public/
    ↓
Agent tests locally: npm run dev
    ↓
Agent commits + pushes
    ↓
Cloudflare Pages auto-deploys to staging
    ↓
Ryan reviews staging site
    ↓
Merge to main → production deploy
```

## Key Constraints

- **Static HTML/CSS only** — no JavaScript frameworks, no build step
- **Plain CSS** — no SASS/LESS/CSS-in-JS
- **Self-hosted assets** — fonts, images, icons in `public/assets/`; Cloudflare CDN handles delivery
- **Semantic HTML** — no divitis; use `<header>`, `<nav>`, `<main>`, `<section>`, `<footer>`
- **Mobile-first responsive** — base CSS for mobile, then @media queries for larger screens
- **WCAG AA accessibility** — alt text, semantic HTML, color contrast, keyboard nav, 48×48px touch targets

## For Coding Agents

**When assigned a task to build a page:**

1. Look for the `PLAN_*.yaml` file for this task (Ryan will provide a link or create one)
2. If no plan exists, ask Ryan to fill in the `PLAN_TEMPLATE.yaml`
3. Read the plan thoroughly — every field matters
4. Reference `AGENTS.md` for coding patterns and constraints
5. Reference `architecture.md` to understand how your page fits in the larger site
6. Build the page locally: `npm run dev`
7. Test before committing (see AGENTS.md → Testing section)
8. Commit + push; Cloudflare auto-deploys

## Common Questions

**Q: What if the Builder.io design shows an interactive element (modal, dropdown, animation)?**
A: Implement the HTML/CSS layout only. If it requires JavaScript, note it in the plan and ask Ryan if JS is acceptable (likely: defer to a later task).

**Q: What if images or copy are missing from Builder.io?**
A: Use placeholder text (e.g., `[Headline TBD]`) and ask Ryan. Do NOT proceed with placeholder images.

**Q: How do I know if my page is accessible?**
A: Run Lighthouse audit in DevTools (target score ≥90), test with keyboard navigation, check color contrast. See AGENTS.md → Accessibility section.

**Q: Can I use Bootstrap, Tailwind, or other CSS framework?**
A: No. Plain CSS only. Use CSS custom properties (variables) for colors/spacing, BEM naming for classes.

**Q: Where do I put new CSS?**
A: If it's shared across pages, add to `public/assets/css/global.css`. If it's page-specific, create `public/assets/css/[page-name].css`.

**Q: How do I deploy?**
A: Just push to your branch. Cloudflare auto-deploys to staging. To deploy to production, merge to `main` (or Ryan merges your PR).

## Files in This Folder

```
docs/
├── README.md               (this file)
├── AGENTS.md               (conventions, patterns, constraints)
├── architecture.md         (system overview, component map, data flow)
├── PLAN_TEMPLATE.yaml      (template for per-page implementation specs)
└── plans/
    ├── PLAN_001_*.yaml     (filled-in plans for specific pages)
    └── ...
```

---

**Last updated:** 2026-05-31 | **Audience:** Coding agents | **Owner:** Ryan Gonzalez
