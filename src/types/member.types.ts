/**
 * @file member.types.ts
 * @description Domain types for the People module (Members, Visitors, Households).
 */

export type MemberStatus = 'active' | 'visitor' | 'inactive' | 'prospect';

export interface Member {
  id: string;
  tenantId: string;

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
}

export interface MemberDetail extends Member {
  // Extended fields for full profile view
  dateOfBirth?: string;
  gender?: string;
  maritalStatus?: string;
  occupation?: string;
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
