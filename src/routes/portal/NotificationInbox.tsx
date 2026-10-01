/**
 * @file NotificationInbox.tsx
 * @description Inbox for member alerts, announcements, and system notifications.
 */
import { Bell, Heart, Calendar } from 'lucide-react';
import { Card, Text } from '@/components/ui';

const MOCK_NOTIFICATIONS = [
  {
    id: 1,
    title: 'Thank you for your donation',
    message: 'Your recent donation of $150 to the General Fund has been received.',
    type: 'giving',
    date: '2 hours ago',
    read: false
  },
  {
    id: 2,
    title: 'Upcoming Event Reminder',
    message: 'Sunday Service starts tomorrow at 9:00 AM.',
    type: 'event',
    date: '1 day ago',
    read: false
  },
  {
    id: 3,
    title: 'Welcome to EcclesiaFlow',
    message: 'We are glad you are here! Update your profile to get started.',
    type: 'system',
    date: '3 days ago',
    read: true
  }
];

export function NotificationInbox() {
  const unreadCount = MOCK_NOTIFICATIONS.filter(n => !n.read).length;

  return (
    <div className="w-full animate-fade-in pb-8">
      {/* Header */}
      <div className="bg-surface dark:bg-surface-dark px-4 pt-6 pb-4 sticky top-0 z-10 shadow-sm border-b border-slate-100 dark:border-slate-800">
        <div className="flex items-center justify-between">
          <Text variant="h1">Inbox</Text>
          {unreadCount > 0 && (
            <span className="bg-primary text-white text-xs font-bold px-2 py-1 rounded-full">
              {unreadCount} New
            </span>
          )}
        </div>
      </div>

      <div className="px-4 mt-6 space-y-3">
        {MOCK_NOTIFICATIONS.map(notification => (
          <Card
            key={notification.id}
            padding="md"
            accent={notification.read ? 'none' : 'primary'}
            className="cursor-pointer transition-all"
          >
            <div className="flex gap-4">
              <div className={`mt-1 p-2 rounded-full shrink-0 ${
                !notification.read 
                  ? 'bg-primary text-white' 
                  : 'bg-slate-100 dark:bg-slate-800 text-slate-500'
              }`}>
                {notification.type === 'giving' ? <Heart size={16} /> :
                 notification.type === 'event' ? <Calendar size={16} /> :
                 <Bell size={16} />}
              </div>
              <div>
                <div className="flex justify-between items-start mb-1">
                  <Text variant="h3" className={!notification.read ? 'text-slate-900 dark:text-white' : 'text-slate-700 dark:text-slate-300'}>
                    {notification.title}
                  </Text>
                  <Text variant="caption" color="muted" className="shrink-0 ml-2 whitespace-nowrap">
                    {notification.date}
                  </Text>
                </div>
                <Text variant="body-sm" color="muted" className="line-clamp-2">
                  {notification.message}
                </Text>
              </div>
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
}
