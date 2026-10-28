/**
 * @file Toaster.tsx
 * @description Renders the toast stack. Mounted once, in App.tsx.
 * Errors are announced assertively; the rest politely.
 */
import { AlertCircle, CheckCircle2, Info, X } from 'lucide-react';
import { type ToastKind, useToastStore } from '@/hooks/useToastStore';
import { cn } from '@/lib/cn';

const STYLE: Record<ToastKind, { box: string; Icon: typeof Info }> = {
  error: { box: 'bg-danger-light text-danger border-danger/20', Icon: AlertCircle },
  success: { box: 'bg-success-light text-success border-success/20', Icon: CheckCircle2 },
  info: { box: 'bg-surface text-slate-800 border-slate-200 dark:bg-surface-dark dark:text-slate-100 dark:border-slate-700', Icon: Info },
};

export function Toaster() {
  const { toasts, dismiss } = useToastStore();
  if (toasts.length === 0) return null;

  return (
    <div className="pointer-events-none fixed inset-x-0 bottom-20 z-[100] flex flex-col items-center gap-2 px-4 xl:bottom-6">
      {toasts.map(({ id, kind, message }) => {
        const { box, Icon } = STYLE[kind];
        return (
          <div
            key={id}
            role={kind === 'error' ? 'alert' : 'status'}
            className={cn(
              'pointer-events-auto flex w-full max-w-md items-start gap-3 rounded-lg border p-3 shadow-lg animate-fade-in',
              box,
            )}
          >
            <Icon size={18} className="mt-0.5 shrink-0" aria-hidden />
            <p className="flex-1 text-body-sm font-medium">{message}</p>
            <button
              type="button"
              onClick={() => dismiss(id)}
              aria-label="Dismiss message"
              className="shrink-0 rounded p-0.5 opacity-70 hover:opacity-100"
            >
              <X size={16} aria-hidden />
            </button>
          </div>
        );
      })}
    </div>
  );
}
