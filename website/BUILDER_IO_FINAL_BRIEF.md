# Final Brief: Builder.io Design for LexiTap Website

**To Builder.io:**

You've been given the context. Now build the best design possible.

---

## What "Best" Means Here

1. **Mobile-first beautiful.** Design for 375px first. Tablet/desktop come after. If it looks great on a phone, it will scale.

2. **Accessible by default.** Don't make accessibility a checklist item—build it in:
   - Color contrast ≥4.5:1 for all body text (measure it)
   - Touch targets ≥48px on mobile (no tiny buttons)
   - Type hierarchy so clear a user can scan in 3 seconds
   - Semantic structure (your design should suggest correct HTML)

3. **Mirrors the app.** The mobile app (iOS, Expo + React Native) is clean and modern. This website should feel like the same brand, not a different company. Reference: https://github.com/rmg007/LexiTap/tree/master/mobile (UI in Expo, React Native, TypeScript—but aesthetically, look at the screens).

4. **Implementable in static HTML/CSS.** No JavaScript framework, no build step, no external CDN dependencies. This does NOT limit your design—it just means:
   - No modals that require JS state
   - No carousels (but stacked cards on mobile → 2–3 grid on tablet/desktop is great)
   - No fancy animations (but CSS hover states, transitions, subtle movement is perfect)
   - All assets self-hosted (no Google Fonts, no Bootstrap, no CDN links)

5. **Fast loading.** Images must be optimized (heroes <500KB, everything else <100KB). Design should suggest this—one hero, lean imagery, text-heavy where it matters.

6. **Trust-focused.** This is for ESL learners (and parents/teachers of ESL learners). They want to trust the app. Design should feel:
   - Professional, not gimmicky
   - Focused, not cluttered
   - Clear on what the app does, not vague

---

## The Pages You're Designing

### Homepage (`/`)
- **Hero:** Headline + subheading + primary CTA (Download button)
- **Problem section:** Why vocabulary? Why SRS? Why offline? (1–3 sentences each, scannable)
- **Key features:** 3–4 cards showing the app's superpowers (offline, SRS, privacy, etc.)
- **Secondary CTA:** "Learn more about privacy" or "Why LexiTap?" (link to details)
- **Footer:** Copyright, links to legal pages

**Goal:** User lands, understands the app in 10 seconds, hits "Download" or scrolls to learn more.

### Privacy Policy (`/legal/privacy`)
- Legally compliant (GDPR, CCPA, privacy-focused)
- Clear sections (data we collect, how we use it, your rights, deletion)
- Scannable (headings, lists, short paragraphs—not a wall of text)
- Plain language where possible

**Goal:** User can skim, find what they need, trust the company.

### Terms of Service (`/legal/terms`)
- Standard legal terms (acceptable use, liability limits, dispute resolution)
- Clear sections (similar to privacy)
- Enforceable, not scary

**Goal:** Minimalist legal protection, not a threat.

### Delete Account (Optional, `/legal/delete-account`)
- If included: step-by-step guide to deleting account (GDPR/CCPA right to erasure)
- Clear CTA to start deletion
- Plain language

---

## Design Tokens (You Decide)

Pick your own. Constraints:
- **Color palette:** 2–3 primary colors + 2–3 neutrals (grays for text/borders)
- **Primary color:** Vibrant enough for CTAs to pop, professional enough for trustworthiness (not neon)
- **Text:** Dark text on light (or light on dark), never gray-on-gray. Contrast ≥4.5:1.
- **Typography:** System fonts (free, fast, accessible) OR 1 self-hosted custom font. No CDN dependencies.
- **Spacing:** Consistent, predictable. 0.5rem, 1rem, 1.5rem, 2rem, 3rem — use a scale.

**Document your choices.** When you hand off the design, export:
```
Primary color: #...
Secondary color: #...
Text color: #...
Background: #...
Font: [system stack or custom font name]
Font sizes: h1=2rem, h2=1.5rem, body=1rem
```

---

## Responsive Breakpoints

Design for three viewports:

| Viewport | Width | Usage |
|----------|-------|-------|
| Mobile | 375px | Base; priority |
| Tablet | 768px | Secondary refinement |
| Desktop | 1440px | Nice-to-have enhancement |

Mobile is do-or-die. If it looks great at 375px and scales cleanly, you've won.

---

## Deliverables When Done

1. **Builder.io preview link** (so agents can see the design live)
2. **Design tokens export** (colors, typography, spacing — screenshot or JSON)
3. **Mobile + tablet + desktop screenshots** (prove responsive design works)
4. **Content copy** (headlines, CTAs, feature descriptions exactly as they should appear)
5. **Image list** (what images you're using, where they live, dimensions, alt text placeholders)

Or: Just share the Builder.io preview link and we'll extract the rest.

---

## Success Criteria (Non-Negotiable)

- [ ] Mobile design is primary; tablet/desktop are obvious progressions (not afterthoughts)
- [ ] All text ≥4.5:1 contrast against background (measure in DevTools)
- [ ] All interactive elements (buttons, links) ≥48×48px on mobile
- [ ] Type hierarchy is obvious (headings clearly bigger/bolder than body)
- [ ] Hero section is visually compelling (image, headline, CTA — user gets it in 3 sec)
- [ ] Feature cards are distinct, scannable, benefit-focused (not feature lists)
- [ ] Legal pages are readable, not scary (short paragraphs, clear headings, lists > prose)
- [ ] CTAs are obvious (big, high-contrast, action-oriented: "Download", "Get Started", "Delete Account")
- [ ] Design is implementable in plain HTML/CSS (no JS framework required)
- [ ] Design suggests semantic HTML structure (header nav, main, sections, footer)
- [ ] No external dependencies (fonts, images, assets are self-hosted)

---

## Process

1. **Build in Builder.io.** Start with the brief, iterate, share preview links with Ryan for feedback.
2. **Lock the design.** Once Ryan approves, finalize design tokens and content.
3. **Hand off.** Share the preview link (agents will reference it).
4. **Agents implement.** Coding agents convert your design to HTML/CSS in 1–2 hours per page (using PLAN templates).
5. **Deploy.** Cloudflare Pages auto-publishes; Ryan approves staging → merges to production.

---

## What We're Grading On

Not "is it pretty?" (though it should be). Grading on:

1. **Does it work on mobile?** (Non-negotiable)
2. **Is it accessible?** (WCAG AA: contrast, targets, hierarchy)
3. **Does it sell the app?** (Clear value prop, obvious CTA, builds trust)
4. **Can agents implement it?** (Semantic structure, plain CSS-friendly, no JS complexity)
5. **Will it load fast?** (Optimized images, no bloat, clean code structure)
6. **Does it match the app aesthetic?** (Feels like LexiTap, not generic)

---

## One More Thing

**Make it distinctive.** The ugly draft was generic. You have freedom to:
- Use an interesting color palette (but keep it professional)
- Play with typography hierarchy (big, bold headlines; clean body text)
- Use whitespace intentionally (empty space is design, not wasted space)
- Choose imagery that tells a story (not stock photos of people in suits)
- Add subtle motion (CSS hover effects, transitions—not distracting animations)

The goal is: **Users look at this site and immediately feel the app is high-quality.**

---

## Questions?

If the brief is unclear, ask Ryan. If you're uncertain about a design choice, propose it—Ryan will review. But once you're locked in, **execute with confidence.** This is your chance to build something users will respect.

---

**Status:** Ready to design  
**Deadline:** No hard deadline; quality > speed  
**Next step:** Share a preview link with Ryan  
**Success:** Agents implement it in 1–2 hours, users love it, app downloads increase

**Go build something great.**

---

**Created:** 2026-05-31 | **Audience:** Builder.io | **Owner:** Ryan Gonzalez
