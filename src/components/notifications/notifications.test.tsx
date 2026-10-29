// @vitest-environment jsdom
/**
 * The notification screens, with the data hooks replaced so each test says exactly what the
 * server "returned" and checks what a person would see and be able to do.
 */
import '@testing-library/jest-dom/vitest';
import { cleanup, render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, useLocation } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { Notification } from '@/types';

const h = vi.hoisted(() => {
  const mutate = () => vi.fn();
  return {
    access: true,
    isMember: false,
    unread: 0,
    recent: { data: { items: [] as unknown[], total: 0 }, isLoading: false, isError: false, refetch: () => {} },
    feed: {
      data: undefined as unknown,
      isLoading: false,
      isError: false,
      hasNextPage: false,
      isFetchingNextPage: false,
      fetchNextPage: () => {},
      refetch: () => {},
    },
    feedStatus: [] as string[],
    setRead: { mutate: mutate(), isPending: false, isError: false, variables: undefined as unknown },
    markAll: { mutate: mutate(), isPending: false },
    prefs: {
      data: undefined as unknown,
      isLoading: false,
      isError: false,
      refetch: () => {},
    },
    update: { mutate: mutate(), isPending: false, isError: false, error: null as unknown },
  };
});

vi.mock('@/hooks/useNotifications', () => ({
  useNotificationAccess: () => h.access,
  useUnreadCount: () => ({ data: h.unread }),
  useRecentNotifications: () => h.recent,
  useNotificationFeed: (status: string) => {
    h.feedStatus.push(status);
    return h.feed;
  },
  flattenFeed: (data: { pages: Array<{ items: unknown[] }> } | undefined) => data?.pages.flatMap((p) => p.items) ?? [],
  useSetRead: () => h.setRead,
  useMarkAllRead: () => h.markAll,
  usePreferences: () => h.prefs,
  useUpdatePreferences: () => h.update,
}));
vi.mock('@/hooks/useRole', () => ({ useRole: () => ({ isMember: h.isMember }) }));

import { NotificationBell } from './NotificationBell';
import { NotificationItem } from './NotificationItem';
import { NotificationPreferencesView } from './NotificationPreferencesView';
import { NotificationsInbox } from './NotificationsInbox';

function note(over: Partial<Notification> = {}): Notification {
  return {
    id: 'n1',
    userId: 'u1',
    type: 'event',
    title: 'Gathering published',
    body: 'Prayer night was published.',
    isRead: false,
    actionUrl: '/staff/events/e1',
    createdAt: new Date().toISOString(),
    ...over,
  };
}

function Where() {
  return <div data-testid="where">{useLocation().pathname}</div>;
}

function renderAt(path: string, ui: React.ReactNode) {
  return render(
    <MemoryRouter initialEntries={[path]}>
      {ui}
      <Where />
    </MemoryRouter>,
  );
}

beforeEach(() => {
  h.access = true;
  h.isMember = false;
  h.unread = 0;
  h.recent = { data: { items: [], total: 0 }, isLoading: false, isError: false, refetch: () => {} };
  h.feed = { ...h.feed, data: undefined, isLoading: false, isError: false, hasNextPage: false };
  h.feedStatus = [];
  h.setRead = { mutate: vi.fn(), isPending: false, isError: false, variables: undefined };
  h.markAll = { mutate: vi.fn(), isPending: false };
  h.prefs = { data: undefined, isLoading: false, isError: false, refetch: () => {} };
  h.update = { mutate: vi.fn(), isPending: false, isError: false, error: null };
});
afterEach(cleanup);

describe('NotificationBell', () => {
  it('says how many are unread, to the eye and to a screen reader', () => {
    h.unread = 3;
    renderAt('/staff/dashboard', <NotificationBell />);
    const bell = screen.getByRole('button', { name: 'Notifications, 3 unread' });
    expect(within(bell).getByText('3')).toBeInTheDocument();
  });

  it('shows 9+ for many, and no number for none', () => {
    h.unread = 25;
    const { unmount } = renderAt('/staff/dashboard', <NotificationBell />);
    expect(screen.getByText('9+')).toBeInTheDocument();
    unmount();
    h.unread = 0;
    renderAt('/staff/dashboard', <NotificationBell />);
    expect(screen.getByRole('button', { name: 'Notifications' })).toBeInTheDocument();
    expect(screen.queryByText('9+')).toBeNull();
  });

  it('is absent for someone with no notifications to show', () => {
    h.access = false;
    renderAt('/staff/dashboard', <NotificationBell />);
    expect(screen.queryByRole('button', { name: /notifications/i })).toBeNull();
  });

  it('opens the latest, marks one read and goes to what it points at', async () => {
    h.unread = 1;
    h.recent = {
      data: {
        items: [note({ id: 'a', title: 'Prayer night published' }), note({ id: 'b', title: 'Old news', isRead: true })],
        total: 2,
      },
      isLoading: false,
      isError: false,
      refetch: () => {},
    };
    const user = userEvent.setup();
    renderAt('/staff/dashboard', <NotificationBell />);

    await user.click(screen.getByRole('button', { name: 'Notifications, 1 unread' }));
    const panel = screen.getByRole('dialog', { name: 'Notifications' });
    expect(within(panel).getByText('Old news')).toBeInTheDocument();
    expect(within(panel).getByRole('link', { name: 'View all' })).toHaveAttribute('href', '/staff/notifications');

    await user.click(within(panel).getByRole('button', { name: /Prayer night published/ }));
    expect(h.setRead.mutate).toHaveBeenCalledWith({ id: 'a', isRead: true });
    expect(screen.getByTestId('where')).toHaveTextContent('/staff/events/e1');
    expect(screen.queryByRole('dialog')).toBeNull(); // it closes once you've gone
  });

  it('does not re-mark one that is already read, and falls back to the inbox when nothing is linked', async () => {
    h.recent = {
      data: { items: [note({ id: 'b', title: 'Plain notice', isRead: true, actionUrl: null })], total: 1 },
      isLoading: false,
      isError: false,
      refetch: () => {},
    };
    const user = userEvent.setup();
    renderAt('/staff/dashboard', <NotificationBell />);
    await user.click(screen.getByRole('button', { name: 'Notifications' }));
    await user.click(screen.getByRole('button', { name: /Plain notice/ }));
    expect(h.setRead.mutate).not.toHaveBeenCalled();
    expect(screen.getByTestId('where')).toHaveTextContent('/staff/notifications');
  });

  it('marks everything read, but only when there is something unread', async () => {
    const user = userEvent.setup();
    h.unread = 2;
    const { unmount } = renderAt('/staff/dashboard', <NotificationBell />);
    await user.click(screen.getByRole('button', { name: /Notifications/ }));
    await user.click(screen.getByRole('button', { name: 'Mark all read' }));
    expect(h.markAll.mutate).toHaveBeenCalledTimes(1);
    unmount();

    h.unread = 0;
    renderAt('/staff/dashboard', <NotificationBell />);
    await user.click(screen.getByRole('button', { name: /Notifications/ }));
    expect(screen.getByRole('button', { name: 'Mark all read' })).toBeDisabled();
  });

  it('closes on Escape', async () => {
    const user = userEvent.setup();
    renderAt('/staff/dashboard', <NotificationBell />);
    await user.click(screen.getByRole('button', { name: /Notifications/ }));
    expect(screen.getByRole('dialog')).toBeInTheDocument();
    await user.keyboard('{Escape}');
    expect(screen.queryByRole('dialog')).toBeNull();
  });

  it('says so when there is nothing, and when it cannot load', async () => {
    const user = userEvent.setup();
    const { unmount } = renderAt('/staff/dashboard', <NotificationBell />);
    await user.click(screen.getByRole('button', { name: /Notifications/ }));
    expect(screen.getByText('You’re all caught up.')).toBeInTheDocument();
    unmount();

    h.recent = { data: undefined as never, isLoading: false, isError: true, refetch: () => {} };
    renderAt('/staff/dashboard', <NotificationBell />);
    await user.click(screen.getByRole('button', { name: /Notifications/ }));
    expect(screen.getByRole('alert')).toHaveTextContent('Couldn’t load your notifications.');
  });

  it('on a phone goes straight to the inbox of the area you are in', () => {
    h.unread = 2;
    renderAt('/board/hierarchy', <NotificationBell variant="link" />);
    expect(screen.getByRole('link', { name: 'Notifications, 2 unread' })).toHaveAttribute('href', '/board/notifications');
  });
});

describe('NotificationItem', () => {
  const noop = () => {};

  it('marks an unread one in words as well as colour', () => {
    const { rerender } = render(
      <NotificationItem notification={note()} surface="staff" variant="card" onActivate={noop} />,
    );
    expect(screen.getByText('Unread')).toBeInTheDocument();
    rerender(<NotificationItem notification={note({ isRead: true })} surface="staff" variant="card" onActivate={noop} />);
    expect(screen.queryByText('Unread')).toBeNull();
  });

  it('shows Open only when there is somewhere safe to go, and the right read/unread action', async () => {
    const user = userEvent.setup();
    const toggle = vi.fn();
    const open = vi.fn();
    const { rerender } = render(
      <NotificationItem
        notification={note()}
        surface="staff"
        variant="card"
        expanded
        onActivate={noop}
        onToggleRead={toggle}
        onOpenLink={open}
      />,
    );
    await user.click(screen.getByRole('button', { name: 'Open' }));
    await user.click(screen.getByRole('button', { name: 'Mark as read' }));
    expect(open).toHaveBeenCalledTimes(1);
    expect(toggle).toHaveBeenCalledTimes(1);

    // A link off the site is never offered.
    rerender(
      <NotificationItem
        notification={note({ isRead: true, actionUrl: 'https://evil.example/x' })}
        surface="staff"
        variant="card"
        expanded
        onActivate={noop}
        onToggleRead={toggle}
        onOpenLink={open}
      />,
    );
    expect(screen.queryByRole('button', { name: 'Open' })).toBeNull();
    expect(screen.getByRole('button', { name: 'Mark as unread' })).toBeInTheDocument();
  });

  it('keeps the details hidden until expanded', () => {
    render(<NotificationItem notification={note()} surface="staff" variant="card" onActivate={noop} onOpenLink={noop} />);
    expect(screen.queryByRole('button', { name: 'Open' })).toBeNull();
    expect(screen.getByRole('button', { name: /Gathering published/ })).toHaveAttribute('aria-expanded', 'false');
  });
});

describe('NotificationsInbox', () => {
  it('explains an empty inbox, differently for the unread filter', async () => {
    const user = userEvent.setup();
    h.feed = { ...h.feed, data: { pages: [{ items: [], total: 0 }] } };
    renderAt('/portal/notifications', <NotificationsInbox />);
    expect(screen.getByText('No notifications yet')).toBeInTheDocument();
    await user.click(screen.getByRole('tab', { name: 'Unread' }));
    expect(screen.getByText('Nothing unread')).toBeInTheDocument();
    expect(h.feedStatus).toContain('unread');
  });

  it('groups by day, opens a notification as reading it, and offers older ones', async () => {
    const user = userEvent.setup();
    h.unread = 1;
    h.feed = {
      ...h.feed,
      data: { pages: [{ items: [note({ id: 'a', title: 'Prayer night published' })], total: 40 }] },
      hasNextPage: true,
    };
    renderAt('/staff/notifications', <NotificationsInbox />);
    expect(screen.getByText('1 unread')).toBeInTheDocument();
    expect(screen.getByRole('region', { name: 'Today' })).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: /Prayer night published/ }));
    expect(h.setRead.mutate).toHaveBeenCalledWith({ id: 'a', isRead: true });
    await user.click(screen.getByRole('button', { name: 'Open' }));
    expect(screen.getByTestId('where')).toHaveTextContent('/staff/events/e1');
  });

  it('shows the older-notifications button only when there are more', () => {
    h.feed = { ...h.feed, data: { pages: [{ items: [note()], total: 1 }] }, hasNextPage: false };
    renderAt('/portal/notifications', <NotificationsInbox />);
    expect(screen.queryByRole('button', { name: 'Load older notifications' })).toBeNull();
  });

  it('says plainly when the role has no notifications, and when loading fails', () => {
    h.access = false;
    const { unmount } = renderAt('/portal/notifications', <NotificationsInbox />);
    expect(screen.getByText('Notifications aren’t available for your role')).toBeInTheDocument();
    unmount();

    h.access = true;
    h.feed = { ...h.feed, data: undefined, isError: true };
    renderAt('/portal/notifications', <NotificationsInbox />);
    expect(screen.getByRole('alert')).toHaveTextContent('Your notifications couldn’t be loaded.');
  });
});

describe('NotificationPreferencesView', () => {
  const channels = (email = true, inApp = true) => ({ email, push: true, in_app: inApp, sms: false });
  const prefs = {
    userId: 'u1',
    preferences: {
      event: channels(),
      reminder: channels(),
      manual: channels(),
      approval: channels(),
      billing: channels(),
      announcement: channels(),
      system: channels(),
      pastoral_alert: channels(),
      finance_alert: channels(),
    },
  };

  it('lets a member see only what members receive', () => {
    h.isMember = true;
    h.prefs = { ...h.prefs, data: prefs };
    render(<NotificationPreferencesView />);
    expect(screen.getByText('Gatherings')).toBeInTheDocument();
    expect(screen.getByText('Reminders')).toBeInTheDocument();
    expect(screen.queryByText('Approvals')).toBeNull();
    expect(screen.queryByText('Plan and payments')).toBeNull();
  });

  it('shows staff everything, with in-app locked on where it must stay', () => {
    h.prefs = { ...h.prefs, data: prefs };
    render(<NotificationPreferencesView />);
    const approvals = screen.getByRole('group', { name: 'Approvals: how it reaches you' });
    const inApp = within(approvals).getByRole('button', { name: 'In the app (always on)' });
    expect(inApp).toBeDisabled();
    expect(inApp).toHaveAttribute('aria-pressed', 'true');
    expect(within(approvals).getByRole('button', { name: 'Email' })).toBeEnabled();
  });

  it('shows push and SMS as coming soon, and never as switched on', () => {
    h.prefs = { ...h.prefs, data: prefs };
    render(<NotificationPreferencesView />);
    const events = screen.getByRole('group', { name: 'Gatherings: how it reaches you' });
    const push = within(events).getByRole('button', { name: 'Push (coming soon)' });
    expect(push).toBeDisabled();
    expect(push).toHaveAttribute('aria-pressed', 'false'); // the server's default for push is on; it isn't live
    expect(within(events).getByRole('button', { name: 'SMS (coming soon)' })).toBeDisabled();
  });

  it('saves the one change that was made, in the names the API uses', async () => {
    const user = userEvent.setup();
    h.prefs = { ...h.prefs, data: prefs };
    render(<NotificationPreferencesView />);
    const events = screen.getByRole('group', { name: 'Gatherings: how it reaches you' });
    await user.click(within(events).getByRole('button', { name: 'Email' }));
    expect(h.update.mutate).toHaveBeenCalledWith({ event: { email: false } });
    await user.click(within(events).getByRole('button', { name: 'In the app' }));
    expect(h.update.mutate).toHaveBeenLastCalledWith({ event: { in_app: false } });
  });

  it('says when settings cannot be loaded or a change is refused', () => {
    h.prefs = { ...h.prefs, data: undefined, isError: true };
    const { unmount } = render(<NotificationPreferencesView />);
    expect(screen.getByRole('alert')).toHaveTextContent('Your settings couldn’t be loaded.');
    unmount();

    h.prefs = { ...h.prefs, data: prefs, isError: false };
    h.update = { mutate: vi.fn(), isPending: false, isError: true, error: new Error('Not allowed') };
    render(<NotificationPreferencesView />);
    expect(screen.getByRole('alert')).toHaveTextContent('Not allowed');
  });
});
