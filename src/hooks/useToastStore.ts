/**
 * @file useToastStore.ts
 * @description Short-lived messages that tell a person what just happened.
 * Failed requests raise one automatically (see App.tsx); call `toast` directly
 * for anything else worth confirming.
 */
import { create } from 'zustand';

export type ToastKind = 'error' | 'success' | 'info';

export interface Toast {
  id: number;
  kind: ToastKind;
  message: string;
}

interface ToastState {
  toasts: Toast[];
  push: (kind: ToastKind, message: string) => void;
  dismiss: (id: number) => void;
}

let nextId = 1;
const LIFETIME_MS = { error: 8000, success: 4000, info: 5000 } as const;

export const useToastStore = create<ToastState>((set, get) => ({
  toasts: [],
  push: (kind, message) => {
    // The same message twice in a row (a retried request) shouldn't stack.
    if (get().toasts.some((t) => t.kind === kind && t.message === message)) return;
    const id = nextId++;
    set((s) => ({ toasts: [...s.toasts.slice(-3), { id, kind, message }] }));
    setTimeout(() => get().dismiss(id), LIFETIME_MS[kind]);
  },
  dismiss: (id) => set((s) => ({ toasts: s.toasts.filter((t) => t.id !== id) })),
}));

export const toast = {
  error: (message: string) => useToastStore.getState().push('error', message),
  success: (message: string) => useToastStore.getState().push('success', message),
  info: (message: string) => useToastStore.getState().push('info', message),
};
