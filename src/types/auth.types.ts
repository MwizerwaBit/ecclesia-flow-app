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

export interface AuthSession {
  user: User;
  accessToken: string;
  expiresAt: number; // Unix timestamp
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
