/**
 * @file Checkbox.tsx
 * @description Custom styled checkbox for forms and lists.
 */
import { type ComponentPropsWithoutRef, forwardRef, useId } from 'react';
import { cn } from '@/lib/cn';

export interface CheckboxProps extends Omit<ComponentPropsWithoutRef<'input'>, 'type'> {
  label?: React.ReactNode;
  description?: string;
  error?: string;
}

export const Checkbox = forwardRef<HTMLInputElement, CheckboxProps>(
  ({ label, description, error, className, id: externalId, ...props }, ref) => {
    const internalId = useId();
    const id = externalId ?? internalId;
    const errorId = `${id}-error`;

    return (
      <div className={cn('flex items-start gap-3', className)}>
        <div className="flex items-center h-6">
          <input
            type="checkbox"
            ref={ref}
            id={id}
            aria-invalid={!!error}
            aria-errormessage={error ? errorId : undefined}
            className={cn(
              'size-5 rounded border-slate-300 dark:border-slate-600',
              'text-primary focus:ring-primary focus:ring-offset-2 dark:focus:ring-offset-background-dark',
              'transition-all duration-fast cursor-pointer',
              props.disabled && 'opacity-50 cursor-not-allowed'
            )}
            {...props}
          />
        </div>
        
        {(label || description) && (
          <div className="flex flex-col pt-0.5">
            {label && (
              <label 
                htmlFor={id} 
                className={cn(
                  'text-body font-medium text-slate-900 dark:text-slate-100 cursor-pointer',
                  props.disabled && 'opacity-50 cursor-not-allowed'
                )}
              >
                {label}
              </label>
            )}
            {description && (
              <p className={cn(
                'text-body-sm text-slate-500 dark:text-slate-400 mt-0.5',
                props.disabled && 'opacity-50'
              )}>
                {description}
              </p>
            )}
            {error && (
              <p id={errorId} className="text-caption text-danger mt-1" role="alert">
                {error}
              </p>
            )}
          </div>
        )}
      </div>
    );
  }
);

Checkbox.displayName = 'Checkbox';
