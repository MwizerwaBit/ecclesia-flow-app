/**
 * @file finance.mock.ts
 * @description Realistic mock data for the Finance module.
 */
import type { DonationBatch, Donation, Fund, Pledge } from '@/types';

export const MOCK_FUNDS: Fund[] = [
  { id: 'fund-1', tenantId: 't1', name: 'General Fund', description: 'Main operating fund', isDefault: true, totalReceived: 142500, isActive: true, createdAt: '2023-01-01T00:00:00Z' },
  { id: 'fund-2', tenantId: 't1', name: 'Building Fund', description: 'New sanctuary project', isDefault: false, target: 500000, totalReceived: 237800, isActive: true, createdAt: '2023-01-01T00:00:00Z' },
  { id: 'fund-3', tenantId: 't1', name: 'Missions', description: 'International outreach', isDefault: false, totalReceived: 34200, isActive: true, createdAt: '2023-01-01T00:00:00Z' },
  { id: 'fund-4', tenantId: 't1', name: 'Benevolence', description: 'Member assistance fund', isDefault: false, totalReceived: 12100, isActive: true, createdAt: '2023-01-01T00:00:00Z' },
];

export const MOCK_BATCHES: DonationBatch[] = [
  {
    id: 'batch-1',
    tenantId: 't1',
    name: 'Sunday Service — Oct 20',
    description: 'Morning service offering',
    serviceName: 'Sunday Morning Service',
    date: '2024-10-20',
    status: 'open',
    totalAmount: 4250.00,
    donationCount: 34,
    createdById: 'u1',
    createdByName: 'Sarah Thompson',
    createdAt: '2024-10-20T08:00:00Z',
  },
  {
    id: 'batch-2',
    tenantId: 't1',
    name: 'Sunday Service — Oct 13',
    description: 'Morning service offering',
    serviceName: 'Sunday Morning Service',
    date: '2024-10-13',
    status: 'closed',
    totalAmount: 5120.50,
    donationCount: 41,
    verifiedTotal: 5120.50,
    createdById: 'u1',
    createdByName: 'Sarah Thompson',
    closedAt: '2024-10-13T12:30:00Z',
    createdAt: '2024-10-13T08:00:00Z',
  },
  {
    id: 'batch-3',
    tenantId: 't1',
    name: 'Sunday Service — Oct 6',
    date: '2024-10-06',
    status: 'posted',
    totalAmount: 3980.00,
    donationCount: 38,
    verifiedTotal: 3980.00,
    createdById: 'u1',
    createdByName: 'Sarah Thompson',
    closedAt: '2024-10-06T13:00:00Z',
    postedAt: '2024-10-07T09:00:00Z',
    createdAt: '2024-10-06T08:00:00Z',
  },
];

export const MOCK_DONATIONS: Donation[] = [
  { id: 'd1', batchId: 'batch-1', tenantId: 't1', memberId: 'm1', memberName: 'Aaron Smith', envelopeNumber: '0042', isGuest: false, fundId: 'fund-1', fundName: 'General Fund', amount: 150.00, paymentMethod: 'cash', isVoided: false, createdAt: '2024-10-20T09:15:00Z', createdById: 'u1' },
  { id: 'd2', batchId: 'batch-1', tenantId: 't1', memberId: 'm2', memberName: 'Abigail Johnson', envelopeNumber: '0117', isGuest: false, fundId: 'fund-1', fundName: 'General Fund', amount: 75.00, paymentMethod: 'check', isVoided: false, createdAt: '2024-10-20T09:20:00Z', createdById: 'u1' },
  { id: 'd3', batchId: 'batch-1', tenantId: 't1', memberId: 'm3', memberName: 'Benjamin Carter', envelopeNumber: '0003', isGuest: false, fundId: 'fund-2', fundName: 'Building Fund', amount: 500.00, paymentMethod: 'check', isVoided: false, createdAt: '2024-10-20T09:25:00Z', createdById: 'u1' },
  // Julian Brooks (m18) — the portal demo login's own giving history. Sums to
  // MOCK_PORTAL_MEMBER_DETAIL.givingThisYear ($375) so the two stay consistent.
  { id: 'd4', batchId: 'batch-1', tenantId: 't1', memberId: 'm18', memberName: 'Julian Brooks', envelopeNumber: '0210', isGuest: false, fundId: 'fund-1', fundName: 'General Fund', amount: 150.00, paymentMethod: 'card', isVoided: false, createdAt: '2024-10-20T09:30:00Z', createdById: 'u1' },
  { id: 'd5', batchId: 'batch-2', tenantId: 't1', memberId: 'm18', memberName: 'Julian Brooks', envelopeNumber: '0210', isGuest: false, fundId: 'fund-1', fundName: 'General Fund', amount: 125.00, paymentMethod: 'card', isVoided: false, createdAt: '2024-09-22T09:30:00Z', createdById: 'u1' },
  { id: 'd6', batchId: 'batch-3', tenantId: 't1', memberId: 'm18', memberName: 'Julian Brooks', envelopeNumber: '0210', isGuest: false, fundId: 'fund-3', fundName: 'Missions', amount: 100.00, paymentMethod: 'card', isVoided: false, createdAt: '2024-08-15T09:30:00Z', createdById: 'u1' },
];

export const MOCK_PLEDGES: Pledge[] = [
  { id: 'pl1', tenantId: 't1', memberId: 'm3', memberName: 'Benjamin Carter', fundId: 'fund-2', fundName: 'Building Fund', pledgeAmount: 6000, amountFulfilled: 4500, startDate: '2024-01-01', endDate: '2024-12-31', frequency: 'monthly', status: 'active', createdAt: '2024-01-01T00:00:00Z' },
  { id: 'pl2', tenantId: 't1', memberId: 'm11', memberName: 'James King', fundId: 'fund-2', fundName: 'Building Fund', pledgeAmount: 12000, amountFulfilled: 12000, startDate: '2024-01-01', endDate: '2024-12-31', frequency: 'monthly', status: 'fulfilled', createdAt: '2024-01-01T00:00:00Z' },
  { id: 'pl3', tenantId: 't1', memberId: 'm6', memberName: 'Elizabeth Foster', fundId: 'fund-1', fundName: 'General Fund', pledgeAmount: 2400, amountFulfilled: 1600, startDate: '2024-01-01', endDate: '2024-12-31', frequency: 'monthly', status: 'active', createdAt: '2024-01-01T00:00:00Z' },
];

export const MOCK_FINANCE_DASHBOARD = {
  thisWeekTotal: 4250.00,
  lastWeekTotal: 5120.50,
  openBatchCount: 1,
  pledgeProgress: 0.74,
  yearToDateTotal: 142500,
  lastYearTotal: 138200,
  fundBreakdown: MOCK_FUNDS.map(f => ({
    fundName: f.name,
    amount: f.totalReceived,
    percentage: f.totalReceived / 426600,
  })),
};
