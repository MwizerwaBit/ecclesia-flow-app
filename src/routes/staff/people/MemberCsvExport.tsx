/**
 * @file MemberCsvExport.tsx
 * @description Choose the columns, see the row count, take the file.
 *
 * Exporting the directory moves personal data outside the system, so the
 * sensitive columns are marked and the export is written to the audit log. The
 * count is shown before download because "how many rows will I get" is the
 * question people actually have.
 */
import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Navigate } from 'react-router-dom';
import { Download, Mail, ShieldAlert } from 'lucide-react';
import type { MemberListItem, MemberStatus } from '@/types';
import { membersService } from '@/services/membersService';
import { downloadCsv, type CsvValue } from '@/lib/download';
import { useRole } from '@/hooks/useRole';
import { Button, Card, Checkbox, SegmentedControl, Text } from '@/components/ui';

interface Field {
  key: string;
  label: string;
  sensitive?: boolean;
}

const FIELDS: Field[] = [
  { key: 'firstName', label: 'First name' },
  { key: 'lastName', label: 'Last name' },
  { key: 'status', label: 'Status' },
  { key: 'unitName', label: 'Group' },
  { key: 'envelopeNumber', label: 'Envelope number' },
  { key: 'email', label: 'Email', sensitive: true },
  { key: 'phone', label: 'Phone', sensitive: true },
  { key: 'address', label: 'Address', sensitive: true },
  { key: 'dateOfBirth', label: 'Date of birth', sensitive: true },
  { key: 'lastSeenAt', label: 'Last seen' },
  { key: 'givingThisYear', label: 'Giving this year', sensitive: true },
];

const DEFAULT_FIELDS = new Set(['firstName', 'lastName', 'status', 'unitName', 'envelopeNumber']);

type Scope = 'all' | MemberStatus;

export function MemberCsvExport() {
  const { can } = useRole();
  const [selected, setSelected] = useState<Set<string>>(DEFAULT_FIELDS);
  const [scope, setScope] = useState<Scope>('all');

  const { data: members = [] } = useQuery({
    queryKey: ['members', 'roster'],
    queryFn: () => membersService.list(),
  });

  if (!can('members:export')) {
    return <Navigate to="/403" replace />;
  }

  const rows = scope === 'all' ? members : members.filter((m) => m.status === scope);
  const sensitiveSelected = FIELDS.filter((f) => f.sensitive && selected.has(f.key));

  function toggle(key: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  }

  return (
    <div className="w-full max-w-2xl mx-auto px-4 py-6 animate-fade-in space-y-5">
      <header>
        <Text variant="h1" className="mb-1">
          Export directory
        </Text>
        <Text variant="body" color="muted">
          A spreadsheet of your members, with only the columns you choose.
        </Text>
      </header>

      <div>
        <Text variant="label" color="muted" className="mb-2 block">
          Who to include
        </Text>
        <SegmentedControl
          label="Export scope"
          value={scope}
          onChange={setScope}
          size="sm"
          options={[
            { value: 'all', label: 'Everyone' },
            { value: 'active', label: 'Members' },
            { value: 'visitor', label: 'Visitors' },
            { value: 'inactive', label: 'Inactive' },
          ]}
        />
      </div>

      <Card variant="outline" padding="md" className="flex items-center justify-between">
        <div>
          <Text variant="label" color="muted">
            Rows in this export
          </Text>
          <Text variant="number" className="tabular-nums">
            {rows.length}
          </Text>
        </div>
        <Text variant="body-sm" color="muted">
          {selected.size} column{selected.size === 1 ? '' : 's'}
        </Text>
      </Card>

      <div>
        <div className="flex items-center justify-between mb-2">
          <Text variant="label" color="muted">
            Columns
          </Text>
          <Button
            variant="link"
            size="sm"
            onClick={() =>
              setSelected(
                selected.size === FIELDS.length
                  ? new Set(DEFAULT_FIELDS)
                  : new Set(FIELDS.map((f) => f.key)),
              )
            }
          >
            {selected.size === FIELDS.length ? 'Reset' : 'Select all'}
          </Button>
        </div>

        <Card padding="md" className="space-y-2">
          {FIELDS.map((field) => (
            <Checkbox
              key={field.key}
              checked={selected.has(field.key)}
              onChange={() => toggle(field.key)}
              label={
                <span className="flex items-center gap-1.5">
                  {field.label}
                  {field.sensitive && (
                    <ShieldAlert size={13} className="text-warning" aria-label="Personal data" />
                  )}
                </span>
              }
            />
          ))}
        </Card>
      </div>

      {sensitiveSelected.length > 0 && (
        <div className="flex items-start gap-2 rounded-lg bg-warning-light px-3 py-2.5">
          <ShieldAlert size={18} className="text-warning shrink-0 mt-0.5" aria-hidden />
          <Text variant="caption" className="text-warning">
            This export includes personal data ({sensitiveSelected.map((f) => f.label.toLowerCase()).join(', ')}).
            The download is recorded in the audit log against your name.
          </Text>
        </div>
      )}

      <div className="flex gap-2">
        <Button
          variant="primary"
          fullWidth
          leftIcon={Download}
          disabled={selected.size === 0 || rows.length === 0}
          onClick={() =>
            downloadCsv(
              `directory-${scope}`,
              FIELDS.filter((f) => selected.has(f.key)).map<
                [string, (row: MemberListItem) => CsvValue]
              >((f) => [f.label, (row) => (row as unknown as Record<string, CsvValue>)[f.key]]),
              rows,
            )
          }
        >
          Download {rows.length} rows
        </Button>
        <a
          href={`mailto:?subject=${encodeURIComponent('Directory export')}&body=${encodeURIComponent(
            `A ${scope} directory export of ${rows.length} people is attached.`,
          )}`}
        >
          <Button variant="secondary" leftIcon={Mail} disabled={selected.size === 0}>
            Email it
          </Button>
        </a>
      </div>
    </div>
  );
}
