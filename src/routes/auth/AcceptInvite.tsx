/**
 * @file AcceptInvite.tsx
 * @description Where an invitation link lands: choose a password, start serving.
 *
 * The invitation token arrives in the URL fragment (#…), which browsers never
 * send to any server or put in a Referer header. It is read once into memory
 * and wiped from the address bar immediately, so it doesn't linger in history.
 */
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { CheckCircle2, KeyRound, ShieldCheck } from 'lucide-react';
import { authService } from '@/services/authService';
import { ApiError } from '@/services/adapter';
import { authErrorMessage, useAuthStore } from '@/hooks/useAuthStore';
import { Button, Card, Input, Text } from '@/components/ui';
import { cn } from '@/lib/cn';

function takeTokenFromUrl(): string {
  const token = window.location.hash.replace(/^#/, '');
  if (token) window.history.replaceState(null, '', window.location.pathname);
  return token;
}

/** The same composition rule the API enforces, shown as the person types. */
const RULES: Array<{ label: string; test: (p: string) => boolean }> = [
  { label: 'At least 10 characters', test: (p) => p.length >= 10 },
  { label: 'Upper and lower case letters', test: (p) => p !== p.toLowerCase() && p !== p.toUpperCase() },
  { label: 'At least one number', test: (p) => /\d/.test(p) },
];

export function AcceptInvite() {
  const [token] = useState(takeTokenFromUrl);
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setSubmitting] = useState(false);
  const setSession = useAuthStore((s) => s.setSession);
  const navigate = useNavigate();

  const strong = RULES.every((r) => r.test(password));
  const matches = password.length > 0 && password === confirm;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!strong || !matches) return;
    setSubmitting(true);
    setError(null);
    try {
      const session = await authService.acceptInvite({ token, password, firstName, lastName });
      setSession(session);
      navigate('/login', { replace: true }); // PublicLayout forwards to their home
    } catch (err) {
      setError(
        err instanceof ApiError && err.code === 'invite_expired'
          ? 'This invitation has expired. Ask whoever invited you to send a new one.'
          : authErrorMessage(err),
      );
    } finally {
      setSubmitting(false);
    }
  }

  if (!token) {
    return (
      <Card padding="lg" className="text-center">
        <Text variant="h2" className="mb-2">
          This invitation link is incomplete
        </Text>
        <Text variant="body" color="muted">
          Open the link exactly as it was sent to you, or ask for a new invitation.
        </Text>
      </Card>
    );
  }

  return (
    <div className="w-full animate-fade-in px-4">
      <div className="text-center mb-8">
        <div className="mx-auto bg-primary-light text-primary w-16 h-16 rounded-full flex items-center justify-center mb-6">
          <ShieldCheck size={32} aria-hidden />
        </div>
        <Text variant="h1" className="mb-2">
          Accept your invitation
        </Text>
        <Text variant="body-lg" color="muted">
          Choose a password to start using EcclesiaFlow. If you already have an account, enter its password.
        </Text>
      </div>

      <Card padding="lg">
        {error && (
          <div role="alert" className="mb-6 p-4 bg-danger-light text-danger rounded-lg text-body-sm font-medium border border-danger/20">
            {error}
          </div>
        )}
        <form onSubmit={handleSubmit} className="space-y-5">
          <div className="grid gap-4 sm:grid-cols-2">
            <Input label="First name" autoComplete="given-name" value={firstName} onChange={(e) => setFirstName(e.target.value)} />
            <Input label="Last name" autoComplete="family-name" value={lastName} onChange={(e) => setLastName(e.target.value)} />
          </div>
          <Input
            label="Password"
            type="password"
            autoComplete="new-password"
            leftIcon={KeyRound}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />
          <ul className="space-y-1" aria-label="Password requirements">
            {RULES.map((rule) => {
              const ok = rule.test(password);
              return (
                <li key={rule.label} className={cn('flex items-center gap-2 text-caption', ok ? 'text-success' : 'text-slate-500')}>
                  <CheckCircle2 size={14} aria-hidden className={ok ? '' : 'opacity-40'} /> {rule.label}
                </li>
              );
            })}
          </ul>
          <Input
            label="Confirm password"
            type="password"
            autoComplete="new-password"
            value={confirm}
            onChange={(e) => setConfirm(e.target.value)}
            error={confirm && !matches ? 'The passwords don’t match.' : undefined}
            required
          />
          <Button type="submit" variant="primary" size="lg" fullWidth isLoading={isSubmitting} disabled={!strong || !matches}>
            Accept and sign in
          </Button>
        </form>
      </Card>
    </div>
  );
}
