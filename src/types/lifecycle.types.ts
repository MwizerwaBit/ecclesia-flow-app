/**
 * @file lifecycle.types.ts
 * @description A church's life on the platform: profile, onboarding, official
 * documents, plans and billing. Mirrors the API's org/ and billing/ modules.
 */
import type { OrgTier } from './org.types';

export type OrgLifecycleStatus = 'pending' | 'trial' | 'active' | 'suspended' | 'canceled';
export type VerificationStatus = 'unverified' | 'pending_review' | 'verified' | 'rejected';
export type BillingInterval = 'month' | 'year';

export interface OrgProfile {
  id: string;
  legalName: string;
  displayName: string;
  slug: string;
  country: string;
  currency: string;
  timezone: string;
  status: OrgLifecycleStatus;
  tier: OrgTier;
  verificationStatus: VerificationStatus;
  registrationNumber: string | null;
  denomination: string | null;
  contactEmail: string | null;
  contactPhone: string | null;
  addressLine1: string | null;
  city: string | null;
  region: string | null;
  website: string | null;
  logoUrl: string | null;
  primaryColor: string | null;
  activatedAt: string | null;
  activationSource: 'payment' | 'platform_admin' | null;
  createdAt: string;
}

export type OrgProfileUpdate = Partial<
  Pick<
    OrgProfile,
    | 'legalName'
    | 'displayName'
    | 'registrationNumber'
    | 'denomination'
    | 'contactEmail'
    | 'contactPhone'
    | 'addressLine1'
    | 'city'
    | 'region'
    | 'website'
    | 'primaryColor'
  >
>;

export type OnboardingStepKey = 'church_profile' | 'leader' | 'administrator' | 'branches' | 'certificate' | 'payment';

export interface OnboardingStep {
  key: OnboardingStepKey;
  title: string;
  required: boolean;
  state: 'done' | 'pending' | 'todo';
  detail: string;
}

export interface OnboardingStatus {
  orgStatus: OrgLifecycleStatus;
  verificationStatus: VerificationStatus;
  activationSource: 'payment' | 'platform_admin' | null;
  isActive: boolean;
  steps: OnboardingStep[];
  nextAction: string | null;
}

export interface OrgDocument {
  id: string;
  kind: 'government_certificate';
  fileName: string;
  mimeType: string;
  sizeBytes: number;
  sha256: string;
  status: 'pending_review' | 'verified' | 'rejected' | 'superseded';
  uploadedAt: string;
  uploadedByName: string | null;
  reviewedAt: string | null;
  reviewNote: string | null;
}

export interface PersonInChargeInvite {
  role: 'leader' | 'administrator';
  email: string;
  firstName: string;
  lastName?: string;
}

export interface Plan {
  tier: OrgTier;
  name: string;
  tagline: string;
  monthlyCents: number | null;
  yearlyCents: number | null;
  maxMembers: number | null;
  modules: string[];
  purchasable: boolean;
  currency: string;
}

export interface CheckoutSession {
  provider: 'demo' | 'stripe';
  sessionId: string;
  checkoutUrl: string;
}

export interface Subscription {
  provider: string;
  tier: OrgTier;
  interval: BillingInterval;
  status: 'incomplete' | 'active' | 'past_due' | 'canceled';
  currentPeriodEnd: string | null;
}

export interface Payment {
  id: string;
  amountCents: number;
  currency: string;
  status: string;
  description: string | null;
  paidAt: string | null;
}

/**
 * What a church may do right now, worked out by the API from dates:
 * full (paid), basics (free modules only, inside the grace days), view_only
 * (nothing can be changed), or stopped by the platform.
 */
export interface Access {
  state: 'full' | 'basics' | 'view_only' | 'suspended' | 'closed';
  tier: OrgTier | 'free';
  canWrite: boolean;
  periodEnd: string | null;
  graceEndsAt: string | null;
  daysLeft: number | null;
  renewalDue: boolean;
  /** A payment was reported and is waiting for approval. */
  paymentPending: boolean;
}

export type ManualPaymentStatus = 'pending' | 'approved' | 'rejected';

/** A mobile-money payment a church has reported, waiting for (or past) approval. */
export interface ManualPayment {
  id: string;
  tier: OrgTier;
  months: number;
  amountCents: number;
  currency: string;
  referenceCode: string;
  senderName: string;
  sentAmountCents: number;
  momoTransactionId: string | null;
  status: ManualPaymentStatus;
  submittedAt: string;
  decidedAt: string | null;
  decisionNote: string | null;
  grantedUntil: string | null;
}

/** The platform admin's view of the same payment. */
export interface ManualPaymentAdmin extends ManualPayment {
  tenantId: string;
  churchName: string;
  churchEmail: string | null;
  proofMimeType: string;
  amountMatches: boolean;
  wouldGrantUntil: string | null;
  currentPeriodEnd: string | null;
}

export interface PaymentInstructions {
  network: string;
  number: string;
  accountName: string;
  tier: OrgTier;
  planName: string;
  months: number;
  amountCents: number;
  currency: string;
  /** The price in each currency this church may pay in; the first is the default. */
  options: { currency: string; amountCents: number }[];
}

export interface BillingOverview {
  provider: 'demo' | 'stripe' | 'manual';
  publishableKey: string | null;
  orgStatus: OrgLifecycleStatus;
  tier: OrgTier;
  subscription: Subscription | null;
  payments: Payment[];
  access: Access | null;
  pendingPayment: ManualPayment | null;
  lastPayment: ManualPayment | null;
}

export interface DemoCheckout {
  sessionId: string;
  churchName: string;
  planName: string;
  interval: BillingInterval;
  amountCents: number;
  currency: string;
  status: 'open' | 'completed' | 'expired';
}

/** A platform-console row: everything needed to review a church at a glance. */
export interface OrgReviewRow {
  id: string;
  displayName: string;
  slug: string;
  country: string;
  city: string | null;
  contactEmail: string | null;
  tier: OrgTier;
  status: OrgLifecycleStatus;
  verificationStatus: VerificationStatus;
  activationSource: 'payment' | 'platform_admin' | null;
  activatedAt: string | null;
  documentsPending: number;
  subscriptionStatus: Subscription['status'] | null;
  memberCount: number;
  createdAt: string;
  lastActiveAt: string | null;
  inviteUrl?: string | null;
}
