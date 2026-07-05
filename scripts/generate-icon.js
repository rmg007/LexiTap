#!/usr/bin/env node

/**
 * Icon generator for LexiTap app store + app assets.
 * Renders the canonical SVG sources to PNG at every required size.
 *
 * Usage: node scripts/generate-icon.js
 * Sources (edit these, never hand-edit a generated PNG):
 *   website/assets/lexitap-icon.svg           (opaque, full-bleed — iOS + web)
 *   website/assets/lexitap-adaptive-icon.svg  (transparent bg — Android)
 * Output:
 *   website/assets/lexitap-icon-{1024,512,180,120}.png
 *   mobile/assets/icon.png            (1024, opaque)
 *   mobile/assets/adaptive-icon.png   (1024, transparent)
 *
 * Dependencies: This requires sharp (image library)
 * Install: npm install --save-dev sharp
 */

const fs = require('fs');
const path = require('path');

console.log('Icon generator for LexiTap');
console.log('='.repeat(40));

try {
  require('sharp');
  console.log('✓ sharp library detected');
} catch (e) {
  console.error('✗ sharp not installed');
  console.error('  Run: npm install --save-dev sharp');
  console.error('  Then: node scripts/generate-icon.js');
  process.exit(1);
}

const sharp = require('sharp');

const webAssetsDir = path.join(__dirname, '../website/assets');
const mobileAssetsDir = path.join(__dirname, '../mobile/assets');
const iconSvgPath = path.join(webAssetsDir, 'lexitap-icon.svg');
const adaptiveIconSvgPath = path.join(webAssetsDir, 'lexitap-adaptive-icon.svg');

async function generateIcon() {
  for (const dir of [webAssetsDir, mobileAssetsDir]) {
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  }

  for (const p of [iconSvgPath, adaptiveIconSvgPath]) {
    if (!fs.existsSync(p)) {
      console.error(`✗ missing source: ${p}`);
      return false;
    }
  }

  try {
    // Web/store icon set — sizes: 1024 (App Store), 512 (web manifest),
    // 180 (iOS touch icon), 120 (iOS spotlight/settings).
    const sizes = [1024, 512, 180, 120];
    console.log(`\nGenerating web icon set: ${sizes.map((s) => `${s}×${s}`).join(', ')}`);
    for (const size of sizes) {
      const outputPath = path.join(webAssetsDir, `lexitap-icon-${size}.png`);
      await sharp(iconSvgPath)
        .resize(size, size, { fit: 'cover', position: 'center' })
        .flatten({ background: '#20B2AA' }) // opaque — iOS App Store icon must have no alpha
        .png({ compressionLevel: 9 })
        .toFile(outputPath);
      console.log(`  ✓ lexitap-icon-${size}.png`);
    }

    // Mobile app icon (Expo `icon`) — opaque, full-bleed.
    console.log('\nGenerating mobile app assets');
    await sharp(iconSvgPath)
      .resize(1024, 1024, { fit: 'cover', position: 'center' })
      .flatten({ background: '#20B2AA' })
      .png({ compressionLevel: 9 })
      .toFile(path.join(mobileAssetsDir, 'icon.png'));
    console.log('  ✓ mobile/assets/icon.png');

    // Android adaptive-icon foreground — transparent, Expo composites
    // app.config.ts's adaptiveIcon.backgroundColor behind it.
    await sharp(adaptiveIconSvgPath)
      .resize(1024, 1024, { fit: 'cover', position: 'center' })
      .png({ compressionLevel: 9 })
      .toFile(path.join(mobileAssetsDir, 'adaptive-icon.png'));
    console.log('  ✓ mobile/assets/adaptive-icon.png');

    console.log('\n✓ All icons generated successfully');
    return true;
  } catch (error) {
    console.error('\n✗ Error generating icons:');
    console.error(`  ${error.message}`);
    return false;
  }
}

generateIcon().then((success) => {
  process.exit(success ? 0 : 1);
});
