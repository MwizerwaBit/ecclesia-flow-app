/**
 * @file Card.tsx
 * @description Container primitive for grouping content.
 *
 * @prop variant - 'elevated' (shadow) | 'outline' (border) | 'flat' (solid bg)
 * @prop padding - 'none' | 'sm' | 'md' | 'lg'
 * @prop accent - 'none' | 'primary' | 'success' | 'warning' | 'danger'. Adds the
 *   colored left-border treatment used for notifications and attention-needed
 *   rows. The left corners square off instead of rounding, so the accent border
 *   meets a flat edge — never give a card a left border through `className`
 *   directly, or the corners round over it.
 *
 * @example
 * <Card variant="elevated" padding="md">
 *   <Text variant="h3">Member Details</Text>
 *   ...
 * </Card>
 *
 * @example
 * <Card accent="danger">Needs follow-up</Card>
 */
import { type ComponentPropsWithoutRef, forwardRef } from 'react';
import { cn } from '@/lib/cn';

type CardVariant = 'elevated' | 'outline' | 'flat' | 'platform';
type CardPadding = 'none' | 'sm' | 'md' | 'lg';
type CardAccent = 'none' | 'primary' | 'success' | 'warning' | 'danger';

interface CardProps extends ComponentPropsWithoutRef<'div'> {
  variant?: CardVariant;
  padding?: CardPadding;
  accent?: CardAccent;
}

const variantClasses: Record<CardVariant, string> = {
  elevated: 'bg-surface dark:bg-surface-dark shadow-card',
  outline: 'bg-surface dark:bg-surface-dark border border-slate-200 dark:border-slate-700',
  flat: 'bg-slate-50 dark:bg-slate-800/50',
  platform: 'bg-platform-surface text-white',
};

const paddingClasses: Record<CardPadding, string> = {
  none: '',
  sm: 'p-3',
  md: 'p-5',
  lg: 'p-6 sm:p-8', // Responsive padding for larger cards
};

const accentClasses: Record<CardAccent, string> = {
  none: '',
  primary: 'border-l-4 border-l-primary bg-primary-light/10 dark:bg-primary/10',
  success: 'border-l-4 border-l-success bg-success-light/10',
  warning: 'border-l-4 border-l-amber-500 bg-amber-50 dark:bg-amber-900/10',
  danger: 'border-l-4 border-l-danger bg-danger-light/10',
};

export const Card = forwardRef<HTMLDivElement, CardProps>(
  ({ variant = 'elevated', padding = 'md', accent = 'none', className, children, ...props }, ref) => {
    return (
      <div
        ref={ref}
        className={cn(
          accent === 'none' ? 'rounded-xl' : 'rounded-r-xl',
          'overflow-hidden',
          variantClasses[variant],
          paddingClasses[padding],
          accentClasses[accent],
          className
        )}
        {...props}
      >
        {children}
      </div>
    );
  }
);

Card.displayName = 'Card';
