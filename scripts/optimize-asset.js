#!/usr/bin/env node

/**
 * Asset optimizer — shrinks PNG (sharp) and SVG (svgo) in place.
 *
 * Marketing site is on Cloudflare Pages; raw gpt-image-1 PNGs and hand-authored
 * SVGs are heavier than they need to be. Run this before shipping any web asset.
 *
 * Usage:
 *   node scripts/optimize-asset.js <file-or-dir> [more...]
 *   npm run optimize -- website/public/og-image.png
 *   npm run optimize -- website/assets        # recurses, optimizes png+svg
 *
 * Also importable: const { optimizeFile } = require('./optimize-asset');
 */

const fs = require('fs');
const path = require('path');

async function optimizePng(file) {
  const sharp = require('sharp');
  const before = fs.statSync(file).size;
  // Re-encode: max zlib compression + adaptive palette where it helps.
  const buf = await sharp(file)
    .png({ compressionLevel: 9, palette: true, effort: 10 })
    .toBuffer();
  // Only write if we actually saved bytes.
  if (buf.length < before) fs.writeFileSync(file, buf);
  const after = fs.statSync(file).size;
  return { before, after };
}

function optimizeSvg(file) {
  const { optimize } = require('svgo');
  const before = fs.statSync(file).size;
  const src = fs.readFileSync(file, 'utf8');
  const out = optimize(src, {
    path: file,
    multipass: true,
    plugins: [
      {
        name: 'preset-default',
        params: { overrides: { removeViewBox: false } }, // keep viewBox — scaling
      },
    ],
  });
  if (out.data && out.data.length < before) fs.writeFileSync(file, out.data);
  const after = fs.statSync(file).size;
  return { before, after };
}

async function optimizeFile(file) {
  const ext = path.extname(file).toLowerCase();
  if (ext === '.png') return optimizePng(file);
  if (ext === '.svg') return optimizeSvg(file);
  return null; // unsupported — skip silently
}

function collect(target, acc) {
  const stat = fs.statSync(target);
  if (stat.isDirectory()) {
    for (const name of fs.readdirSync(target)) {
      if (name === 'node_modules' || name.startsWith('.')) continue;
      collect(path.join(target, name), acc);
    }
  } else {
    const ext = path.extname(target).toLowerCase();
    if (ext === '.png' || ext === '.svg') acc.push(target);
  }
  return acc;
}

async function main() {
  const args = process.argv.slice(2);
  if (!args.length) {
    console.error('✗ Usage: node scripts/optimize-asset.js <file-or-dir> [more...]');
    process.exit(2);
  }

  const files = [];
  for (const a of args) {
    if (!fs.existsSync(a)) { console.error(`✗ not found: ${a}`); process.exit(1); }
    collect(a, files);
  }

  let totalBefore = 0, totalAfter = 0;
  for (const f of files) {
    const r = await optimizeFile(f);
    if (!r) continue;
    totalBefore += r.before;
    totalAfter += r.after;
    const pct = r.before ? Math.round((1 - r.after / r.before) * 100) : 0;
    const kb = (n) => (n / 1024).toFixed(1) + 'KB';
    console.log(`  ${pct > 0 ? '✓' : '·'} ${f}  ${kb(r.before)} → ${kb(r.after)} (${pct >= 0 ? '-' : '+'}${Math.abs(pct)}%)`);
  }
  if (totalBefore) {
    const pct = Math.round((1 - totalAfter / totalBefore) * 100);
    console.log(`\n✓ ${files.length} file(s): ${(totalBefore / 1024).toFixed(1)}KB → ${(totalAfter / 1024).toFixed(1)}KB (-${pct}%)`);
  }
}

module.exports = { optimizeFile, optimizePng, optimizeSvg };

if (require.main === module) {
  main().catch((err) => { console.error(`✗ ${err.message}`); process.exit(1); });
}
