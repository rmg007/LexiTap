#!/usr/bin/env node
/**
 * Postinstall patch: removes the unconditional react-native-worklets/plugin
 * entry from nativewind's css-interop babel preset.
 *
 * Root cause: react-native-css-interop@0.2.4 (bundled inside nativewind@4.x)
 * has this in its Babel preset:
 *
 *   // Use this plugin in reanimated 4 and later
 *   "react-native-worklets/plugin",
 *
 * The comment says it's for reanimated v4+, but there is no guard — it always
 * fires. When @babel/core resolves "react-native-worklets/plugin" it uses the
 * *project root* as the dirname (standard babel behavior), not nativewind's
 * nested node_modules, so resolution always fails on reanimated v3.
 *
 * Fix: remove the entry entirely. We are on reanimated v3, which handles
 * worklets via react-native-reanimated/plugin (listed in babel.config.js).
 *
 * This patch is idempotent — running it twice is safe.
 */

'use strict';

const fs = require('fs');
const path = require('path');

const TARGET = path.join(
  __dirname,
  '..',
  'node_modules',
  'nativewind',
  'node_modules',
  'react-native-css-interop',
  'babel.js',
);

const PATCHED_MARKER = '/* patched: worklets-removed */';

if (!fs.existsSync(TARGET)) {
  console.log('patch-nativewind: target not found — skipping');
  process.exit(0);
}

const current = fs.readFileSync(TARGET, 'utf8');

if (current.includes(PATCHED_MARKER)) {
  // Already patched — nothing to do.
  process.exit(0);
}

// The original line and the comment above it:
const ORIGINAL_BLOCK = `      // Use this plugin in reanimated 4 and later
      "react-native-worklets/plugin",`;

if (!current.includes(ORIGINAL_BLOCK)) {
  // Might be already patched differently, or version changed — bail safely
  console.log('patch-nativewind: expected pattern not found — skipping (file may have changed)');
  process.exit(0);
}

const REPLACEMENT = `      ${PATCHED_MARKER}
      // react-native-worklets/plugin removed: only valid in reanimated v4.
      // On reanimated v3 worklets are handled by react-native-reanimated/plugin.`;

const patched = current.replace(ORIGINAL_BLOCK, REPLACEMENT);
fs.writeFileSync(TARGET, patched, 'utf8');
console.log('patch-nativewind: ✓ removed react-native-worklets/plugin from css-interop babel preset (reanimated v3 compat)');
