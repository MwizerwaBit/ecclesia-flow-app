/**
 * @file paymentsService.ts
 * @description The platform admin's queue of mobile-money payments to approve.
 *
 * Approving or rejecting needs a fresh two-step code: the page asks for it
 * (MfaStepUpPrompt) and the adapter then sends the step-up token with the call.
 */
import type { ManualPaymentAdmin, ManualPaymentStatus } from '@/types';
import { apiBlob, apiRequest, requireApi } from './adapter';

export const paymentsService = {
  async list(status?: ManualPaymentStatus): Promise<ManualPaymentAdmin[]> {
    requireApi('Payments');
    return apiRequest<ManualPaymentAdmin[]>(`/platform/payments${status ? `?status=${status}` : ''}`);
  },

  async pendingCount(): Promise<number> {
    requireApi('Payments');
    const r = await apiRequest<{ count: number }>('/platform/payments/pending-count');
    return r.count;
  },

  /** The screenshot, as a Blob to show in an <img>. */
  async proof(id: string): Promise<Blob> {
    requireApi('Payments');
    return apiBlob(`/platform/payments/${id}/proof`);
  },

  async approve(id: string, input: { note?: string; acceptAmountDifference?: boolean }): Promise<ManualPaymentAdmin> {
    requireApi('Payments');
    return apiRequest<ManualPaymentAdmin>(`/platform/payments/${id}/approve`, {
      method: 'POST',
      body: JSON.stringify({ note: input.note ?? '', accept_amount_difference: input.acceptAmountDifference ?? false }),
    });
  },

  async reject(id: string, reason: string): Promise<ManualPaymentAdmin> {
    requireApi('Payments');
    return apiRequest<ManualPaymentAdmin>(`/platform/payments/${id}/reject`, {
      method: 'POST',
      body: JSON.stringify({ note: reason }),
    });
  },
};
