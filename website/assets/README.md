# LexiTap App Store Assets

This directory contains app store assets for iOS App Store and Google Play.

## Icon

- **`lexitap-icon.svg`** — Master icon source (editable vector)
  - Design: Teal rounded square (#20B2AA) + white "LT" monogram
  - Use this as the single source of truth; convert to PNG for stores

### Generate PNG versions from SVG

**Option 1: Using online converter** (fastest for one-off)
1. Go to [CloudConvert](https://cloudconvert.com/svg-to-png) or similar
2. Upload `lexitap-icon.svg`
3. Export at 1024×1024, 512×512, 180×180, 120×120
4. Save as `lexitap-icon-{size}.png` in this directory

**Option 2: Command-line (requires librsvg or ImageMagick)**
```bash
# Using rsvg-convert (librsvg)
rsvg-convert -w 1024 -h 1024 lexitap-icon.svg -o lexitap-icon-1024.png
rsvg-convert -w 512 -h 512 lexitap-icon.svg -o lexitap-icon-512.png
rsvg-convert -w 180 -h 180 lexitap-icon.svg -o lexitap-icon-180.png
rsvg-convert -w 120 -h 120 lexitap-icon.svg -o lexitap-icon-120.png

# Using ImageMagick
convert -density 300 lexitap-icon.svg -resize 1024x1024 lexitap-icon-1024.png
```

**Option 3: Node.js script** (if sharp is installed)
```bash
npm install --save-dev sharp
node ../../scripts/generate-icon.js
```

## Screenshots

**Status:** TODO (captured during P5 when app UI is stable)

Screenshots go here as:
- `ios-screenshot-{1..7}.png` — iPhone screenshots (1170×2532 or 750×1334)
- `android-screenshot-{1..7}.png` — Android screenshots (1080×1920 or 1440×2560)

**Capture method:**
```bash
# iOS simulator
xcrun simctl screenshot booted ios-screenshot-1.png

# Android emulator
adb exec-out screencap -p > android-screenshot-1.png
```

## Store Metadata

Copy is in `plans/ASSET_STRATEGY.md`:
- App name: `LexiTap`
- Tagline: `Learn English offline, anytime`
- Full description, keywords, privacy/terms links

**Submission checklist:**
- [ ] 1024×1024 icon + smaller variants exist
- [ ] 5+ iOS + Android screenshots captured
- [ ] Screenshots have text overlays with feature descriptions
- [ ] Store copy reviewed for tone (calm, evidence-based, not hype)
- [ ] Privacy + Terms links point to live lexitap.app URLs

See `plans/ASSET_STRATEGY.md` for full spec.

---

**Owner:** Ryan Gonzalez  
**Phase:** P5 (pre-launch store submission)
