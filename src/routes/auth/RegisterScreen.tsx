/**
 * @file RegisterScreen.tsx
 * @description Step 1 of onboarding: register the church leader.
 *
 * Whoever fills this in becomes the account the rest of the org is set up
 * under — not a placeholder "admin," the actual person accountable for it,
 * which is why leadership transfer (Team & Roles) exists as its own
 * deliberate, multi-approval process later rather than a settings toggle.
 */
import { useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import { Link, useNavigate } from 'react-router-dom';
import { ArrowRight, Building2 } from 'lucide-react';
import { authService } from '@/services/authService';
import { Button, Card, Input, Text } from '@/components/ui';

export function RegisterScreen() {
  const navigate = useNavigate();

  const [churchName, setChurchName] = useState('');
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  const register = useMutation({
    mutationFn: () => authService.register({ churchName, fullName, email, password }),
    // The session is applied by OnboardingWizard itself, after it has
    // mounted — not here. Calling setSession while /register (and
    // PublicLayout's "redirect away if already authenticated" guard) is
    // still mounted races the navigation below: PublicLayout sometimes wins
    // and bounces straight to the dashboard before the wizard ever renders.
    onSuccess: (session) => {
      navigate('/onboarding', { replace: true, state: { pendingSession: session } });
    },
  });

  const canSubmit =
    churchName.trim().length > 0 &&
    fullName.trim().length > 0 &&
    email.trim().length > 0 &&
    password.length >= 8;

  return (
    <div className="w-full animate-fade-in px-4">
      <div className="text-center mb-8">
        <Text variant="display" className="text-primary mb-2">EcclesiaFlow</Text>
        <Text variant="body-lg" color="muted">Register as your church&rsquo;s leader</Text>
      </div>

      <Card padding="lg" className="w-full">
        <div className="mx-auto bg-primary-light text-primary w-16 h-16 rounded-full flex items-center justify-center mb-6">
          <Building2 size={32} />
        </div>

        <form
          className="space-y-4"
          onSubmit={(e) => {
            e.preventDefault();
            if (canSubmit) register.mutate();
          }}
        >
          <Input
            label="Church name"
            placeholder="e.g. St. Jude's Cathedral"
            autoFocus
            value={churchName}
            onChange={(e) => setChurchName(e.target.value)}
          />
          <Input
            label="Your full name"
            placeholder="e.g. Sarah Thompson"
            autoComplete="name"
            value={fullName}
            onChange={(e) => setFullName(e.target.value)}
          />
          <Input
            label="Email"
            type="email"
            autoComplete="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
          <Input
            label="Password"
            type="password"
            autoComplete="new-password"
            placeholder="At least 8 characters"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />

          <Button
            type="submit"
            variant="primary"
            size="lg"
            fullWidth
            rightIcon={ArrowRight}
            disabled={!canSubmit}
            isLoading={register.isPending}
          >
            Create your workspace
          </Button>
        </form>
      </Card>

      <div className="mt-8 text-center text-body-sm text-slate-500">
        Already have an account?{' '}
        <Link to="/login" className="text-primary hover:underline font-bold">
          Sign In
        </Link>
      </div>
    </div>
  );
}
