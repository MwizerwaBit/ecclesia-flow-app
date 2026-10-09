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

export interface BillingOverview {
  provider: 'demo' | 'stripe';
  publishableKey: string | null;
  orgStatus: OrgLifecycleStatus;
  tier: OrgTier;
  subscription: Subscription | null;
  payments: Payment[];
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
