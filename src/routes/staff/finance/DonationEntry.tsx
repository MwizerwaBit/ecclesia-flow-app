/**
 * @file DonationEntry.tsx
 * @description US-035/036 — the critical finance screen.
 *
 * A counting team works through a tray of envelopes: number → fund → amount → next.
 * The loop is the product here, so after each submit the form resets to the giver
 * field with the fund and payment method carried forward, because a tray is
 * usually all cash for one fund. The running batch total is always visible, since
 * that is what the team reconciles against at the end.
 */
import { useMemo, useRef, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { ArrowRight, Hash, Search, Check } from 'lucide-react';
import type { DonationEntryForm, PaymentMethod } from '@/types';
import { financeService } from '@/services/financeService';
import { membersService } from '@/services/membersService';
import { Button, Card, Input, SegmentedControl, Select, Text } from '@/components/ui';
import { StickyActionBar } from '@/components/layout';
import { formatCurrency } from '@/lib/formatters';
import { cn } from '@/lib/cn';

type EntryMode = 'member_search' | 'envelope';

const PAYMENT_METHODS: Array<{ value: PaymentMethod; label: string }> = [
  { value: 'cash', label: 'Cash' },
  { value: 'check', label: 'Check' },
  { value: 'transfer', label: 'Transfer' },
  { value: 'mobile_money', label: 'Mobile' },
];

export function DonationEntry() {
  const { batchId = '' } = useParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const giverInputRef = useRef<HTMLInputElement>(null);

  const [mode, setMode] = useState<EntryMode>('envelope');
  const [giverQuery, setGiverQuery] = useState('');
  const [selectedMemberId, setSelectedMemberId] = useState<string | null>(null);
  const [amount, setAmount] = useState('');
  /** Empty until the user picks — the church's default fund fills in below. */
  const [fundId, setFundId] = useState('');
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('cash');
  const [memo, setMemo] = useState('');
  const [error, setError] = useState<string | null>(null);
  /** Entries recorded in this sitting — separate from the batch's stored total. */
  const [sessionEntries, setSessionEntries] = useState<Array<{ name: string; amount: number }>>([]);
  const [justSavedName, setJustSavedName] = useState<string | null>(null);

  const { data: batch } = useQuery({
    queryKey: ['batch', batchId],
    queryFn: () => financeService.getBatch(batchId),
    enabled: Boolean(batchId),
  });

  const { data: funds = [] } = useQuery({
    queryKey: ['funds'],
    queryFn: () => financeService.listFunds(),
  });

  const { data: members = [] } = useQuery({
    queryKey: ['members', 'roster'],
    queryFn: () => membersService.list(),
  });

  // Derived rather than pushed into state by an effect: until the counter chooses
  // a fund, the church's default one stands in.
  const activeFundId = fundId || (funds.find((f) => f.isDefault) ?? funds[0])?.id || '';

  const matches = useMemo(() => {
    const q = giverQuery.trim().toLowerCase();
    if (!q || selectedMemberId) return [];
    return members
      .filter((m) =>
        mode === 'envelope'
          ? (m.envelopeNumber ?? '').includes(q)
          : `${m.firstName} ${m.lastName}`.toLowerCase().includes(q),
      )
      .slice(0, 5);
  }, [giverQuery, members, mode, selectedMemberId]);

  const selectedMember = members.find((m) => m.id === selectedMemberId);
  const sessionTotal = sessionEntries.reduce((sum, e) => sum + e.amount, 0);
  const batchTotal = (batch?.totalAmount ?? 0) + sessionTotal;
  const batchCount = (batch?.donationCount ?? 0) + sessionEntries.length;
  const parsedAmount = Number.parseFloat(amount);

  const createDonation = useMutation({
    mutationFn: (form: DonationEntryForm) => financeService.createDonation(batchId, form),
    onSuccess: (donation) => {
      const name = donation.memberName ?? donation.guestName ?? 'Unmatched envelope';
      setSessionEntries((prev) => [...prev, { name, amount: donation.amount }]);
      setJustSavedName(name);
      window.setTimeout(() => setJustSavedName(null), 2200);

      // Reset the giver and amount only — fund and method carry to the next envelope.
      setGiverQuery('');
      setSelectedMemberId(null);
      setAmount('');
      setMemo('');
      setError(null);
      giverInputRef.current?.focus();

      void queryClient.invalidateQueries({ queryKey: ['batch', batchId] });
    },
    onError: () => setError('That entry did not save. Check the amount and try again.'),
  });

  function submit() {
    if (!Number.isFinite(parsedAmount) || parsedAmount <= 0) {
      setError('Enter an amount greater than zero.');
      return;
    }
    if (!activeFundId) {
      setError('Choose a fund for this gift.');
      return;
    }

    // An envelope with no matching member is still recorded — it is resolved at
    // batch review rather than blocking the counting team now.
    createDonation.mutate({
      mode: mode === 'envelope' ? 'envelope' : 'member_search',
      envelopeNumber: mode === 'envelope' ? giverQuery.trim() || undefined : selectedMember?.envelopeNumber,
      memberId: selectedMember?.id,
      memberName: selectedMember
        ? `${selectedMember.firstName} ${selectedMember.lastName}`
        : undefined,
      isGuest: !selectedMember,
      guestName: !selectedMember && mode === 'member_search' ? giverQuery.trim() : undefined,
      fundId: activeFundId,
      amount: parsedAmount,
      paymentMethod,
      notes: memo.trim() || undefined,
    });
  }

  return (
    <div className="w-full animate-fade-in pb-[calc(4rem+13rem)] lg:pb-56">
      <div className="max-w-2xl mx-auto px-4 py-6 space-y-6">
        <header className="flex items-start justify-between gap-4">
          <div className="min-w-0">
            <Text variant="h1" className="mb-1">
              Record giving
            </Text>
            <Text variant="body-sm" color="muted" className="truncate">
              {batch?.name ?? 'Loading batch…'}
            </Text>
          </div>
          <Link to={`/staff/finance/batches/${batchId}/review`}>
            <Button variant="ghost" size="sm">
              Batch
            </Button>
          </Link>
        </header>

        {/* Giver */}
        <div className="space-y-3">
          <SegmentedControl
            label="How to identify the giver"
            value={mode}
            onChange={(next) => {
              setMode(next);
              setGiverQuery('');
              setSelectedMemberId(null);
            }}
            options={[
              { value: 'envelope', label: 'Envelope #' },
              { value: 'member_search', label: 'By name' },
            ]}
          />

          <div className="relative">
            <Input
              ref={giverInputRef}
              label="Giver"
              autoFocus
              inputMode={mode === 'envelope' ? 'numeric' : 'text'}
              placeholder={mode === 'envelope' ? 'Envelope number' : 'Search by name'}
              leftIcon={mode === 'envelope' ? Hash : Search}
              value={selectedMember ? `${selectedMember.firstName} ${selectedMember.lastName}` : giverQuery}
              onChange={(e) => {
                setSelectedMemberId(null);
                setGiverQuery(e.target.value);
              }}
              className="[&_input]:h-14 [&_input]:text-body-lg"
            />

            {matches.length > 0 && (
              <Card
                padding="none"
                className="absolute z-dropdown mt-1 w-full divide-y divide-slate-100 dark:divide-slate-800"
              >
                {matches.map((m) => (
                  <button
                    key={m.id}
                    type="button"
                    onClick={() => {
                      setSelectedMemberId(m.id);
                      setGiverQuery('');
                    }}
                    className="w-full px-4 py-3 text-left hover:bg-slate-50 dark:hover:bg-slate-800/60 transition-colors"
                  >
                    <p className="font-member-name text-body-lg text-slate-900 dark:text-slate-100">
                      {m.firstName} {m.lastName}
                    </p>
                    <Text variant="caption" color="muted">
                      {m.envelopeNumber ? `#${m.envelopeNumber}` : 'No envelope'}
                      {m.unitName ? ` · ${m.unitName}` : ''}
                    </Text>
                  </button>
                ))}
              </Card>
            )}
          </div>

          {selectedMember && (
            <Text variant="caption" className="text-success flex items-center gap-1">
              <Check size={14} aria-hidden /> Matched to a member record
            </Text>
          )}
          {mode === 'envelope' && giverQuery && matches.length === 0 && !selectedMember && (
            <Text variant="caption" color="muted">
              No member holds that envelope — it will be flagged for review at batch close.
            </Text>
          )}
        </div>

        {/* Amount — the biggest target on the screen */}
        <Card variant="outline" padding="lg" className="flex flex-col items-center">
          <Text variant="label" color="muted" className="mb-3">
            Amount
          </Text>
          <div className="flex w-full items-baseline justify-center">
            <span className="font-display text-h1 text-primary mr-1.5">$</span>
            <input
              type="text"
              inputMode="decimal"
              aria-label="Donation amount"
              placeholder="0.00"
              value={amount}
              onChange={(e) => {
                setAmount(e.target.value.replace(/[^0-9.]/g, ''));
                setError(null);
              }}
              className="w-full max-w-[260px] bg-transparent border-none text-center font-display text-[3rem] leading-tight font-semibold tabular-nums text-slate-900 dark:text-slate-100 focus:ring-0 outline-none placeholder:text-slate-300 dark:placeholder:text-slate-700"
            />
          </div>
        </Card>

        {/* Fund + method */}
        <div className="grid gap-4 lg:grid-cols-2">
          <Select
            label="Fund"
            value={activeFundId}
            onChange={(e) => setFundId(e.target.value)}
            options={funds.map((f) => ({ value: f.id, label: f.name }))}
          />

          <div className="flex flex-col gap-1.5">
            <span className="text-label text-slate-700 dark:text-slate-300">Payment method</span>
            <div className="grid grid-cols-4 gap-2">
              {PAYMENT_METHODS.map((method) => (
                <button
                  key={method.value}
                  type="button"
                  onClick={() => setPaymentMethod(method.value)}
                  aria-pressed={paymentMethod === method.value}
                  className={cn(
                    'h-11 rounded-lg border text-body-sm font-medium transition-all duration-fast',
                    paymentMethod === method.value
                      ? 'bg-primary-light dark:bg-primary/15 border-primary text-primary'
                      : 'bg-surface dark:bg-surface-dark border-slate-200 dark:border-slate-700 text-slate-500',
                  )}
                >
                  {method.label}
                </button>
              ))}
            </div>
          </div>
        </div>

        <Input
          label="Memo / check number"
          placeholder="Optional reference"
          value={memo}
          onChange={(e) => setMemo(e.target.value)}
        />

        {error && (
          <Text variant="body-sm" className="text-danger" role="alert">
            {error}
          </Text>
        )}

        {/* Recent entries give the counter a way to catch a slip immediately */}
        {sessionEntries.length > 0 && (
          <div>
            <Text variant="label" color="muted" className="mb-2 block">
              Recorded in this sitting
            </Text>
            <Card padding="none" className="divide-y divide-slate-100 dark:divide-slate-800">
              {[...sessionEntries]
                .slice(-4)
                .reverse()
                .map((entry, i) => (
                  <div key={`${entry.name}-${i}`} className="flex justify-between px-4 py-2.5">
                    <Text variant="body-sm" className="truncate">
                      {entry.name}
                    </Text>
                    <Text variant="body-sm" className="tabular-nums font-medium">
                      {formatCurrency(entry.amount)}
                    </Text>
                  </div>
                ))}
            </Card>
          </div>
        )}
      </div>

      {/* Sticky action bar — total, count, and the loop */}
      <StickyActionBar contentClassName="space-y-3">
          {justSavedName && (
            <div className="flex items-center gap-2 rounded-lg bg-success-light px-3 py-2 animate-fade-in">
              <Check size={16} className="text-success" aria-hidden />
              <Text variant="body-sm" className="text-success truncate">
                Recorded for {justSavedName}
              </Text>
            </div>
          )}

          <div className="flex items-end justify-between">
            <div>
              <Text variant="label" color="muted">
                Batch total
              </Text>
              <Text variant="number" className="tabular-nums">
                {formatCurrency(batchTotal)}
              </Text>
            </div>
            <div className="text-right">
              <Text variant="label" color="muted">
                Entries
              </Text>
              <Text variant="h3" className="tabular-nums">
                {batchCount}
              </Text>
            </div>
          </div>

          <Button
            variant="primary"
            size="lg"
            fullWidth
            rightIcon={ArrowRight}
            isLoading={createDonation.isPending}
            onClick={submit}
          >
            Submit &amp; next
          </Button>

          <Button
            variant="ghost"
            fullWidth
            size="sm"
            onClick={() => navigate(`/staff/finance/batches/${batchId}/review`)}
          >
            Finish and review batch
          </Button>
      </StickyActionBar>
    </div>
  );
}
