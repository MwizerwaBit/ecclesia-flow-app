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
