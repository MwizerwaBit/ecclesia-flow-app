/**
 * @file Select.tsx
 * @description Standard select dropdown, styled to match the Input component.
 *
 * @prop label - Field label
 * @prop error - Error message string
 * @prop options - Array of { label, value } objects
 */
import { type ComponentPropsWithoutRef, forwardRef, useId } from 'react';
import { ChevronDown } from 'lucide-react';
import { cn } from '@/lib/cn';

export interface SelectOption {
  label: string;
  value: string;
}

export interface SelectProps extends Omit<ComponentPropsWithoutRef<'select'>, 'size'> {
  /** Visible label. When omitted, pass `aria-label` for accessibility. */
  label?: string;
  error?: string;
  options: SelectOption[];
  hideLabel?: boolean;
}

export const Select = forwardRef<HTMLSelectElement, SelectProps>(
  ({ label, error, options, hideLabel, className, id: externalId, ...props }, ref) => {
    const internalId = useId();
    const id = externalId ?? internalId;
    const errorId = `${id}-error`;

    return (
      <div className={cn('flex flex-col gap-1.5 w-full', className)}>
        {label && (
          <label
            htmlFor={id}
            className={cn(
              'text-label text-slate-700 dark:text-slate-300',
              hideLabel && 'sr-only'
            )}
          >
            {label}
          </label>
        )}
        
        <div className="relative">
          <select
            ref={ref}
            id={id}
            aria-invalid={!!error}
            aria-errormessage={error ? errorId : undefined}
            className={cn(
              'w-full h-11 px-3 pr-10 bg-surface dark:bg-surface-dark border rounded-lg appearance-none',
              'text-body text-slate-900 dark:text-slate-100',
              'transition-colors duration-fast outline-none',
              'focus:ring-2 focus:ring-primary/20',
              error 
                ? 'border-danger focus:border-danger' 
                : 'border-slate-200 dark:border-slate-700 focus:border-primary',
              props.disabled && 'opacity-50 cursor-not-allowed bg-slate-50 dark:bg-slate-800'
            )}
            {...props}
          >
            {/* If there's no default value, we should probably have a placeholder option. Assuming first option or empty is handled by consumer */}
            {options.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
          
          <div className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none">
            <ChevronDown size={18} aria-hidden />
          </div>
        </div>

        {error && (
          <span id={errorId} className="text-caption text-danger" role="alert">
            {error}
          </span>
        )}
      </div>
    );
  }
);

Select.displayName = 'Select';
