/**
 * @file finance.types.ts
 * @description Domain types for the Finance module.
 */

export type BatchStatus = 'open' | 'closed' | 'posted';
export type PaymentMethod = 'cash' | 'check' | 'card' | 'transfer' | 'mobile_money';

export interface Fund {
  id: string;
  tenantId: string;
  name: string;
  description?: string;
  isDefault: boolean;
  target?: number; // Target amount (for progress bars)
  totalReceived: number;
  isActive: boolean;
  createdAt: string;
}

export interface DonationBatch {
  id: string;
  tenantId: string;
  name: string;
  description?: string;
  serviceId?: string;
  serviceName?: string;
  date: string; // ISO date
  status: BatchStatus;
  totalAmount: number;
  donationCount: number;
  verifiedTotal?: number; // Manually entered verification total
  createdById: string;
  createdByName: string;
  closedAt?: string;
  postedAt?: string;
  createdAt: string;
}

export interface Donation {
  id: string;
  batchId: string;
  tenantId: string;

  // Giver
  memberId?: string;
  memberName?: string;
  envelopeNumber?: string;
  isGuest: boolean;
  guestName?: string;

  // Donation details
  fundId: string;
  fundName: string;
  amount: number;
  paymentMethod: PaymentMethod;
  notes?: string;
  referenceNumber?: string;

  // Status
  isVoided: boolean;
  voidedAt?: string;
  voidReason?: string;
  voidedById?: string;

  createdAt: string;
  createdById: string;
}

export interface DonationEntryForm {
  // Step 1 — Identity
  mode: 'envelope' | 'member_search';
  envelopeNumber?: string;
  memberId?: string;
  memberName?: string;
  isGuest?: boolean;
  guestName?: string;

  // Step 2 — Fund
  fundId: string;

  // Step 3 — Amount + method
  amount: number;
  paymentMethod: PaymentMethod;
  notes?: string;
}

export interface Pledge {
  id: string;
  tenantId: string;
  memberId: string;
  memberName: string;
  fundId: string;
  fundName: string;
  pledgeAmount: number;
  amountFulfilled: number;
  startDate: string;
  endDate: string;
  frequency?: 'weekly' | 'monthly' | 'annual' | 'one-time';
  status: 'active' | 'fulfilled' | 'overdue' | 'canceled';
  createdAt: string;
}

export interface GivingReport {
  period: 'weekly' | 'monthly' | 'annual';
  startDate: string;
  endDate: string;
  totalAmount: number;
  donationCount: number;
  byFund: Array<{
    fundId: string;
    fundName: string;
    amount: number;
    percentage: number;
  }>;
  trend: Array<{
    label: string; // "Week 1", "Jan", "2023"
    amount: number;
  }>;
}

export interface ContributionStatement {
  id: string;
  memberId: string;
  memberName: string;
  year: number;
  totalAmount: number;
  donations: Array<{
    date: string;
    fundName: string;
    amount: number;
    paymentMethod: PaymentMethod;
    referenceNumber?: string;
  }>;
  generatedAt: string;
}
