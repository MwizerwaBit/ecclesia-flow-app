/**
 * @file ApiIntegrations.tsx
 * @description API keys and webhook endpoints, for tiers that include them.
 *
 * A key is shown in full exactly once, at creation. After that only its prefix
 * is stored, because a key we can display back is a key we are storing in a way
 * nobody should accept from a system holding member records.
 */
import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Check, Copy, KeyRound, Plus, Trash2, Webhook } from 'lucide-react';
import { Badge, BottomSheet, Button, Card, Input, Text } from '@/components/ui';
import { formatDate, formatRelative } from '@/lib/formatters';

interface ApiKey {
  id: string;
  name: string;
  prefix: string;
  createdAt: string;
  lastUsedAt?: string;
}

const KEYS: ApiKey[] = [
  { id: 'k1', name: 'Website event feed', prefix: 'ef_live_7c1a', createdAt: '2024-03-12T00:00:00Z', lastUsedAt: '2024-10-22T06:40:00Z' },
  { id: 'k2', name: 'Giving reconciliation script', prefix: 'ef_live_b93f', createdAt: '2024-07-02T00:00:00Z', lastUsedAt: '2024-10-20T23:10:00Z' },
  { id: 'k3', name: 'Old newsletter sync', prefix: 'ef_live_20de', createdAt: '2023-11-01T00:00:00Z' },
];

const WEBHOOKS = [
  { id: 'w1', url: 'https://stjudes.org/hooks/ecclesiaflow', events: ['member.created', 'donation.recorded'], healthy: true },
  { id: 'w2', url: 'https://analytics.stjudes.org/ingest', events: ['attendance.recorded'], healthy: false },
];

export function ApiIntegrations() {
  const [isCreateOpen, setCreateOpen] = useState(false);
  const [keyName, setKeyName] = useState('');
  const [createdKey, setCreatedKey] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  function createKey() {
    // Only moment the full key exists in the client.
    setCreatedKey(`ef_live_${Math.random().toString(36).slice(2, 10)}${Math.random().toString(36).slice(2, 18)}`);
  }

  function copyKey() {
    if (!createdKey) return;
    void navigator.clipboard?.writeText(createdKey);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 2000);
  }

  function closeSheet() {
    setCreateOpen(false);
    setCreatedKey(null);
    setKeyName('');
  }

  return (
    <div className="w-full max-w-2xl mx-auto px-4 py-6 animate-fade-in space-y-6">
      <header>
        <div className="flex items-center gap-2 mb-1">
          <Text variant="h1">API &amp; integrations</Text>
          <Badge variant="primary" size="sm">
            Diocese
          </Badge>
        </div>
        <Text variant="body" color="muted">
          Programmatic access to your own data.
        </Text>
      </header>

      {/* Keys */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <KeyRound size={18} className="text-slate-400" aria-hidden />
            <Text variant="h2">API keys</Text>
          </div>
          <Button variant="link" size="sm" leftIcon={Plus} onClick={() => setCreateOpen(true)}>
            New key
          </Button>
        </div>

        <Card padding="none" className="divide-y divide-slate-100 dark:divide-slate-800">
          {KEYS.map((key) => (
            <div key={key.id} className="flex items-center gap-3 px-4 py-3.5">
              <div className="min-w-0 flex-1">
                <Text variant="body" className="truncate">
                  {key.name}
                </Text>
                <code className="text-caption text-slate-500">{key.prefix}…</code>
                <Text variant="caption" color="muted" className="block mt-0.5">
                  Created {formatDate(key.createdAt)}
                  {key.lastUsedAt ? ` · used ${formatRelative(key.lastUsedAt)}` : ' · never used'}
                </Text>
              </div>

              {!key.lastUsedAt && (
                <Badge variant="neutral" size="sm" className="shrink-0">
                  Unused
                </Badge>
              )}

              <Button variant="ghost" size="sm" aria-label={`Revoke ${key.name}`}>
                <Trash2 size={16} />
              </Button>
            </div>
          ))}
        </Card>
      </div>

      {/* Webhooks */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <Webhook size={18} className="text-slate-400" aria-hidden />
            <Text variant="h2">Webhooks</Text>
          </div>
          <Button variant="link" size="sm" leftIcon={Plus}>
            Add endpoint
          </Button>
        </div>

        <div className="space-y-3">
          {WEBHOOKS.map((hook) => (
            <Card key={hook.id} padding="md">
              <div className="flex items-start justify-between gap-3 mb-2">
                <code className="min-w-0 truncate text-body-sm text-slate-700 dark:text-slate-300">
                  {hook.url}
                </code>
                <Badge variant={hook.healthy ? 'success' : 'danger'} size="sm" dot className="shrink-0">
                  {hook.healthy ? 'Healthy' : 'Failing'}
                </Badge>
              </div>

              <div className="flex flex-wrap gap-1.5">
                {hook.events.map((event) => (
                  <span
                    key={event}
                    className="rounded bg-slate-100 dark:bg-slate-800 px-2 py-0.5 text-caption text-slate-600 dark:text-slate-300"
                  >
                    {event}
                  </span>
                ))}
              </div>

              {!hook.healthy && (
                <Text variant="caption" className="text-danger block mt-2">
                  Last 12 deliveries failed. We retry for 24 hours, then stop sending.
                </Text>
              )}
            </Card>
          ))}
        </div>
      </div>

      <Link to="/contact">
        <Button variant="ghost" fullWidth>
          Read the API documentation
        </Button>
      </Link>

      {isCreateOpen && (
        <BottomSheet
          open
          onClose={closeSheet}
          title={createdKey ? 'Your new key' : 'Create an API key'}
          description={
            createdKey
              ? 'Copy it now. We store only a hash, so it can never be shown again.'
              : 'Name it for what it will do, so an unused key can be safely revoked later.'
          }
          footer={
            createdKey ? (
              <Button variant="primary" size="lg" fullWidth onClick={closeSheet}>
                I have copied it
              </Button>
            ) : (
              <Button
                variant="primary"
                size="lg"
                fullWidth
                disabled={keyName.trim().length === 0}
                onClick={createKey}
              >
                Create key
              </Button>
            )
          }
        >
          {createdKey ? (
            <div className="space-y-3">
              <code className="block break-all rounded-lg bg-slate-100 dark:bg-slate-800 px-3 py-3 text-body-sm text-slate-900 dark:text-slate-100">
                {createdKey}
              </code>
              <Button
                variant="secondary"
                fullWidth
                leftIcon={copied ? Check : Copy}
                onClick={copyKey}
              >
                {copied ? 'Copied' : 'Copy key'}
              </Button>
            </div>
          ) : (
            <Input
              label="Key name"
              autoFocus
              placeholder="Website event feed"
              value={keyName}
              onChange={(e) => setKeyName(e.target.value)}
            />
          )}
        </BottomSheet>
      )}
    </div>
  );
}
