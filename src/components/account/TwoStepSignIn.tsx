/**
 * @file TwoStepSignIn.tsx
 * @description The two-step sign-in card: whether it is on, a way to set it up, and a way
 * to turn it off. Shared by the church security page and the platform admin's account,
 * so both show the same real status instead of each keeping its own.
 *
 * Turning it off first asks for a current code (step-up), because the server will not
 * accept it otherwise — and it is the one thing a stolen session must not be able to do.
 */
import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Shield, ShieldCheck } from 'lucide-react';
import { useAuthStore } from '@/hooks/useAuthStore';
import { authService } from '@/services/authService';
import { errorMessage } from '@/lib/errors';
import { Badge, Button, Card, MfaStepUpPrompt, Text } from '@/components/ui';

export function TwoStepSignIn() {
  const enabled = useAuthStore((s) => s.session?.user.mfaEnabled ?? false);
  const setMfaEnabled = useAuthStore((s) => s.setMfaEnabled);
  const [confirmingOff, setConfirmingOff] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function turnOff() {
    setError(null);
    try {
      await authService.disableMfa();
      setMfaEnabled(false);
      setConfirmingOff(false);
    } catch (err) {
      setError(errorMessage(err));
    }
  }

  return (
    <Card
      variant="outline"
      padding="md"
      className={enabled ? 'border-success/40' : 'border-warning/40 bg-warning-light/30'}
    >
      <div className="flex items-start gap-3">
        {enabled ? (
          <ShieldCheck size={22} className="text-success shrink-0 mt-0.5" aria-hidden />
        ) : (
          <Shield size={22} className="text-warning shrink-0 mt-0.5" aria-hidden />
        )}

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-0.5">
            <Text variant="h3">Two-factor authentication</Text>
            <Badge variant={enabled ? 'success' : 'warning'} size="sm">
              {enabled ? 'On' : 'Off'}
            </Badge>
          </div>

          <Text variant="body-sm" color="muted">
            {enabled
              ? 'A code from your authenticator app is required at every sign-in.'
              : 'Without it, your password is the only thing protecting member and giving records.'}
          </Text>

          {error && (
            <div role="alert" className="mt-2">
              <Text variant="body-sm" className="text-danger">
                {error}
              </Text>
            </div>
          )}

          {enabled && confirmingOff && (
            <div className="mt-3">
              <MfaStepUpPrompt
                description="Enter a code from your authenticator app to turn two-factor off."
                confirmLabel="Turn off"
                onVerified={() => void turnOff()}
                onCancel={() => setConfirmingOff(false)}
              />
            </div>
          )}

          {enabled && !confirmingOff && (
            <Button variant="ghost" size="sm" className="mt-3" onClick={() => setConfirmingOff(true)}>
              Turn off
            </Button>
          )}

          {!enabled && (
            <Link to="/mfa/setup">
              <Button variant="primary" size="sm" className="mt-3">
                Set up two-factor
              </Button>
            </Link>
          )}
        </div>
      </div>
    </Card>
  );
}
