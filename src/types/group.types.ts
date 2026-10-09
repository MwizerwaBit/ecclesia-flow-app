/**
 * @file group.types.ts
 * @description Domain types for Groups — ministries, small groups, choirs, teams.
 *
 * A group is not a hierarchy unit. Units are where someone belongs
 * structurally (a branch, a parish, a zone) and a person has exactly one; groups
 * are what someone takes part in (the choir, a home cell, the ushering team)
 * and a person can be in any number of them, with a role in each.
 */
import type { GroupRole, MemberListItem } from './member.types';

export type GroupType =
  | 'ministry'
  | 'small_group'
  | 'choir'
  | 'department'
  | 'fellowship'
  | 'class'
  | 'committee'
  | 'team';

export type MeetingFrequency = 'weekly' | 'fortnightly' | 'monthly' | 'irregular';

export type Weekday = 'monday' | 'tuesday' | 'wednesday' | 'thursday' | 'friday' | 'saturday' | 'sunday';

export interface GroupSchedule {
  frequency: MeetingFrequency;
  day?: Weekday;
  /** 24h "HH:mm". */
  time?: string;
  location?: string;
}

export interface Group {
  id: string;
  tenantId: string;
  name: string;
  type: GroupType;
  description?: string;
  /** The branch/unit this group belongs to; unset means church-wide. */
  unitId?: string;
  unitName?: string;
  schedule?: GroupSchedule;
  /** Open groups appear in the member portal and accept join requests. */
  isOpen: boolean;
  /** Soft cap — the roster can exceed it, the UI just says so. */
  capacity?: number;
  /** Accent colour used for the group's chip and card band. */
  color: string;
  isArchived: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface GroupListItem extends Group {
  memberCount: number;
  invitedCount?: number;
  leaders: Array<Pick<MemberListItem, 'id' | 'firstName' | 'lastName' | 'photoUrl' | 'initials'>>;
}

export interface GroupMembership {
  id: string;
  tenantId: string;
  groupId: string;
  memberId: string;
  role: GroupRole;
  joinedAt: string;
  /** e.g. a choir voice part or a team rota note. */
  note?: string;
  /** People with a login are invited and join once they accept in their portal. */
  status?: 'invited' | 'active' | 'declined';
  invitedAt?: string | null;
  respondedAt?: string | null;
  roleName?: string | null;
}

/** A role a church defines for its groups (Leader, Secretary, Treasurer…). */
export interface GroupRoleDef {
  id: string;
  key: string;
  name: string;
  capabilities: Array<'manage_roster' | 'edit_group' | 'message' | 'manage_events'>;
  /** Lower ranks outrank higher ones; Leader is 0. */
  rank: number;
  isSystem: boolean;
}

export interface GroupRosterEntry extends GroupMembership {
  member: MemberListItem;
}

export interface GroupDetail extends GroupListItem {
  roster: GroupRosterEntry[];
}

export type GroupInput = Pick<Group, 'name' | 'type' | 'isOpen' | 'color'> &
  Partial<Pick<Group, 'description' | 'unitId' | 'schedule' | 'capacity'>>;
