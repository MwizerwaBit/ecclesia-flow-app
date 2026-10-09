/**
 * @file auth.types.ts
 * @description Domain types for authentication, users, roles, and permissions.
 */

import type { Role } from '@/lib/constants';

export interface User {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  photoUrl?: string;
  role: Role;
  tenantId?: string; // null for platform admins
  tenantName?: string;
  tenantSlug?: string;
  primaryColor?: string; // Tenant branding
  tenantLogoUrl?: string;
  mfaEnabled: boolean;
  createdAt: string;
  lastLoginAt?: string;
  /**
   * Resolved permission set for this session, as a real backend would embed
   * in a JWT once a tenant membership's role is a custom (CustomRoleBuilder)
   * role rather than one of the four system roles. When set, this replaces
   * the system role's default permission list entirely. Unset for every
   * built-in dev-login session today — system role defaults still apply.
   */
  permissions?: string[];
  /**
   * ABAC attribute: the hierarchy unit (and its descendants) this session is
   * scoped to, mirroring tenant_memberships.unit_scope_id in the database
   * design. Unset = whole organisation, which is today's behaviour for every
   * built-in dev-login session.
   */
  unitScopeId?: string;
}

/** One church this login belongs to (a person can serve in several). */
export interface MembershipSummary {
  id: string;
  tenantId: string;
  tenantName: string;
  roleName: string;
  isPrimary: boolean;
  isLeader: boolean;
  unitScopeId?: string | null;
}

export interface AuthSession {
  user: User;
  /** In REST mode this is held in memory only and is never persisted. */
  accessToken: string;
  expiresAt: number; // Unix timestamp
  /** True only when this sign-in passed a second factor; some actions require it. */
  mfaVerified?: boolean;
  membershipId?: string;
  memberships?: MembershipSummary[];
  isImpersonating?: boolean;
  impersonatedOrgName?: string;
  impersonatedRole?: string;
  impersonationExpiresAt?: number;
}

export interface LoginCredentials {
  email: string;
  password: string;
}

export interface MagicLinkRequest {
  email: string;
}

export interface MfaVerification {
  code: string;
  type: 'totp' | 'backup';
}

/** Returned instead of a session when the account has two-step sign-in on. */
export interface MfaChallenge {
  mfaRequired: true;
  challengeToken: string;
}

export interface AcceptInvitePayload {
  token: string;
  password: string;
  firstName?: string;
  lastName?: string;
}

export interface ResetPasswordPayload {
  token: string;
  password: string;
  confirmPassword: string;
}

export interface AuthState {
  session: AuthSession | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  isImpersonating: boolean;
}
