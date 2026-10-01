/**
 * @file BulkIssue.tsx
 * @description Issue one template to many people — a confirmation class, a cohort.
 *
 * The selected count is kept in front of the user the whole way down, because the
 * failure mode here is issuing forty certificates when you meant four. Generation
 * is genuinely slow, so the button says what is happening rather than spinning.
 */
import { useMemo, useState } from 'react';
import { useMutation, useQuery } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { Award, Check, Search, Users } from 'lucide-react';
import { certificatesService } from '@/services/certificatesService';
import { membersService } from '@/services/membersService';
import { Avatar, Button, Card, Checkbox, Input, Select, Text } from '@/components/ui';
import { StickyActionBar } from '@/components/layout';
import { cn } from '@/lib/cn';

export function BulkIssue() {
  const navigate = useNavigate();

  const [templateId, setTemplateId] = useState('');
  const [batchName, setBatchName] = useState('');
  const [query, setQuery] = useState('');
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [issuedCount, setIssuedCount] = useState<number | null>(null);

  const { data: templates = [] } = useQuery({
    queryKey: ['certificate-templates', 'active'],
    queryFn: () => certificatesService.listTemplates(),
  });

  const { data: members = [] } = useQuery({
    queryKey: ['members', 'roster'],
    queryFn: () => membersService.list(),
  });

  const issuable = templates.filter((t) => t.status === 'active');
  const activeTemplateId = templateId || issuable[0]?.id || '';

  const visible = useMemo(() => {
    const q = query.trim().toLowerCase();
    return members.filter((m) =>
      q
        ? `${m.firstName} ${m.lastName}`.toLowerCase().includes(q) ||
          (m.unitName ?? '').toLowerCase().includes(q)
        : true,
    );
  }, [members, query]);

  function toggle(id: string) {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  const bulkIssue = useMutation({
    mutationFn: () =>
      certificatesService.bulkIssue(activeTemplateId, [...selectedIds], {
        batch_name: batchName.trim(),
      }),
    onSuccess: (certificates) => setIssuedCount(certificates.length),
  });

  if (issuedCount !== null) {
    return (
      <div className="flex min-h-[60vh] flex-col items-center justify-center px-6 text-center animate-fade-in">
        <div className="mb-5 flex size-20 items-center justify-center rounded-full bg-success-light animate-scale-in">
          <Check size={40} className="text-success" strokeWidth={2.5} aria-hidden />
        </div>
        <Text variant="h2" className="mb-2">
          {issuedCount} certificates issued
        </Text>
        <Text variant="body" color="muted" className="max-w-xs mb-8">
          Each one carries its own serial number and verification code, and now appears on the
          recipient&rsquo;s record.
        </Text>
        <Button variant="primary" onClick={() => navigate('/staff/certificates')}>
          Back to certificates
        </Button>
      </div>
    );
  }

  return (
    <div className="w-full max-w-2xl mx-auto px-4 py-6 pb-[calc(4rem+7rem)] lg:pb-32 animate-fade-in space-y-5">
      <header>
        <Text variant="h1" className="mb-1">
          Bulk issue
        </Text>
        <Text variant="body" color="muted">
          One template, many recipients.
        </Text>
      </header>

      <Select
        label="Template"
        value={activeTemplateId}
        onChange={(e) => setTemplateId(e.target.value)}
        options={issuable.map((t) => ({ value: t.id, label: t.name }))}
      />

      <Input
        label="Batch name"
        placeholder="Confirmation class 2024"
        value={batchName}
        onChange={(e) => setBatchName(e.target.value)}
      />

      <div>
        <div className="flex items-center justify-between mb-2">
          <Text variant="label" color="muted">
            Recipients
          </Text>
          {visible.length > 0 && (
            <Button
              variant="link"
              size="sm"
              onClick={() =>
                setSelectedIds((prev) =>
                  visible.every((m) => prev.has(m.id))
                    ? new Set()
                    : new Set(visible.map((m) => m.id)),
                )
              }
            >
              {visible.every((m) => selectedIds.has(m.id)) ? 'Clear all' : 'Select all shown'}
            </Button>
          )}
        </div>

        <Input
          type="search"
          placeholder="Filter by name or group"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          leftIcon={Search}
          className="mb-3"
        />

        <Card padding="none" className="divide-y divide-slate-100 dark:divide-slate-800">
          {visible.map((member) => {
            const isSelected = selectedIds.has(member.id);
            return (
              <label
                key={member.id}
                className={cn(
                  'flex items-center gap-3 px-4 py-2.5 cursor-pointer transition-colors',
                  isSelected
                    ? 'bg-primary-light dark:bg-primary/15'
                    : 'hover:bg-slate-50 dark:hover:bg-slate-800/40',
                )}
              >
                <Checkbox checked={isSelected} onChange={() => toggle(member.id)} />
                <Avatar
                  src={member.photoUrl}
                  name={`${member.firstName} ${member.lastName}`}
                  size="sm"
                  className="shrink-0"
                />
                <div className="min-w-0">
                  <p className="font-member-name text-body-lg truncate text-slate-900 dark:text-slate-100">
                    {member.firstName} {member.lastName}
                  </p>
                  <Text variant="caption" color="muted">
                    {member.unitName ?? 'No group'}
                  </Text>
                </div>
              </label>
            );
          })}
        </Card>
      </div>

      {/* Count stays in view all the way down the list */}
      <StickyActionBar contentClassName="flex items-center gap-4">
        <div className="flex items-center gap-2 shrink-0">
          <Users size={20} className="text-primary" aria-hidden />
          <Text variant="h3" className="tabular-nums">
            {selectedIds.size}
          </Text>
        </div>
        <Button
          variant="primary"
          size="lg"
          fullWidth
          leftIcon={Award}
          disabled={selectedIds.size === 0}
          isLoading={bulkIssue.isPending}
          onClick={() => bulkIssue.mutate()}
        >
          {bulkIssue.isPending
            ? `Generating ${selectedIds.size}…`
            : `Issue ${selectedIds.size || ''} certificate${selectedIds.size === 1 ? '' : 's'}`}
        </Button>
      </StickyActionBar>
    </div>
  );
}
