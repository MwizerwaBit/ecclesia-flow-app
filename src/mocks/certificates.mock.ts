/**
 * @file certificates.mock.ts
 * @description Mock data for the Certification module.
 */
import type { Certificate, CertificateTemplate } from '@/types';

export const MOCK_CERTIFICATE_TEMPLATES: CertificateTemplate[] = [
  {
    id: 'ct1',
    tenantId: 't1',
    name: 'Certificate of Baptism',
    category: 'sacramental',
    status: 'active',
    tokens: [
      { key: 'member_name', label: 'Recipient', x: 50, y: 42, fontSize: 32, fontFamily: 'Crimson Pro', color: '#1E293B' },
      { key: 'date', label: 'Date', x: 50, y: 58, fontSize: 16, fontFamily: 'DM Sans', color: '#475569' },
      { key: 'officiant', label: 'Officiant', x: 30, y: 78, fontSize: 14, fontFamily: 'DM Sans', color: '#475569' },
      { key: 'org_name', label: 'Church', x: 70, y: 78, fontSize: 14, fontFamily: 'DM Sans', color: '#475569' },
    ],
    qrCodePosition: { x: 88, y: 88 },
    createdAt: '2023-02-01T00:00:00Z',
    updatedAt: '2024-05-12T00:00:00Z',
  },
  {
    id: 'ct2',
    tenantId: 't1',
    name: 'Certificate of Confirmation',
    category: 'sacramental',
    status: 'active',
    tokens: [
      { key: 'member_name', label: 'Recipient', x: 50, y: 44, fontSize: 30, fontFamily: 'Crimson Pro', color: '#1E293B' },
      { key: 'date', label: 'Date', x: 50, y: 60, fontSize: 16, fontFamily: 'DM Sans', color: '#475569' },
    ],
    qrCodePosition: { x: 88, y: 88 },
    createdAt: '2023-02-01T00:00:00Z',
    updatedAt: '2023-02-01T00:00:00Z',
  },
  {
    id: 'ct3',
    tenantId: 't1',
    name: 'Membership Certificate',
    category: 'membership',
    status: 'active',
    tokens: [
      { key: 'member_name', label: 'Recipient', x: 50, y: 45, fontSize: 30, fontFamily: 'Crimson Pro', color: '#1E293B' },
      { key: 'date', label: 'Joined', x: 50, y: 62, fontSize: 15, fontFamily: 'DM Sans', color: '#475569' },
    ],
    createdAt: '2023-04-10T00:00:00Z',
    updatedAt: '2023-04-10T00:00:00Z',
  },
  {
    id: 'ct4',
    tenantId: 't1',
    name: 'Long Service Recognition',
    category: 'recognition',
    status: 'draft',
    tokens: [
      { key: 'member_name', label: 'Recipient', x: 50, y: 46, fontSize: 28, fontFamily: 'Crimson Pro', color: '#1E293B' },
    ],
    createdAt: '2024-09-02T00:00:00Z',
    updatedAt: '2024-09-02T00:00:00Z',
  },
  {
    id: 'ct5',
    tenantId: 't1',
    name: 'Sunday School Completion',
    category: 'education',
    status: 'active',
    tokens: [
      { key: 'member_name', label: 'Recipient', x: 50, y: 44, fontSize: 28, fontFamily: 'Crimson Pro', color: '#1E293B' },
      { key: 'date', label: 'Completed', x: 50, y: 60, fontSize: 15, fontFamily: 'DM Sans', color: '#475569' },
    ],
    createdAt: '2023-08-01T00:00:00Z',
    updatedAt: '2023-08-01T00:00:00Z',
  },
  {
    id: 'ct6',
    tenantId: 't1',
    name: 'Certificate of Marriage',
    category: 'sacramental',
    status: 'archived',
    tokens: [],
    createdAt: '2022-05-01T00:00:00Z',
    updatedAt: '2024-01-15T00:00:00Z',
  },
];

export const MOCK_CERTIFICATES: Certificate[] = [
  { id: 'c1', tenantId: 't1', templateId: 'ct1', templateName: 'Certificate of Baptism', memberId: 'm1', memberName: 'Aaron Smith', issuedById: 'u2', issuedByName: 'Pastor James King', issuedAt: '2024-06-16T00:00:00Z', serialNumber: 'BAP-2024-0041', qrHash: 'a3f91c8e2b', customValues: { officiant: 'Rev. David Morrison' }, isRevoked: false },
  { id: 'c2', tenantId: 't1', templateId: 'ct3', templateName: 'Membership Certificate', memberId: 'm1', memberName: 'Aaron Smith', issuedById: 'u1', issuedByName: 'Sarah Thompson', issuedAt: '2019-03-20T00:00:00Z', serialNumber: 'MEM-2019-0118', qrHash: '7d21b4f009', customValues: {}, isRevoked: false },
  { id: 'c3', tenantId: 't1', templateId: 'ct2', templateName: 'Certificate of Confirmation', memberId: 'm4', memberName: 'Chloe Davis', issuedById: 'u2', issuedByName: 'Pastor James King', issuedAt: '2024-04-21T00:00:00Z', serialNumber: 'CON-2024-0012', qrHash: 'ef5590aa31', customValues: { officiant: 'Bishop Thomas Eliot' }, isRevoked: false },
  { id: 'c4', tenantId: 't1', templateId: 'ct5', templateName: 'Sunday School Completion', memberId: 'm12', memberName: 'Katherine Lee', issuedById: 'u1', issuedByName: 'Sarah Thompson', issuedAt: '2024-07-28T00:00:00Z', serialNumber: 'EDU-2024-0203', qrHash: '11c7de8a44', customValues: {}, isRevoked: true, revokedAt: '2024-08-02T00:00:00Z', revokedReason: 'Issued against the wrong template.' },
];
