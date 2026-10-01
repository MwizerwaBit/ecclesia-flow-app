/**
 * @file BottomSheet.tsx
 * @description Modal bottom sheet — the mobile-first alternative to a dialog.
 *
 * Used for quick-capture flows where the user must not lose their place
 * (visitor quick-add during a service, fund pickers, confirmations).
 *
 * Closes on backdrop click and Escape. Body scroll is locked while open.
 *
 * @example
 * <BottomSheet open={open} onClose={() => setOpen(false)} title="Add Visitor">
 *   ...form...
 * </BottomSheet>
 */
import { type ReactNode, useEffect, useRef } from 'react';
import { X } from 'lucide-react';
import { cn } from '@/lib/cn';
import { Text } from './Typography';

interface BottomSheetProps {
  open: boolean;
  onClose: () => void;
  title: string;
  /** Short line under the title — sets expectations before the user commits. */
  description?: string;
  children: ReactNode;
  /** Sticky action row pinned to the bottom of the sheet. */
  footer?: ReactNode;
  className?: string;
}

export function BottomSheet({
  open,
  onClose,
  title,
  description,
  children,
  footer,
  className,
}: BottomSheetProps) {
  const panelRef = useRef<HTMLDivElement>(null);

  // Escape to close + lock background scroll while the sheet is up
  useEffect(() => {
    if (!open) return;

    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', onKeyDown);

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    // Move focus into the sheet so keyboard users land in the right place
    panelRef.current?.focus();

    return () => {
      document.removeEventListener('keydown', onKeyDown);
      document.body.style.overflow = previousOverflow;
    };
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-sheet flex items-end justify-center lg:items-center">
      {/* Backdrop */}
      <button
        type="button"
        aria-label="Close"
        onClick={onClose}
        className="absolute inset-0 bg-slate-900/40 backdrop-blur-[2px] animate-fade-in"
      />

      {/* Panel */}
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-label={title}
        tabIndex={-1}
        className={cn(
          'relative w-full lg:max-w-lg bg-surface dark:bg-surface-dark',
          'rounded-t-3xl lg:rounded-2xl shadow-sheet',
          'max-h-[92dvh] flex flex-col outline-none',
          'animate-slide-up',
          className
        )}
      >
        {/* Grab handle (mobile affordance) */}
        <div className="pt-3 pb-1 flex justify-center lg:hidden">
          <div className="h-1 w-10 rounded-full bg-slate-300 dark:bg-slate-600" />
        </div>

        <div className="flex items-start justify-between gap-4 px-5 pt-3 pb-4">
          <div className="min-w-0">
            <Text variant="h3">{title}</Text>
            {description && (
              <Text variant="body-sm" color="muted" className="mt-1">
                {description}
              </Text>
            )}
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close sheet"
            className="shrink-0 p-2 -mr-2 -mt-1 rounded-full text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
          >
            <X size={20} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-5 pb-5">{children}</div>

        {footer && (
          <div className="border-t border-slate-100 dark:border-slate-800 px-5 py-4 pb-safe bg-surface dark:bg-surface-dark">
            {footer}
          </div>
        )}
      </div>
    </div>
  );
}
