/**
 * @file membersService.ts
 * @description Members / People service interface.
 *
 * In mock mode every read and write goes through `peopleStore`, which keeps
 * each church's people separate and persists what is registered — so a person
 * added here really does appear in that church's directory, groups and
 * households afterwards, and nowhere else.
 */
import type {
  Household,
  MemberDetail,
  MemberListItem,
  MemberRegistration,
  PastoralNote,
  PossibleDuplicate,
  SacramentalRecord,
  VisitorFollowUp,
  VisitorQuickAdd,
} from '@/types';
import { mockResponse, API_MODE, apiRequest } from './adapter';
import { MOCK_VISITOR_FOLLOWUPS } from '@/mocks/members.mock';
import { MOCK_UNITS } from '@/mocks/comms.mock';
import { currentTenantId, newId, readPeople, writePeople, type HouseholdRecord, type PeopleData } from '@/mocks/peopleStore';
import { normalisePhone } from '@/lib/people';

function initialsOf(firstName: string, lastName: string): string {
  return `${firstName.trim()[0] ?? '?'}${lastName.trim()[0] ?? ''}`.toUpperCase();
}

/** The directory row for a stored member, with their groups attached. */
export function toListItem(member: MemberDetail, data: PeopleData): MemberListItem {
  const groups = data.memberships
    .filter((gm) => gm.memberId === member.id)
    .map((gm) => {
      const group = data.groups.find((g) => g.id === gm.groupId && !g.isArchived);
      return group ? { id: group.id, name: group.name, color: group.color, role: gm.role } : null;
    })
    .filter((g): g is NonNullable<typeof g> => g !== null);

  return {
    id: member.id,
    firstName: member.firstName,
    lastName: member.lastName,
    preferredName: member.preferredName,
    photoUrl: member.photoUrl,
    initials: member.initials,
    status: member.status,
    unitId: member.unitId,
    unitName: member.unitName,
    envelopeNumber: member.envelopeNumber,
    lastSeenAt: member.lastSeenAt,
    email: member.email,
    phone: member.phone,
    whatsapp: member.whatsapp,
    gender: member.gender,
    joinedAt: member.joinedAt,
    householdId: member.householdId,
    groups,
  };
}

function sortByName(a: MemberListItem, b: MemberListItem): number {
  return a.lastName.localeCompare(b.lastName) || a.firstName.localeCompare(b.firstName);
}

function detailFromStore(id: string): MemberDetail {
  const data = readPeople();
  const member = data.members.find((m) => m.id === id);
  if (!member) throw new Error('No such person in this church.');
  return { ...member, groups: toListItem(member, data).groups };
}

function householdFromStore(record: HouseholdRecord, data: PeopleData): Household {
  return {
    ...record,
    members: data.members.filter((m) => m.householdId === record.id).map((m) => toListItem(m, data)),
  };
}

/** Fields the client sends that the stored record should never take verbatim. */
function cleanDetail(input: Partial<MemberDetail>): Partial<MemberDetail> {
  const { groups: _groups, household: _household, ...rest } = input as Partial<MemberDetail> & { household?: unknown };
  const unitName = rest.unitId ? MOCK_UNITS.find((u) => u.id === rest.unitId)?.name : undefined;
  return { ...rest, ...(rest.unitId !== undefined ? { unitName } : {}) };
}

export const membersService = {
  async list(params?: { search?: string; status?: string; unitId?: string; groupId?: string }): Promise<MemberListItem[]> {
    if (API_MODE === 'mock') {
      const data = readPeople();
      let members = data.members.map((m) => toListItem(m, data));
      if (params?.search) {
        const q = params.search.toLowerCase();
        members = members.filter(
          (m) => `${m.firstName} ${m.lastName}`.toLowerCase().includes(q) || m.envelopeNumber?.includes(q),
        );
      }
      if (params?.status) members = members.filter((m) => m.status === params.status);
      if (params?.unitId) members = members.filter((m) => m.unitId === params.unitId);
      if (params?.groupId) members = members.filter((m) => m.groups?.some((g) => g.id === params.groupId));
      return mockResponse(members.sort(sortByName));
    }
    const qs = new URLSearchParams(params as Record<string, string>).toString();
    return apiRequest<MemberListItem[]>(`/members?${qs}`);
  },

  async getById(id: string): Promise<MemberDetail> {
    if (API_MODE === 'mock') return mockResponse(detailFromStore(id));
    return apiRequest<MemberDetail>(`/members/${id}`);
  },

  /** The member record behind a portal login, if that account is linked to one yet. */
  async getByUserId(userId: string): Promise<MemberDetail | null> {
    if (API_MODE === 'mock') {
      const member = readPeople().members.find((m) => m.userId === userId);
      return mockResponse(member ? detailFromStore(member.id) : null);
    }
    return apiRequest<MemberDetail | null>(`/members/by-user/${userId}`);
  },

  /**
   * People already on file who look like the one being registered — same
   * name, phone or email. Registration shows these before saving so a family
   * doesn't end up in the directory twice.
   */
  async findDuplicates(probe: { firstName?: string; lastName?: string; phone?: string; email?: string; excludeId?: string }): Promise<PossibleDuplicate[]> {
    if (API_MODE === 'mock') {
      const data = readPeople();
      const first = probe.firstName?.trim().toLowerCase();
      const last = probe.lastName?.trim().toLowerCase();
      const phone = normalisePhone(probe.phone);
      const email = probe.email?.trim().toLowerCase();

      const matches: PossibleDuplicate[] = [];
      for (const member of data.members) {
        if (member.id === probe.excludeId) continue;
        const reasons: PossibleDuplicate['reasons'] = [];
        if (first && last && member.firstName.toLowerCase() === first && member.lastName.toLowerCase() === last) reasons.push('name');
        // Compare the trailing digits so country-code formatting doesn't hide a match.
        const memberPhone = normalisePhone(member.phone);
        if (phone.length >= 7 && memberPhone.length >= 7 && memberPhone.slice(-9) === phone.slice(-9)) reasons.push('phone');
        if (email && member.email?.toLowerCase() === email) reasons.push('email');
        if (reasons.length > 0) matches.push({ member: toListItem(member, data), reasons });
      }
      return mockResponse(matches, 120);
    }
    const qs = new URLSearchParams(
      Object.entries(probe).filter(([, v]) => Boolean(v)) as Array<[string, string]>,
    ).toString();
    return apiRequest<PossibleDuplicate[]>(`/members/duplicates?${qs}`);
  },

  /** The next unused envelope number, offered as a default when registering. */
  async suggestEnvelopeNumber(): Promise<string> {
    if (API_MODE === 'mock') {
      const highest = readPeople().members.reduce((max, m) => Math.max(max, Number(m.envelopeNumber) || 0), 0);
      return mockResponse(String(highest + 1).padStart(4, '0'), 80);
    }
    return (await apiRequest<{ envelopeNumber: string }>('/members/next-envelope-number')).envelopeNumber;
  },

  /**
   * Registers a person into the signed-in church, with their household and
   * group memberships, as one operation — so a registration either lands
   * whole or not at all.
   */
  async register(input: MemberRegistration): Promise<MemberDetail> {
    if (API_MODE === 'mock') {
      const { household, groupIds = [], ...fields } = input;
      const now = new Date().toISOString();
      const id = newId('m');
      const tenantId = currentTenantId();

      writePeople((data) => {
        if (fields.envelopeNumber && data.members.some((m) => m.envelopeNumber === fields.envelopeNumber)) {
          throw new Error(`Envelope #${fields.envelopeNumber} already belongs to someone else.`);
        }

        let householdId: string | undefined;
        if (household?.mode === 'existing') {
          if (!data.households.some((h) => h.id === household.householdId)) throw new Error('That household no longer exists.');
          householdId = household.householdId;
        } else if (household?.mode === 'new') {
          householdId = newId('hh');
          data.households.push({
            id: householdId,
            tenantId,
            name: household.name.trim(),
            headMemberId: fields.householdRole === 'head' ? id : undefined,
            address: fields.address,
            createdAt: now,
          });
        }

        if (householdId) {
          const record = data.households.find((h) => h.id === householdId)!;
          if (fields.householdRole === 'head' && !record.headMemberId) record.headMemberId = id;
        }

        data.members.push({
          ...cleanDetail(fields),
          id,
          tenantId,
          firstName: fields.firstName.trim(),
          lastName: fields.lastName.trim(),
          initials: initialsOf(fields.firstName, fields.lastName),
          status: fields.status ?? 'active',
          joinedAt: fields.joinedAt ?? now.slice(0, 10),
          householdId,
          createdAt: now,
          updatedAt: now,
        } as MemberDetail);

        for (const groupId of groupIds) {
          if (!data.groups.some((g) => g.id === groupId)) continue;
          data.memberships.push({ id: newId('gm'), tenantId, groupId, memberId: id, role: 'member', joinedAt: now.slice(0, 10) });
        }
      });

      return mockResponse(detailFromStore(id));
    }
    return apiRequest<MemberDetail>('/members', { method: 'POST', body: JSON.stringify(input) });
  },

  /** Kept for the onboarding wizard's "first member" step. */
  async create(data: Partial<MemberDetail>): Promise<MemberDetail> {
    const { household: _household, ...fields } = data;
    return membersService.register({ ...fields, firstName: fields.firstName ?? '', lastName: fields.lastName ?? '' });
  },

  async update(id: string, input: Omit<Partial<MemberDetail>, 'household'> & { household?: MemberRegistration['household'] }): Promise<MemberDetail> {
    if (API_MODE === 'mock') {
      const { household, ...fields } = input;
      writePeople((data) => {
        const member = data.members.find((m) => m.id === id);
        if (!member) throw new Error('No such person in this church.');
        if (fields.envelopeNumber && data.members.some((m) => m.id !== id && m.envelopeNumber === fields.envelopeNumber)) {
          throw new Error(`Envelope #${fields.envelopeNumber} already belongs to someone else.`);
        }

        if (household?.mode === 'none') member.householdId = undefined;
        if (household?.mode === 'existing') member.householdId = household.householdId;
        if (household?.mode === 'new') {
          const householdId = newId('hh');
          data.households.push({
            id: householdId,
            tenantId: member.tenantId,
            name: household.name.trim(),
            headMemberId: fields.householdRole === 'head' ? id : undefined,
            address: fields.address ?? member.address,
            createdAt: new Date().toISOString(),
          });
          member.householdId = householdId;
        }

        Object.assign(member, cleanDetail(fields), {
          initials: initialsOf(fields.firstName ?? member.firstName, fields.lastName ?? member.lastName),
          updatedAt: new Date().toISOString(),
        });
      });
      return mockResponse(detailFromStore(id));
    }
    return apiRequest<MemberDetail>(`/members/${id}`, { method: 'PATCH', body: JSON.stringify(input) });
  },

  async getPastoralNotes(memberId: string): Promise<PastoralNote[]> {
    if (API_MODE === 'mock') {
      // Only m1 has a note on file today — everyone else genuinely has none yet.
      if (memberId !== 'm1') return mockResponse<PastoralNote[]>([]);
      return mockResponse<PastoralNote[]>([
        { id: 'pn1', memberId, content: '<p>Aaron mentioned he\'s going through a difficult time at work. Follow up next week.</p>', authorId: 'u-staff', authorName: 'Pastor Sarah Thompson', isPrivate: true, createdAt: '2024-10-15T10:00:00Z', updatedAt: '2024-10-15T10:00:00Z' },
      ]);
    }
    return apiRequest<PastoralNote[]>(`/members/${memberId}/pastoral-notes`);
  },

  async getSacramentalRecords(memberId: string): Promise<SacramentalRecord[]> {
    if (API_MODE === 'mock') {
      // Only m1 has sacramental history on file today — everyone else genuinely has none yet.
      if (memberId !== 'm1') return mockResponse<SacramentalRecord[]>([]);
      return mockResponse<SacramentalRecord[]>([
        { id: 'sr1', memberId, type: 'Baptism', date: '1990-06-15', officiantName: 'Rev. David Morrison', location: "St. Jude's Cathedral", createdAt: '2019-03-15T00:00:00Z' },
        { id: 'sr2', memberId, type: 'Confirmation', date: '2002-04-20', officiantName: 'Bishop Thomas Eliot', location: "St. Jude's Cathedral", createdAt: '2019-03-15T00:00:00Z' },
      ]);
    }
    return apiRequest<SacramentalRecord[]>(`/members/${memberId}/sacramental-records`);
  },

  async listHouseholds(): Promise<Household[]> {
    if (API_MODE === 'mock') {
      const data = readPeople();
      return mockResponse(data.households.map((h) => householdFromStore(h, data)));
    }
    return apiRequest<Household[]>('/households');
  },

  async getHousehold(householdId: string): Promise<Household | null> {
    if (API_MODE === 'mock') {
      const data = readPeople();
      const record = data.households.find((h) => h.id === householdId);
      return mockResponse(record ? householdFromStore(record, data) : null);
    }
    return apiRequest<Household | null>(`/households/${householdId}`);
  },

  async getNotSeenRecently(): Promise<MemberListItem[]> {
    if (API_MODE === 'mock') {
      const data = readPeople();
      const fourWeeks = 28 * 24 * 60 * 60 * 1000;
      return mockResponse(
        data.members
          .filter((m) => m.lastSeenAt && Date.now() - new Date(m.lastSeenAt).getTime() >= fourWeeks)
          .map((m) => toListItem(m, data)),
      );
    }
    return apiRequest<MemberListItem[]>('/members/not-seen-recently');
  },

  async getVisitorFollowUps(): Promise<VisitorFollowUp[]> {
    if (API_MODE === 'mock') {
      const data = readPeople();
      const day = 24 * 60 * 60 * 1000;
      return mockResponse(
        data.members
          .filter((m) => m.status === 'visitor')
          .map((m): VisitorFollowUp => {
            const known = MOCK_VISITOR_FOLLOWUPS.find((f) => f.memberId === m.id);
            if (known) return { ...known, member: toListItem(m, data) };
            const visitDate = m.joinedAt ?? m.createdAt.slice(0, 10);
            return {
              id: `vf-${m.id}`,
              memberId: m.id,
              member: toListItem(m, data),
              visitDate,
              daysSinceVisit: Math.max(0, Math.floor((Date.now() - new Date(visitDate).getTime()) / day)),
              status: 'pending',
            };
          }),
      );
    }
    return apiRequest<VisitorFollowUp[]>('/members/visitor-followups');
  },

  async quickAddVisitor(data: VisitorQuickAdd): Promise<MemberListItem> {
    if (API_MODE === 'mock') {
      const visitor = await membersService.register({
        firstName: data.firstName,
        lastName: data.lastName,
        phone: data.phone,
        invitedBy: data.invitedBy,
        status: 'visitor',
        joinMethod: 'first_visit',
      });
      return toListItem(visitor, readPeople());
    }
    return apiRequest<MemberListItem>('/members/visitor-quick-add', { method: 'POST', body: JSON.stringify(data) });
  },
};
