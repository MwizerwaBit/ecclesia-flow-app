/**
 * @file Input.tsx
 * @description Standard text input component, built to integrate with React Hook Form.
 *
 * @prop label - Input label (required for accessibility, can be visually hidden)
 * @prop error - Error message string
 * @prop leftIcon - Icon rendered inside the input on the left
 *
 * Password fields get a show/hide button. Fields also get the keyboard and
 * autofill hints their `type` implies (email, phone, url, password), so a phone
 * shows the right keyboard and the browser can offer saved details. Pass
 * `autoComplete` to say more (e.g. "given-name", "new-password"); it wins.
 *
 * @example
 * <Input
 *   label="Email Address"
 *   type="email"
 *   error={errors.email?.message}
 *   {...register('email')}
 * />
 */
import { type ComponentPropsWithoutRef, type ElementType, forwardRef, useId, useState } from 'react';
import { Eye, EyeOff } from 'lucide-react';
import { cn } from '@/lib/cn';

export interface InputProps extends ComponentPropsWithoutRef<'input'> {
  /** Visible label. When omitted, the placeholder becomes the accessible name. */
  label?: string;
  error?: string;
  /** Any icon component accepting `size` — a LucideIcon or a small custom renderer. */
  leftIcon?: ElementType;
  hideLabel?: boolean;
}

export const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ label, error, leftIcon: LeftIcon, hideLabel, className, id: externalId, type, ...props }, ref) => {
    const internalId = useId();
    const id = externalId ?? internalId;
    const errorId = `${id}-error`;
    const [revealed, setRevealed] = useState(false);
    const isPassword = type === 'password';

    // What the type implies, unless the screen said otherwise.
    const hints: Partial<ComponentPropsWithoutRef<'input'>> =
      type === 'email'
        ? { autoComplete: 'email', inputMode: 'email', autoCapitalize: 'none', spellCheck: false }
        : type === 'tel'
          ? { autoComplete: 'tel', inputMode: 'tel' }
          : type === 'url'
            ? { autoComplete: 'url', inputMode: 'url', autoCapitalize: 'none', spellCheck: false }
            : isPassword
              ? { autoComplete: 'current-password', autoCapitalize: 'none', spellCheck: false }
              : {};

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
          {LeftIcon && (
            <div className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none">
              <LeftIcon size={18} aria-hidden />
            </div>
          )}
          
          <input
            ref={ref}
            id={id}
            aria-invalid={!!error}
            aria-label={label ? undefined : (props['aria-label'] ?? props.placeholder)}
            aria-errormessage={error ? errorId : undefined}
            type={isPassword && revealed ? 'text' : type}
            {...hints}
            className={cn(
              'w-full h-11 px-3 bg-surface dark:bg-surface-dark border rounded-lg',
              'text-body text-slate-900 dark:text-slate-100 placeholder:text-slate-400',
              'transition-colors duration-fast outline-none',
              'focus:ring-2 focus:ring-primary/20',
              LeftIcon ? 'pl-10' : '',
              isPassword && 'pr-11',
              error 
                ? 'border-danger focus:border-danger' 
                : 'border-slate-200 dark:border-slate-700 focus:border-primary',
              props.disabled && 'opacity-50 cursor-not-allowed bg-slate-50 dark:bg-slate-800'
            )}
            {...props}
          />

          {isPassword && (
            <button
              type="button"
              onClick={() => setRevealed((r) => !r)}
              disabled={props.disabled}
              aria-label={revealed ? 'Hide password' : 'Show password'}
              aria-pressed={revealed}
              className="absolute right-1 top-1/2 -translate-y-1/2 grid size-9 place-items-center rounded-md text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 disabled:opacity-50"
            >
              {revealed ? <EyeOff size={18} aria-hidden /> : <Eye size={18} aria-hidden />}
            </button>
          )}
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

Input.displayName = 'Input';
