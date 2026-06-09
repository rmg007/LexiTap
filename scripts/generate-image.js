#!/usr/bin/env node

/**
 * AI image generator for LexiTap (OpenAI gpt-image-1).
 *
 * Generates raster PNGs from a text prompt — og-images, marketing art,
 * content illustrations, icon explorations. Dependency-light: uses the
 * built-in fetch (Node 18+), no openai SDK.
 *
 * For deterministic SVG→PNG resizing of a FINAL icon, use generate-icon.js
 * instead. Diffusion output is exploration-grade; ship vectors for store icons.
 *
 * Setup:
 *   1. Add OPENAI_API_KEY to your root .env  (see .env.example)
 *   2. node scripts/generate-image.js "a friendly teal owl mascot, flat vector" \
 *        --out website/public/og-image.png --size 1536x1024
 *
 * Usage:
 *   node scripts/generate-image.js "<prompt>" [options]
 *
 * Options:
 *   --out <path>        Output file (default: scripts/out/image-<n>.png)
 *   --size <WxH>        1024x1024 | 1536x1024 | 1024x1536 | auto  (default 1024x1024)
 *   --quality <q>       low | medium | high | auto                (default high)
 *   --n <count>         Number of images to generate               (default 1)
 *   --transparent       Transparent background (icons/logos; forces PNG)
 *   --model <id>        Image model                                 (default gpt-image-1)
 *   --no-optimize       Skip the post-gen PNG compression pass (sharp)
 *
 * Cost (gpt-image-1, approx): ~$0.04 low / ~$0.07 medium / ~$0.17 high per 1024² image.
 */

const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');

// --- minimal .env loader (no dependency) -----------------------------------
function loadEnv() {
  const envPath = path.join(ROOT, '.env');
  if (!fs.existsSync(envPath)) return;
  for (const line of fs.readFileSync(envPath, 'utf8').split('\n')) {
    const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/i);
    if (!m) continue;
    const key = m[1];
    let val = m[2].replace(/^["']|["']$/g, '');
    if (process.env[key] === undefined) process.env[key] = val;
  }
}

// --- arg parsing ------------------------------------------------------------
function parseArgs(argv) {
  const opts = {
    size: '1024x1024',
    quality: 'high',
    n: 1,
    transparent: false,
    model: 'gpt-image-1',
    out: null,
    optimize: true,
  };
  const positional = [];
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    switch (a) {
      case '--out': opts.out = argv[++i]; break;
      case '--size': opts.size = argv[++i]; break;
      case '--quality': opts.quality = argv[++i]; break;
      case '--n': opts.n = parseInt(argv[++i], 10); break;
      case '--model': opts.model = argv[++i]; break;
      case '--transparent': opts.transparent = true; break;
      case '--no-optimize': opts.optimize = false; break;
      default:
        if (a.startsWith('--')) { console.error(`Unknown flag: ${a}`); process.exit(2); }
        positional.push(a);
    }
  }
  opts.prompt = positional.join(' ').trim();
  return opts;
}

async function main() {
  loadEnv();

  const opts = parseArgs(process.argv.slice(2));

  if (!opts.prompt) {
    console.error('✗ No prompt given.\n  Usage: node scripts/generate-image.js "<prompt>" [--out path] [--size WxH] [--quality low|medium|high] [--n N] [--transparent]');
    process.exit(2);
  }

  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    console.error('✗ OPENAI_API_KEY not set.\n  Add it to your root .env (see .env.example) or export it in your shell.');
    process.exit(1);
  }

  const body = {
    model: opts.model,
    prompt: opts.prompt,
    n: opts.n,
    size: opts.size,
    quality: opts.quality,
  };
  if (opts.transparent) body.background = 'transparent';

  console.log(`Generating ${opts.n} image(s) — ${opts.size} ${opts.quality}${opts.transparent ? ' transparent' : ''}`);
  console.log(`Prompt: ${opts.prompt}\n`);

  const res = await fetch('https://api.openai.com/v1/images/generations', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const text = await res.text();
    console.error(`✗ API error (${res.status}):\n${text}`);
    process.exit(1);
  }

  const json = await res.json();
  const images = json.data || [];
  if (!images.length) {
    console.error('✗ No images returned.');
    process.exit(1);
  }

  // Resolve output path(s)
  const defaultDir = path.join(__dirname, 'out');
  let outBase, outDir, outExt, outName;
  if (opts.out) {
    outDir = path.dirname(opts.out);
    outExt = path.extname(opts.out) || '.png';
    outName = path.basename(opts.out, outExt);
  } else {
    outDir = defaultDir;
    outExt = '.png';
    outName = 'image';
  }
  if (!fs.existsSync(outDir)) fs.mkdirSync(outDir, { recursive: true });

  const written = [];
  images.forEach((img, i) => {
    const suffix = images.length > 1 ? `-${i + 1}` : '';
    const outPath = path.join(outDir, `${outName}${suffix}${outExt}`);
    fs.writeFileSync(outPath, Buffer.from(img.b64_json, 'base64'));
    written.push(outPath);
    console.log(`  ✓ ${path.relative(ROOT, outPath)}`);
  });

  // Post-gen compression (sharp). Graceful: skip if --no-optimize or sharp missing.
  if (opts.optimize) {
    try {
      const { optimizeFile } = require('./optimize-asset');
      for (const f of written) {
        if (path.extname(f).toLowerCase() !== '.png') continue;
        const r = await optimizeFile(f);
        if (r && r.after < r.before) {
          const pct = Math.round((1 - r.after / r.before) * 100);
          console.log(`  ↳ optimized ${path.relative(ROOT, f)}  -${pct}%`);
        }
      }
    } catch (e) {
      console.log(`  (skipped optimize: ${e.message})`);
    }
  }

  if (json.usage) {
    console.log(`\nTokens — input ${json.usage.input_tokens ?? '?'}, output ${json.usage.output_tokens ?? '?'}`);
  }
  console.log('\n✓ Done.');
}

main().catch((err) => {
  console.error(`✗ ${err.message}`);
  process.exit(1);
});
