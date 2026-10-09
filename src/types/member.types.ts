/**
 * @file member.types.ts
 * @description Domain types for the People module (Members, Visitors, Households).
 */

export type MemberStatus = 'active' | 'visitor' | 'inactive' | 'prospect';
export type IdType = 'national_id' | 'passport' | 'other';

export type Gender = 'male' | 'female';
export type MaritalStatus = 'single' | 'married' | 'widowed' | 'divorced' | 'separated';
export type ContactChannel = 'phone' | 'sms' | 'whatsapp' | 'email';
/** How someone came into membership — drives which records the church expects to hold for them. */
export type JoinMethod = 'first_visit' | 'transfer' | 'baptism' | 'profession_of_faith' | 'born_into' | 'other';
export type HouseholdRole = 'head' | 'spouse' | 'child' | 'relative' | 'other';

export interface EmergencyContact {
  name: string;
  phone: string;
  relationship?: string;
}

/** Recorded once at registration; a church holding religious-affiliation data needs to show it was given. */
export interface MemberConsent {
  /** ISO timestamp the data-processing consent was recorded. Required to save a new record. */
  dataProcessingAt: string;
  /** Who gave it — the person themselves, or a parent/guardian for a minor. */
  givenBy: 'self' | 'guardian';
  /** Opt-in to announcements and bulk messages. Off unless they said yes. */
  communications: boolean;
  /** Whether fellow members can find them in the portal directory. */
  directoryVisible: boolean;
}

/** The light group reference carried on directory rows. */
export interface MemberGroupRef {
  id: string;
  name: string;
  color?: string;
  role: GroupRole;
}

/** A group role key. The three built-ins always exist; churches add their own. */
export type GroupRole = 'leader' | 'assistant' | 'member' | (string & {});

export interface Member {
  id: string;
  tenantId: string;

  /** Set only when this congregant also has a portal login — see docs/database-design.md members.user_id. */
  userId?: string;

  // Identity
  firstName: string;
  lastName: string;
  preferredName?: string;
  photoUrl?: string;
  initials: string; // Computed: "JS" from "John Smith"

  // Contact
  email?: string;
  phone?: string;
  whatsapp?: string;

  // Church
  status: MemberStatus;
  envelopeNumber?: string;
  unitId?: string;
  unitName?: string;
  joinedAt?: string; // ISO date
  lastSeenAt?: string; // ISO date

  // Household
  householdId?: string;

  // Metadata
  createdAt: string;
  updatedAt: string;
}

export interface MemberListItem {
  id: string;
  firstName: string;
  lastName: string;
  preferredName?: string;
  photoUrl?: string;
  initials: string;
  status: MemberStatus;
  unitName?: string;
  envelopeNumber?: string;
  lastSeenAt?: string;
  // Carried on the list row so the directory can offer Call / WhatsApp / Email
  // without fetching each member's full record.
  email?: string;
  phone?: string;
  whatsapp?: string;
  unitId?: string;
  gender?: Gender;
  joinedAt?: string;
  householdId?: string;
  /** Ministries and small groups this person belongs to. */
  groups?: MemberGroupRef[];
}

export interface MemberDetail extends Member {
  // Extended fields for full profile view
  title?: string; // Mr, Mrs, Dr, Rev…
  middleName?: string;
  dateOfBirth?: string;
  gender?: Gender;
  maritalStatus?: MaritalStatus;
  occupation?: string;
  employer?: string;
  preferredContact?: ContactChannel;
  // Church journey
  joinMethod?: JoinMethod;
  previousChurch?: string;
  invitedBy?: string;
  isBaptised?: boolean;
  baptismDate?: string;
  // Family
  householdRole?: HouseholdRole;
  emergencyContact?: EmergencyContact;
  consent?: MemberConsent;
  /** Anything the registrar wants on file that has no field of its own. */
  notes?: string;
  groups?: MemberGroupRef[];
  idType?: IdType;
  /** Only the last four characters are ever returned by the API. */
  nationalIdLast4?: string;
  /** Write-only: sent when registering or correcting, never read back. */
  nationalId?: string;
  address?: {
    line1: string;
    line2?: string;
    city: string;
    state?: string;
    country: string;
    postalCode?: string;
  };
  // Computed metrics
  attendanceRate?: number; // 0-1
  totalGiving?: number;
  givingThisYear?: number;
  // Household
  household?: Household;
}

/** Where a newly registered person lives, relative to the households already on file. */
export type HouseholdChoice =
  | { mode: 'none' }
  | { mode: 'new'; name: string }
  | { mode: 'existing'; householdId: string };

/** Everything the registration wizard submits in one go. */
export interface MemberRegistration extends Omit<Partial<MemberDetail>, 'household'> {
  firstName: string;
  lastName: string;
  household?: HouseholdChoice;
  /** Groups to join on creation, each as an ordinary member. */
  groupIds?: string[];
}

/** An existing record that looks like the person being registered. */
export interface PossibleDuplicate {
  member: MemberListItem;
  /** What matched: same name, same phone, same email. */
  reasons: Array<'name' | 'phone' | 'email'>;
}

export interface PastoralNote {
  id: string;
  memberId: string;
  content: string;
  authorId: string;
  authorName: string;
  isPrivate: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface SacramentalRecord {
  id: string;
  memberId: string;
  type: string; // Baptism, Confirmation, Marriage, etc.
  date: string;
  officiantName?: string;
  location?: string;
  notes?: string;
  createdAt: string;
}

export interface Household {
  id: string;
  tenantId: string;
  name: string; // e.g. "The Smith Family"
  headMemberId?: string;
  address?: {
    line1: string;
    line2?: string;
    city: string;
    state?: string;
    country: string;
    postalCode?: string;
  };
  members: MemberListItem[];
  totalGiving?: number;
  createdAt: string;
}

export interface VisitorQuickAdd {
  firstName: string;
  lastName: string;
  phone?: string;
  invitedBy?: string;
}

export interface VisitorFollowUp {
  id: string;
  memberId: string;
  member: MemberListItem;
  daysSinceVisit: number;
  visitDate: string;
  assignedToId?: string;
  assignedToName?: string;
  status: 'pending' | 'resolved';
  notes?: string;
}

export interface MemberSearchResult {
  unitName: string;
  members: MemberListItem[];
}

export interface MemberCsvExportConfig {
  fields: string[];
  filterStatus?: MemberStatus[];
  filterUnitId?: string;
}
