/**
 * @file applyDrafts.ts
 * @description Saves the wizard's optional first member and first event.
 * Shared by the wizard (church already active) and the return from payment.
 */
import { membersService } from '@/services/membersService';
import { eventsService } from '@/services/eventsService';
import type { OnboardingDrafts } from '@/lib/onboardingDrafts';

export async function applyDrafts(drafts: OnboardingDrafts): Promise<void> {
  if (drafts.memberName.trim()) {
    const [firstName, ...rest] = drafts.memberName.trim().split(' ');
    await membersService.create({
      firstName,
      lastName: rest.join(' ') || '—',
      email: drafts.memberEmail.trim() || undefined,
      status: 'active',
    });
  }
  if (drafts.eventName.trim() && drafts.eventDate) {
    await eventsService.create({
      title: drafts.eventName.trim(),
      type: 'service',
      startDateTime: drafts.eventDate,
      attendanceMode: 'individual',
      isPublic: true,
      status: 'published',
    });
  }
}
