/**
 * @file NotificationScreens.tsx
 * @description The notification screens as router targets, plus the one link that works for everybody.
 *
 * `/notifications` and `/notifications/preferences` exist for links that can't know who opens them
 * (the settings link at the bottom of every notification email): they send the signed-in person
 * to their own area's version, and someone signed out to sign in first.
 */
import { Navigate, useLocation } from 'react-router-dom';
import { NotificationPreferencesView, NotificationsInbox } from '@/components/notifications';
import { useRole } from '@/hooks/useRole';
import { notificationPaths } from '@/lib/notifications';

export function NotificationsScreen() {
  return <NotificationsInbox />;
}

export function NotificationSettingsScreen() {
  return <NotificationPreferencesView />;
}

export function NotificationsEntry({ to }: { to: 'inbox' | 'preferences' }) {
  const { isAuthenticated, isMember, isPlatformAdmin } = useRole();
  const location = useLocation();

  if (!isAuthenticated) return <Navigate to="/login" state={{ from: location }} replace />;
  // A platform admin belongs to no church, so has no notifications.
  if (isPlatformAdmin) return <Navigate to="/" replace />;
  // Staff and board read theirs in the staff area, members in the portal.
  return <Navigate to={notificationPaths(isMember ? 'portal' : 'staff')[to]} replace />;
}
