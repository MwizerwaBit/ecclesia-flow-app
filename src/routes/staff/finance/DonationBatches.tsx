/**
 * @file DonationBatches.tsx
 * @description The list of counting sessions, newest first.
 *
 * An open batch is unfinished business — money counted but not reconciled — so
 * open batches are visually loudest and carry the resume action.
 */
import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Link, useNavigate } from 'react-router-dom';
import { Inbox, Plus } from 'lucide-react';
import type { BatchStatus } from '@/types';
import { financeService } from '@/services/financeService';
import {
  BottomSheet,
  Badge,
  Button,
  Card,
  EmptyState,
  Fab,
  Input,
  Select,
  Text,
} from '@/components/ui';
import { formatCurrency, formatDate } from '@/lib/formatters';

const STATUS_VARIANT: Record<BatchStatus, 'warning' | 'info' | 'success'> = {
  open: 'warning',
  closed: 'info',
  posted: 'success',
};

const STATUS_LABEL: Record<BatchStatus, string> = {
  open: 'Open',
  closed: 'Closed',
  posted: 'Posted',
};

export function DonationBatches() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const [isSheetOpen, setSheetOpen] = useState(false);
  const [newBatchName, setNewBatchName] = useState('');
  const [newBatchDate, setNewBatchDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [newBatchService, setNewBatchService] = useState('Sunday Morning Service');

  const { data: batches = [], isLoading } = useQuery({
    queryKey: ['batches'],
    queryFn: () => financeService.listBatches(),
  });

  const createBatch = useMutation({
    mutationFn: () =>
      financeService.createBatch({
        name: newBatchName.trim() || `Offering — ${formatDate(newBatchDate)}`,
        date: newBatchDate,
        serviceName: newBatchService,
      }),
    onSuccess: (batch) => {
      void queryClient.invalidateQueries({ queryKey: ['batches'] });
      setSheetOpen(false);
      setNewBatchName('');
      // Straight into entry — creating a batch is never the goal in itself.
      navigate(`/staff/finance/batches/${batch.id}/donations/new`);
    },
  });

  const openBatches = batches.filter((b) => b.status === 'open');

  return (
    <div className="w-full max-w-6xl mx-auto px-4 py-6 animate-fade-in">
      <header className="mb-6">
        <Text variant="h1" className="mb-1">
          Offering batches
        </Text>
        <Text variant="body" color="muted">
          {openBatches.length > 0
            ? `${openBatches.length} batch${openBatches.length > 1 ? 'es' : ''} still open`
            : 'Every batch is reconciled'}
        </Text>
      </header>

      {isLoading && (
        <Text variant="body" color="muted" className="text-center py-10">
          Loading batches…
        </Text>
      )}

      {!isLoading && batches.length === 0 && (
        <EmptyState
          icon={Inbox}
          title="No batches yet"
          description="A batch groups everything counted in one sitting, so it can be reconciled as one."
          action={
            <Button variant="primary" leftIcon={Plus} onClick={() => setSheetOpen(true)}>
              Start the first batch
            </Button>
          }
        />
      )}

      <div className="grid gap-3 xl:grid-cols-2">
        {batches.map((batch) => (
          <Card key={batch.id} padding="none" variant="elevated">
            <Link
              to={
                batch.status === 'open'
                  ? `/staff/finance/batches/${batch.id}/donations/new`
                  : `/staff/finance/batches/${batch.id}/review`
              }
              className="block p-4 hover:bg-slate-50 dark:hover:bg-slate-800/40 transition-colors"
            >
              <div className="flex items-start justify-between gap-3 mb-3">
                <div className="min-w-0">
                  <Text variant="h3" className="truncate">
                    {batch.name}
                  </Text>
                  <Text variant="caption" color="muted">
                    {formatDate(batch.date)}
                    {batch.serviceName ? ` · ${batch.serviceName}` : ''}
                  </Text>
                </div>
                <Badge variant={STATUS_VARIANT[batch.status]} dot>
                  {STATUS_LABEL[batch.status]}
                </Badge>
              </div>

              <div className="flex items-end justify-between">
                <div>
                  <Text variant="label" color="muted">
                    Total
                  </Text>
                  <Text variant="h3" className="tabular-nums">
                    {formatCurrency(batch.totalAmount)}
                  </Text>
                </div>
                <Text variant="body-sm" color="muted" className="tabular-nums">
                  {batch.donationCount} gift{batch.donationCount === 1 ? '' : 's'}
                </Text>
              </div>
            </Link>
          </Card>
        ))}
      </div>

      <Fab icon={Plus} label="New batch" onClick={() => setSheetOpen(true)} />

      <BottomSheet
        open={isSheetOpen}
        onClose={() => setSheetOpen(false)}
        title="New offering batch"
        description="Name it for the service it came from — that is how it will be found later."
        footer={
          <Button
            variant="primary"
            size="lg"
            fullWidth
            isLoading={createBatch.isPending}
            onClick={() => createBatch.mutate()}
          >
            Create and start counting
          </Button>
        }
      >
        <div className="space-y-4">
          <Input
            label="Batch name"
            placeholder={`Offering — ${formatDate(newBatchDate)}`}
            value={newBatchName}
            onChange={(e) => setNewBatchName(e.target.value)}
          />
          <Input
            label="Date"
            type="date"
            value={newBatchDate}
            onChange={(e) => setNewBatchDate(e.target.value)}
          />
          <Select
            label="Service"
            value={newBatchService}
            onChange={(e) => setNewBatchService(e.target.value)}
            options={[
              { value: 'Sunday Morning Service', label: 'Sunday Morning Service' },
              { value: 'Sunday Evening Service', label: 'Sunday Evening Service' },
              { value: 'Midweek Service', label: 'Midweek Service' },
              { value: 'Special Collection', label: 'Special Collection' },
            ]}
          />
        </div>
      </BottomSheet>
    </div>
  );
}
