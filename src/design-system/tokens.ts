/**
 * @file tokens.ts
 * @description EcclesiaFlow Design System — Single source of truth for all visual tokens.
 *
 * Tokens flow in one direction:
 *   tokens.ts → tailwind.config.ts (theme extension)
 *              → theme.css (CSS custom properties for runtime theming)
 *
 * Rules:
 * - No component or screen hardcodes a hex value, px, or arbitrary spacing.
 * - All values here map to Tailwind utility classes (e.g. `bg-primary`, `text-accent-gold`).
 * - For tenant branding overrides at runtime, update CSS variables in theme.css.
 *
 * Typography scale (use <Text variant="..."> or the utility classes below):
 *   display  → Crimson Pro 32px semibold — screen hero headlines
 *   h1       → Crimson Pro 28px semibold — page titles
 *   h2       → Crimson Pro 22px semibold — section headers
 *   h3       → Crimson Pro 18px semibold — card titles, member names
 *   body-lg  → DM Sans 16px regular — prominent body text
 *   body     → DM Sans 14px regular — default body
 *   body-sm  → DM Sans 12px regular — secondary text, hints
 *   caption  → DM Sans 11px regular — timestamps, metadata
 *   label    → DM Sans 11px bold uppercase + tracking — section labels, field labels
 *   number   → DM Sans 20–28px medium — monetary amounts, counts
 */

// ─── Colors ──────────────────────────────────────────────────────────────────

export const colors = {
  // Brand primary — Indigo 700 (canonical; some mockups show #3a3acb, treated as Stitch drift)
  primary: '#4338CA',
  'primary-hover': '#3730A3', // Indigo 800
  'primary-light': '#EEF2FF', // Indigo 50 — tinted backgrounds
  'primary-muted': 'rgba(67, 56, 202, 0.08)', // 8% primary — subtle fills

  // Accent — Warm gold (used for financial callouts, highlights)
  'accent-gold': '#B45309', // Amber 700
  'accent-gold-light': '#FEF3C7', // Amber 50

  // Semantic — success / warning / danger / info
  success: '#16A34A', // Green 600
  'success-light': '#DCFCE7', // Green 100
  warning: '#D97706', // Amber 600
  'warning-light': '#FEF3C7', // Amber 100
  danger: '#DC2626', // Red 600
  'danger-light': '#FEE2E2', // Red 100
  info: '#0284C7', // Sky 600
  'info-light': '#E0F2FE', // Sky 100

  // Backgrounds
  'background-light': '#FAFAF9', // Warm off-white — primary app background
  'background-dark': '#13131f', // Deep navy-black — dark mode background
  'surface': '#FFFFFF', // Pure white — cards, sheets, inputs
  'surface-dark': '#1E1E2E', // Dark mode surface

  // Platform admin — Distinct internal-tool treatment (never confused with tenant UI)
  'platform-bg': '#0F172A', // Slate 900 — platform sidebar
  'platform-surface': '#1E293B', // Slate 800 — platform cards
  'platform-accent': '#6366F1', // Indigo 500 — platform highlights
} as const;

// ─── Typography ───────────────────────────────────────────────────────────────

export const fontFamily = {
  display: ['Crimson Pro', 'Georgia', 'serif'], // Headings, member names, hero text
  sans: ['DM Sans', 'system-ui', 'sans-serif'], // Body, labels, UI text
  ui: ['Inter', 'system-ui', 'sans-serif'], // Form chrome, admin-dense screens
} as const;

export const fontSize = {
  display: ['2rem', { lineHeight: '1.15', fontWeight: '600' }], // 32px
  h1: ['1.75rem', { lineHeight: '1.2', fontWeight: '600' }], // 28px
  h2: ['1.375rem', { lineHeight: '1.3', fontWeight: '600' }], // 22px
  h3: ['1.125rem', { lineHeight: '1.4', fontWeight: '600' }], // 18px
  'body-lg': ['1rem', { lineHeight: '1.6', fontWeight: '400' }], // 16px
  body: ['0.875rem', { lineHeight: '1.55', fontWeight: '400' }], // 14px
  'body-sm': ['0.75rem', { lineHeight: '1.5', fontWeight: '400' }], // 12px
  caption: ['0.6875rem', { lineHeight: '1.45', fontWeight: '400' }], // 11px
  label: ['0.6875rem', { lineHeight: '1', fontWeight: '700', letterSpacing: '0.07em', textTransform: 'uppercase' }], // 11px bold uppercase
  number: ['1.75rem', { lineHeight: '1.1', fontWeight: '500' }], // 28px — monetary amounts
} as const;

// ─── Spacing (extends Tailwind's default scale — no custom values needed) ─────
// Use standard Tailwind: p-4 = 16px, p-6 = 24px, p-8 = 32px, gap-3 = 12px
// Mobile rhythm: section gaps 24–32px, item gaps 12–16px, card padding 16–20px

// ─── Border Radius ────────────────────────────────────────────────────────────

export const borderRadius = {
  DEFAULT: '0.25rem', // 4px — inputs, small elements
  lg: '0.5rem', // 8px — buttons, chips
  xl: '0.75rem', // 12px — cards
  '2xl': '1rem', // 16px — sheets, prominent cards
  '3xl': '1.5rem', // 24px — bottom sheets handle
  full: '9999px', // Avatars, pills, FABs
} as const;

// ─── Shadows ──────────────────────────────────────────────────────────────────

export const boxShadow = {
  card: '0 1px 3px 0 rgba(0,0,0,0.07), 0 1px 2px -1px rgba(0,0,0,0.05)',
  'card-elevated': '0 4px 6px -1px rgba(0,0,0,0.08), 0 2px 4px -2px rgba(0,0,0,0.05)',
  sheet: '0 -4px 24px 0 rgba(0,0,0,0.10)',
  'primary-glow': '0 4px 20px 0 rgba(67,56,202,0.25)',
  'fab': '0 8px 24px 0 rgba(67,56,202,0.35)',
} as const;

// ─── Breakpoints (mobile-first) ───────────────────────────────────────────────

export const screens = {
  sm: '390px', // iPhone 14 baseline — minimum supported
  md: '430px', // iPhone 14 Plus
  lg: '768px', // Tablet / iPad portrait
  xl: '1024px', // Desktop (board/platform admin side nav kicks in)
  '2xl': '1280px', // Wide desktop
} as const;

// ─── Z-Index scale ────────────────────────────────────────────────────────────

export const zIndex = {
  base: 0,
  raised: 10,
  dropdown: 20,
  sticky: 30,
  overlay: 40,
  sheet: 50,
  toast: 60,
  impersonation: 70, // Impersonation banner — always on top
} as const;

// ─── Animation ────────────────────────────────────────────────────────────────

export const transitionDuration = {
  fast: '100ms',
  DEFAULT: '200ms',
  slow: '300ms',
  sheet: '400ms', // Bottom sheet slide-up
} as const;

export const transitionTimingFunction = {
  DEFAULT: 'cubic-bezier(0.4, 0, 0.2, 1)', // ease-in-out
  spring: 'cubic-bezier(0.34, 1.56, 0.64, 1)', // Slight overshoot for delightful micro-animations
  sheet: 'cubic-bezier(0.32, 0.72, 0, 1)', // iOS-style sheet
} as const;
