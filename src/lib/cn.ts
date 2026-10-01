/**
 * @file cn.ts
 * @description Utility for merging Tailwind class names safely.
 * Combines `clsx` (conditional logic) + `tailwind-merge` (deduplication).
 *
 * Usage:
 *   cn('px-4 py-2', isActive && 'bg-primary text-white', className)
 */
import { clsx, type ClassValue } from 'clsx';
import { extendTailwindMerge } from 'tailwind-merge';
import { fontSize } from '@/design-system/tokens';

/**
 * tailwind-merge has to be told about our custom font-size scale.
 *
 * Out of the box it parses `text-*` as either a font size or a text colour, and
 * it only recognises its own built-in size names (`text-sm`, `text-lg`, …). Our
 * tokens are `text-h1`, `text-caption` and so on, so it classified them as
 * colours — and then dropped them as redundant whenever a real colour class
 * followed, which is exactly what `<Text>` does:
 *
 *   cn('text-h1 font-display', 'text-slate-900')  ->  'font-display text-slate-900'
 *
 * Every `<Text>` carrying a `color` prop silently lost its size and rendered at
 * the inherited 14px. Registering the token names under `font-size` fixes it at
 * the root. The list is derived from tokens.ts so it cannot drift.
 */
const twMerge = extendTailwindMerge({
  extend: {
    classGroups: {
      'font-size': [{ text: Object.keys(fontSize) }],
    },
  },
});

export function cn(...inputs: ClassValue[]): string {
  return twMerge(clsx(inputs));
}
