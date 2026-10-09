/**
 * @file people.ts
 * @description Labels and small derivations shared by the People and Groups screens.
 *
 * Kept in one place so the registration form, the profile and the directory
 * never disagree about what a stored value is called.
 */
import type {
  ContactChannel,
  Gender,
  GroupRole,
  GroupSchedule,
  GroupType,
  HouseholdRole,
  JoinMethod,
  MaritalStatus,
  MemberStatus,
  MeetingFrequency,
  Weekday,
} from '@/types';

export const STATUS_LABELS: Record<MemberStatus, string> = {
  active: 'Member',
  visitor: 'Visitor',
  prospect: 'Prospect',
  inactive: 'Inactive',
};

export const STATUS_BADGE: Record<MemberStatus, 'success' | 'info' | 'warning' | 'neutral'> = {
  active: 'success',
  visitor: 'info',
  prospect: 'warning',
  inactive: 'neutral',
};

export const GENDER_LABELS: Record<Gender, string> = { male: 'Male', female: 'Female' };

export const MARITAL_LABELS: Record<MaritalStatus, string> = {
  single: 'Single',
  married: 'Married',
  widowed: 'Widowed',
  divorced: 'Divorced',
  separated: 'Separated',
};

export const CONTACT_CHANNEL_LABELS: Record<ContactChannel, string> = {
  phone: 'Phone call',
  sms: 'SMS',
  whatsapp: 'WhatsApp',
  email: 'Email',
};

export const JOIN_METHOD_LABELS: Record<JoinMethod, string> = {
  first_visit: 'Visited and stayed',
  transfer: 'Transfer from another church',
  baptism: 'Baptism',
  profession_of_faith: 'Profession of faith',
  born_into: 'Born into the church',
  other: 'Other',
};

export const HOUSEHOLD_ROLE_LABELS: Record<HouseholdRole, string> = {
  head: 'Head of household',
  spouse: 'Spouse',
  child: 'Child',
  relative: 'Relative',
  other: 'Other',
};

export const TITLE_OPTIONS = ['Mr', 'Mrs', 'Ms', 'Miss', 'Dr', 'Rev', 'Pastor', 'Prof'];

export const GROUP_TYPE_LABELS: Record<GroupType, string> = {
  ministry: 'Ministry',
  small_group: 'Small group',
  choir: 'Choir',
  department: 'Department',
  fellowship: 'Fellowship',
  class: 'Class',
  committee: 'Committee',
  team: 'Team',
};

export const GROUP_ROLE_LABELS: Record<GroupRole, string> = {
  leader: 'Leader',
  assistant: 'Assistant',
  member: 'Member',
};

export const FREQUENCY_LABELS: Record<MeetingFrequency, string> = {
  weekly: 'Weekly',
  fortnightly: 'Every two weeks',
  monthly: 'Monthly',
  irregular: 'As arranged',
};

export const WEEKDAY_LABELS: Record<Weekday, string> = {
  monday: 'Monday',
  tuesday: 'Tuesday',
  wednesday: 'Wednesday',
  thursday: 'Thursday',
  friday: 'Friday',
  saturday: 'Saturday',
  sunday: 'Sunday',
};

/**
 * The palette a group colour is picked from. Stored on the group as data (like
 * an org's brand colour), so it is a fixed list rather than a design token.
 */
export const GROUP_COLORS = ['#4f46e5', '#7c3aed', '#db2777', '#dc2626', '#ea580c', '#ca8a04', '#16a34a', '#0d9488', '#0284c7', '#475569'];

/** "Weekly · Thursday 18:30 · Church hall" */
export function formatSchedule(schedule?: GroupSchedule): string | null {
  if (!schedule) return null;
  const parts: string[] = [FREQUENCY_LABELS[schedule.frequency]];
  const when = [schedule.day ? WEEKDAY_LABELS[schedule.day] : null, schedule.time].filter(Boolean).join(' ');
  if (when) parts.push(when);
  if (schedule.location) parts.push(schedule.location);
  return parts.join(' · ');
}

/** Whole years between a date of birth and today, or null when unknown. */
export function ageFrom(dateOfBirth?: string, today = new Date()): number | null {
  if (!dateOfBirth) return null;
  const dob = new Date(dateOfBirth);
  if (Number.isNaN(dob.getTime())) return null;
  let age = today.getFullYear() - dob.getFullYear();
  const beforeBirthday =
    today.getMonth() < dob.getMonth() || (today.getMonth() === dob.getMonth() && today.getDate() < dob.getDate());
  if (beforeBirthday) age -= 1;
  return age;
}

export const ADULT_AGE = 18;

/** Digits only, so "+1 (555) 010-1" and "1555 0101" compare equal. */
export function normalisePhone(phone?: string): string {
  return (phone ?? '').replace(/\D/g, '');
}

export function fullName(person: { firstName: string; lastName: string; preferredName?: string }): string {
  return `${person.preferredName || person.firstName} ${person.lastName}`.trim();
}
