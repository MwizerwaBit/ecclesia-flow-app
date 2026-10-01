/**
 * @file PlatformLogin.tsx
 * @description PA-01 — the separate sign-in for EcclesiaFlow staff.
 *
 * Deliberately not the church login: dark chrome so there is never any doubt
 * which system you are in, password plus TOTP only, and no magic-link option.
 * An account that can reach every tenant's data does not get a convenience path.
 */
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { KeyRound, Lock, Mail, ShieldAlert } from 'lucide-react';
import { Button, Input, Text } from '@/components/ui';

export function PlatformLogin() {
  const navigate = useNavigate();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [totp, setTotp] = useState('');
  const [step, setStep] = useState<'credentials' | 'totp'>('credentials');

  const canContinue = /.+@.+\..+/.test(email.trim()) && password.length > 0;

  return (
    <div className="min-h-screen bg-platform-bg flex flex-col items-center justify-center px-4 py-12">
      <div className="w-full max-w-sm animate-fade-in">
        <header className="text-center mb-8">
          <div className="mx-auto mb-5 flex size-14 items-center justify-center rounded-xl bg-platform-accent">
            <ShieldAlert size={26} className="text-white" aria-hidden />
          </div>
          <h1 className="font-display text-h1 font-semibold text-white mb-1">Platform access</h1>
          <p className="text-body-sm text-slate-400">
            EcclesiaFlow staff only. Every action is logged.
          </p>
        </header>

        <div className="rounded-2xl bg-platform-surface p-6">
          {step === 'credentials' ? (
            <div className="space-y-4">
              <Input
                label="Email"
                type="email"
                autoFocus
                autoComplete="email"
                leftIcon={Mail}
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="[&_label]:text-slate-400 [&_input]:bg-platform-bg [&_input]:border-slate-700 [&_input]:text-white"
              />
              <Input
                label="Password"
                type="password"
                autoComplete="current-password"
                leftIcon={Lock}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="[&_label]:text-slate-400 [&_input]:bg-platform-bg [&_input]:border-slate-700 [&_input]:text-white"
              />

              <Button
                variant="primary"
                size="lg"
                fullWidth
                disabled={!canContinue}
                onClick={() => setStep('totp')}
              >
                Continue
              </Button>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="flex items-center gap-2 text-slate-400">
                <KeyRound size={16} aria-hidden />
                <Text variant="body-sm" className="text-slate-400">
                  Enter the code from your authenticator
                </Text>
              </div>

              <Input
                label="Authentication code"
                inputMode="numeric"
                autoFocus
                maxLength={6}
                placeholder="000000"
                value={totp}
                onChange={(e) => setTotp(e.target.value.replace(/[^0-9]/g, ''))}
                className="[&_label]:text-slate-400 [&_input]:bg-platform-bg [&_input]:border-slate-700 [&_input]:text-white [&_input]:text-center [&_input]:text-h2 [&_input]:tracking-[0.3em] [&_input]:h-14"
              />

              <Button
                variant="primary"
                size="lg"
                fullWidth
                disabled={totp.length !== 6}
                onClick={() => navigate('/platform/dashboard')}
              >
                Sign in
              </Button>

              <Button
                variant="ghost"
                fullWidth
                className="!text-slate-400 hover:!bg-slate-800"
                onClick={() => setStep('credentials')}
              >
                Back
              </Button>
            </div>
          )}
        </div>

        <p className="text-caption text-slate-500 text-center mt-6">
          Two-factor is mandatory and cannot be disabled. Failed attempts alert the security channel
          immediately.
        </p>
      </div>
    </div>
  );
}
