/**
 * @file Card.tsx
 * @description Container primitive for grouping content.
 *
 * @prop variant - 'elevated' (shadow) | 'outline' (border) | 'flat' (solid bg)
 * @prop padding - 'none' | 'sm' | 'md' | 'lg'
 *
 * @example
 * <Card variant="elevated" padding="md">
 *   <Text variant="h3">Member Details</Text>
 *   ...
 * </Card>
 */
import { type ComponentPropsWithoutRef, forwardRef } from 'react';
import { cn } from '@/lib/cn';

type CardVariant = 'elevated' | 'outline' | 'flat' | 'platform';
type CardPadding = 'none' | 'sm' | 'md' | 'lg';

interface CardProps extends ComponentPropsWithoutRef<'div'> {
  variant?: CardVariant;
  padding?: CardPadding;
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

export const Card = forwardRef<HTMLDivElement, CardProps>(
  ({ variant = 'elevated', padding = 'md', className, children, ...props }, ref) => {
    return (
      <div
        ref={ref}
        className={cn(
          'rounded-xl overflow-hidden',
          variantClasses[variant],
          paddingClasses[padding],
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
