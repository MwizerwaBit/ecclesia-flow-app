/**
 * @file Typography.tsx
 * @description Strict typographic components mapped to the design system tokens.
 * Use these instead of raw HTML tags to ensure font families and scales are consistent.
 */
import { type ElementType, type ComponentPropsWithoutRef, type ReactNode } from 'react';
import { cn } from '@/lib/cn';

type TextVariant = 
  | 'display' 
  | 'h1' 
  | 'h2' 
  | 'h3' 
  | 'body-lg' 
  | 'body' 
  | 'body-sm' 
  | 'caption' 
  | 'label' 
  | 'number';

type TextOwnProps<T extends ElementType> = {
  variant?: TextVariant;
  as?: T;
  color?: 'default' | 'muted' | 'inverse' | 'primary' | 'danger' | 'success';
  className?: string;
  children?: ReactNode;
};

type TextProps<T extends ElementType = 'span'> = TextOwnProps<T> &
  Omit<ComponentPropsWithoutRef<T>, keyof TextOwnProps<T>>;

const variantMapping: Record<TextVariant, string> = {
  display: 'text-display font-display',
  h1: 'text-h1 font-display',
  h2: 'text-h2 font-display',
  h3: 'text-h3 font-display',
  'body-lg': 'text-body-lg font-sans',
  body: 'text-body font-sans',
  'body-sm': 'text-body-sm font-sans',
  caption: 'text-caption font-sans',
  label: 'text-label font-sans',
  number: 'text-number font-sans tabular-nums',
};

const colorMapping = {
  default: 'text-slate-900 dark:text-slate-100',
  muted: 'text-slate-500 dark:text-slate-400',
  inverse: 'text-white',
  primary: 'text-primary',
  danger: 'text-danger',
  success: 'text-success',
};

// Default HTML tags for variants if 'as' is not provided
const defaultTags: Record<TextVariant, ElementType> = {
  display: 'h1',
  h1: 'h1',
  h2: 'h2',
  h3: 'h3',
  'body-lg': 'p',
  body: 'p',
  'body-sm': 'p',
  caption: 'span',
  label: 'span',
  number: 'span',
};

export function Text<T extends ElementType = 'span'>({
  variant = 'body',
  as,
  color = 'default',
  className,
  children,
  ...props
}: TextProps<T>) {
  const Component = as || defaultTags[variant] || 'span';

  return (
    <Component
      className={cn(variantMapping[variant], colorMapping[color], className)}
      {...props}
    >
      {children}
    </Component>
  );
}
