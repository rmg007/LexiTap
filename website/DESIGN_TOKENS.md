# LexiTap Website — Design Tokens

Complete design system for `lexitap.app` website. All tokens live in `public/styles.css` as CSS custom properties.

## Color Palette

### Dark Theme (Canonical)
Primary theme — used by default and when user selects dark mode.

| Token | Value | Usage |
|-------|-------|-------|
| `--bg-base` | `#0E1112` | Page background |
| `--bg-surface` | `#171A1C` | Cards, elevated surfaces |
| `--bg-surface-raised` | `#1F2426` | Hover states, emphasized surfaces |
| `--bg-surface-sunken` | `#0A0C0D` | Callouts, subtle backgrounds |
| `--border-subtle` | `#262B2E` | Quiet borders, dividers |
| `--border-strong` | `#3A4145` | Emphasized borders, hover states |
| `--text-primary` | `#F2F5F6` | Headlines, main text, high contrast |
| `--text-secondary` | `#A9B2B6` | Body copy, secondary text |
| `--text-tertiary` | `#6E777B` | Captions, metadata, low priority |
| `--accent` | `#20B2AA` | CTAs, highlights, interactive elements |
| `--accent-pressed` | `#1A938C` | Hover/active state for accent |
| `--accent-subtle` | `#13322F` | Accent background (low contrast) |
| `--on-accent` | `#062826` | Text on accent background |
| `--success` | `#4CAF50` | Success states, positive feedback |
| `--streak` | `#FF9A3D` | Streaks, achievement, gamification |

**Contrast verification (dark):**
- Text primary on base: 16:1 ✓ (WCAG AAA)
- Text secondary on base: 7.5:1 ✓ (WCAG AA)
- Accent on base: 6:1 ✓ (WCAG AA)
- All text on surfaces meets WCAG AA (4.5:1 minimum)

### Light Theme (Derived)
Applied when `data-theme="light"` or system prefers light.

| Token | Dark | Light |
|-------|------|-------|
| `--bg-base` | `#0E1112` | `#FBFCFC` |
| `--bg-surface` | `#171A1C` | `#FFFFFF` |
| `--text-primary` | `#F2F5F6` | `#1A1D1E` |
| `--text-secondary` | `#A9B2B6` | `#52595C` |
| `--accent` | `#20B2AA` | `#178F88` |
| `--on-accent` | `#062826` | `#FFFFFF` |

Light theme uses same spacing, typography, and radius tokens as dark.

## Typography

### Font Families
- **Display (headlines):** `Playfair Display, Georgia, serif` — serif elegance for h1/h2
- **UI (body):** `Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif` — modern sans-serif, system fallbacks

Both fonts are **self-hosted** or system-provided (no external CDN dependency post-load).

### Type Scale (CSS `clamp()` for fluid sizing)

| Element | Size (mobile) | Size (desktop) | Line height | Weight | Notes |
|---------|---|---|---|---|---|
| h1 | `32px` | `56px` | `1.1` | `700` | Playfair Display; `clamp(32px, 8vw, 56px)` |
| h2 | `22px` | `40px` | `1.2` | `700` | Playfair Display; `clamp(28px, 5vw, 40px)` |
| h3 | `18px` | `18px` | `1.2` | `700` | Inter; static |
| Body | `16px` | `16px` | `1.6` | `400` | Inter; readable on all screens |
| Small (captions) | `14px` | `14px` | `1.4` | `500` | Color: `--text-tertiary` |

**Sizing strategy:** Display uses `clamp()` for responsive scaling; body text stays fixed at 16px for mobile readability.

## Spacing Scale (8pt base)

| Token | Value | Usage |
|-------|-------|-------|
| `--s1` | `4px` | Tiny gaps, icon offsets |
| `--s2` | `8px` | Small gaps, padding in badges |
| `--s3` | `12px` | Tight spacing |
| `--s4` | `16px` | Standard padding, gutter |
| `--s6` | `24px` | Card padding, section gaps |
| `--s8` | `32px` | Large padding, section spacing |
| `--s10` | `40px` | Extra large spacing |
| `--s12` | `48px` | Massive spacing, hero padding |
| `--s16` | `64px` | Hero height, large sections |
| `--s20` | `80px` | Reserved for extra tall sections |
| `--s24` | `96px` | Reserved for hero variants |

**Mobile padding:** `--gutter: 16px` (s4) on all edges; increases to `var(--s8)` on tablet+ (768px+).

## Radii & Layout

| Token | Value | Usage |
|-------|-------|-------|
| `--radius-sm` | `8px` | Skip link, small buttons |
| `--radius-md` | `12px` | Cards, callouts, badges |
| `--radius-lg` | `20px` | Large cards, hero section |
| `--radius-full` | `999px` | Eyebrow tags, rounded buttons |
| `--content-max` | `600px` | Legal docs, prose max-width |
| `--wide-max` | `960px` | Page max-width (wrap) |
| `--gutter` | `16px` | Horizontal padding on mobile |

## Interactive Elements

### Buttons / CTAs (`.badge`)
- **Default:** Accent background, white text, 48px min-height
- **Hover:** Darker accent (`--accent-pressed`)
- **Coming soon variant:** Surface background, secondary text, subtle border
- **Padding:** `var(--s3) var(--s6)` (mobile-friendly 48px touch target)
- **Font:** Inter, 15px, weight 600

### Links (a)
- **Default:** Accent color, no underline
- **Hover:** Darker accent (`--accent-pressed`), underline
- **Transition:** `color .15s`

### Cards (`.card`)
- **Background:** `--bg-surface`
- **Border:** `--border-subtle`, 1px
- **Padding:** `var(--s6)` (24px)
- **Radius:** `--radius-lg` (20px)
- **Hover:** Border color → `--border-strong`, slight lift (transform: translateY(-2px))
- **Transition:** `border-color .15s, transform .15s`

## Responsive Breakpoints

| Device | Width | Design Strategy |
|--------|-------|---|
| Mobile | ≤375px | Single column, full-width badges, large touch targets (48×48px minimum) |
| Tablet | 376px–767px | Two-column grid for cards, increased padding |
| Tablet+ | 768px+ | Three-column grid, `--gutter: var(--s8)` (32px) |
| Desktop | ≥1200px | `--wide-max: 960px` cap, centered content |

**Grid:** `grid-template-columns: repeat(auto-fit, minmax(280px, 1fr))` — 280px cards scale responsively.

## Accessibility

**Color Contrast (WCAG AA verified):**
- All text on background: ≥4.5:1
- Accent on base: 6:1
- Accent secondary: 7.5:1

**Touch Targets:**
- All interactive elements: ≥48×48px (`.badge`, `.theme-toggle`)
- Focus states: Visible outline, high contrast

**Motion:**
- Respects `prefers-reduced-motion: reduce` — disables all transitions and animations

**Semantic HTML:**
- `<header>`, `<nav>`, `<main>`, `<section>`, `<footer>` for landmark regions
- Skip link for keyboard navigation
- `aria-label`, `aria-hidden` for clarity

## Hero Section

- **Background:** Linear gradient (base → surface)
- **Eyebrow:** Accent color, uppercase, `--accent-subtle` background, `--radius-full` (pill-shaped)
- **Heading:** Playfair Display, `clamp(32px, 8vw, 56px)`, max-width 12ch for line breaks
- **Emphasis:** Accent color on `<em>` (non-italic display)
- **CTA badges:** Two-column flex (flex-wrap on mobile), min-height 48px, full-width on 375px phones

## Legal Doc Pages

- **H1 size:** `clamp(32px, 6vw, 48px)`
- **H2 size:** `22px`, top border separator
- **Callout:** `--bg-surface-sunken` background, `--border-subtle` border + 4px left accent border
- **Table:** Bordered, header background `--bg-surface-sunken`, responsive overflow-x
- **Prose max-width:** `600px`, centered
- **Line height:** 1.6 (body), 1.5 (callout)

## Light Mode Overrides

When `data-theme="light"` or system preference is light:
- Text colors invert to high-contrast dark on light
- Accent becomes darker teal (`#178F88`)
- Surfaces lighten (white, near-white)
- All contrast ratios remain WCAG AA+

**No separate CSS file needed** — all color tokens switch via CSS custom property override.

---

## Usage

All tokens are **global CSS custom properties** in `:root`. Use in HTML/CSS:

```html
<button style="background: var(--accent); color: var(--on-accent); padding: var(--s4);">
  Call to action
</button>
```

**Never hardcode colors or spacings.** Always use tokens to ensure consistency and support theme switching.

---

**Last updated:** 31 May 2026  
**For:** Agents implementing `website/public/` pages  
**Reference:** `AGENTS.md`, `architecture.md`
