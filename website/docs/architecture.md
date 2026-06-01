---
name: LexiTap Website Architecture
version: 1.0
last_updated: 2026-05-31
---

# LexiTap Website Architecture

## System Overview

The **LexiTap website** is a static marketing + legal site for `lexitap.app`. It serves as the public face of the project: landing page, privacy policy, terms of service, account deletion flow documentation.

```
┌─────────────────────────────────────────────────────────┐
│ Builder.io (Design Source)                              │
│ (Ryan provides: specs, color palette, copy, layout)     │
└───────────────────┬─────────────────────────────────────┘
                    │
                    ▼
┌─────────────────────────────────────────────────────────┐
│ LexiTap Website (HTML/CSS, /website)                    │
│                                                         │
│ public/                                                 │
│  ├── index.html          (homepage)                    │
│  ├── legal/privacy.html  (privacy policy)              │
│  ├── legal/terms.html    (terms of service)            │
│  └── assets/             (images, fonts, CSS)          │
│                                                         │
│ Dev: npm run dev (localhost:8788)                       │
│ Deploy: npm run deploy (Cloudflare Pages)               │
└───────────────────┬─────────────────────────────────────┘
                    │
                    ▼
┌─────────────────────────────────────────────────────────┐
│ Cloudflare Pages (CDN + Hosting)                        │
│                                                         │
│ Production: lexitap.app                                 │
│ Staging: branch-based (feature/* → *.pages.dev)         │
└─────────────────────────────────────────────────────────┘
                    │
                    ▼
┌─────────────────────────────────────────────────────────┐
│ End User (Browser)                                      │
│ → Reads marketing copy                                  │
│ → Reviews privacy policy, terms                         │
│ → Clicks CTA to app store / contact                     │
└─────────────────────────────────────────────────────────┘
```

## Component Map

| Component | Purpose | Primary File(s) |
|-----------|---------|---|
| **Homepage** | Product overview, screenshots, CTA (download app) | `public/index.html` |
| **Privacy Policy** | Legal: data collection, processing, GDPR/CCPA | `public/legal/privacy.html` |
| **Terms of Service** | Legal: acceptable use, disclaimers, liability | `public/legal/terms.html` |
| **Delete Account** | Legal: instructions for account deletion | `public/legal/delete-account.html` (optional) |
| **Global Styles** | Typography, colors, spacing, responsive baseline | `public/assets/css/global.css` |
| **Page Styles** | Page-specific layouts, overrides | `public/assets/css/{page-name}.css` |
| **Images** | Hero banners, app screenshots, icons | `public/assets/img/**` |
| **Fonts** | Custom typefaces (if any) | `public/assets/fonts/**` |

## Data Flow

```
Builder.io Spec
  │
  ├─→ [Structure] → HTML semantic elements
  │                  (header, nav, sections, footer)
  │
  ├─→ [Design] → CSS (colors, spacing, typography)
  │               (global.css + page-specific)
  │
  └─→ [Copy] → Static text in HTML
               (no CMS; content hardcoded per Builder.io)

User Request (browser) → Cloudflare Pages
                        → Returns index.html or page file
                        → Browser fetches assets (CSS, images)
                        → Renders page
```

**No backend, no database, no API calls.** Each page is a static file. Links point to file paths on disk (`/legal/privacy` → `public/legal/privacy.html`).

## Routing & File Mapping

Cloudflare Pages auto-maps file paths:

| File Path | Browser URL | Served As |
|-----------|---|---|
| `public/index.html` | `/` or `/index.html` | HTML |
| `public/legal/privacy.html` | `/legal/privacy` | HTML |
| `public/legal/terms.html` | `/legal/terms` | HTML |
| `public/assets/css/global.css` | `/assets/css/global.css` | CSS |
| `public/assets/img/logo.svg` | `/assets/img/logo.svg` | SVG |
| `public/404.html` | (any non-existent path) | HTML (auto-fallback) |

**Note:** Cloudflare Pages auto-strips `.html` from URLs. URLs are clean (`/legal/privacy`, not `/legal/privacy.html`).

## External Dependencies

| Dependency | Purpose | Hosted Where |
|---|---|---|
| **Cloudflare Pages** | CDN + static hosting | cloudflare.com |
| **Cloudflare Wrangler** | CLI for local dev + deployment | npm |
| **(Optional) Analytics** | Page views, user flow (if Ryan wires PostHog) | PostHog EU host (future) |

**No JavaScript frameworks, no backend APIs, no databases.**

## Invariants (Must Remain True)

1. **All files are static.** No server-side rendering, no dynamic content generation. Every page must be a `.html` file in `public/`.

2. **No external CDN dependencies.** Fonts, icons, images self-hosted in `public/assets/`. Cloudflare CDN handles delivery.

3. **Mobile-first responsive design.** Base CSS for mobile (320px+), media queries for tablet (768px+) and desktop (1024px+).

4. **WCAG AA accessibility baseline.** All content reachable, readable, and keyboard-navigable.

5. **Deployment = `npm run deploy`.** No manual steps, no separate build. After edits, `npm run deploy` publishes to staging or production.

6. **Content mirrors app theme.** Colors, typography, spacing in sync with `mobile/` app design system (Ryan owns consistency).

## Performance Targets

- **Lighthouse Score:** ≥90 (Performance, Accessibility, Best Practices, SEO)
- **Page Load:** <1s on 4G
- **Repeat Load:** <100ms (Cloudflare cache)
- **Image Optimization:** All images <100KB each (except hero banners, <500KB)

## Deployment Pipeline

```
Local Dev (npm run dev)
    ↓
Commit to feature branch
    ↓
Push to origin
    ↓
Cloudflare Pages auto-deploys to staging branch URL
    ↓
Review staging site
    ↓
Merge PR to main (or push main directly)
    ↓
Cloudflare auto-deploys to production (lexitap.app)
```

**Auto-delete head branch on merge** is enabled (GitHub setting) to keep the repo clean.

## Future Integration Points (Out of Scope for Now)

- **Form handling** (contact form, waitlist signup) — currently CTA buttons link to email/Slack; Ryan will wire backend later
- **Analytics** (PostHog) — may be added to track page views, CTA clicks
- **Blog/Changelog** — static pages for now; no dynamic content system
- **Email capture** (waitlist) — depends on backend service (TBD)

---

**Architecture Status:** Stable | **Next Review:** after first Builder.io design import (2026-06)
