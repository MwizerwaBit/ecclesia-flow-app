/**
 * @file registration.ts
 * @description The member registration form's state, rules and payload mapping.
 *
 * Kept apart from the screen so the rules — what is required, what is merely
 * nice to have — are readable in one place:
 *
 *   Required to register anyone: first name, last name, gender, at least one
 *   way to reach them (phone or email), their membership status, and recorded
 *   consent to hold their data. Church membership reveals religious belief,
 *   which data-protection law (GDPR art. 9 and its equivalents) treats as
 *   special-category data — so consent is a hard requirement, not a tickbox
 *   that can be skipped. For under-18s it is recorded as given by a guardian.
 *
 *   Everything else is optional and can be skipped or filled in later.
 */
import type {
  ContactChannel,
  Gender,
  HouseholdRole,
  JoinMethod,
  MaritalStatus,
  MemberDetail,
  MemberRegistration,
  MemberStatus,
} from '@/types';
import { ADULT_AGE, ageFrom, normalisePhone } from '@/lib/people';

export type StepId = 'identity' | 'contact' | 'church' | 'family' | 'review';

export interface StepDef {
  id: StepId;
  title: string;
  /** Shown under the title in the step rail. */
  summary: string;
  /** Optional steps can be skipped outright. */
  optional: boolean;
}

export const STEPS: StepDef[] = [
  { id: 'identity', title: 'Identity', summary: 'Name, gender, birthday', optional: false },
  { id: 'contact', title: 'Contact', summary: 'Phone, email, address', optional: false },
  { id: 'church', title: 'Church life', summary: 'Status, unit, groups', optional: false },
  { id: 'family', title: 'Family', summary: 'Household, emergency contact', optional: true },
  { id: 'review', title: 'Review & consent', summary: 'Check and confirm', optional: false },
];

export interface FormState {
  // Identity
  photoUrl: string;
  title: string;
  firstName: string;
  middleName: string;
  lastName: string;
  preferredName: string;
  gender: Gender | '';
  dateOfBirth: string;
  maritalStatus: MaritalStatus | '';
  occupation: string;
  employer: string;
  // Contact
  phone: string;
  whatsappSameAsPhone: boolean;
  whatsapp: string;
  email: string;
  preferredContact: ContactChannel | '';
  addressLine1: string;
  addressLine2: string;
  city: string;
  state: string;
  postalCode: string;
  country: string;
  // Church
  status: MemberStatus;
  unitId: string;
  joinedAt: string;
  joinMethod: JoinMethod | '';
  previousChurch: string;
  invitedBy: string;
  isBaptised: '' | 'yes' | 'no';
  baptismDate: string;
  envelopeNumber: string;
  groupIds: string[];
  // Family
  householdMode: 'none' | 'new' | 'existing';
  householdName: string;
  householdId: string;
  householdRole: HouseholdRole | '';
  emergencyName: string;
  emergencyPhone: string;
  emergencyRelationship: string;
  // Consent
  consentData: boolean;
  consentCommunications: boolean;
  directoryVisible: boolean;
  confirmedNotDuplicate: boolean;
  notes: string;
}

export function emptyForm(): FormState {
  return {
    photoUrl: '',
    title: '',
    firstName: '',
    middleName: '',
    lastName: '',
    preferredName: '',
    gender: '',
    dateOfBirth: '',
    maritalStatus: '',
    occupation: '',
    employer: '',
    phone: '',
    whatsappSameAsPhone: true,
    whatsapp: '',
    email: '',
    preferredContact: '',
    addressLine1: '',
    addressLine2: '',
    city: '',
    state: '',
    postalCode: '',
    country: '',
    status: 'active',
    unitId: '',
    joinedAt: new Date().toISOString().slice(0, 10),
    joinMethod: '',
    previousChurch: '',
    invitedBy: '',
    isBaptised: '',
    baptismDate: '',
    envelopeNumber: '',
    groupIds: [],
    householdMode: 'none',
    householdName: '',
    householdId: '',
    householdRole: '',
    emergencyName: '',
    emergencyPhone: '',
    emergencyRelationship: '',
    consentData: false,
    consentCommunications: false,
    directoryVisible: true,
    confirmedNotDuplicate: false,
    notes: '',
  };
}

/** An existing record, laid out for editing. */
export function formFromMember(member: MemberDetail): FormState {
  const base = emptyForm();
  return {
    ...base,
    photoUrl: member.photoUrl ?? '',
    title: member.title ?? '',
    firstName: member.firstName,
    middleName: member.middleName ?? '',
    lastName: member.lastName,
    preferredName: member.preferredName ?? '',
    gender: member.gender ?? '',
    dateOfBirth: member.dateOfBirth ?? '',
    maritalStatus: member.maritalStatus ?? '',
    occupation: member.occupation ?? '',
    employer: member.employer ?? '',
    phone: member.phone ?? '',
    whatsappSameAsPhone: !member.whatsapp || member.whatsapp === member.phone,
    whatsapp: member.whatsapp ?? '',
    email: member.email ?? '',
    preferredContact: member.preferredContact ?? '',
    addressLine1: member.address?.line1 ?? '',
    addressLine2: member.address?.line2 ?? '',
    city: member.address?.city ?? '',
    state: member.address?.state ?? '',
    postalCode: member.address?.postalCode ?? '',
    country: member.address?.country ?? '',
    status: member.status,
    unitId: member.unitId ?? '',
    joinedAt: member.joinedAt ?? '',
    joinMethod: member.joinMethod ?? '',
    previousChurch: member.previousChurch ?? '',
    invitedBy: member.invitedBy ?? '',
    isBaptised: member.isBaptised === undefined ? '' : member.isBaptised ? 'yes' : 'no',
    baptismDate: member.baptismDate ?? '',
    envelopeNumber: member.envelopeNumber ?? '',
    householdMode: member.householdId ? 'existing' : 'none',
    householdId: member.householdId ?? '',
    householdRole: member.householdRole ?? '',
    emergencyName: member.emergencyContact?.name ?? '',
    emergencyPhone: member.emergencyContact?.phone ?? '',
    emergencyRelationship: member.emergencyContact?.relationship ?? '',
    consentData: Boolean(member.consent),
    consentCommunications: member.consent?.communications ?? false,
    directoryVisible: member.consent?.directoryVisible ?? true,
    confirmedNotDuplicate: true,
    notes: member.notes ?? '',
  };
}

export type Errors = Partial<Record<keyof FormState, string>>;

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

function isFuture(date: string): boolean {
  return Boolean(date) && date > new Date().toISOString().slice(0, 10);
}

export function isMinor(form: FormState): boolean {
  const age = ageFrom(form.dateOfBirth);
  return age !== null && age < ADULT_AGE;
}

/** What is wrong with one step, keyed by field. Empty means the step is complete. */
export function validateStep(step: StepId, form: FormState, ctx: { takenEnvelopes: Set<string>; hasDuplicates: boolean; isEditing: boolean }): Errors {
  const errors: Errors = {};

  if (step === 'identity') {
    if (!form.firstName.trim()) errors.firstName = 'First name is required.';
    if (!form.lastName.trim()) errors.lastName = 'Last name is required.';
    if (!form.gender) errors.gender = 'Choose a gender.';
    if (form.dateOfBirth && isFuture(form.dateOfBirth)) errors.dateOfBirth = 'Date of birth can’t be in the future.';
    const age = ageFrom(form.dateOfBirth);
    if (age !== null && age > 120) errors.dateOfBirth = 'That date of birth looks wrong.';
  }

  if (step === 'contact') {
    const phoneDigits = normalisePhone(form.phone);
    if (!form.phone.trim() && !form.email.trim()) {
      errors.phone = 'Add a phone number or an email — at least one way to reach them.';
    }
    if (form.phone.trim() && (phoneDigits.length < 7 || phoneDigits.length > 15)) {
      errors.phone = 'Enter a full phone number, including the area or country code.';
    }
    if (!form.whatsappSameAsPhone && form.whatsapp.trim() && normalisePhone(form.whatsapp).length < 7) {
      errors.whatsapp = 'Enter a full WhatsApp number.';
    }
    if (form.email.trim() && !EMAIL_RE.test(form.email.trim())) errors.email = 'That email address doesn’t look right.';
    const addressStarted = [form.addressLine2, form.city, form.state, form.postalCode].some((v) => v.trim());
    if (addressStarted && !form.addressLine1.trim()) errors.addressLine1 = 'Add the street address, or clear the rest.';
    if (form.addressLine1.trim() && !form.city.trim()) errors.city = 'Add the town or city.';
  }

  if (step === 'church') {
    if (!form.status) errors.status = 'Choose a membership status.';
    if (form.joinedAt && isFuture(form.joinedAt)) errors.joinedAt = 'Join date can’t be in the future.';
    if (form.isBaptised === 'yes' && form.baptismDate) {
      if (isFuture(form.baptismDate)) errors.baptismDate = 'Baptism date can’t be in the future.';
      else if (form.dateOfBirth && form.baptismDate < form.dateOfBirth) errors.baptismDate = 'Baptism date is before their date of birth.';
    }
    const envelope = form.envelopeNumber.trim();
    if (envelope && !/^\d{1,8}$/.test(envelope)) errors.envelopeNumber = 'Envelope numbers are digits only.';
    else if (envelope && ctx.takenEnvelopes.has(envelope)) errors.envelopeNumber = `Envelope #${envelope} already belongs to someone else.`;
  }

  if (step === 'family') {
    if (form.householdMode === 'new' && !form.householdName.trim()) errors.householdName = 'Name the household.';
    if (form.householdMode === 'existing' && !form.householdId) errors.householdId = 'Choose a household.';
    if (form.householdMode !== 'none' && !form.householdRole) errors.householdRole = 'Choose their place in the household.';
    const emergencyStarted = form.emergencyName.trim() || form.emergencyPhone.trim() || form.emergencyRelationship.trim();
    if (emergencyStarted && !form.emergencyName.trim()) errors.emergencyName = 'Add the emergency contact’s name.';
    if (emergencyStarted && normalisePhone(form.emergencyPhone).length < 7) errors.emergencyPhone = 'Add a full phone number for the emergency contact.';
  }

  if (step === 'review') {
    // Older records predate consent capture; editing one shouldn't be blocked
    // on it, so the profile flags the gap instead.
    if (!form.consentData && !ctx.isEditing) {
      errors.consentData = isMinor(form)
        ? 'A parent or guardian’s consent must be recorded before saving.'
        : 'Consent must be recorded before saving.';
    }
    if (ctx.hasDuplicates && !form.confirmedNotDuplicate) {
      errors.confirmedNotDuplicate = 'Confirm this is a different person, or open the existing record instead.';
    }
  }

  return errors;
}

function opt(value: string): string | undefined {
  const trimmed = value.trim();
  return trimmed ? trimmed : undefined;
}

/** The form, as the record the service stores. */
export function toPayload(form: FormState, opts: { isEditing: boolean; existingConsentAt?: string }): MemberRegistration {
  const phone = opt(form.phone);
  const hasAddress = Boolean(form.addressLine1.trim());
  const household: MemberRegistration['household'] =
    form.householdMode === 'new'
      ? { mode: 'new', name: form.householdName.trim() }
      : form.householdMode === 'existing'
        ? { mode: 'existing', householdId: form.householdId }
        : { mode: 'none' };

  return {
    photoUrl: opt(form.photoUrl),
    title: opt(form.title),
    firstName: form.firstName.trim(),
    middleName: opt(form.middleName),
    lastName: form.lastName.trim(),
    preferredName: opt(form.preferredName),
    gender: form.gender || undefined,
    dateOfBirth: opt(form.dateOfBirth),
    maritalStatus: form.maritalStatus || undefined,
    occupation: opt(form.occupation),
    employer: opt(form.employer),
    phone,
    whatsapp: form.whatsappSameAsPhone ? phone : opt(form.whatsapp),
    email: opt(form.email)?.toLowerCase(),
    preferredContact: form.preferredContact || undefined,
    address: hasAddress
      ? {
          line1: form.addressLine1.trim(),
          line2: opt(form.addressLine2),
          city: form.city.trim(),
          state: opt(form.state),
          postalCode: opt(form.postalCode),
          country: form.country.trim(),
        }
      : undefined,
    status: form.status,
    unitId: opt(form.unitId),
    joinedAt: opt(form.joinedAt),
    joinMethod: form.joinMethod || undefined,
    previousChurch: form.joinMethod === 'transfer' ? opt(form.previousChurch) : undefined,
    invitedBy: opt(form.invitedBy),
    isBaptised: form.isBaptised === '' ? undefined : form.isBaptised === 'yes',
    baptismDate: form.isBaptised === 'yes' ? opt(form.baptismDate) : undefined,
    envelopeNumber: opt(form.envelopeNumber),
    householdRole: form.householdMode === 'none' ? undefined : form.householdRole || undefined,
    household,
    emergencyContact: form.emergencyName.trim()
      ? { name: form.emergencyName.trim(), phone: form.emergencyPhone.trim(), relationship: opt(form.emergencyRelationship) }
      : undefined,
    consent: form.consentData
      ? {
          dataProcessingAt: opts.existingConsentAt ?? new Date().toISOString(),
          givenBy: isMinor(form) ? 'guardian' : 'self',
          communications: form.consentCommunications,
          directoryVisible: form.directoryVisible,
        }
      : undefined,
    notes: opt(form.notes),
    groupIds: opts.isEditing ? undefined : form.groupIds,
  };
}

/** How much of the optional detail has been captured — shown as a gentle nudge, never a gate. */
export function completeness(form: FormState): number {
  const fields: Array<boolean> = [
    Boolean(form.firstName && form.lastName),
    Boolean(form.gender),
    Boolean(form.dateOfBirth),
    Boolean(form.maritalStatus),
    Boolean(form.phone),
    Boolean(form.email),
    Boolean(form.addressLine1),
    Boolean(form.unitId),
    Boolean(form.joinMethod),
    Boolean(form.isBaptised),
    Boolean(form.envelopeNumber),
    form.groupIds.length > 0 || form.householdMode !== 'none',
    Boolean(form.emergencyName),
    Boolean(form.photoUrl),
  ];
  return fields.filter(Boolean).length / fields.length;
}
