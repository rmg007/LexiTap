---
description: Generate a raster image/asset from a text prompt (OpenAI gpt-image-1) into the right canonical folder, auto-optimized.
argument-hint: <what to generate, e.g. "og card, teal owl mascot, flat vector">
---

Generate a raster image for LexiTap from this request: **$ARGUMENTS**

Use the asset system — do NOT hand-roll a new approach. Canonical guide: `scripts/README.md`.

## Steps

1. **Read the request** and infer intent:
   - **og / social card / hero** → `--size 1536x1024`, out `website/public/og-image.png` (or a clearly-named file in `website/public/`).
   - **content illustration / word image** → `--size 1024x1024`, out `mobile/assets/vocab/<slug>.png`.
   - **icon/logo exploration** → `--size 1024x1024 --transparent`, out `scripts/out/<slug>.png` (scratch — these are explorations, NOT shippable; see rule below).
   - **anything unclear** → out `scripts/out/<slug>.png` (scratch) and say so.

2. **Pick quality:** default `--quality low` for first exploration (cheap, ~$0.04), `--quality high` only when the user asks for a final-quality asset.

3. **Run:**
   ```bash
   node scripts/generate-image.js "<refined prompt>" --out <path> --size <WxH> --quality <q>
   ```
   PNG output is auto-optimized (sharp). Refine the user's words into a strong prompt — add style cues (flat vector, minimal, brand teal #20B2AA, soft background) when appropriate.

4. **If it fails:**
   - `OPENAI_API_KEY not set` → tell the user to add it to root `.env`.
   - `billing_hard_limit_reached` → the OpenAI account needs funding at platform.openai.com → Billing. Not a code issue.

5. **Report** the output path and, for web assets, remind that it landed optimized and ready to commit.

## Hard rules (from scripts/README.md — do not violate)

- **Generate freely** for og / marketing / content imagery.
- **The final app store icon + primary logo need Ryan's explicit sign-off and ship as VECTORS (Figma/SVG → `generate-icon.js`), never an AI-generated PNG.** For those, generate only into `scripts/out/` as exploration and say it's not shippable.
- Canonical homes only: `website/public/` (web), `mobile/assets/vocab/` (content). `scripts/out/` is gitignored scratch.
- Don't AI-gen what should be a vector (icons, UI mockups → Figma + `/figma-use`).
