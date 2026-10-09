/**
 * @file authService.ts
 * @description Authentication service interface.
 * All auth operations go through this — never call the adapter directly from components.
 */
import type {
  AcceptInvitePayload,
  AuthSession,
  JoinChurchPayload,
  LoginCredentials,
  MembershipSummary,
  MfaChallenge,
  ResetPasswordPayload,
} from '@/types';
import { mockResponse, API_MODE, apiRequest, requireApi, setAccessToken, setStepUpToken } from './adapter';
import { ROLES, type Role } from '@/lib/constants';
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

/** The API's session response, after the adapter has camel-cased it. */
interface ServerSession {
  accessToken: string;
  expiresIn: number;
  user: {
    id: string;
    email: string;
    firstName: string;
    lastName: string;
    photoUrl: string | null;
    mfaEnabled: boolean;
    isPlatformAdmin: boolean;
  };
  activeMembership: MembershipSummary | null;
  memberships: MembershipSummary[];
  permissions: string[];
  role: string | null;
  unitScopeId: string | null;
}

/** Reads the (unverified) claims of our own access token — display only, never for decisions. */
function tokenClaims(token: string): { mfa_verified?: boolean; exp?: number } {
  try {
    const part = token.split('.')[1].replace(/-/g, '+').replace(/_/g, '/');
    return JSON.parse(atob(part));
  } catch {
    return {};
  }
}

/**
 * Which surface a session lands on. System roles map directly; a custom role
 * is staff if it can see the staff dashboard, otherwise a portal member. The
 * server still decides every individual permission — this only picks a layout.
 */
function surfaceRole(s: ServerSession): Role {
  if (s.user.isPlatformAdmin && !s.activeMembership) return ROLES.PLATFORM_ADMIN;
  if (s.role === ROLES.BOARD || s.role === ROLES.STAFF || s.role === ROLES.MEMBER) return s.role;
  return s.permissions.includes('dashboard:view') ? ROLES.STAFF : ROLES.MEMBER;
}

/** Server session → the app's AuthSession, and installs the access token in memory. */
function toAuthSession(s: ServerSession): AuthSession {
  const claims = tokenClaims(s.accessToken);
  const expiresAt = claims.exp ? claims.exp * 1000 : Date.now() + s.expiresIn * 1000;
  setAccessToken(s.accessToken, expiresAt);
  const membership = s.activeMembership;
  return {
    accessToken: s.accessToken,
    expiresAt,
    mfaVerified: Boolean(claims.mfa_verified),
    membershipId: membership?.id,
    memberships: s.memberships,
    user: {
      id: s.user.id,
      firstName: s.user.firstName,
      lastName: s.user.lastName,
      email: s.user.email,
      photoUrl: s.user.photoUrl ?? undefined,
      role: surfaceRole(s),
      tenantId: membership?.tenantId,
      tenantName: membership?.tenantName,
      mfaEnabled: s.user.mfaEnabled,
      createdAt: new Date().toISOString(),
      permissions: s.permissions,
      unitScopeId: s.unitScopeId ?? undefined,
    },
  };
}

/** Set by the last register() call — the dev-only invitation link for the other person in charge. */
let lastInviteUrl: string | null = null;
export function takeRegistrationInviteUrl(): string | null {
  const url = lastInviteUrl;
  lastInviteUrl = null;
  return url;
}

function isChallenge(r: ServerSession | MfaChallenge): r is MfaChallenge {
  return (r as MfaChallenge).mfaRequired === true;
}

export interface RegisterPayload {
  churchName: string;
  fullName: string;
  email: string;
  password: string;
  legalName?: string;
  denomination?: string;
  registrationNumber?: string;
  contactPhone?: string;
  addressLine1?: string;
  city?: string;
  region?: string;
  country?: string;
  /** Who is registering: the church's leader, or its administrator. */
  registrantRole?: 'leader' | 'administrator';
  /** The other person in charge, who is invited. Required when an administrator registers. */
  otherPerson?: { firstName: string; lastName?: string; email: string };
}

/** Registration result: the session, plus (in development) the invitation link for the other person. */
export interface RegisterResult {
  session: AuthSession;
  inviteUrl?: string | null;
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
          // A new church is a new tenant — its directory starts empty rather
          // than inheriting the demo church's people.
          tenantId: `t-${Date.now().toString(36)}`,
          tenantName: payload.churchName,
          tenantSlug: payload.churchName.toLowerCase().trim().replace(/[^a-z0-9]+/g, '-'),
          mfaEnabled: false,
          createdAt: new Date().toISOString(),
        },
        accessToken: `mock-registered-token-${Date.now()}`,
        expiresAt: Date.now() + 3_600_000,
      });
    }
    const { fullName, ...rest } = payload;
    const [firstName, ...others] = fullName.trim().split(/\s+/);
    const session = await apiRequest<ServerSession & { inviteUrl?: string | null }>('/auth/register', {
      method: 'POST',
      skipAuth: true,
      body: JSON.stringify({ ...rest, firstName, lastName: others.join(' ') || firstName }),
    });
    lastInviteUrl = session.inviteUrl ?? null;
    return toAuthSession(session);
  },

  /** A session, or an MFA challenge to complete with verifyMfa. */
  async login(credentials: LoginCredentials): Promise<AuthSession | MfaChallenge> {
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
    const result = await apiRequest<ServerSession | MfaChallenge>('/auth/login', {
      method: 'POST',
      skipAuth: true,
      body: JSON.stringify(credentials),
    });
    return isChallenge(result) ? result : toAuthSession(result);
  },

  async loginWithRole(role: keyof typeof MOCK_SESSIONS): Promise<AuthSession> {
    return mockResponse(MOCK_SESSIONS[role]);
  },

  async requestMagicLink(email: string): Promise<void> {
    if (API_MODE === 'mock') return mockResponse(undefined as void);
    return apiRequest('/auth/magic-link', { method: 'POST', body: JSON.stringify({ email }) });
  },

  /** Completes a sign-in that returned an MFA challenge. */
  async verifyMfa(code: string, challengeToken?: string): Promise<AuthSession> {
    if (API_MODE === 'mock') return mockResponse(MOCK_SESSIONS.staff);
    const session = await apiRequest<ServerSession>('/auth/mfa/challenge', {
      method: 'POST',
      skipAuth: true,
      body: JSON.stringify({ challengeToken, code }),
    });
    return toAuthSession(session);
  },

  /** Rotates the httpOnly refresh cookie; rejects when there is no live session. */
  async refresh(): Promise<AuthSession> {
    const session = await apiRequest<ServerSession>('/auth/refresh', { method: 'POST', skipAuth: true });
    return toAuthSession(session);
  },

  async switchChurch(membershipId: string): Promise<AuthSession> {
    if (API_MODE === 'mock') return mockResponse(MOCK_SESSIONS.staff);
    const session = await apiRequest<ServerSession>('/auth/switch-tenant', {
      method: 'POST',
      body: JSON.stringify({ membershipId }),
    });
    return toAuthSession(session);
  },

  /** Self-registration into a church (adults, ID number required). */
  async joinChurch(payload: JoinChurchPayload): Promise<AuthSession> {
    requireApi('Joining a church');
    const session = await apiRequest<ServerSession>('/auth/join', {
      method: 'POST',
      skipAuth: true,
      body: JSON.stringify(payload),
    });
    return toAuthSession(session);
  },

  /** Turns an emailed invitation into a sign-in (sets a password for new accounts). */
  async acceptInvite(payload: AcceptInvitePayload): Promise<AuthSession> {
    if (API_MODE === 'mock') return mockResponse(MOCK_SESSIONS.staff);
    const session = await apiRequest<ServerSession>('/auth/accept-invite', {
      method: 'POST',
      skipAuth: true,
      body: JSON.stringify(payload),
    });
    return toAuthSession(session);
  },

  /**
   * Step-up re-auth for a sensitive in-session action (leadership transfer,
   * approving one) — distinct from verifyMfa, which replaces the session at
   * login. Doesn't change who's signed in, just confirms it's really them
   * right now.
   */
  async verifyStepUp(code: string): Promise<boolean> {
    if (API_MODE === 'mock') return mockResponse(code.length === 6);
    try {
      const r = await apiRequest<{ stepUpToken: string; expiresInSeconds: number }>('/auth/step-up', {
        method: 'POST',
        body: JSON.stringify({ code }),
      });
      setStepUpToken(r.stepUpToken, r.expiresInSeconds);
      return true;
    } catch {
      return false;
    }
  },

  async requestPasswordReset(email: string): Promise<void> {
    if (API_MODE === 'mock') return mockResponse(undefined as void);
    // Always answers 202 with the same message, whether or not the account exists.
    return apiRequest('/auth/password-reset/request', { method: 'POST', body: JSON.stringify({ email }) });
  },

  async resetPassword(payload: ResetPasswordPayload): Promise<void> {
    if (API_MODE === 'mock') return mockResponse(undefined as void);
    // confirmPassword is checked on the page; the API only needs the token and the new password.
    return apiRequest('/auth/password-reset/complete', {
      method: 'POST',
      body: JSON.stringify({ token: payload.token, password: payload.password }),
    });
  },

  /** Revokes the whole refresh chain server-side and clears the cookie. */
  async logout(): Promise<void> {
    setAccessToken(null);
    if (API_MODE === 'mock') return mockResponse(undefined as void);
    await apiRequest('/auth/logout', { method: 'POST', skipAuth: true }).catch(() => undefined);
  },
};
