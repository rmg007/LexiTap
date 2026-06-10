/**
 * withFmtConstevalFix — Expo config plugin (iOS).
 *
 * Apple now requires apps to be built with the iOS 26 SDK (Xcode 26). Xcode 26
 * ships a stricter Clang that rejects React Native's bundled `fmt` library:
 *
 *   call to consteval function 'fmt::basic_format_string<...>' is not a
 *   constant expression
 *
 * `fmt` gates its compile-time format-string checking behind FMT_USE_CONSTEVAL.
 * Forcing it to 0 makes FMT_CONSTEVAL expand to nothing (constexpr fallback),
 * which removes the consteval instantiation that the new compiler rejects.
 *
 * We inject the define into every Pod target's GCC_PREPROCESSOR_DEFINITIONS via
 * a post_install hook appended to the Expo-generated Podfile. This is a managed
 * project (no committed ios/ dir) so the Podfile is regenerated on every EAS
 * build — hence a config plugin rather than a hand-edit.
 *
 * Remove this plugin once the project moves to an Expo SDK whose RN/folly/fmt
 * compiles cleanly under Xcode 26 (SDK 54+).
 */
const { withDangerousMod } = require('@expo/config-plugins');
const fs = require('fs');
const path = require('path');

const MARKER = 'withFmtConstevalFix';

const INJECTION = `
  # ${MARKER}: disable fmt consteval so RN's bundled fmt compiles under Xcode 26.
  installer.pods_project.targets.each do |target|
    target.build_configurations.each do |build_config|
      defs = build_config.build_settings['GCC_PREPROCESSOR_DEFINITIONS'] || ['$(inherited)']
      defs = [defs] unless defs.is_a?(Array)
      defs << 'FMT_USE_CONSTEVAL=0' unless defs.include?('FMT_USE_CONSTEVAL=0')
      build_config.build_settings['GCC_PREPROCESSOR_DEFINITIONS'] = defs
    end
  end
`;

module.exports = function withFmtConstevalFix(config) {
  return withDangerousMod(config, [
    'ios',
    (cfg) => {
      const podfilePath = path.join(cfg.modRequest.platformProjectRoot, 'Podfile');
      let contents = fs.readFileSync(podfilePath, 'utf8');

      if (contents.includes(MARKER)) {
        return cfg;
      }

      const postInstall = /post_install do \|installer\|\n/;
      if (postInstall.test(contents)) {
        contents = contents.replace(postInstall, (m) => m + INJECTION);
      } else {
        // No existing post_install — append a fresh one before the final `end`.
        const block = `\n  post_install do |installer|\n${INJECTION}  end\n`;
        const lastEnd = contents.lastIndexOf('\nend');
        contents =
          lastEnd >= 0
            ? contents.slice(0, lastEnd) + block + contents.slice(lastEnd)
            : contents + block;
      }

      fs.writeFileSync(podfilePath, contents);
      return cfg;
    },
  ]);
};
