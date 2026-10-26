/**
 * @file JoinChurch.tsx
 * @description Self-registration for an adult attender — not a visitor
 * quick-add (that's staff-facing), this creates their own portal login.
 *
 * Under-18s are turned away with a clear next step rather than a dead end,
 * since the backend refuses them outright (a parent/guardian registers them
 * through the church office instead).
 */
import { useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { HeartHandshake, MapPin } from 'lucide-react';
import { authService } from '@/services/authService';
import { churchDirectoryService } from '@/services/churchDirectoryService';
import { authErrorMessage, useAuthStore } from '@/hooks/useAuthStore';
import { Button, Card, Checkbox, EmptyState, Input, Select, Skeleton, Text } from '@/components/ui';
import { cn } from '@/lib/cn';

const RULES: Array<{ label: string; test: (p: string) => boolean }> = [
  { label: 'At least 10 characters', test: (p) => p.length >= 10 },
  { label: 'Upper and lower case letters', test: (p) => p !== p.toLowerCase() && p !== p.toUpperCase() },
  { label: 'At least one number', test: (p) => /\d/.test(p) },
];

function isAdult(dob: string): boolean {
  if (!dob) return false;
  const d = new Date(dob);
  const today = new Date();
  let age = today.getFullYear() - d.getFullYear();
  const beforeBirthday =
    today.getMonth() < d.getMonth() || (today.getMonth() === d.getMonth() && today.getDate() < d.getDate());
  if (beforeBirthday) age -= 1;
  return age >= 18;
}

export function JoinChurch() {
  const { slug = '' } = useParams();
  const navigate = useNavigate();
  const setSession = useAuthStore((s) => s.setSession);

  const { data: church, isLoading: isLoadingChurch } = useQuery({
    queryKey: ['public', 'church', slug],
    queryFn: () => churchDirectoryService.getBySlug(slug),
    enabled: Boolean(slug),
  });

  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [phone, setPhone] = useState('');
  const [gender, setGender] = useState<'male' | 'female'>('female');
  const [dateOfBirth, setDateOfBirth] = useState('');
  const [idType, setIdType] = useState<'national_id' | 'passport' | 'other'>('national_id');
  const [nationalId, setNationalId] = useState('');
  const [consentDataProcessing, setConsentDataProcessing] = useState(false);
  const [consentCommunications, setConsentCommunications] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setSubmitting] = useState(false);

  const strong = RULES.every((r) => r.test(password));
  const adult = isAdult(dateOfBirth);
  const underage = dateOfBirth.length > 0 && !adult;

  const canSubmit =
    firstName.trim().length > 0 &&
    lastName.trim().length > 0 &&
    email.trim().length > 0 &&
    strong &&
    phone.trim().length >= 7 &&
    adult &&
    nationalId.trim().length >= 4 &&
    consentDataProcessing;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!canSubmit) return;
    setSubmitting(true);
    setError(null);
    try {
      const session = await authService.joinChurch({
        churchSlug: slug,
        firstName,
        lastName,
        email,
        password,
        phone,
        gender,
        dateOfBirth,
        idType,
        nationalId,
        consentDataProcessing,
        consentCommunications,
      });
      setSession(session);
      navigate('/login', { replace: true }); // PublicLayout forwards to their home
    } catch (err) {
      setError(authErrorMessage(err));
    } finally {
      setSubmitting(false);
    }
  }

  if (isLoadingChurch) {
    return (
      <div className="w-full max-w-md mx-auto px-4 py-12 space-y-6">
        <Skeleton className="h-9 w-64 mx-auto" />
        <Skeleton className="h-96 rounded-xl" />
      </div>
    );
  }

  if (!church) {
    return (
      <div className="w-full max-w-2xl mx-auto px-4 py-12">
        <EmptyState
          icon={MapPin}
          title="We couldn't find that church"
          description="It may have moved, or the link may be out of date."
          action={
            <Link to="/churches">
              <Button variant="primary">Search for a church</Button>
            </Link>
          }
        />
      </div>
    );
  }

  return (
    <div className="w-full max-w-md mx-auto px-4 py-12 animate-fade-in">
      <header className="text-center mb-8">
        <Link to={`/c/${slug}`} className="text-body-sm text-slate-500 hover:text-primary transition-colors mb-3 inline-block">
          &larr; Back to {church.displayName}
        </Link>
        <Text variant="h1" className="mb-2">
          Join {church.displayName}
        </Text>
        <Text variant="body-lg" color="muted">
          A few details, and you&rsquo;re part of the congregation.
        </Text>
      </header>

      <Card padding="lg">
        <div className="mx-auto bg-primary-light text-primary w-16 h-16 rounded-full flex items-center justify-center mb-6">
          <HeartHandshake size={32} />
        </div>

        <form className="space-y-4" onSubmit={handleSubmit}>
          <div className="grid grid-cols-2 gap-3">
            <Input label="First name" autoFocus value={firstName} onChange={(e) => setFirstName(e.target.value)} />
            <Input label="Last name" value={lastName} onChange={(e) => setLastName(e.target.value)} />
          </div>
          <Input label="Email" type="email" autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} />
          <Input
            label="Password"
            type="password"
            autoComplete="new-password"
            placeholder="At least 10 characters"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
          {password.length > 0 && (
            <ul className="space-y-1 -mt-2">
              {RULES.map((r) => (
                <li
                  key={r.label}
                  className={cn('text-caption flex items-center gap-1.5', r.test(password) ? 'text-success' : 'text-slate-400')}
                >
                  <span className="w-1 h-1 rounded-full bg-current" /> {r.label}
                </li>
              ))}
            </ul>
          )}
          <Input label="Phone number" type="tel" value={phone} onChange={(e) => setPhone(e.target.value)} />
          <div className="grid grid-cols-2 gap-3">
            <Select
              label="Gender"
              value={gender}
              onChange={(e) => setGender(e.target.value as 'male' | 'female')}
              options={[
                { value: 'female', label: 'Female' },
                { value: 'male', label: 'Male' },
              ]}
            />
            <Input label="Date of birth" type="date" value={dateOfBirth} onChange={(e) => setDateOfBirth(e.target.value)} />
          </div>
          {underage && (
            <Text variant="caption" className="text-warning block -mt-2">
              Under-18s are registered by the church office with a parent or guardian — please speak to staff instead.
            </Text>
          )}
          <div className="grid grid-cols-2 gap-3">
            <Select
              label="ID type"
              value={idType}
              onChange={(e) => setIdType(e.target.value as typeof idType)}
              options={[
                { value: 'national_id', label: 'National ID' },
                { value: 'passport', label: 'Passport' },
                { value: 'other', label: 'Other' },
              ]}
            />
            <Input label="ID number" value={nationalId} onChange={(e) => setNationalId(e.target.value)} />
          </div>

          <div className="space-y-2 pt-1">
            <Checkbox
              label="I consent to the church keeping my membership record"
              checked={consentDataProcessing}
              onChange={(e) => setConsentDataProcessing(e.target.checked)}
            />
            <Checkbox
              label="Send me announcements and updates"
              checked={consentCommunications}
              onChange={(e) => setConsentCommunications(e.target.checked)}
            />
          </div>

          {error && (
            <Text variant="body-sm" className="text-danger">
              {error}
            </Text>
          )}

          <Button type="submit" variant="primary" size="lg" fullWidth disabled={!canSubmit} isLoading={isSubmitting}>
            Join the congregation
          </Button>
        </form>
      </Card>

      <div className="mt-8 text-center text-body-sm text-slate-500">
        Already a member?{' '}
        <Link to="/login" className="text-primary hover:underline font-bold">
          Sign in
        </Link>
      </div>
    </div>
  );
}
