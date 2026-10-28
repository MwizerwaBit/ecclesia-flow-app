/**
 * @file useGuideStore.ts
 * @description Remembers which page guides a person has already seen, and lets
 * the account menu ask for the current page's guide again.
 *
 * "Seen" lives in this browser only (localStorage, per user), so a guide may
 * come back on a new device. That is a better failure than never showing one.
 * Every storage call is guarded: private windows and blocked storage throw.
 */
import { create } from 'zustand';

const key = (userId: string) => `ef.guides.seen.${userId}`;

function read(userId: string): string[] {
  try {
    const raw = localStorage.getItem(key(userId));
    const parsed: unknown = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? parsed.filter((v): v is string => typeof v === 'string') : [];
  } catch {
    return [];
  }
}

// When storage is unavailable, remember for this tab so a guide is not shown
// on every navigation.
const session = new Set<string>();

export function hasSeenGuide(userId: string, guideId: string): boolean {
  return session.has(`${userId}:${guideId}`) || read(userId).includes(guideId);
}

export function markGuideSeen(userId: string, guideId: string): void {
  session.add(`${userId}:${guideId}`);
  try {
    const seen = read(userId);
    if (!seen.includes(guideId)) localStorage.setItem(key(userId), JSON.stringify([...seen, guideId]));
  } catch {
    /* kept in memory above */
  }
}

interface GuideState {
  /** Bumped by the account menu; the guide on screen reopens when it changes. */
  replayRequest: number;
  replay: () => void;
}

export const useGuideStore = create<GuideState>((set) => ({
  replayRequest: 0,
  replay: () => set((s) => ({ replayRequest: s.replayRequest + 1 })),
}));
