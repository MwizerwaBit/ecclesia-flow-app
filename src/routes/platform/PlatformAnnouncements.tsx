/**
 * @file PlatformAnnouncements.tsx
 * @description PA-09 — tell every church, or a filtered subset, something.
 *
 * Maintenance windows and policy changes go out from here. The reach estimate is
 * shown before sending for the same reason as the tenant audience builder: this
 * one can reach every church on the platform at once.
 */
import { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Megaphone, Radio, Send } from 'lucide-react';
import type { OrgStatus, OrgTier } from '@/types';
import { platformService } from '@/services/platformService';
import { Badge, Button, Card, Checkbox, Input, SegmentedControl, Text } from '@/components/ui';
import { formatRelative } from '@/lib/formatters';

type Audience = 'all' | 'tier' | 'country' | 'status';

const TIERS: OrgTier[] = ['seed', 'parish', 'growth', 'diocese', 'enterprise'];
const STATUSES: OrgStatus[] = ['trial', 'active', 'suspended'];

const PAST_ANNOUNCEMENTS = [
  { id: 'pa1', title: 'Scheduled maintenance — 2 November, 02:00–04:00 UTC', reach: 8, sentAt: '2024-10-20T09:00:00Z' },
  { id: 'pa2', title: 'Certificates are now available on Parish tier', reach: 4, sentAt: '2024-10-01T10:00:00Z' },
  { id: 'pa3', title: 'Updated data processing terms', reach: 8, sentAt: '2024-09-12T08:00:00Z' },
];

export function PlatformAnnouncements() {
  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [audience, setAudience] = useState<Audience>('all');
  const [selectedTiers, setSelectedTiers] = useState<string[]>([]);
  const [selectedStatuses, setSelectedStatuses] = useState<string[]>([]);
  const [inApp, setInApp] = useState(true);
  const [email, setEmail] = useState(false);

  const { data: orgs = [] } = useQuery({
    queryKey: ['platform', 'orgs'],
    queryFn: () => platformService.listOrgs(),
  });

  // Reach is computed rather than guessed — this can hit every church at once.
  const reach = useMemo(() => {
    if (audience === 'all') return orgs.length;
    if (audience === 'tier') {
      return selectedTiers.length === 0
        ? 0
        : orgs.filter((o) => selectedTiers.includes(o.tier)).length;
    }
    if (audience === 'status') {
      return selectedStatuses.length === 0
        ? 0
        : orgs.filter((o) => selectedStatuses.includes(o.status)).length;
    }
    return orgs.length;
  }, [audience, orgs, selectedTiers, selectedStatuses]);

  function toggle(list: string[], setList: (next: string[]) => void, value: string) {
    setList(list.includes(value) ? list.filter((v) => v !== value) : [...list, value]);
  }

  const canSend = title.trim().length > 0 && body.trim().length > 0 && reach > 0 && (inApp || email);

  return (
    <div className="w-full max-w-2xl mx-auto px-4 py-6 animate-fade-in space-y-5">
      <header>
        <Text variant="h1" className="mb-1">
          Platform announcements
        </Text>
        <Text variant="body" color="muted">
          Maintenance windows, feature news, policy changes.
        </Text>
      </header>

      <Input
        label="Title"
        autoFocus
        placeholder="Scheduled maintenance — 2 November"
        value={title}
        onChange={(e) => setTitle(e.target.value)}
      />

      <div className="flex flex-col gap-1.5">
        <label htmlFor="pa-body" className="text-label text-slate-700 dark:text-slate-300">
          Message
        </label>
        <textarea
          id="pa-body"
          rows={5}
          placeholder="What is happening, when, and what they should do."
          value={body}
          onChange={(e) => setBody(e.target.value)}
          className="w-full rounded-lg border border-slate-200 dark:border-slate-700 bg-surface dark:bg-surface-dark px-3 py-2.5 text-body text-slate-900 dark:text-slate-100 placeholder:text-slate-400 outline-none transition-colors focus:border-primary focus:ring-2 focus:ring-primary/20"
        />
      </div>

      {/* Targeting */}
      <div>
        <Text variant="label" color="muted" className="mb-2 block">
          Who receives it
        </Text>
        <SegmentedControl
          label="Target audience"
          value={audience}
          onChange={setAudience}
          size="sm"
          options={[
            { value: 'all', label: 'Everyone' },
            { value: 'tier', label: 'By tier' },
            { value: 'status', label: 'By status' },
          ]}
        />
      </div>

      {audience === 'tier' && (
        <Card padding="md" className="space-y-1">
          {TIERS.map((tier) => (
            <Checkbox
              key={tier}
              label={`${tier} (${orgs.filter((o) => o.tier === tier).length})`}
              checked={selectedTiers.includes(tier)}
              onChange={() => toggle(selectedTiers, setSelectedTiers, tier)}
            />
          ))}
        </Card>
      )}

      {audience === 'status' && (
        <Card padding="md" className="space-y-1">
          {STATUSES.map((status) => (
            <Checkbox
              key={status}
              label={`${status} (${orgs.filter((o) => o.status === status).length})`}
              checked={selectedStatuses.includes(status)}
              onChange={() => toggle(selectedStatuses, setSelectedStatuses, status)}
            />
          ))}
        </Card>
      )}

      {/* Reach */}
      <Card variant="outline" padding="md" className="flex items-center gap-3">
        <Radio size={22} className="text-platform-accent shrink-0" aria-hidden />
        <div>
          <Text variant="label" color="muted">
            Organisations reached
          </Text>
          <Text variant="number" className="tabular-nums">
            {reach}
          </Text>
        </div>
      </Card>

      <div className="space-y-3">
        <Checkbox
          label="Show as an in-app banner"
          description="Every admin user at the targeted organisations sees it."
          checked={inApp}
          onChange={(e) => setInApp(e.target.checked)}
        />
        <Checkbox
          label="Email the primary admin"
          description="One email per organisation, to the primary contact only."
          checked={email}
          onChange={(e) => setEmail(e.target.checked)}
        />
      </div>

      <Button variant="primary" size="lg" fullWidth leftIcon={Send} disabled={!canSend}>
        Send to {reach} organisation{reach === 1 ? '' : 's'}
      </Button>

      {/* History */}
      <div>
        <Text variant="h2" className="mb-3">
          Sent before
        </Text>
        <Card padding="none" className="divide-y divide-slate-100 dark:divide-slate-800">
          {PAST_ANNOUNCEMENTS.map((announcement) => (
            <div key={announcement.id} className="flex items-start gap-3 px-4 py-3">
              <Megaphone size={16} className="text-slate-300 shrink-0 mt-0.5" aria-hidden />
              <div className="min-w-0 flex-1">
                <Text variant="body-sm" className="truncate">
                  {announcement.title}
                </Text>
                <Text variant="caption" color="muted">
                  {formatRelative(announcement.sentAt)}
                </Text>
              </div>
              <Badge variant="neutral" size="sm" className="shrink-0">
                {announcement.reach} orgs
              </Badge>
            </div>
          ))}
        </Card>
      </div>
    </div>
  );
}
