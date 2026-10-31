import { beforeEach, describe, expect, it } from 'vitest';
import type { AuthSession, ImpersonationSession } from '@/types';
import { ROLES } from '@/lib/constants';
import { useAuthStore } from './useAuthStore';

/** A token whose payload the app can read (it never checks the signature: the server does). */
function fakeToken(claims: Record<string, unknown>): string {
  const payload = btoa(JSON.stringify(claims)).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
  return `header.${payload}.signature`;
}

const admin: AuthSession = {
  user: {
    id: 'admin-1',
    firstName: 'Platform',
    lastName: 'Admin',
    email: 'admin@example.org',
    role: ROLES.PLATFORM_ADMIN,
    mfaEnabled: true,
    createdAt: '2026-01-01T00:00:00Z',
  },
  accessToken: 'admins-own-token',
  expiresAt: Date.now() + 900_000,
};

const expSeconds = Math.floor(Date.now() / 1000) + 900;
const church: ImpersonationSession = {
  orgId: 'org-9',
  orgName: 'St Mark',
  role: 'staff',
  token: fakeToken({ permissions: ['members:read', 'events:read'], exp: expSeconds, mfa_verified: true }),
  expiresAt: Date.now() + 3_600_000,
};

describe('impersonating a church', () => {
  beforeEach(() => {
    useAuthStore.setState({ session: admin, impersonatedFrom: null });
  });

  it('becomes the church session, with the permissions the server gave, and remembers the admin', () => {
    useAuthStore.getState().startImpersonation(church);

    const { session, impersonatedFrom } = useAuthStore.getState();
    expect(session?.isImpersonating).toBe(true);
    expect(session?.user.role).toBe(ROLES.STAFF);
    expect(session?.user.tenantId).toBe('org-9');
    expect(session?.user.tenantName).toBe('St Mark');
    expect(session?.user.permissions).toEqual(['members:read', 'events:read']);
    expect(session?.impersonatedOrgName).toBe('St Mark');
    // The countdown follows the token's own expiry, not the longer figure the server reports.
    expect(session?.impersonationExpiresAt).toBe(expSeconds * 1000);
    expect(impersonatedFrom).toBe(admin);
  });

  it('puts the admin back when it ends', () => {
    useAuthStore.getState().startImpersonation(church);
    useAuthStore.getState().endImpersonation();

    const { session, impersonatedFrom } = useAuthStore.getState();
    expect(session).toBe(admin);
    expect(session?.isImpersonating).toBeUndefined();
    expect(impersonatedFrom).toBeNull();
  });

  it('cannot be started twice, so the admin session is never lost', () => {
    useAuthStore.getState().startImpersonation(church);
    useAuthStore.getState().startImpersonation({ ...church, orgId: 'org-10', orgName: 'Other' });

    expect(useAuthStore.getState().session?.user.tenantId).toBe('org-9');
    expect(useAuthStore.getState().impersonatedFrom).toBe(admin);
  });

  it('is dropped when the session is cleared', () => {
    useAuthStore.getState().startImpersonation(church);
    useAuthStore.getState().clearLocalSession();

    expect(useAuthStore.getState().session).toBeNull();
    expect(useAuthStore.getState().impersonatedFrom).toBeNull();
  });
});

describe('two-step sign-in status', () => {
  it('is recorded on the signed-in profile', () => {
    useAuthStore.setState({ session: { ...admin, user: { ...admin.user, mfaEnabled: false } } });
    useAuthStore.getState().setMfaEnabled(true);
    expect(useAuthStore.getState().session?.user.mfaEnabled).toBe(true);
  });
});
