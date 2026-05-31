#!/usr/bin/env node
/**
 * Postinstall patch: two fixes for nativewind@4 + reanimated v3 compat.
 *
 * PATCH 1 — css-interop babel.js
 * react-native-css-interop@0.2.4 (bundled inside nativewind@4.x) adds
 * "react-native-worklets/plugin" to its Babel preset unconditionally.
 * That package only exists in reanimated v4+. On v3 @babel/core resolves
 * from the project root and fails. Fix: remove the entry.
 *
 * PATCH 2 — nativewind-bundled reanimated v4 plugin/index.js
 * nativewind ships its own reanimated@4.x in its node_modules. That
 * plugin/index.js does `require('react-native-worklets/plugin')` and
 * re-exports it. The nativewind metro transformer invokes Babel with this
 * plugin path in scope, causing the same missing-module error at bundle time.
 * Fix: replace the file with a redirect to the project-root reanimated v3
 * plugin, which is the correct worklets handler for this project.
 *
 * Both patches are idempotent — running them twice is safe.
 */

'use strict';

const fs = require('fs');
const path = require('path');

// ─── PATCH 1: css-interop babel preset ───────────────────────────────────────

const BABEL_TARGET = path.join(
  __dirname,
  '..',
  'node_modules',
  'nativewind',
  'node_modules',
  'react-native-css-interop',
  'babel.js',
);

const PATCHED_MARKER = '/* patched: worklets-removed */';

if (!fs.existsSync(BABEL_TARGET)) {
  console.log('patch-nativewind[1]: target not found — skipping');
} else {
  const current = fs.readFileSync(BABEL_TARGET, 'utf8');
  if (current.includes(PATCHED_MARKER)) {
    console.log('patch-nativewind[1]: already patched — skipping');
  } else {
    const ORIGINAL_BLOCK = `      // Use this plugin in reanimated 4 and later
      "react-native-worklets/plugin",`;
    if (!current.includes(ORIGINAL_BLOCK)) {
      console.log('patch-nativewind[1]: expected pattern not found — skipping (file may have changed)');
    } else {
      const REPLACEMENT = `      ${PATCHED_MARKER}
      // react-native-worklets/plugin removed: only valid in reanimated v4.
      // On reanimated v3 worklets are handled by react-native-reanimated/plugin.`;
      fs.writeFileSync(BABEL_TARGET, current.replace(ORIGINAL_BLOCK, REPLACEMENT), 'utf8');
      console.log('patch-nativewind[1]: ✓ removed react-native-worklets/plugin from css-interop babel preset');
    }
  }
}

// ─── PATCH 2: nativewind-bundled reanimated v4 plugin/index.js ───────────────
// nativewind bundles reanimated@4 which does:
//   const plugin = require('react-native-worklets/plugin'); module.exports = plugin;
// The metro transformer spawned by nativewind loads babel and this file ends up
// in scope. Redirect it to the project-root reanimated v3 plugin instead.

const REANIMATED_PLUGIN_TARGET = path.join(
  __dirname,
  '..',
  'node_modules',
  'nativewind',
  'node_modules',
  'react-native-reanimated',
  'plugin',
  'index.js',
);

const REANIMATED_PATCHED_MARKER = '/* patched: redirect-to-v3 */';

if (!fs.existsSync(REANIMATED_PLUGIN_TARGET)) {
  console.log('patch-nativewind[2]: reanimated plugin target not found — skipping');
} else {
  const current = fs.readFileSync(REANIMATED_PLUGIN_TARGET, 'utf8');
  if (current.includes(REANIMATED_PATCHED_MARKER)) {
    console.log('patch-nativewind[2]: already patched — skipping');
  } else {
    // Redirect to project-root reanimated v3 plugin. The require path uses
    // __dirname so it resolves relative to this file (inside nativewind's
    // node_modules), walking up to the project root's react-native-reanimated.
    const PATCHED_CONTENT = `${REANIMATED_PATCHED_MARKER}
// Redirected from react-native-worklets/plugin (reanimated v4 only).
// This project uses reanimated v3; worklets are handled by the project-root plugin.
module.exports = require(require('path').join(
  __dirname, '..', '..', '..', '..', 'react-native-reanimated', 'plugin'
));
`;
    fs.writeFileSync(REANIMATED_PLUGIN_TARGET, PATCHED_CONTENT, 'utf8');
    console.log('patch-nativewind[2]: ✓ redirected nativewind-bundled reanimated v4 plugin to project-root reanimated v3');
  }
}
