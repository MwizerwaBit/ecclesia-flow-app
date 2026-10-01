/**
 * @file teamService.ts
 * @description Team and RBAC service — staff accounts, roles, invitations.
 */
import type { CustomRole, InviteStaffPayload, LeadershipTransferRequest, TeamMember } from '@/types';
import { mockResponse, API_MODE, apiRequest } from './adapter';
import { MOCK_ROLES, MOCK_TEAM, MOCK_LEADERSHIP_TRANSFER, setMockLeadershipTransfer } from '@/mocks/comms.mock';

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

  // ─── Church leadership ──────────────────────────────────────────────────
  // The org's single accountable owner, and the only process that changes
  // who it is: initiate (requires a fresh MFA code, not just being signed
  // in) then sign-off from staff other than the outgoing leader and the
  // nominee, so no one account can make the change alone.

  async getLeader(): Promise<TeamMember | undefined> {
    if (API_MODE === 'mock') return mockResponse(MOCK_TEAM.find((m) => m.isLeader));
    return apiRequest<TeamMember>('/team/leader');
  },

  async getLeadershipTransfer(): Promise<LeadershipTransferRequest | null> {
    if (API_MODE === 'mock') return mockResponse(MOCK_LEADERSHIP_TRANSFER);
    return apiRequest<LeadershipTransferRequest | null>('/team/leadership-transfer');
  },

  /** `mfaCode` has already been verified by the caller (see MfaStepUp) before this is called. */
  async requestLeadershipTransfer(nomineeId: string): Promise<LeadershipTransferRequest> {
    if (API_MODE === 'mock') {
      const leader = MOCK_TEAM.find((m) => m.isLeader);
      const nominee = MOCK_TEAM.find((m) => m.id === nomineeId);
      if (!leader || !nominee) throw new Error('Leader or nominee not found');

      const request: LeadershipTransferRequest = {
        id: `lt-${Date.now()}`,
        tenantId: 't1',
        outgoingLeaderId: leader.id,
        outgoingLeaderName: `${leader.firstName} ${leader.lastName}`,
        nomineeId: nominee.id,
        nomineeName: `${nominee.firstName} ${nominee.lastName}`,
        initiatedByTeamMemberId: leader.id,
        initiatedAt: new Date().toISOString(),
        mfaVerifiedAt: new Date().toISOString(),
        requiredApprovals: 2,
        eligibleApproverIds: MOCK_TEAM.filter(
          (m) => m.acceptedAt && m.id !== leader.id && m.id !== nominee.id,
        ).map((m) => m.id),
        approvals: [],
        status: 'pending_approvals',
      };
      setMockLeadershipTransfer(request);
      return mockResponse(request);
    }
    return apiRequest<LeadershipTransferRequest>('/team/leadership-transfer', {
      method: 'POST',
      body: JSON.stringify({ nomineeId }),
    });
  },

  /** `mfaCode` has already been verified by the caller before this is called. */
  async approveLeadershipTransfer(requestId: string, approverTeamMemberId: string): Promise<LeadershipTransferRequest> {
    if (API_MODE === 'mock') {
      const current = MOCK_LEADERSHIP_TRANSFER;
      if (!current || current.id !== requestId) throw new Error('No matching leadership transfer request');
      const approver = MOCK_TEAM.find((m) => m.id === approverTeamMemberId);
      if (!approver) throw new Error('Approver not found');
      if (current.approvals.some((a) => a.teamMemberId === approverTeamMemberId)) {
        return mockResponse(current);
      }

      const approvals = [
        ...current.approvals,
        { teamMemberId: approver.id, name: `${approver.firstName} ${approver.lastName}`, approvedAt: new Date().toISOString() },
      ];
      const completed = approvals.length >= current.requiredApprovals;
      const updated: LeadershipTransferRequest = {
        ...current,
        approvals,
        status: completed ? 'completed' : 'pending_approvals',
        completedAt: completed ? new Date().toISOString() : undefined,
      };

      if (completed) {
        // Move the single isLeader flag — the one data change this whole
        // process exists to make, and the only moment it happens.
        MOCK_TEAM.forEach((m) => {
          m.isLeader = m.id === current.nomineeId;
        });
      }

      setMockLeadershipTransfer(updated);
      return mockResponse(updated);
    }
    return apiRequest<LeadershipTransferRequest>(`/team/leadership-transfer/${requestId}/approve`, {
      method: 'POST',
    });
  },

  async cancelLeadershipTransfer(requestId: string): Promise<void> {
    if (API_MODE === 'mock') {
      if (MOCK_LEADERSHIP_TRANSFER?.id === requestId) {
        setMockLeadershipTransfer(null);
      }
      return mockResponse(undefined as void);
    }
    return apiRequest(`/team/leadership-transfer/${requestId}`, { method: 'DELETE' });
  },
};
