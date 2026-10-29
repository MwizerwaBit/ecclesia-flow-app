// @vitest-environment jsdom
import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import type { EventListItem } from '@/types';
import { EventCard } from './EventCard';

const base: EventListItem = {
  id: 'e1',
  title: 'Night Vigil',
  type: 'prayer',
  // 23:30 UTC on Mar 1 is already Mar 2, 01:30 in Kigali (UTC+2).
  startDateTime: '2026-03-01T23:30:00Z',
  status: 'published',
  isPublic: true,
};

function renderCard(event: Partial<EventListItem>, props: { timeZone?: string } = {}) {
  return render(
    <QueryClientProvider client={new QueryClient()}>
      <MemoryRouter>
        <EventCard event={{ ...base, ...event }} href="/x" typeLabel="Prayer" timeZone="Africa/Kigali" {...props} />
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

describe('EventCard', () => {
  it('shows the church day and time, not the browser one', () => {
    renderCard({});
    expect(screen.getByText('Mar')).toBeTruthy();
    expect(screen.getByText('2')).toBeTruthy();
    expect(screen.getByText('1:30 AM')).toBeTruthy();
  });

  it('shows All day for all-day events', () => {
    renderCard({ isAllDay: true });
    expect(screen.getByText('All day')).toBeTruthy();
  });

  it('leads with the next occurrence of a repeating event', () => {
    renderCard({ isRecurring: true, recurrenceRule: 'FREQ=WEEKLY;BYDAY=SU', nextOccurrence: '2026-03-08T07:00:00Z' });
    expect(screen.getByText('8')).toBeTruthy();
    expect(screen.getByText('9:00 AM')).toBeTruthy();
    expect(screen.getByText('Every Sunday')).toBeTruthy();
  });

  it('shows status and who can see it, with a published event left unmarked', () => {
    const waiting = renderCard({ status: 'pending_review', visibility: 'private' });
    expect(screen.getByText('Waiting for review')).toBeTruthy();
    expect(screen.getByText('Group only')).toBeTruthy();
    waiting.unmount();

    renderCard({ status: 'published', visibility: 'members' });
    expect(screen.queryByText('Published')).toBeNull();
    expect(screen.getByText('Members')).toBeTruthy();
  });
});
