# App Store Assets — Index

**Status:** ✓ Planning + specifications complete. Implementation deferred to P5 (screenshots + PNG exports).

---

## Files in This Directory

| File | Purpose |
|------|---------|
| **`lexitap-icon.svg`** | Master icon source (editable vector) |
| **`README.md`** | How to generate PNG icon variants + submit to stores |
| **`SCREENSHOTS_SPEC.md`** | Detailed spec for 5 core app store screenshots |
| **`STORE_COPY.md`** | App store listing copy (name, description, keywords) |

## Related Docs (Outside This Dir)

| File | Purpose |
|------|---------|
| **`plans/ASSET_STRATEGY.md`** | Strategic overview (design direction, timeline, high-risk areas) |
| **`scripts/generate-icon.js`** | Node.js icon generator (requires sharp; see README.md) |

---

## Quick Start

### 1. Generate PNG Icon Variants

**Easiest:** Use online converter (CloudConvert, Convertio, etc.)
- Upload `lexitap-icon.svg`
- Export PNG at 1024×1024, 512×512, 180×180, 120×120
- Save as `lexitap-icon-{size}.png` in this directory

**Alternative:** Command-line (if rsvg-convert installed)
```bash
rsvg-convert -w 1024 -h 1024 lexitap-icon.svg -o lexitap-icon-1024.png
rsvg-convert -w 512 -h 512 lexitap-icon.svg -o lexitap-icon-512.png
rsvg-convert -w 180 -h 180 lexitap-icon.svg -o lexitap-icon-180.png
rsvg-convert -w 120 -h 120 lexitap-icon.svg -o lexitap-icon-120.png
```

### 2. Capture Real App Screenshots (P5, when UI stable)

```bash
# iOS
xcrun simctl screenshot booted ios-screenshot-1.png

# Android
adb exec-out screencap -p > android-screenshot-1.png
```

See `SCREENSHOTS_SPEC.md` for full capture + post-processing guide.

### 3. Use Store Copy

Copy text from `STORE_COPY.md`:
- App name: `LexiTap`
- Tagline: `Learn English offline, anytime`
- Full description (1,247 chars)
- Keywords

Paste into iOS App Store Connect + Google Play Store console.

### 4. Pre-Submission Checklist

From `ASSET_STRATEGY.md`, section 4:
- [ ] Icon: 1024×1024 PNG + smaller variants
- [ ] 5+ iOS + Android screenshots (simulator-captured)
- [ ] Text overlays on screenshots (descriptions, <170 chars)
- [ ] Store copy reviewed (calm tone, no hype)
- [ ] Privacy + Terms links live on lexitap.app
- [ ] Screenshots show only shipped features

---

## Timeline

**Now (P4–early P5):** Icon design + screenshot spec complete ✓

**P5 (pre-launch):**
1. Finalize paywall + home screen UI
2. Capture real simulator screenshots (5 core flows)
3. Add text overlays + verify tone
4. Generate PNG icons (if not done)
5. Bulk upload to stores (≥5 weeks before desired launch)

**P5 final:** Integrate feedback from store review; resubmit if rejected

---

## Design Notes

### Icon

- **Brand colors:** Teal `#20B2AA` (background), white `#F2F5F6` (text)
- **Monogram:** "LT" (clean, memorable at small sizes)
- **Rounded square:** iOS convention (SF Symbols style)
- **No app name in icon:** Text breaks at <512px; use monogram only

### Screenshots

- **Tone:** Calm, evidence-based, humble (not hype)
- **Real app:** Simulator captures ONLY (no mockups; stores reject)
- **Text:** Describes features (e.g., "Multiple choice, instant feedback")
- **Color:** Dark theme with teal accents (#20B2AA visible)
- **Accessibility:** High contrast text (7:1 WCAG AA), readable font size

---

## Common Pitfalls (Don't)

- ✗ Screenshot features not yet shipped (store rejection, user backlash)
- ✗ Overstate results ("Fluent in 30 days," "Master English")
- ✗ Use marketing clichés ("Transform your life," "Unlock potential")
- ✗ Point privacy/terms links to external sites (app-specific only)
- ✗ Mock-up screenshots instead of real simulator captures
- ✗ Hardcode app name in icon (scales poorly, inflexible)

---

## References

- **Design system:** `mobile/tailwind.config.js` (color tokens)
- **App name:** `mobile/app.config.ts` (`slug: 'lexitap'`, name: `'LexiTap'`)
- **Privacy + Terms:** `website/public/privacy.html`, `website/public/terms.html`
- **Release timeline:** `plans/RELEASE_PLAN.md` (P5 launch dates)

---

**Owner:** Ryan Gonzalez  
**Last updated:** 2026-05-31  
**Phase:** P5 (pre-launch store submission)
