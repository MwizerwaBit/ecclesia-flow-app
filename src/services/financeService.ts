/**
 * @file financeService.ts
 * @description Finance service interface — funds, batches, donations.
 *
 * Money is the most audit-sensitive part of the product, so every mutation
 * here returns the server's view of the record rather than the caller's input.
 */
import type { Donation, DonationBatch, DonationEntryForm, Fund, Pledge } from '@/types';
import { mockResponse, API_MODE, apiRequest } from './adapter';
import {
  MOCK_BATCHES,
  MOCK_DONATIONS,
  MOCK_FUNDS,
  MOCK_PLEDGES,
  MOCK_FINANCE_DASHBOARD,
} from '@/mocks/finance.mock';

export type FinanceDashboard = typeof MOCK_FINANCE_DASHBOARD;

export interface CloseBatchInput {
  batchId: string;
  verifiedTotal: number;
}

export const financeService = {
  async getDashboard(): Promise<FinanceDashboard> {
    if (API_MODE === 'mock') return mockResponse(MOCK_FINANCE_DASHBOARD);
    return apiRequest<FinanceDashboard>('/finance/dashboard');
  },

  async listFunds(): Promise<Fund[]> {
    if (API_MODE === 'mock') return mockResponse(MOCK_FUNDS.filter((f) => f.isActive));
    return apiRequest<Fund[]>('/finance/funds');
  },

  async listBatches(params?: { status?: string }): Promise<DonationBatch[]> {
    if (API_MODE === 'mock') {
      const batches = params?.status
        ? MOCK_BATCHES.filter((b) => b.status === params.status)
        : MOCK_BATCHES;
      return mockResponse(
        [...batches].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()),
      );
    }
    const qs = new URLSearchParams(params as Record<string, string>).toString();
    return apiRequest<DonationBatch[]>(`/finance/batches?${qs}`);
  },

  async getBatch(id: string): Promise<DonationBatch> {
    if (API_MODE === 'mock') {
      const batch = MOCK_BATCHES.find((b) => b.id === id) ?? MOCK_BATCHES[0];
      return mockResponse(batch);
    }
    return apiRequest<DonationBatch>(`/finance/batches/${id}`);
  },

  async createBatch(data: Partial<DonationBatch>): Promise<DonationBatch> {
    if (API_MODE === 'mock') {
      return mockResponse<DonationBatch>({
        ...MOCK_BATCHES[0],
        ...data,
        id: `batch-${Date.now()}`,
        status: 'open',
        totalAmount: 0,
        donationCount: 0,
        createdAt: new Date().toISOString(),
      });
    }
    return apiRequest<DonationBatch>('/finance/batches', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  /**
   * Closing is the point of no return for a batch: the counted total is compared
   * against the entered donations and any discrepancy is surfaced to the user
   * before this is called.
   */
  async closeBatch({ batchId, verifiedTotal }: CloseBatchInput): Promise<DonationBatch> {
    if (API_MODE === 'mock') {
      const batch = MOCK_BATCHES.find((b) => b.id === batchId) ?? MOCK_BATCHES[0];
      return mockResponse<DonationBatch>({
        ...batch,
        status: 'closed',
        verifiedTotal,
        closedAt: new Date().toISOString(),
      });
    }
    return apiRequest<DonationBatch>(`/finance/batches/${batchId}/close`, {
      method: 'POST',
      body: JSON.stringify({ verifiedTotal }),
    });
  },

  async listDonations(batchId: string): Promise<Donation[]> {
    if (API_MODE === 'mock') {
      return mockResponse(MOCK_DONATIONS.filter((d) => d.batchId === batchId));
    }
    return apiRequest<Donation[]>(`/finance/batches/${batchId}/donations`);
  },

  async createDonation(batchId: string, form: DonationEntryForm): Promise<Donation> {
    if (API_MODE === 'mock') {
      const fund = MOCK_FUNDS.find((f) => f.id === form.fundId) ?? MOCK_FUNDS[0];
      return mockResponse<Donation>(
        {
          id: `d-${Date.now()}`,
          batchId,
          tenantId: 't1',
          memberId: form.memberId,
          memberName: form.memberName,
          envelopeNumber: form.envelopeNumber,
          isGuest: form.isGuest ?? false,
          guestName: form.guestName,
          fundId: fund.id,
          fundName: fund.name,
          amount: form.amount,
          paymentMethod: form.paymentMethod,
          notes: form.notes,
          isVoided: false,
          createdAt: new Date().toISOString(),
          createdById: 'u1',
        },
        120, // Entry is a tight loop — submit and next must feel immediate
      );
    }
    return apiRequest<Donation>(`/finance/batches/${batchId}/donations`, {
      method: 'POST',
      body: JSON.stringify(form),
    });
  },

  async voidDonation(donationId: string, reason: string): Promise<Donation> {
    if (API_MODE === 'mock') {
      const donation = MOCK_DONATIONS.find((d) => d.id === donationId) ?? MOCK_DONATIONS[0];
      return mockResponse<Donation>({
        ...donation,
        isVoided: true,
        voidReason: reason,
        voidedAt: new Date().toISOString(),
        voidedById: 'u1',
      });
    }
    return apiRequest<Donation>(`/finance/donations/${donationId}/void`, {
      method: 'POST',
      body: JSON.stringify({ reason }),
    });
  },

  async listPledges(): Promise<Pledge[]> {
    if (API_MODE === 'mock') return mockResponse(MOCK_PLEDGES);
    return apiRequest<Pledge[]>('/finance/pledges');
  },
};
