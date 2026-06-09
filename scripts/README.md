# Asset Operations — LexiTap

**Canonical guide for any agent/chat that needs to create, update, or delete a design, CSS, image, or icon.** If you touch a visual asset, the rules and tools are here. Read this before improvising.

There is **no magic dispatcher** — each asset type has the right tool and the right home. This doc maps them.

**Fastest path:** run **`/gen-image <description>`** (slash command) — it picks size/quality/output folder, generates, and auto-optimizes. Everything below is the manual layer it wraps.

**npm shortcuts** (root `package.json`): `npm run gen:image -- "<prompt>" --out <path>` · `npm run gen:icon` · `npm run optimize -- <file-or-dir>`.

---

## Quick reference

| Asset type | Tool | Canonical home | Create / Update / Delete |
|---|---|---|---|
| **CSS** | Edit files directly | `website/public/styles.css` (web). App = RN/nativewind styles, **not CSS**. | Edit the file. Tokens live in [`website/DESIGN_TOKENS.md`](../website/DESIGN_TOKENS.md) — keep them in sync. |
| **Designs / UI** (vector, editable) | **Figma MCP** (connected) | Figma file + HTML mirrors in [`.design-specs/html/screens/`](../.design-specs/html/screens/) | Use Figma MCP (load `/figma-use` skill first). Mirror finished screens into `.design-specs/` HTML. |
| **Images** (raster: og, marketing, content illustration) | [`scripts/generate-image.js`](generate-image.js) — OpenAI `gpt-image-1` | `website/public/` (web), `mobile/assets/vocab/` (content), `scripts/out/` (scratch, gitignored) | Generate → `--out <path>`. Update = re-generate. Delete = `git rm`. |
| **Icons** (final, deterministic) | [`scripts/generate-icon.js`](generate-icon.js) — SVG→PNG via `sharp` | `website/assets/lexitap-icon-*.png` (canonical), `mobile/assets/{icon,adaptive-icon,splash}.png` (app) | Edit the SVG source → re-run resizer. **Final brand icon: get Ryan's sign-off (see Rules).** |

---

## 1. CSS

- **Web:** single stylesheet [`website/public/styles.css`](../website/public/styles.css). Plain CSS, theme mirrors the app. Dark/light via [`website/public/theme-toggle.js`](../website/public/theme-toggle.js). Token source of truth: [`website/DESIGN_TOKENS.md`](../website/DESIGN_TOKENS.md) — if you change a color/spacing value, update the token doc too.
- **App:** there is no CSS. Styling is React Native / nativewind in `mobile/src/presentation/`. "Update the app's CSS" = edit RN style objects / nativewind classes.

## 2. Designs / UI (vector)

- Use the **Figma MCP** (already connected, no install). **Load the `/figma-use` skill before any `use_figma` call** — mandatory, prevents hard-to-debug failures.
- Design-to-code and code-to-design both supported. For building a full screen/page in Figma, also load `/figma-generate-design`.
- HTML prototypes of screens live in [`.design-specs/html/screens/`](../.design-specs/html/screens/) (light + dark variants). Keep these in sync when a screen design changes.
- **Vector beats raster for anything editable/shippable** (icons, logos, UI). Don't AI-generate a screen mockup you'll need to edit — build it in Figma.

## 3. Images (raster) — `scripts/generate-image.js`

AI image generation via OpenAI `gpt-image-1`. Dependency-light (built-in `fetch`, no SDK).

```bash
node scripts/generate-image.js "<prompt>" \
  --out website/public/og-image.png \
  --size 1536x1024 --quality high
```

| Flag | Values | Default |
|---|---|---|
| `--out <path>` | output file | `scripts/out/image.png` (scratch, gitignored) |
| `--size <WxH>` | `1024x1024` `1536x1024` `1024x1536` `auto` | `1024x1024` |
| `--quality <q>` | `low` `medium` `high` `auto` | `high` |
| `--n <count>` | number of variants | `1` |
| `--transparent` | transparent background (logos/icons) | off |

- **Cost** (approx): ~$0.04 low / ~$0.07 medium / ~$0.17 high per 1024². Use `--quality low` for exploration.
- **Good for:** og-images, marketing/hero art, content illustrations (word imagery).
- **Bad for:** final store icon (diffusion output is exploration-grade — soft edges, off-grid, no clean vector), and UI mockups (use Figma — raster gives you an un-editable picture with fake text).
- Requires `OPENAI_API_KEY` in root `.env` (see [`.env.example`](../.env.example)). Script errors clearly if unset.

## 4. Icons (deterministic) — `scripts/generate-icon.js`

SVG→PNG resizer (`sharp`). Renders a vector source to `1024/512/180/120` PNGs. Use this for the **final** icon pipeline — edit the SVG, re-run, get crisp pixel-exact output.

```bash
npm install --save-dev sharp   # one-time
node scripts/generate-icon.js
```

- Canonical web icons: `website/assets/lexitap-icon-*.png` + SVG sources (`lexitap-icon.svg`, `lexitap-adaptive-icon.svg`).
- App icons: `mobile/assets/icon.png`, `adaptive-icon.png`, `splash.png` (consumed by Expo via `app.config.ts`).
- Brand SVG scratch/exploration: `lexitap_svg_assets/` (**gitignored** — not canonical).

## 5. Optimize before shipping — `scripts/optimize-asset.js`

Shrinks PNG (sharp) + SVG (svgo) in place. `generate-image.js` runs this automatically on PNG output (disable with `--no-optimize`). Run it manually on anything else headed for the web (Cloudflare Pages — bytes matter):

```bash
npm run optimize -- website/public/og-image.png   # one file
npm run optimize -- website/assets                 # recurse a dir (png+svg)
```

Typical savings: PNG ~40%, SVG ~35%. Lossless-safe (only writes if smaller; keeps SVG `viewBox`).

---

## Create / Update / Delete — the universal workflow

- **Create:** pick the tool from the table → output to the canonical home (not scratch, unless exploring).
- **Update:** edit the *source* (SVG, CSS, Figma, token doc), then regenerate any derived PNGs. Never hand-edit a generated PNG.
- **Delete:** `git rm <path>` for committed assets. Scratch dirs (`scripts/out/`, `lexitap_svg_assets/`) are gitignored — just delete the files.

## Rules & guardrails (do not violate)

1. **Final brand identity needs Ryan's sign-off.** The app **store icon** and primary **logo** are brand-critical — propose/explore freely, but the shipped file gets Ryan's explicit OK. AI-generated PNGs are **never** submitted as the store icon; ship a clean vector. (Everything else — og-images, marketing, content illustration — generate and use freely.)
2. **`OPENAI_API_KEY` is a build-tooling secret.** Lives in root `.env` (gitignored). **Never** committed, logged, or bundled into the mobile app. Rotate on leak.
3. **Edit sources, regenerate derivatives.** SVG/token/Figma is truth; PNGs/CSS-output are derived.
4. **Canonical homes only.** `website/assets/` (web icons), `mobile/assets/` (app icons), `website/public/` (web images/css). `scripts/out/` and `lexitap_svg_assets/` are scratch (gitignored) — never cite them as canonical.
5. **Vector for editable/shippable; raster for photographic/illustrative.** Don't AI-gen what should be a vector.

---

*Setup for image gen: add `OPENAI_API_KEY` to root `.env`, fund the OpenAI account (Billing), then run the command above. See [`.env.example`](../.env.example).*
