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
import { all, email as emailRule, minLength, password as passwordRule, required, useFieldErrors } from '@/lib/validation';
import { apiFieldErrors } from '@/lib/formErrors';
import { errorMessage } from '@/lib/errors';

// The API's own limits, so a mistake is explained here before the round trip.
const RULES = {
  churchName: all(required('Church name'), minLength('Church name', 2)),
  fullName: required('Your name'),
  email: all(required('Email'), emailRule),
  password: all(required('Password'), passwordRule),
};

export function RegisterScreen() {
  const navigate = useNavigate();

  const [churchName, setChurchName] = useState('');
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  const register = useMutation({
    mutationFn: () => authService.register({ churchName, fullName: fullName.trim(), email: email.trim(), password }),
    // This screen reports the failure itself, under the field it concerns.
    meta: { inline: true },
    // The session is applied by OnboardingWizard itself, after it has
    // mounted — not here. Calling setSession while /register (and
    // PublicLayout's "redirect away if already authenticated" guard) is
    // still mounted races the navigation below: PublicLayout sometimes wins
    // and bounces straight to the dashboard before the wizard ever renders.
    onSuccess: (session) => {
      navigate('/onboarding', { replace: true, state: { pendingSession: session } });
    },
  });

  // What the server rejected, mapped onto this form's fields.
  const server = apiFieldErrors(register.error);
  const { field, validateAll } = useFieldErrors(
    { churchName, fullName, email, password },
    RULES,
    { ...server, fullName: server.fullName ?? server.firstName ?? server.lastName },
  );
  // Anything the server said that no field on this form owns (or a non-validation failure).
  const bannerError =
    register.error && !Object.keys(server).some((k) => ['churchName', 'fullName', 'firstName', 'lastName', 'email', 'password'].includes(k))
      ? errorMessage(register.error)
      : null;

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

        {bannerError && (
          <div role="alert" className="mb-6 p-4 bg-danger-light text-danger rounded-lg text-body-sm font-medium border border-danger/20">
            {bannerError}
          </div>
        )}

        <form
          className="space-y-4"
          noValidate
          onSubmit={(e) => {
            e.preventDefault();
            // Show every problem at once instead of leaving the button dead.
            if (validateAll()) register.mutate();
          }}
        >
          <Input autoComplete="organization"
            label="Church name"
            placeholder="e.g. St. Jude's Cathedral"
            autoFocus
            value={churchName}
            onChange={(e) => setChurchName(e.target.value)}
            {...field('churchName')}
          />
          <Input
            label="Your full name"
            placeholder="e.g. Sarah Thompson"
            autoComplete="name"
            value={fullName}
            onChange={(e) => setFullName(e.target.value)}
            {...field('fullName')}
          />
          <Input
            label="Email"
            type="email"
            autoComplete="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            {...field('email')}
          />
          <Input
            label="Password"
            type="password"
            autoComplete="new-password"
            placeholder="10+ characters, upper and lower case, a number"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            {...field('password')}
          />

          <Button
            type="submit"
            variant="primary"
            size="lg"
            fullWidth
            rightIcon={ArrowRight}
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
