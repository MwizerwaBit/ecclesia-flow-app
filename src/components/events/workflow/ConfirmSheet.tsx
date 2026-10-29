/**
 * @file ConfirmSheet.tsx
 * @description A bottom sheet that asks "are you sure?" before a workflow action,
 * and shows why it failed in place if the server says no.
 *
 * Anything the action needs from the person (a reason, a choice) goes in as children.
 */
import { type ReactNode } from 'react';
import { BottomSheet, Button } from '@/components/ui';
import { ErrorNotice } from '@/components/feedback/ErrorNotice';

interface ConfirmSheetProps {
  open: boolean;
  onClose: () => void;
  title: string;
  description?: string;
  confirmLabel: string;
  onConfirm: () => void;
  /** Red confirm button, for actions that cannot be undone. */
  destructive?: boolean;
  confirmDisabled?: boolean;
  isPending?: boolean;
  error?: unknown;
  children?: ReactNode;
}

export function ConfirmSheet({
  open,
  onClose,
  title,
  description,
  confirmLabel,
  onConfirm,
  destructive = false,
  confirmDisabled = false,
  isPending = false,
  error,
  children,
}: ConfirmSheetProps) {
  return (
    <BottomSheet
      open={open}
      onClose={onClose}
      title={title}
      description={description}
      footer={
        <div className="flex gap-2">
          <Button variant="ghost" onClick={onClose} disabled={isPending}>
            Not now
          </Button>
          <Button
            variant={destructive ? 'destructive' : 'primary'}
            fullWidth
            onClick={onConfirm}
            disabled={confirmDisabled}
            isLoading={isPending}
          >
            {confirmLabel}
          </Button>
        </div>
      }
    >
      <div className="space-y-3">
        {children}
        <div aria-live="polite">{error ? <ErrorNotice error={error} /> : null}</div>
      </div>
    </BottomSheet>
  );
}
