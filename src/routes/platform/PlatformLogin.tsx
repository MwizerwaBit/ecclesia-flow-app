/**
 * @file PlatformLogin.tsx
 * @description PA-01 — the separate sign-in for EcclesiaFlow staff.
 *
 * Looks like every other sign-in (same layout, same components) and runs the
 * same real flow: password, then the two-step code. An account that can reach
 * every church's data gets no convenience path, so there is no magic link here.
 * Signing in as anything other than a platform admin lands on that person's own
 * dashboard (PublicLayout redirects by role), never on the platform surface.
 */
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Lock, LogIn, Mail, ShieldAlert } from 'lucide-react';
import { useAuthStore } from '@/hooks/useAuthStore';
import { Button, Card, Input, Text } from '@/components/ui';

export function PlatformLogin() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const { login, isLoading, error, clearError } = useAuthStore();
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    clearError();
    try {
      const outcome = await login({ email, password });
      if (outcome === 'mfa') navigate('/mfa/challenge');
    } catch {
      // The store holds the message.
    }
  };

  return (
    <div className="w-full animate-fade-in px-4">
      <div className="mb-8 text-center">
        <ShieldAlert size={36} className="mx-auto mb-3 text-primary" aria-hidden />
        <Text variant="display" className="mb-2">
          Platform access
        </Text>
        <Text variant="body-lg" color="muted">
          EcclesiaFlow staff only. Every action is logged.
        </Text>
      </div>

      <Card padding="lg" className="w-full">
        {error && (
          <div role="alert" className="mb-6 rounded-lg border border-danger/20 bg-danger-light p-4 text-body-sm font-medium text-danger">
            {error}
          </div>
        )}
        <form onSubmit={handleSubmit} className="space-y-5">
          <Input
            label="Email address"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            leftIcon={Mail}
            required
            autoComplete="email"
          />
          <Input
            label="Password"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            leftIcon={Lock}
            required
            autoComplete="current-password"
          />
          <Button type="submit" variant="primary" size="lg" fullWidth isLoading={isLoading} rightIcon={LogIn}>
            Sign in
          </Button>
        </form>
      </Card>

      <Text variant="caption" color="muted" className="mt-6 block text-center">
        Two-step sign-in is mandatory for platform accounts and cannot be turned off.
      </Text>
    </div>
  );
}
