import { defineConfig, minimal2023Preset } from '@vite-pwa/assets-generator/config';

// Generates every icon size/format the manifest below references from the
// one brand mark we already have (public/favicon.svg) — run via
// `npm run pwa:assets`. Re-run it if favicon.svg ever changes.
export default defineConfig({
  headLinkOptions: {
    preset: '2023',
  },
  preset: {
    ...minimal2023Preset,
    // The brand mark's own canvas (48x46) isn't square and has no padding —
    // without this, maskable icons would clip the shape at the safe-zone
    // circle. Padding + the brand indigo as backdrop keeps it legible once
    // the OS masks it into a circle/squircle on the home screen.
    maskable: {
      ...minimal2023Preset.maskable,
      padding: 0.3,
      resizeOptions: { background: '#4338CA' },
    },
  },
  images: ['public/favicon.svg'],
});
