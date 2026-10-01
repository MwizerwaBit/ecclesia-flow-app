/**
 * @file Button.tsx
 * @description Primary interactive element. All clickable actions use this — never raw <button>.
 *
 * @prop variant - Visual style: 'primary' | 'secondary' | 'ghost' | 'destructive' | 'link'
 * @prop size - 'sm' | 'md' | 'lg'
 * @prop isLoading - Shows spinner, disables interaction
 * @prop leftIcon - Lucide icon component rendered before label
 * @prop rightIcon - Lucide icon component rendered after label
 * @prop fullWidth - Expands to fill container width
 *
 * @example
 * <Button variant="primary" size="lg" rightIcon={ArrowRight} onClick={handleSubmit}>
 *   Sign In
 * </Button>
 *
 * @example
 * <Button variant="destructive" isLoading={isDeleting}>Delete Member</Button>
 */
import { type ComponentPropsWithoutRef, forwardRef } from 'react';
import type { LucideIcon } from 'lucide-react';
import { Loader2 } from 'lucide-react';
import { cn } from '@/lib/cn';

type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'destructive' | 'link';
type ButtonSize = 'sm' | 'md' | 'lg';

interface ButtonProps extends ComponentPropsWithoutRef<'button'> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  isLoading?: boolean;
  leftIcon?: LucideIcon;
  rightIcon?: LucideIcon;
  fullWidth?: boolean;
}

const variantClasses: Record<ButtonVariant, string> = {
  primary: [
    'bg-primary text-white shadow-primary-glow',
    'hover:bg-primary-hover active:scale-[0.98]',
    'disabled:bg-primary/50 disabled:shadow-none',
    'focus-visible:ring-2 focus-visible:ring-primary/50 focus-visible:ring-offset-2',
  ].join(' '),

  secondary: [
    'bg-white text-primary border border-primary/30',
    'hover:bg-primary-light hover:border-primary/60 active:scale-[0.98]',
    'disabled:opacity-50',
    'dark:bg-slate-800 dark:text-primary dark:border-primary/30 dark:hover:bg-slate-700',
    'focus-visible:ring-2 focus-visible:ring-primary/50 focus-visible:ring-offset-2',
  ].join(' '),

  ghost: [
    'bg-transparent text-slate-600',
    'hover:bg-slate-100 hover:text-slate-900 active:scale-[0.98]',
    'disabled:opacity-50',
    'dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-slate-100',
    'focus-visible:ring-2 focus-visible:ring-slate-400/50 focus-visible:ring-offset-2',
  ].join(' '),

  destructive: [
    'bg-danger text-white',
    'hover:bg-red-700 active:scale-[0.98]',
    'disabled:bg-danger/50',
    'focus-visible:ring-2 focus-visible:ring-danger/50 focus-visible:ring-offset-2',
  ].join(' '),

  link: [
    'bg-transparent text-primary underline-offset-4',
    'hover:underline active:opacity-70',
    'disabled:opacity-50 disabled:no-underline',
    // Padding grows the touch target to ~44px; the matching negative margin keeps
    // the text where the layout expects it, so this costs nothing visually.
    'p-0 h-auto py-3 -my-3 focus-visible:ring-2 focus-visible:ring-primary/50 focus-visible:ring-offset-1',
  ].join(' '),
};

const sizeClasses: Record<ButtonSize, string> = {
  sm: 'h-9 px-3 text-body-sm rounded-lg gap-1.5',
  md: 'h-11 px-4 text-body rounded-lg gap-2',
  lg: 'h-14 px-6 text-body-lg rounded-xl gap-2',
};

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      variant = 'primary',
      size = 'md',
      isLoading = false,
      leftIcon: LeftIcon,
      rightIcon: RightIcon,
      fullWidth = false,
      disabled,
      children,
      className,
      ...props
    },
    ref,
  ) => {
    const iconSize = size === 'sm' ? 14 : size === 'lg' ? 20 : 16;

    return (
      <button
        ref={ref}
        disabled={disabled || isLoading}
        className={cn(
          // Base
          'inline-flex items-center justify-center font-sans font-bold',
          'transition-all duration-fast select-none',
          'disabled:cursor-not-allowed',
          // Variant
          variantClasses[variant],
          // Size (don't apply size padding to 'link' variant)
          variant !== 'link' && sizeClasses[size],
          // Width
          fullWidth && 'w-full',
          className,
        )}
        {...props}
      >
        {isLoading ? (
          <Loader2 size={iconSize} className="animate-spin shrink-0" aria-hidden />
        ) : LeftIcon ? (
          <LeftIcon size={iconSize} className="shrink-0" aria-hidden />
        ) : null}

        {children && <span>{children}</span>}

        {!isLoading && RightIcon && (
          <RightIcon
            size={iconSize}
            className={cn('shrink-0 transition-transform', 'group-hover:translate-x-0.5')}
            aria-hidden
          />
        )}
      </button>
    );
  },
);

Button.displayName = 'Button';
