import type { Config } from 'tailwindcss';
import forms from '@tailwindcss/forms';
import {
  colors,
  fontFamily,
  fontSize,
  borderRadius,
  boxShadow,
  screens,
} from './src/design-system/tokens';

/**
 * @file tailwind.config.ts
 * @description Tailwind CSS configuration.
 * All values extend from /src/design-system/tokens.ts — no values are hardcoded here.
 * Add new tokens in tokens.ts first, then they automatically appear here.
 */
export default {
  content: [
    './index.html',
    './src/**/*.{ts,tsx}',
  ],
  darkMode: 'class',
  theme: {
    // Override screens entirely so 'sm' = 390px (mobile-first baseline)
    screens,
    extend: {
      colors,
      fontFamily,
      fontSize,
      borderRadius,
      boxShadow,
      // Additional spacing tokens
      spacing: {
        'safe-bottom': 'env(safe-area-inset-bottom)',
        'safe-top': 'env(safe-area-inset-top)',
        // Tab bar height
        'tab-bar': '5rem', // 80px
        // Clearance below content on mobile. Has to clear two stacked things:
        // the tab bar (65px incl. safe area) and the FAB that floats above it
        // (56px tall, sitting 96px off the bottom, so reaching 152px). 160px
        // clears both with a little air; anything less and the last row of a
        // list sits under the bar where it cannot be read or tapped.
        'tab-content-pb': '10rem', // 160px
      },
      // Z-index
      zIndex: {
        'impersonation': '70',
        'toast': '60',
        'sheet': '50',
        'overlay': '40',
        'sticky': '30',
        'dropdown': '20',
        'raised': '10',
      },
      // Transition timing
      transitionTimingFunction: {
        'spring': 'cubic-bezier(0.34, 1.56, 0.64, 1)',
        'sheet': 'cubic-bezier(0.32, 0.72, 0, 1)',
      },
      // Animation keyframes
      keyframes: {
        'slide-up': {
          '0%': { transform: 'translateY(100%)' },
          '100%': { transform: 'translateY(0)' },
        },
        'slide-down': {
          '0%': { transform: 'translateY(0)' },
          '100%': { transform: 'translateY(100%)' },
        },
        'fade-in': {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        'scale-in': {
          '0%': { transform: 'scale(0.95)', opacity: '0' },
          '100%': { transform: 'scale(1)', opacity: '1' },
        },
        'confetti-fall': {
          '0%': { transform: 'translateY(-10px) rotate(0deg)', opacity: '1' },
          '100%': { transform: 'translateY(100vh) rotate(720deg)', opacity: '0' },
        },
        'pulse-primary': {
          '0%, 100%': { boxShadow: '0 0 0 0 rgba(67, 56, 202, 0.4)' },
          '50%': { boxShadow: '0 0 0 8px rgba(67, 56, 202, 0)' },
        },
      },
      animation: {
        'slide-up': 'slide-up 400ms cubic-bezier(0.32, 0.72, 0, 1)',
        'slide-down': 'slide-down 400ms cubic-bezier(0.32, 0.72, 0, 1)',
        'fade-in': 'fade-in 200ms ease-in-out',
        'scale-in': 'scale-in 200ms cubic-bezier(0.34, 1.56, 0.64, 1)',
        'confetti-fall': 'confetti-fall 3s ease-in forwards',
        'pulse-primary': 'pulse-primary 2s infinite',
      },
    },
  },
  plugins: [forms],
} satisfies Config;
