/**
 * @file groupsService.ts
 * @description Groups — ministries, small groups, choirs, teams — and who is in them.
 *
 * Mock mode reads and writes the same tenant-partitioned store as
 * membersService, so a person added to a group shows it on their profile and
 * in the directory straight away.
 */
import type {
  Group,
  GroupDetail,
  GroupInput,
  GroupListItem,
  GroupMembership,
  GroupRoleDef,
  GroupRole,
  GroupRosterEntry,
} from '@/types';
import { API_MODE, apiRequest, mockResponse, requireApi } from './adapter';
import { toListItem } from './membersService';
import { MOCK_UNITS } from '@/mocks/comms.mock';
import { currentTenantId, newId, readPeople, writePeople, type PeopleData } from '@/mocks/peopleStore';

const ROLE_ORDER: Record<GroupRole, number> = { leader: 0, assistant: 1, member: 2 };

function roster(groupId: string, data: PeopleData): GroupRosterEntry[] {
  return data.memberships
    .filter((gm) => gm.groupId === groupId)
    .map((gm) => {
      const member = data.members.find((m) => m.id === gm.memberId);
      return member ? { ...gm, member: toListItem(member, data) } : null;
    })
    .filter((entry): entry is GroupRosterEntry => entry !== null)
    .sort(
      (a, b) =>
        ROLE_ORDER[a.role] - ROLE_ORDER[b.role] ||
        a.member.lastName.localeCompare(b.member.lastName) ||
        a.member.firstName.localeCompare(b.member.firstName),
    );
}

function toListItemGroup(group: Group, data: PeopleData): GroupListItem {
  const entries = roster(group.id, data);
  return {
    ...group,
    memberCount: entries.length,
    leaders: entries
      .filter((e) => e.role === 'leader')
      .map(({ member }) => ({
        id: member.id,
        firstName: member.firstName,
        lastName: member.lastName,
        photoUrl: member.photoUrl,
        initials: member.initials,
      })),
  };
}

function groupOrThrow(data: PeopleData, groupId: string): Group {
  const group = data.groups.find((g) => g.id === groupId);
  if (!group) throw new Error('No such group in this church.');
  return group;
}

function unitNameOf(unitId?: string): string | undefined {
  return unitId ? MOCK_UNITS.find((u) => u.id === unitId)?.name : undefined;
}

export const groupsService = {
  async list(params?: { includeArchived?: boolean }): Promise<GroupListItem[]> {
    if (API_MODE === 'mock') {
      const data = readPeople();
      return mockResponse(
        data.groups
          .filter((g) => params?.includeArchived || !g.isArchived)
          .map((g) => toListItemGroup(g, data))
          .sort((a, b) => a.name.localeCompare(b.name)),
      );
    }
    return apiRequest<GroupListItem[]>(`/groups${params?.includeArchived ? '?include_archived=true' : ''}`);
  },

  async getById(groupId: string): Promise<GroupDetail> {
    if (API_MODE === 'mock') {
      const data = readPeople();
      const group = groupOrThrow(data, groupId);
      return mockResponse({ ...toListItemGroup(group, data), roster: roster(groupId, data) });
    }
    return apiRequest<GroupDetail>(`/groups/${groupId}`);
  },

  async create(input: GroupInput): Promise<Group> {
    if (API_MODE === 'mock') {
      const now = new Date().toISOString();
      const group: Group = {
        ...input,
        name: input.name.trim(),
        id: newId('g'),
        tenantId: currentTenantId(),
        unitName: unitNameOf(input.unitId),
        isArchived: false,
        createdAt: now,
        updatedAt: now,
      };
      writePeople((data) => {
        if (data.groups.some((g) => !g.isArchived && g.name.toLowerCase() === group.name.toLowerCase())) {
          throw new Error(`There is already a group called "${group.name}".`);
        }
        data.groups.push(group);
      });
      return mockResponse(group);
    }
    return apiRequest<Group>('/groups', { method: 'POST', body: JSON.stringify(input) });
  },

  async update(groupId: string, input: Partial<GroupInput> & { isArchived?: boolean }): Promise<Group> {
    if (API_MODE === 'mock') {
      let updated: Group | undefined;
      writePeople((data) => {
        const group = groupOrThrow(data, groupId);
        const name = input.name?.trim();
        if (name && data.groups.some((g) => g.id !== groupId && !g.isArchived && g.name.toLowerCase() === name.toLowerCase())) {
          throw new Error(`There is already a group called "${name}".`);
        }
        Object.assign(group, input, {
          ...(name ? { name } : {}),
          ...(input.unitId !== undefined ? { unitName: unitNameOf(input.unitId) } : {}),
          updatedAt: new Date().toISOString(),
        });
        updated = { ...group };
      });
      return mockResponse(updated!);
    }
    return apiRequest<Group>(`/groups/${groupId}`, { method: 'PATCH', body: JSON.stringify(input) });
  },

  /** Adds people to a group. Anyone already in it keeps their current role. */
  async addMembers(groupId: string, memberIds: string[], role: GroupRole = 'member'): Promise<GroupMembership[]> {
    if (API_MODE === 'mock') {
      const added: GroupMembership[] = [];
      writePeople((data) => {
        const group = groupOrThrow(data, groupId);
        const today = new Date().toISOString().slice(0, 10);
        for (const memberId of memberIds) {
          if (!data.members.some((m) => m.id === memberId)) continue;
          if (data.memberships.some((gm) => gm.groupId === groupId && gm.memberId === memberId)) continue;
          const membership: GroupMembership = {
            id: newId('gm'),
            tenantId: group.tenantId,
            groupId,
            memberId,
            role,
            joinedAt: today,
          };
          data.memberships.push(membership);
          added.push(membership);
        }
      });
      return mockResponse(added);
    }
    return apiRequest<GroupMembership[]>(`/groups/${groupId}/members`, {
      method: 'POST',
      body: JSON.stringify({ memberIds, role }),
    });
  },

  async updateMembership(groupId: string, memberId: string, patch: { role?: GroupRole; note?: string }): Promise<GroupMembership> {
    if (API_MODE === 'mock') {
      let updated: GroupMembership | undefined;
      writePeople((data) => {
        const membership = data.memberships.find((gm) => gm.groupId === groupId && gm.memberId === memberId);
        if (!membership) throw new Error('That person is not in this group.');
        Object.assign(membership, patch);
        updated = { ...membership };
      });
      return mockResponse(updated!);
    }
    return apiRequest<GroupMembership>(`/groups/${groupId}/members/${memberId}`, {
      method: 'PATCH',
      body: JSON.stringify(patch),
    });
  },

  async removeMember(groupId: string, memberId: string): Promise<void> {
    if (API_MODE === 'mock') {
      writePeople((data) => {
        data.memberships = data.memberships.filter((gm) => !(gm.groupId === groupId && gm.memberId === memberId));
      });
      return mockResponse(undefined);
    }
    await apiRequest<void>(`/groups/${groupId}/members/${memberId}`, { method: 'DELETE' });
  },

  // ── Group roles (API only) ────────────────────────────────────────────

  async listRoles(): Promise<GroupRoleDef[]> {
    if (API_MODE === 'mock') {
      return mockResponse<GroupRoleDef[]>([
        { id: 'gr-leader', key: 'leader', name: 'Leader', capabilities: ['manage_roster', 'edit_group', 'message', 'manage_events'], rank: 0, isSystem: true },
        { id: 'gr-assistant', key: 'assistant', name: 'Assistant', capabilities: ['manage_roster', 'message'], rank: 10, isSystem: true },
        { id: 'gr-member', key: 'member', name: 'Member', capabilities: [], rank: 100, isSystem: true },
      ]);
    }
    return apiRequest<GroupRoleDef[]>('/groups/roles');
  },

  async createRole(input: Pick<GroupRoleDef, 'name' | 'capabilities' | 'rank'>): Promise<GroupRoleDef> {
    requireApi('Custom group roles');
    return apiRequest<GroupRoleDef>('/groups/roles', { method: 'POST', body: JSON.stringify(input) });
  },

  async updateRole(id: string, input: Partial<Pick<GroupRoleDef, 'name' | 'capabilities' | 'rank'>>): Promise<GroupRoleDef> {
    requireApi('Custom group roles');
    return apiRequest<GroupRoleDef>(`/groups/roles/${id}`, { method: 'PATCH', body: JSON.stringify(input) });
  },

  async deleteRole(id: string): Promise<void> {
    requireApi('Custom group roles');
    await apiRequest<void>(`/groups/roles/${id}`, { method: 'DELETE' });
  },
};
