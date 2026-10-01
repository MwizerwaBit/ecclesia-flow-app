/**
 * @file MfaStepUpPrompt.tsx
 * @description Re-auth gate for a sensitive in-session action.
 *
 * Being signed in is not the same as being verified for *this* action — used
 * wherever a flow needs to confirm it's really the account holder right now
 * (initiating or approving a church-leadership transfer, and anywhere else a
 * sensitive operation shouldn't go through on session trust alone).
 */
import { useState } from 'react';
import { ShieldCheck } from 'lucide-react';
import { authService } from '@/services/authService';
import { Button } from './Button';
import { Card } from './Card';
import { Input } from './Input';
import { Text } from './Typography';

interface MfaStepUpPromptProps {
  description: string;
  onVerified: () => void;
  onCancel?: () => void;
  confirmLabel?: string;
}

export function MfaStepUpPrompt({ description, onVerified, onCancel, confirmLabel = 'Confirm' }: MfaStepUpPromptProps) {
  const [code, setCode] = useState('');
  const [isVerifying, setVerifying] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function verify() {
    setVerifying(true);
    setError(null);
    try {
      const verified = await authService.verifyStepUp(code);
      if (verified) {
        onVerified();
      } else {
        setError('That code didn’t verify. Check your authenticator app and try again.');
      }
    } finally {
      setVerifying(false);
    }
  }

  return (
    <Card variant="outline" padding="md" className="space-y-4">
      <div className="flex items-start gap-3">
        <div className="mt-0.5 flex size-9 shrink-0 items-center justify-center rounded-full bg-primary-light dark:bg-primary/15">
          <ShieldCheck size={18} className="text-primary" aria-hidden />
        </div>
        <div className="min-w-0">
          <Text variant="h3" className="mb-0.5">
            Verify it&rsquo;s you
          </Text>
          <Text variant="body-sm" color="muted">
            {description}
          </Text>
        </div>
      </div>

      <Input
        label="Authenticator code"
        inputMode="numeric"
        maxLength={6}
        placeholder="000000"
        value={code}
        onChange={(e) => {
          setCode(e.target.value.replace(/\D/g, ''));
          setError(null);
        }}
        className="[&_input]:text-center [&_input]:tracking-widest"
      />
      {error && (
        <Text variant="body-sm" className="text-danger" role="alert">
          {error}
        </Text>
      )}

      <div className="flex gap-2">
        {onCancel && (
          <Button variant="ghost" onClick={onCancel} disabled={isVerifying}>
            Cancel
          </Button>
        )}
        <Button
          variant="primary"
          fullWidth
          isLoading={isVerifying}
          disabled={code.length !== 6}
          onClick={verify}
        >
          {confirmLabel}
        </Button>
      </div>
    </Card>
  );
}
