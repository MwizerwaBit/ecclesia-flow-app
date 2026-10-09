/**
 * @file portal.types.ts
 * @description What a signed-in member sees about themselves: their groups,
 * invitations and — when they lead a group — the tools to run it.
 */

export type GroupCapability = 'manage_roster' | 'edit_group' | 'message' | 'manage_events';

export interface MyGroup {
  membershipId: string;
  status: 'invited' | 'active';
  role: string;
  roleName: string;
  capabilities: GroupCapability[];
  /** Lower = more senior; the leader role is 0. */
  rank: number;
  invitedAt: string | null;
  groupId: string;
  name: string;
  type: string;
  description: string | null;
  color: string;
  meetingFrequency: string;
  meetingDay: string | null;
  meetingTime: string | null;
  meetingLocation: string | null;
  memberCount: number;
}

export interface RosterPerson {
  memberId: string;
  firstName: string;
  lastName: string;
  photoUrl: string | null;
  role: string;
  roleName: string | null;
  status: 'invited' | 'active';
  note?: string | null;
  /** Only present for people who manage the roster. */
  phone?: string | null;
  email?: string | null;
}

export interface MyGroupDetail {
  group: {
    id: string;
    name: string;
    type: string;
    description: string | null;
    color: string;
    meetingFrequency: string;
    meetingDay: string | null;
    meetingTime: string | null;
    meetingLocation: string | null;
  };
  myRole: { key: string; name: string; capabilities: GroupCapability[]; rank: number };
  roster: RosterPerson[];
  /** Roles this person may give — empty unless they manage the roster. */
  assignableRoles: Array<{ key: string; name: string }>;
}

export interface GroupCandidate {
  id: string;
  firstName: string;
  lastName: string;
  photoUrl: string | null;
}

export interface JoinChurchPayload {
  churchSlug: string;
  firstName: string;
  lastName: string;
  email: string;
  password: string;
  phone: string;
  gender: 'male' | 'female';
  dateOfBirth: string;
  idType: 'national_id' | 'passport' | 'other';
  nationalId: string;
  consentDataProcessing: boolean;
  consentCommunications: boolean;
}
