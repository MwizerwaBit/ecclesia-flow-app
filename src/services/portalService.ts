/**
 * @file portalService.ts
 * @description The member's own data (/me): their record, groups, invitations
 * and events. Everything is resolved server-side from the signed-in user, so
 * there is no way to ask for someone else's.
 */
import type {
  EventListItem,
  GroupCandidate,
  MemberDetail,
  MyGroup,
  MyGroupDetail,
} from '@/types';
import { apiRequest, requireApi } from './adapter';

export const portalService = {
  async myMember(): Promise<MemberDetail> {
    requireApi('My record');
    return apiRequest<MemberDetail>('/me/member');
  },

  async myGroups(): Promise<MyGroup[]> {
    requireApi('My groups');
    return apiRequest<MyGroup[]>('/me/groups');
  },

  async respond(membershipId: string, accept: boolean): Promise<MyGroup[]> {
    requireApi('Group invitations');
    return apiRequest<MyGroup[]>(`/me/groups/invitations/${membershipId}`, {
      method: 'POST',
      body: JSON.stringify({ accept }),
    });
  },

  async group(groupId: string): Promise<MyGroupDetail> {
    requireApi('My groups');
    return apiRequest<MyGroupDetail>(`/me/groups/${groupId}`);
  },

  async editGroup(
    groupId: string,
    data: { description?: string | null; meetingDay?: string | null; meetingTime?: string | null; meetingLocation?: string | null },
  ): Promise<MyGroupDetail> {
    requireApi('My groups');
    return apiRequest<MyGroupDetail>(`/me/groups/${groupId}`, { method: 'PATCH', body: JSON.stringify(data) });
  },

  /** Needs at least two characters; returns names only. */
  async candidates(groupId: string, search: string): Promise<GroupCandidate[]> {
    requireApi('My groups');
    if (search.trim().length < 2) return [];
    return apiRequest<GroupCandidate[]>(`/me/groups/${groupId}/candidates?search=${encodeURIComponent(search.trim())}`);
  },

  async invite(groupId: string, memberIds: string[], role: string): Promise<MyGroupDetail> {
    requireApi('My groups');
    return apiRequest<MyGroupDetail>(`/me/groups/${groupId}/invitations`, {
      method: 'POST',
      body: JSON.stringify({ memberIds, role }),
    });
  },

  async changeRole(groupId: string, memberId: string, role: string): Promise<MyGroupDetail> {
    requireApi('My groups');
    return apiRequest<MyGroupDetail>(`/me/groups/${groupId}/members/${memberId}`, {
      method: 'PATCH',
      body: JSON.stringify({ role }),
    });
  },

  /** Removing someone else returns the updated group; leaving it yourself returns nothing. */
  async remove(groupId: string, memberId: string): Promise<MyGroupDetail | undefined> {
    requireApi('My groups');
    return apiRequest<MyGroupDetail | undefined>(`/me/groups/${groupId}/members/${memberId}`, { method: 'DELETE' });
  },

  async myEvents(): Promise<EventListItem[]> {
    requireApi('My events');
    return apiRequest<EventListItem[]>('/me/events');
  },
};
