/**
 * @file onboardingDrafts.ts
 * @description Holds the optional "first member" and "first event" from the
 * onboarding wizard while a new church pays.
 *
 * A church is pending until its payment clears, and the API refuses business
 * data (members, events) for a pending church. The wizard keeps what the person
 * typed here, and saves it once the church is active. sessionStorage, so it
 * survives the round trip to the payment page but not the browser session.
 */
const KEY = 'ecclesiaflow-onboarding-drafts';

export interface OnboardingDrafts {
  memberName: string;
  memberEmail: string;
  eventName: string;
  eventDate: string;
}

export function saveDrafts(drafts: OnboardingDrafts): void {
  try {
    sessionStorage.setItem(KEY, JSON.stringify(drafts));
  } catch {
    /* private mode: the person can add them after activation */
  }
}

/** Returns the saved drafts and forgets them, so they are only ever applied once. */
export function takeDrafts(): OnboardingDrafts | null {
  try {
    const raw = sessionStorage.getItem(KEY);
    sessionStorage.removeItem(KEY);
    return raw ? (JSON.parse(raw) as OnboardingDrafts) : null;
  } catch {
    return null;
  }
}
