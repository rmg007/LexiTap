# LexiTap Website

Static marketing + legal site for **lexitap.app**, hosted on **Cloudflare Pages**.
Plain HTML/CSS/vanilla JS — no framework, no build step.

## Structure

```
website/
├── public/              # everything here is deployed verbatim
│   ├── index.html       # home / landing
│   ├── privacy.html     # privacy policy  (alias: /privacy)
│   ├── terms.html       # terms of service (alias: /terms)
│   ├── styles.css       # shared theme — mirrors mobile/src/presentation/theme/tokens.ts
│   ├── theme-toggle.js  # dark/light toggle (system default + localStorage)
│   ├── favicon.svg
│   ├── _headers         # security headers + caching (CSP, HSTS, …)
│   └── _redirects       # www→apex, friendly /privacy & /terms aliases
├── wrangler.toml        # Pages project config (output dir = public)
├── package.json         # wrangler devDep + deploy scripts
└── README.md
```

## Theme

Colors and fonts mirror the mobile app's design tokens
(`mobile/src/presentation/theme/tokens.ts`, `lexitap-docs/03-ux-design/DESIGN_SYSTEM.md`):
teal accent `#20B2AA` (dark) / `#178F88` (light), Playfair Display headlines, Inter body.
Dark is canonical; light is the derived theme. The toggle defaults to the visitor's
system preference and remembers an explicit choice.

**If the app theme changes, update `public/styles.css` to match.**

## Develop locally

```bash
cd website
npm install
npm run dev        # serves public/ at http://localhost:8788
```

## Deploy (Cloudflare Pages via wrangler)

One-time auth (opens a browser — must be done by the account owner):

```bash
npx wrangler login
```

Then deploy:

```bash
npm run deploy     # wrangler pages deploy public --project-name=lexitap
```

First deploy creates the `lexitap` Pages project. After that, attach the custom
domain in **Cloudflare dashboard → Workers & Pages → lexitap → Custom domains**:
add `lexitap.app` (and `www.lexitap.app`). DNS is automatic when the domain is on
Cloudflare.

## Email

`privacy@lexitap.app` and `support@lexitap.app` are referenced on the site. Set up
email forwarding/routing for the domain (Cloudflare Email Routing works) so these
addresses deliver.

## TODO before public launch

- [ ] Replace placeholder `og-image.png` (1200×630 social card).
- [ ] Swap "Coming soon" badges for real App Store / Google Play links at launch.
- [ ] Legal review of `privacy.html` / `terms.html` before relying on them.
