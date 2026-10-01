/**
 * @file RegisterOrganisation.tsx
 * @description PA-05 — register a church that came through sales rather than signup.
 *
 * Differs from public registration in two ways that matter: the tier and trial
 * length are set before the church ever signs in, and email verification is
 * skipped in favour of a set-password link.
 */
import { useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { Building2, Check } from 'lucide-react';
import type { OrgTier } from '@/types';
import { platformService } from '@/services/platformService';
import { Button, Card, Checkbox, Input, Select, Text } from '@/components/ui';

const TIERS: Array<{ value: OrgTier; label: string }> = [
  { value: 'seed', label: 'Seed — up to 250 members' },
  { value: 'parish', label: 'Parish — up to 2,000 members' },
  { value: 'growth', label: 'Growth — up to 5,000 members' },
  { value: 'diocese', label: 'Diocese — multi-parish' },
  { value: 'enterprise', label: 'Enterprise' },
];

const COUNTRIES = [
  { value: 'US', label: 'United States' },
  { value: 'GB', label: 'United Kingdom' },
  { value: 'IE', label: 'Ireland' },
  { value: 'NG', label: 'Nigeria' },
  { value: 'KE', label: 'Kenya' },
  { value: 'ZA', label: 'South Africa' },
];

/** Slugs are lowercase, hyphenated and URL-safe — this is the subdomain. */
function toSlug(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, '')
    .trim()
    .replace(/\s+/g, '-')
    .slice(0, 40);
}

export function RegisterOrganisation() {
  const navigate = useNavigate();

  const [legalName, setLegalName] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [slugOverride, setSlugOverride] = useState('');
  const [country, setCountry] = useState('US');
  const [tier, setTier] = useState<OrgTier>('parish');
  const [trialEndsAt, setTrialEndsAt] = useState('');
  const [adminName, setAdminName] = useState('');
  const [adminEmail, setAdminEmail] = useState('');
  const [internalNotes, setInternalNotes] = useState('');
  const [sendWelcome, setSendWelcome] = useState(true);

  // Derived from the display name unless the operator overrides it.
  const slug = slugOverride || toSlug(displayName || legalName);

  const create = useMutation({
    mutationFn: () =>
      platformService.createOrg({
        displayName: displayName.trim() || legalName.trim(),
        slug,
        country,
        tier,
        status: trialEndsAt ? 'trial' : 'active',
        trialEndsAt: trialEndsAt || undefined,
      }),
    onSuccess: (org) => navigate(`/platform/orgs/${org.id}`),
  });

  const canCreate =
    legalName.trim().length > 0 && slug.length > 0 && /.+@.+\..+/.test(adminEmail.trim());

  return (
    <div className="w-full max-w-2xl mx-auto px-4 py-6 animate-fade-in space-y-5">
      <header>
        <Text variant="h1" className="mb-1">
          Register an organisation
        </Text>
        <Text variant="body" color="muted">
          For churches onboarded directly rather than through public signup.
        </Text>
      </header>

      <Input
        label="Legal name"
        autoFocus
        placeholder="The Parish of St. Jude the Apostle"
        value={legalName}
        onChange={(e) => setLegalName(e.target.value)}
      />

      <Input
        label="Display name"
        placeholder="St. Jude's Parish"
        value={displayName}
        onChange={(e) => setDisplayName(e.target.value)}
      />

      <div>
        <Input
          label="Slug"
          placeholder={toSlug(displayName || legalName) || 'st-judes'}
          value={slug}
          onChange={(e) => setSlugOverride(toSlug(e.target.value))}
        />
        <Text variant="caption" color="muted" className="block mt-1">
          Their portal will live at{' '}
          <span className="font-medium">{slug || 'slug'}.ecclesiaflow.com</span>
        </Text>
      </div>

      <Select
        label="Country"
        value={country}
        onChange={(e) => setCountry(e.target.value)}
        options={COUNTRIES}
      />

      <Select
        label="Tier"
        value={tier}
        onChange={(e) => setTier(e.target.value as OrgTier)}
        options={TIERS}
      />

      <div>
        <Input
          label="Trial ends"
          type="date"
          value={trialEndsAt}
          onChange={(e) => setTrialEndsAt(e.target.value)}
        />
        <Text variant="caption" color="muted" className="block mt-1">
          Leave blank to activate the subscription immediately. Sales-led accounts often get longer
          than the standard thirty days.
        </Text>
      </div>

      {/* Primary admin */}
      <Card variant="outline" padding="md" className="space-y-4">
        <Text variant="label" color="muted">
          Primary administrator
        </Text>
        <Input
          label="Full name"
          placeholder="Sarah Thompson"
          value={adminName}
          onChange={(e) => setAdminName(e.target.value)}
        />
        <Input
          label="Email"
          type="email"
          placeholder="sarah@stjudes.org"
          value={adminEmail}
          onChange={(e) => setAdminEmail(e.target.value)}
        />
        <Text variant="caption" color="muted">
          They receive a set-password link rather than a verification email — the account is already
          trusted because you created it.
        </Text>
      </Card>

      <div className="flex flex-col gap-1.5">
        <label htmlFor="internal-notes" className="text-label text-slate-700 dark:text-slate-300">
          Internal notes
        </label>
        <textarea
          id="internal-notes"
          rows={3}
          placeholder="Not visible to the church."
          value={internalNotes}
          onChange={(e) => setInternalNotes(e.target.value)}
          className="w-full rounded-lg border border-slate-200 dark:border-slate-700 bg-surface dark:bg-surface-dark px-3 py-2.5 text-body text-slate-900 dark:text-slate-100 placeholder:text-slate-400 outline-none transition-colors focus:border-primary focus:ring-2 focus:ring-primary/20"
        />
      </div>

      <Checkbox
        label="Send the welcome email now"
        description="Uncheck to create the account quietly and send it later."
        checked={sendWelcome}
        onChange={(e) => setSendWelcome(e.target.checked)}
      />

      <Button
        variant="primary"
        size="lg"
        fullWidth
        leftIcon={canCreate ? Check : Building2}
        disabled={!canCreate}
        isLoading={create.isPending}
        onClick={() => create.mutate()}
      >
        Create organisation
      </Button>
    </div>
  );
}
