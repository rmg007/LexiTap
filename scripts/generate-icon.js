#!/usr/bin/env node

/**
 * Icon generator for LexiTap app store assets
 * Creates 1024×1024, 512×512, 180×180, and 120×120 icons
 *
 * Usage: node scripts/generate-icon.js
 * Output: website/assets/lexitap-icon-{1024,512,180,120}.png
 *
 * Dependencies: This requires sharp (image library)
 * Install: npm install --save-dev sharp
 */

const fs = require('fs');
const path = require('path');

console.log('Icon generator for LexiTap');
console.log('=' .repeat(40));

// Check if sharp is available
try {
  require('sharp');
  console.log('✓ sharp library detected');
} catch (e) {
  console.error('✗ sharp not installed');
  console.error('  Run: npm install --save-dev sharp');
  console.error('  Then: node scripts/generate-icon.js');
  process.exit(1);
}

// After sharp is confirmed available, require it
const sharp = require('sharp');

async function generateIcon() {
  const outputDir = path.join(__dirname, '../website/assets');

  // Ensure output directory exists
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }

  const sizes = [1024, 512, 180, 120];
  const sizes_str = sizes.map(s => `${s}×${s}`).join(', ');
  console.log(`\nGenerating icon variants: ${sizes_str}`);

  // SVG template for the icon
  const iconSvg = `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="1024" height="1024" viewBox="0 0 1024 1024">
  <!-- Background -->
  <rect width="1024" height="1024" fill="#F2F5F6"/>

  <!-- Rounded teal square -->
  <rect x="80" y="80" width="864" height="864" rx="153.6" ry="153.6" fill="#20B2AA"/>

  <!-- Text: LT -->
  <text x="512" y="680" font-family="system-ui, -apple-system, sans-serif" font-size="520" font-weight="600" text-anchor="middle" fill="#F2F5F6" dominant-baseline="central">LT</text>
</svg>`;

  // Write SVG to temp file
  const svgPath = path.join(outputDir, '.icon-temp.svg');
  fs.writeFileSync(svgPath, iconSvg);

  try {
    // Generate each size
    for (const size of sizes) {
      const outputPath = path.join(outputDir, `lexitap-icon-${size}.png`);

      await sharp(svgPath)
        .resize(size, size, {
          fit: 'cover',
          position: 'center',
        })
        .png({
          quality: 90,
          compression: 9,
        })
        .toFile(outputPath);

      console.log(`  ✓ lexitap-icon-${size}.png (${size}×${size})`);
    }

    // Clean up temp SVG
    fs.unlinkSync(svgPath);

    console.log('\n✓ All icons generated successfully');
    console.log(`  Location: ${outputDir}`);
    return true;
  } catch (error) {
    console.error('\n✗ Error generating icons:');
    console.error(`  ${error.message}`);

    // Clean up temp file
    if (fs.existsSync(svgPath)) {
      fs.unlinkSync(svgPath);
    }

    return false;
  }
}

// Run the generator
generateIcon().then(success => {
  process.exit(success ? 0 : 1);
});
