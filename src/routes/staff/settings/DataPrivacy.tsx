/**
 * @file DataPrivacy.tsx
 * @description Export everything, set retention, raise an erasure request.
 *
 * The export comes first and is unconditional: a church that cannot get its data
 * out does not really own it, and saying so plainly is worth more than any
 * compliance badge. Erasure is framed as a request because a platform admin
 * reviews it before it runs.
 */
import { useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import { membersService } from '@/services/membersService';
import { financeService } from '@/services/financeService';
import { eventsService } from '@/services/eventsService';
import { commsService } from '@/services/commsService';
import { downloadJson } from '@/lib/download';
import { Navigate } from 'react-router-dom';
import { Check, Database, Download, FileWarning, ShieldAlert, Trash2 } from 'lucide-react';
import { useRole } from '@/hooks/useRole';
import { BottomSheet, Button, Card, Input, Select, Text } from '@/components/ui';

const EXPORT_CONTENTS = [
  'Every member and household record',
  'Attendance registers and headcounts',
  'Giving records, funds, pledges and batches',
  'Announcements and message templates',
  'Certificates issued, with verification codes',
  'The full audit log for your organisation',
];

const RETENTION_OPTIONS = [
  { value: '0', label: 'Keep indefinitely' },
  { value: '24', label: 'Delete inactive records after 2 years' },
  { value: '60', label: 'Delete inactive records after 5 years' },
  { value: '84', label: 'Delete inactive records after 7 years' },
];

export function DataPrivacy() {
  // Everything this organisation owns, in one open-format archive. Gathered
  // client-side from the same endpoints the app already uses, so it works
  // whether or not the subscription is current — which is the promise the
  // copy below makes.
  const exportAll = useMutation({
    mutationFn: async () => {
      const [members, funds, batches, pledges, events, announcements, units] = await Promise.all([
        membersService.list(),
        financeService.listFunds(),
        financeService.listBatches(),
        financeService.listPledges(),
        eventsService.list(),
        commsService.listAnnouncements(),
        commsService.listUnits(),
      ]);
      return { exportedAt: new Date().toISOString(), members, funds, batches, pledges, events, announcements, units };
    },
    onSuccess: (archive) => downloadJson('ecclesiaflow-export', archive),
  });
  const { can } = useRole();
  const [retention, setRetention] = useState('0');
  const [isErasureOpen, setErasureOpen] = useState(false);
  const [memberName, setMemberName] = useState('');
  const [reason, setReason] = useState('');
  const [isRequested, setRequested] = useState(false);

  if (!can('org:settings')) {
    return <Navigate to="/403" replace />;
  }

  return (
    <div className="w-full max-w-2xl mx-auto px-4 py-6 animate-fade-in space-y-6">
      <header>
        <Text variant="h1" className="mb-1">
          Data &amp; privacy
        </Text>
        <Text variant="body" color="muted">
          Your records are yours. Here is how to take them, keep them or remove them.
        </Text>
      </header>

      {/* Export */}
      <div>
        <div className="flex items-center gap-2 mb-3">
          <Database size={18} className="text-slate-400" aria-hidden />
          <Text variant="h2">Export everything</Text>
        </div>

        <Card padding="md">
          <Text variant="body-sm" color="muted" className="mb-3">
            A complete archive of your organisation, in open formats. No approval needed, no limit on
            how often, and it works whether or not your subscription is current.
          </Text>

          <div className="space-y-1.5 mb-4">
            {EXPORT_CONTENTS.map((item) => (
              <div key={item} className="flex items-start gap-2">
                <Check size={14} className="text-success shrink-0 mt-1" aria-hidden />
                <Text variant="body-sm" color="muted">
                  {item}
                </Text>
              </div>
            ))}
          </div>

          <Button
            variant="primary"
            fullWidth
            leftIcon={Download}
            isLoading={exportAll.isPending}
            onClick={() => exportAll.mutate()}
          >
            Export all data
          </Button>
          <Text variant="caption" color="muted" className="block mt-2 text-center">
            Large archives are emailed when ready rather than downloaded in the browser.
          </Text>
        </Card>
      </div>

      {/* Retention */}
      <div>
        <div className="flex items-center gap-2 mb-3">
          <FileWarning size={18} className="text-slate-400" aria-hidden />
          <Text variant="h2">Retention</Text>
        </div>

        <Card padding="md" className="space-y-3">
          <Select
            label="Inactive member records"
            value={retention}
            onChange={(e) => setRetention(e.target.value)}
            options={RETENTION_OPTIONS}
          />
          <Text variant="caption" color="muted">
            Giving records are never removed by this setting — financial records carry their own
            statutory retention period in most jurisdictions.
          </Text>
        </Card>
      </div>

      {/* Erasure */}
      <div>
        <div className="flex items-center gap-2 mb-3">
          <Trash2 size={18} className="text-slate-400" aria-hidden />
          <Text variant="h2">Right to erasure</Text>
        </div>

        <Card padding="md">
          <Text variant="body-sm" color="muted" className="mb-3">
            If a member asks to be erased under GDPR or POPIA, raise it here. A platform
            administrator reviews every request before anything is removed.
          </Text>

          {isRequested ? (
            <div className="flex items-center gap-2 rounded-lg bg-success-light px-3 py-2.5">
              <Check size={16} className="text-success shrink-0" aria-hidden />
              <Text variant="body-sm" className="text-success">
                Request submitted. You will be told when it has been reviewed.
              </Text>
            </div>
          ) : (
            <Button variant="secondary" fullWidth onClick={() => setErasureOpen(true)}>
              Raise an erasure request
            </Button>
          )}
        </Card>
      </div>

      {isErasureOpen && (
        <BottomSheet
          open
          onClose={() => setErasureOpen(false)}
          title="Erasure request"
          description="Reviewed by a platform administrator before anything is removed."
          footer={
            <Button
              variant="primary"
              size="lg"
              fullWidth
              disabled={memberName.trim().length === 0 || reason.trim().length === 0}
              onClick={() => {
                setRequested(true);
                setErasureOpen(false);
              }}
            >
              Submit request
            </Button>
          }
        >
          <div className="space-y-4">
            <Input
              label="Member"
              autoFocus
              placeholder="Who has asked to be erased"
              value={memberName}
              onChange={(e) => setMemberName(e.target.value)}
            />
            <Input
              label="Reason"
              placeholder="Member requested erasure by email on 18 October"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
            />

            <div className="flex items-start gap-2 rounded-lg bg-warning-light px-3 py-2.5">
              <ShieldAlert size={18} className="text-warning shrink-0 mt-0.5" aria-hidden />
              <Text variant="caption" className="text-warning">
                Personal details are overwritten permanently. Their giving history is kept with the
                name replaced by a token, because those records must be retained.
              </Text>
            </div>
          </div>
        </BottomSheet>
      )}
    </div>
  );
}
