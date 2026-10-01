/**
 * @file org.types.ts
 * @description Domain types for Organisations, Hierarchy, and Platform Admin.
 */

export type OrgStatus = 'trial' | 'active' | 'suspended' | 'canceled';
export type OrgTier = 'free' | 'seed' | 'parish' | 'growth' | 'diocese' | 'enterprise';
export type DomainStatus = 'pending_verification' | 'active' | 'failed' | 'suspended';

export interface Organisation {
  id: string;
  legalName: string;
  displayName: string;
  slug: string;
  country: string;
  currency: string;
  timezone: string;
  language: string;
  status: OrgStatus;
  tier: OrgTier;
  logoUrl?: string;
  primaryColor?: string;
  customDomain?: string;
  trialEndsAt?: string;
  renewalDate?: string;
  memberCount: number;
  unitCount: number;
  storageUsedMb: number;
  primaryAdminEmail?: string;
  primaryAdminName?: string;
  lastActiveAt?: string;
  createdAt: string;
}

/**
 * What a visitor is allowed to see before choosing a church — a small,
 * public-safe subset of Organisation. No billing, usage, or admin-contact
 * fields; those stay behind the platform-admin and tenant-admin surfaces.
 */
export interface PublicChurchSummary {
  slug: string;
  displayName: string;
  country: string;
  logoUrl?: string;
  primaryColor?: string;
}

export interface OrgListItem {
  id: string;
  displayName: string;
  slug: string;
  country: string;
  tier: OrgTier;
  status: OrgStatus;
  memberCount: number;
  createdAt: string;
  trialEndsAt?: string;
  renewalDate?: string;
  lastActiveAt?: string;
}

export interface HierarchyUnit {
  id: string;
  tenantId: string;
  name: string;
  code?: string;
  type: string; // "Church", "Branch", "Zone", "Diocese", etc. (tenant-configurable)
  parentId?: string;
  parentName?: string;
  depth: number;
  memberCount: number;
  subUnitCount: number;
  address?: string;
  children?: HierarchyUnit[];
  createdAt: string;
}

export interface HierarchyTree extends HierarchyUnit {
  children: HierarchyTree[];
}

export interface UnitType {
  id: string;
  tenantId: string;
  name: string;
  level: number; // 0 = top, 1 = second level, etc.
  color?: string;
}

export interface CustomDomain {
  id: string;
  tenantId: string;
  orgName: string;
  domain: string;
  status: DomainStatus;
  sslProvisioned: boolean;
  verifiedAt?: string;
  createdAt: string;
}

export interface FeatureFlag {
  code: string;
  label: string;
  description: string;
  tierDefault: boolean;
  currentValue: boolean;
  isOverridden: boolean;
  overrideSetBy?: string;
  overrideSetAt?: string;
  overrideExpiresAt?: string;
  overrideNote?: string;
}

export interface ImpersonationRequest {
  orgId: string;
  roleToImpersonate: string;
}

export interface ImpersonationSession {
  orgId: string;
  orgName: string;
  role: string;
  token: string;
  expiresAt: number;
}

export interface PlatformMetrics {
  totalOrgs: number;
  activeOrgs: number;
  totalMembers: number; // Anonymised count
  newSignupsToday: number;
  newSignupsThisWeek: number;
  newSignupsThisMonth: number;
  trialsEndingIn7Days: OrgListItem[];
  mrr: number;
  apiP50Ms: number;
  apiP95Ms: number;
  apiP99Ms: number;
  errorRate: number; // 0-1
  queueDepth: number;
}

export interface AuditLogEntry {
  id: string;
  orgId?: string;
  orgName?: string;
  userId: string;
  userName: string;
  action: string;
  resourceType: string;
  resourceId?: string;
  metadata?: Record<string, unknown>;
  ipAddress?: string;
  isImpersonated: boolean;
  impersonatedBy?: string;
  createdAt: string;
}

export interface DataErasureRequest {
  id: string;
  orgId: string;
  orgName: string;
  memberId: string;
  memberDisplayName: string; // May be anonymised
  requestedBy: string;
  requestedAt: string;
  status: 'pending' | 'approved' | 'processing' | 'completed' | 'rejected';
  completedAt?: string;
  processedBy?: string;
  notes?: string;
}
