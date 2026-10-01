/**
 * @file SecuritySettings.tsx
 * @description Password, two-factor, and the devices currently signed in.
 *
 * Active sessions are listed with enough detail to recognise your own — a
 * session list you cannot interpret is a session list nobody acts on. The
 * current device is marked and cannot be revoked from here, since signing
 * yourself out by accident is the one outcome nobody wants from this screen.
 */
import { useState } from 'react';
import { Link } from 'react-router-dom';
import {
  Check,
  Laptop,
  LogOut,
  type LucideIcon,
  Shield,
  ShieldCheck,
  Smartphone,
  Tablet,
} from 'lucide-react';
import { Badge, Button, Card, Input, Text } from '@/components/ui';
import { formatRelative } from '@/lib/formatters';

interface Session {
  id: string;
  device: string;
  location: string;
  lastActiveAt: string;
  icon: LucideIcon;
  isCurrent: boolean;
}

const MOCK_SESSIONS: Session[] = [
  { id: 's1', device: 'Chrome on Windows', location: 'Springfield, IL', lastActiveAt: new Date().toISOString(), icon: Laptop, isCurrent: true },
  { id: 's2', device: 'Safari on iPhone', location: 'Springfield, IL', lastActiveAt: '2024-10-21T18:40:00Z', icon: Smartphone, isCurrent: false },
  { id: 's3', device: 'Safari on iPad', location: 'Chicago, IL', lastActiveAt: '2024-10-14T09:12:00Z', icon: Tablet, isCurrent: false },
];

export function SecuritySettings() {
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [mfaEnabled, setMfaEnabled] = useState(false);
  const [revokedIds, setRevokedIds] = useState<Set<string>>(new Set());
  const [passwordChanged, setPasswordChanged] = useState(false);

  const sessions = MOCK_SESSIONS.filter((s) => !revokedIds.has(s.id));
  const otherSessionCount = sessions.filter((s) => !s.isCurrent).length;

  const passwordsMatch = newPassword.length > 0 && newPassword === confirmPassword;
  const canChangePassword = currentPassword.length > 0 && passwordsMatch && newPassword.length >= 8;

  function changePassword() {
    setPasswordChanged(true);
    setCurrentPassword('');
    setNewPassword('');
    setConfirmPassword('');
    window.setTimeout(() => setPasswordChanged(false), 2400);
  }

  return (
    <div className="w-full max-w-2xl mx-auto px-4 py-6 animate-fade-in space-y-6">
      <header>
        <Text variant="h1" className="mb-1">
          Security
        </Text>
        <Text variant="body" color="muted">
          Your password, your second factor, and where you are signed in.
        </Text>
      </header>

      {/* Two-factor — first, because it is the one that matters most */}
      <Card
        variant="outline"
        padding="md"
        className={mfaEnabled ? 'border-success/40' : 'border-warning/40 bg-warning-light/30'}
      >
        <div className="flex items-start gap-3">
          {mfaEnabled ? (
            <ShieldCheck size={22} className="text-success shrink-0 mt-0.5" aria-hidden />
          ) : (
            <Shield size={22} className="text-warning shrink-0 mt-0.5" aria-hidden />
          )}

          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-0.5">
              <Text variant="h3">Two-factor authentication</Text>
              <Badge variant={mfaEnabled ? 'success' : 'warning'} size="sm">
                {mfaEnabled ? 'On' : 'Off'}
              </Badge>
            </div>

            <Text variant="body-sm" color="muted">
              {mfaEnabled
                ? 'A code from your authenticator app is required at every sign-in.'
                : 'Without it, your password is the only thing protecting member and giving records.'}
            </Text>

            {mfaEnabled ? (
              <Button
                variant="ghost"
                size="sm"
                className="mt-3"
                onClick={() => setMfaEnabled(false)}
              >
                Turn off
              </Button>
            ) : (
              <Link to="/mfa/setup">
                <Button variant="primary" size="sm" className="mt-3">
                  Set up two-factor
                </Button>
              </Link>
            )}
          </div>
        </div>
      </Card>

      {/* Password */}
      <div>
        <Text variant="h2" className="mb-3">
          Password
        </Text>

        <Card padding="md" className="space-y-4">
          <Input
            label="Current password"
            type="password"
            autoComplete="current-password"
            value={currentPassword}
            onChange={(e) => setCurrentPassword(e.target.value)}
          />
          <Input
            label="New password"
            type="password"
            autoComplete="new-password"
            value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)}
            error={
              newPassword.length > 0 && newPassword.length < 8
                ? 'At least 8 characters.'
                : undefined
            }
          />
          <Input
            label="Confirm new password"
            type="password"
            autoComplete="new-password"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            error={
              confirmPassword.length > 0 && !passwordsMatch
                ? 'These do not match.'
                : undefined
            }
          />

          <Button
            variant="primary"
            fullWidth
            disabled={!canChangePassword}
            onClick={changePassword}
          >
            Change password
          </Button>

          {passwordChanged && (
            <div className="flex items-center justify-center gap-2 animate-fade-in">
              <Check size={16} className="text-success" aria-hidden />
              <Text variant="body-sm" className="text-success">
                Password changed.
              </Text>
            </div>
          )}
        </Card>
      </div>

      {/* Sessions */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <Text variant="h2">Signed in on</Text>
          {otherSessionCount > 0 && (
            <Button
              variant="link"
              size="sm"
              onClick={() =>
                setRevokedIds(new Set(MOCK_SESSIONS.filter((s) => !s.isCurrent).map((s) => s.id)))
              }
            >
              Sign out everywhere else
            </Button>
          )}
        </div>

        <Card padding="none" className="divide-y divide-slate-100 dark:divide-slate-800">
          {sessions.map((session) => {
            const Icon = session.icon;
            return (
              <div key={session.id} className="flex items-center gap-3 px-4 py-3.5">
                <Icon size={20} className="text-slate-400 shrink-0" aria-hidden />

                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <Text variant="body" className="truncate">
                      {session.device}
                    </Text>
                    {session.isCurrent && (
                      <Badge variant="primary" size="sm">
                        This device
                      </Badge>
                    )}
                  </div>
                  <Text variant="caption" color="muted">
                    {session.location} · {formatRelative(session.lastActiveAt)}
                  </Text>
                </div>

                {!session.isCurrent && (
                  <Button
                    variant="ghost"
                    size="sm"
                    leftIcon={LogOut}
                    onClick={() => setRevokedIds((prev) => new Set(prev).add(session.id))}
                  >
                    Revoke
                  </Button>
                )}
              </div>
            );
          })}
        </Card>

        {otherSessionCount === 0 && (
          <Text variant="caption" color="muted" className="block mt-2 text-center">
            This is the only device signed in.
          </Text>
        )}
      </div>
    </div>
  );
}
