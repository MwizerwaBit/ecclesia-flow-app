/**
 * @file authService.ts
 * @description Authentication service interface.
 * All auth operations go through this — never call the adapter directly from components.
 */
import type { AuthSession, LoginCredentials, ResetPasswordPayload } from '@/types';
import { mockResponse, API_MODE, apiRequest } from './adapter';
import { ROLES } from '@/lib/constants';
import { MOCK_ROLES } from '@/mocks/comms.mock';

// ─── Mock sessions per role (dev role switcher) ───────────────────────────────
const MOCK_SESSIONS: Record<string, AuthSession> = {
  member: {
    user: { id: 'u-member', firstName: 'Julian', lastName: 'Brooks', email: 'julian@stjudes.org', role: ROLES.MEMBER, tenantId: 't1', tenantName: "St. Jude's Cathedral", tenantSlug: 'stjudes', mfaEnabled: false, createdAt: '2023-01-15T00:00:00Z' },
    accessToken: 'mock-member-token',
    expiresAt: Date.now() + 3600_000,
  },
  staff: {
    user: { id: 'u-staff', firstName: 'Sarah', lastName: 'Thompson', email: 'sarah@stjudes.org', role: ROLES.STAFF, tenantId: 't1', tenantName: "St. Jude's Cathedral", tenantSlug: 'stjudes', mfaEnabled: true, createdAt: '2022-08-01T00:00:00Z' },
    accessToken: 'mock-staff-token',
    expiresAt: Date.now() + 3600_000,
  },
  board: {
    user: { id: 'u-board', firstName: 'Bishop', lastName: 'Adeyemi', email: 'bishop@dioceseofgrace.org', role: ROLES.BOARD, tenantId: 't1', tenantName: 'Diocese of Grace', tenantSlug: 'dioceseofgrace', mfaEnabled: true, createdAt: '2021-01-01T00:00:00Z' },
    accessToken: 'mock-board-token',
    expiresAt: Date.now() + 3600_000,
  },
  platform_admin: {
    user: { id: 'u-platform', firstName: 'Platform', lastName: 'Admin', email: 'admin@ecclesiaflow.com', role: ROLES.PLATFORM_ADMIN, mfaEnabled: true, createdAt: '2020-01-01T00:00:00Z' },
    accessToken: 'mock-platform-token',
    expiresAt: Date.now() + 3600_000,
  },
  // Demonstrates the two RBAC/ABAC extension points that a real tenant
  // membership would resolve at login: a custom (non-system) role's own
  // permission list, and a unit scope narrower than the whole org. Compare
  // against plain "staff" in the dev switcher — Team, Structure, Analytics
  // and billing/integrations settings all disappear, and the Directory only
  // shows the Media Team unit.
  staff_scoped: {
    user: {
      id: 'u-staff-media',
      firstName: 'Grace',
      lastName: 'Hill',
      email: 'grace@stjudes.org',
      role: ROLES.STAFF,
      tenantId: 't1',
      tenantName: "St. Jude's Cathedral",
      tenantSlug: 'stjudes',
      mfaEnabled: true,
      createdAt: '2024-02-01T00:00:00Z',
      permissions: MOCK_ROLES.find((r) => r.id === 'role-media')!.permissions,
      unitScopeId: 'unit-media',
    },
    accessToken: 'mock-staff-scoped-token',
    expiresAt: Date.now() + 3600_000,
  },
};

export interface RegisterPayload {
  churchName: string;
  fullName: string;
  email: string;
  password: string;
}

export const authService = {
  /**
   * Step 1 of onboarding: register the founding church leader. The account
   * created here is the one the leadership-transfer flow (teamService) later
   * lets hand off to someone else — registering doesn't just create a login,
   * it designates who the org is accountable to until that happens.
   */
  async register(payload: RegisterPayload): Promise<AuthSession> {
    if (API_MODE === 'mock') {
      const [firstName, ...rest] = payload.fullName.trim().split(' ');
      return mockResponse<AuthSession>({
        user: {
          id: `u-${Date.now()}`,
          firstName: firstName || payload.fullName,
          lastName: rest.join(' '),
          email: payload.email,
          role: ROLES.STAFF,
          tenantId: 't1',
          tenantName: payload.churchName,
          tenantSlug: payload.churchName.toLowerCase().trim().replace(/[^a-z0-9]+/g, '-'),
          mfaEnabled: false,
          createdAt: new Date().toISOString(),
        },
        accessToken: `mock-registered-token-${Date.now()}`,
        expiresAt: Date.now() + 3_600_000,
      });
    }
    return apiRequest<AuthSession>('/auth/register', { method: 'POST', body: JSON.stringify(payload) });
  },

  async login(credentials: LoginCredentials): Promise<AuthSession> {
    if (API_MODE === 'mock') {
      // In mock mode, email domain determines role for dev convenience
      const email = credentials.email.toLowerCase();
      if (email.includes('platform') || email.includes('admin@ecclesia')) {
        return mockResponse(MOCK_SESSIONS.platform_admin);
      }
      if (email.includes('bishop') || email.includes('diocese')) {
        return mockResponse(MOCK_SESSIONS.board);
      }
      if (email.includes('staff') || email.includes('sarah')) {
        return mockResponse(MOCK_SESSIONS.staff);
      }
      return mockResponse(MOCK_SESSIONS.member);
    }
    return apiRequest<AuthSession>('/auth/login', {
      method: 'POST',
      body: JSON.stringify(credentials),
    });
  },

  async loginWithRole(role: keyof typeof MOCK_SESSIONS): Promise<AuthSession> {
    return mockResponse(MOCK_SESSIONS[role]);
  },

  async requestMagicLink(email: string): Promise<void> {
    if (API_MODE === 'mock') return mockResponse(undefined as void);
    return apiRequest('/auth/magic-link', { method: 'POST', body: JSON.stringify({ email }) });
  },

  async verifyMfa(code: string): Promise<AuthSession> {
    if (API_MODE === 'mock') return mockResponse(MOCK_SESSIONS.staff);
    return apiRequest('/auth/mfa/verify', { method: 'POST', body: JSON.stringify({ code }) });
  },

  /**
   * Step-up re-auth for a sensitive in-session action (leadership transfer,
   * approving one) — distinct from verifyMfa, which replaces the session at
   * login. Doesn't change who's signed in, just confirms it's really them
   * right now.
   */
  async verifyStepUp(code: string): Promise<boolean> {
    if (API_MODE === 'mock') return mockResponse(code.length === 6);
    return apiRequest<{ verified: boolean }>('/auth/step-up/verify', {
      method: 'POST',
      body: JSON.stringify({ code }),
    }).then((r) => r.verified);
  },

  async requestPasswordReset(email: string): Promise<void> {
    if (API_MODE === 'mock') return mockResponse(undefined as void);
    return apiRequest('/auth/forgot-password', { method: 'POST', body: JSON.stringify({ email }) });
  },

  async resetPassword(payload: ResetPasswordPayload): Promise<void> {
    if (API_MODE === 'mock') return mockResponse(undefined as void);
    return apiRequest('/auth/reset-password', { method: 'POST', body: JSON.stringify(payload) });
  },

  async logout(): Promise<void> {
    if (API_MODE === 'mock') return mockResponse(undefined as void);
    return apiRequest('/auth/logout', { method: 'POST' });
  },
};
