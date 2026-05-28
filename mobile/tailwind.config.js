/** @type {import('tailwindcss').Config} */

// ─── LexiTap Design Tokens ───────────────────────────────────────────────────
// Source of truth: .design-specs/images/style_guide.png + tokens.ts
// Localization note: use logical-property utilities (ms-*, me-*, ps-*, pe-*)
// instead of directional left/right equivalents so RTL layouts work correctly.
// ─────────────────────────────────────────────────────────────────────────────

module.exports = {
  content: [
    './app/**/*.{ts,tsx}',
    './src/**/*.{ts,tsx}',
  ],
  presets: [require('nativewind/preset')],
  theme: {
    extend: {
      // ── Color Tokens ───────────────────────────────────────────────────────
      colors: {
        // Brand primitives (canonical from style guide)
        teal: {
          DEFAULT: '#20B2AA',
          pressed: '#1A938C',
          subtle: '#13322F',
        },
        amber: {
          DEFAULT: '#FFC107',
          subtle: '#33290A',
        },
        charcoal: '#0E1112',
        slate: '#94A3B8',

        // Dark surface hierarchy
        surface: {
          base: '#0E1112',
          DEFAULT: '#171A1C',
          raised: '#1F2426',
          sunken: '#0A0C0D',
        },

        // Border
        border: {
          subtle: '#262B2E',
          strong: '#3A4145',
          // Physical surface hairline: 1px rgba(255,255,255,0.06)
          hairline: 'rgba(255,255,255,0.06)',
        },

        // Semantic text
        text: {
          primary: '#F2F5F6',
          secondary: '#A9B2B6',
          tertiary: '#6E777B',
          'on-accent': '#062826',
        },

        // Functional
        success: {
          DEFAULT: '#4CAF50',
          subtle: '#16301A',
        },
        caution: {
          DEFAULT: '#FFC107',
          subtle: '#33290A',
        },
        streak: '#FF9A3D',
        destructive: '#E5484D',
      },

      // ── Typography ─────────────────────────────────────────────────────────
      // Fonts loaded via expo-font in root _layout.tsx:
      //   Inter (400/500/600/700) + Playfair Display (700/800)
      // RTL-safe: font metrics scale correctly in all supported locales.
      fontFamily: {
        sans: ['Inter_400Regular', 'System'],
        'sans-medium': ['Inter_500Medium', 'System'],
        'sans-semibold': ['Inter_600SemiBold', 'System'],
        'sans-bold': ['Inter_700Bold', 'System'],
        serif: ['PlayfairDisplay_700Bold', 'serif'],
        'serif-extra': ['PlayfairDisplay_800ExtraBold', 'serif'],
      },

      // Type scale from design spec (size / lineHeight)
      fontSize: {
        // Design-spec canonical levels
        'h1': ['44px', { lineHeight: '48px' }],       // H1 Display  44/1.1 – Playfair
        'h2': ['34px', { lineHeight: '38px' }],        // H2 Editorial 34/1.1 – Playfair
        'h3': ['18px', { lineHeight: '22px' }],        // H3 Section   18/1.2 – Inter Bold
        'body-std': ['15px', { lineHeight: '24px' }],  // Body Standard 15/1.6 – Inter
        'small-caps': ['11px', { lineHeight: '16px' }], // Small-Caps Branded 11 – Inter Bold

        // Extended scale (intermediate steps for UI density)
        'title': ['28px', { lineHeight: '34px' }],
        'headline': ['22px', { lineHeight: '28px' }],
        'body-lg': ['18px', { lineHeight: '26px' }],
        'body': ['16px', { lineHeight: '24px' }],
        'label': ['14px', { lineHeight: '20px' }],
        'caption': ['13px', { lineHeight: '18px' }],
        'mono': ['14px', { lineHeight: '20px' }],
      },

      // ── Spacing (8pt baseline grid) ────────────────────────────────────────
      spacing: {
        s1: '4px',
        s2: '8px',
        s3: '12px',
        s4: '16px',
        s5: '24px',
        s6: '32px',
        s7: '48px',
        s8: '64px',
      },

      // ── Border Radius ──────────────────────────────────────────────────────
      borderRadius: {
        sm: '8px',   // Physical surface baseline (enforced on all Paper components)
        md: '12px',
        lg: '20px',
        full: '999px',
      },

      // ── Min Touch Target (WCAG 2.2 AA) ────────────────────────────────────
      minHeight: {
        touch: '48px',
      },
      minWidth: {
        touch: '48px',
      },
    },
  },
  plugins: [],
};
