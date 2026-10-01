/**
 * @file MfaChallenge.tsx
 * @description MFA Verification screen after successful primary authentication.
 */
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ShieldCheck, ArrowRight } from 'lucide-react';
import { authService } from '@/services/authService';
import { useAuthStore } from '@/hooks/useAuthStore';
import { Button, Input, Card, Text } from '@/components/ui';

export function MfaChallenge() {
  const [code, setCode] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { setSession } = useAuthStore();
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);
    
    try {
      const session = await authService.verifyMfa(code);
      setSession(session);
      navigate('/staff/dashboard', { replace: true });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Invalid verification code');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="w-full animate-fade-in px-4">
      <div className="text-center mb-8">
        <div className="mx-auto bg-primary-light text-primary w-16 h-16 rounded-full flex items-center justify-center mb-6">
          <ShieldCheck size={32} />
        </div>
        <Text variant="h1" className="mb-2">Two-Factor Authentication</Text>
        <Text variant="body-lg" color="muted">
          Enter the 6-digit code from your authenticator app.
        </Text>
      </div>

      <Card padding="lg" className="w-full">
        {error && (
          <div className="mb-6 p-4 bg-danger-light text-danger rounded-lg text-body-sm font-medium border border-danger/20">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-6">
          <Input
            label="Verification Code"
            type="text"
            inputMode="numeric"
            pattern="[0-9]*"
            maxLength={6}
            placeholder="000000"
            value={code}
            onChange={(e) => setCode(e.target.value.replace(/\D/g, ''))}
            required
            autoComplete="one-time-code"
            className="text-center text-h3 tracking-widest"
          />

          <Button 
            type="submit" 
            variant="primary" 
            size="lg" 
            fullWidth 
            isLoading={isLoading}
            rightIcon={ArrowRight}
            disabled={code.length !== 6}
          >
            Verify
          </Button>
        </form>
      </Card>

      <div className="mt-8 text-center">
        <button className="text-body-sm text-slate-500 hover:text-primary transition-colors">
          Use a recovery code instead
        </button>
      </div>
    </div>
  );
}
