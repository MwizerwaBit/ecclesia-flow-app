/**
 * @file MyAccount.tsx
 * @description "My profile" for staff, board and platform admins: who you are
 * signed in as, a way to your security settings, and sign out.
 *
 * Members have their own, fuller profile (routes/portal/MyProfile.tsx). Staff
 * and admins had nowhere to land when they pressed their name.
 */
import { Link, useLocation } from 'react-router-dom';
import { Building2, LogOut, Mail, ShieldCheck, UserRound } from 'lucide-react';
import { useCurrentUser } from '@/hooks/useAuthStore';
import { useSignOut } from '@/hooks/useSignOut';
import { Avatar, Button, Card, Text } from '@/components/ui';

const ROLE_LABEL: Record<string, string> = {
  member: 'Member',
  staff: 'Staff',
  board: 'Network administrator',
  platform_admin: 'Platform administrator',
};

function Row({ icon: Icon, label, children }: { icon: typeof Mail; label: string; children: React.ReactNode }) {
  return (
    <div className="flex items-start gap-3 py-3">
      <Icon size={18} className="mt-0.5 shrink-0 text-slate-400" aria-hidden />
      <div className="min-w-0">
        <Text variant="label" color="muted" className="block">{label}</Text>
        <Text variant="body" className="break-words">{children}</Text>
      </div>
    </div>
  );
}

export function MyAccount() {
  const user = useCurrentUser();
  const { pathname } = useLocation();
  const isPlatform = pathname.startsWith('/platform');
  const { signOut, pending } = useSignOut(isPlatform ? '/platform/login' : '/login');

  if (!user) return null;
  const fullName = `${user.firstName} ${user.lastName}`.trim();

  return (
    <div className="mx-auto w-full max-w-xl p-4 sm:p-6 space-y-6">
      <div className="flex items-center gap-4">
        <Avatar src={user.photoUrl} name={fullName} size="xl" />
        <div className="min-w-0">
          <Text variant="h2" className="truncate">{fullName}</Text>
          <Text variant="body" color="muted">{ROLE_LABEL[user.role] ?? user.role}</Text>
        </div>
      </div>

      <Card padding="md" className="divide-y divide-slate-100 dark:divide-slate-800">
        <Row icon={Mail} label="Email">{user.email}</Row>
        {user.tenantName && <Row icon={Building2} label="Church">{user.tenantName}</Row>}
        <Row icon={UserRound} label="Role">{ROLE_LABEL[user.role] ?? user.role}</Row>
        <Row icon={ShieldCheck} label="Two-step sign-in">{user.mfaEnabled ? 'On' : 'Off'}</Row>
      </Card>

      <div className="space-y-2">
        {!isPlatform && (
          <Link to="/staff/settings/security" className="block">
            <Button variant="secondary" fullWidth leftIcon={ShieldCheck}>
              Password and security
            </Button>
          </Link>
        )}
        <Button variant="secondary" fullWidth leftIcon={LogOut} onClick={signOut} isLoading={pending}>
          Sign out
        </Button>
      </div>
    </div>
  );
}
