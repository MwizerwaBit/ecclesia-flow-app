/**
 * @file teamService.ts
 * @description Team and RBAC service — staff accounts, roles, invitations.
 */
import type { CustomRole, InviteStaffPayload, TeamMember } from '@/types';
import { mockResponse, API_MODE, apiRequest } from './adapter';
import { MOCK_ROLES, MOCK_TEAM } from '@/mocks/comms.mock';

export const teamService = {
  async listTeam(): Promise<TeamMember[]> {
    if (API_MODE === 'mock') return mockResponse(MOCK_TEAM);
    return apiRequest<TeamMember[]>('/team');
  },

  async listRoles(): Promise<CustomRole[]> {
    if (API_MODE === 'mock') return mockResponse(MOCK_ROLES);
    return apiRequest<CustomRole[]>('/roles');
  },

  async invite(payload: InviteStaffPayload): Promise<TeamMember> {
    if (API_MODE === 'mock') {
      const role = MOCK_ROLES.find((r) => r.id === payload.roleId) ?? MOCK_ROLES[0];
      const [localPart] = payload.email.split('@');
      return mockResponse<TeamMember>({
        id: `tm-${Date.now()}`,
        tenantId: 't1',
        userId: `u-${Date.now()}`,
        firstName: localPart ?? 'Invited',
        lastName: 'user',
        email: payload.email,
        roleId: role.id,
        roleName: role.name,
        roleColor: role.color,
        unitScope: payload.unitScope ?? 'all',
        unitScopeName: payload.unitScope === 'all' ? 'All units' : payload.unitScope,
        mfaEnabled: false,
        // No acceptedAt — the row renders as pending until they accept.
        invitedAt: new Date().toISOString(),
      });
    }
    return apiRequest<TeamMember>('/team/invite', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  },

  async updateAssignment(
    teamMemberId: string,
    data: { roleId?: string; unitScope?: string },
  ): Promise<TeamMember> {
    if (API_MODE === 'mock') {
      const member = MOCK_TEAM.find((m) => m.id === teamMemberId) ?? MOCK_TEAM[0];
      const role = MOCK_ROLES.find((r) => r.id === data.roleId);
      return mockResponse<TeamMember>({
        ...member,
        ...(role ? { roleId: role.id, roleName: role.name, roleColor: role.color } : {}),
        ...(data.unitScope ? { unitScope: data.unitScope } : {}),
      });
    }
    return apiRequest<TeamMember>(`/team/${teamMemberId}`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    });
  },

  async createRole(data: { name: string; color: string; permissions: string[] }): Promise<CustomRole> {
    if (API_MODE === 'mock') {
      return mockResponse<CustomRole>({
        id: `role-${Date.now()}`,
        tenantId: 't1',
        name: data.name,
        color: data.color,
        permissions: data.permissions,
        isSystem: false,
        memberCount: 0,
        createdAt: new Date().toISOString(),
      });
    }
    return apiRequest<CustomRole>('/roles', { method: 'POST', body: JSON.stringify(data) });
  },
};
