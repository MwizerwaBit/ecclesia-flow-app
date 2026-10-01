/**
 * @file MyGiving.tsx
 * @description Member giving interface. Allows members to donate and view their history.
 */
import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Check, CreditCard, History } from 'lucide-react';
import { useCurrentUser } from '@/hooks/useAuthStore';
import { membersService } from '@/services/membersService';
import { financeService } from '@/services/financeService';
import { Button, Card, EmptyState, Skeleton, Text, Input, Select } from '@/components/ui';
import { formatCurrency } from '@/lib/formatters';

const PRESET_AMOUNTS = [50, 100, 250, 500];

export function MyGiving() {
  const user = useCurrentUser();
  const [amount, setAmount] = useState<string>('');
  const [fundId, setFundId] = useState<string>('');
  const [frequency, setFrequency] = useState<'one-time' | 'monthly'>('one-time');
  const [justGaveAmount, setJustGaveAmount] = useState<number | null>(null);
  const [showAllHistory, setShowAllHistory] = useState(false);

  const { data: funds = [] } = useQuery({
    queryKey: ['finance', 'funds'],
    queryFn: () => financeService.listFunds(),
  });
  const activeFundId = fundId || funds.find((f) => f.isDefault)?.id || funds[0]?.id || '';

  const { data: member } = useQuery({
    queryKey: ['members', 'me', user?.id],
    queryFn: () => membersService.getByUserId(user!.id),
    enabled: Boolean(user?.id),
  });

  const { data: donations = [], isLoading: isLoadingDonations } = useQuery({
    queryKey: ['finance', 'donations', 'me', member?.id],
    queryFn: () => financeService.listDonationsByMember(member!.id),
    enabled: Boolean(member?.id),
  });
  const visibleDonations = showAllHistory ? donations : donations.slice(0, 3);

  const handlePresetClick = (preset: number) => {
    setAmount(preset.toString());
  };

  const handleDonate = (e: React.FormEvent) => {
    e.preventDefault();
    if (!amount || isNaN(Number(amount))) return;
    // No payment processor is wired up yet — this is the missing dependency
    // (identified, not invented), so the form confirms the intent rather than
    // pretending a charge went through.
    setJustGaveAmount(Number(amount));
    setAmount('');
    window.setTimeout(() => setJustGaveAmount(null), 4000);
  };

  return (
    <div className="w-full animate-fade-in pb-8">
      {/* Header */}
      <div className="px-4 py-6 mb-2">
        <Text variant="h1" className="mb-2">Giving</Text>
        <Text variant="body" color="muted">
          "Each of you should give what you have decided in your heart to give, not reluctantly or under compulsion, for God loves a cheerful giver."
          <br /><span className="text-sm italic">— 2 Corinthians 9:7</span>
        </Text>
      </div>

      <div className="px-4 space-y-6">

        {justGaveAmount !== null && (
          <div className="flex items-center gap-2 rounded-lg bg-success-light px-4 py-3 animate-fade-in">
            <Check size={16} className="text-success shrink-0" aria-hidden />
            <Text variant="body-sm" className="text-success">
              {formatCurrency(justGaveAmount)} to {funds.find((f) => f.id === activeFundId)?.name} — a payment
              method isn&rsquo;t connected yet, so this hasn&rsquo;t actually been charged.
            </Text>
          </div>
        )}

        {/* Donation Form Card */}
        <Card padding="lg" className="border-t-4 border-t-primary shadow-md">
          <form onSubmit={handleDonate} className="space-y-6">
            
            {/* Amount Presets */}
            <div>
              <Text variant="label" className="mb-3 block text-slate-700 dark:text-slate-300">Select Amount</Text>
              <div className="grid grid-cols-4 gap-2 mb-4">
                {PRESET_AMOUNTS.map((preset) => (
                  <button
                    key={preset}
                    type="button"
                    onClick={() => handlePresetClick(preset)}
                    className={`py-3 rounded-xl border font-bold transition-all ${
                      amount === preset.toString()
                        ? 'bg-primary text-white border-primary shadow-sm scale-[1.02]'
                        : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:border-primary-light active:scale-95'
                    }`}
                  >
                    ${preset}
                  </button>
                ))}
              </div>
              
              <Input
                type="number"
                placeholder="Other Amount"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                leftIcon={() => <span className="text-slate-400 font-bold ml-1">$</span>}
                className="text-lg font-bold"
                min="1"
              />
            </div>

            {/* Fund Selection */}
            <div>
              <Select
                label="Designated Fund"
                value={activeFundId}
                onChange={(e) => setFundId(e.target.value)}
                options={funds.map((f) => ({ value: f.id, label: f.name }))}
              />
            </div>

            {/* Frequency Toggle */}
            <div>
              <Text variant="label" className="mb-2 block text-slate-700 dark:text-slate-300">Frequency</Text>
              <div className="flex p-1 bg-slate-100 dark:bg-slate-800 rounded-lg">
                <button
                  type="button"
                  onClick={() => setFrequency('one-time')}
                  className={`flex-1 py-2 text-sm font-bold rounded-md transition-all ${
                    frequency === 'one-time'
                      ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-sm'
                      : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'
                  }`}
                >
                  One-time
                </button>
                <button
                  type="button"
                  onClick={() => setFrequency('monthly')}
                  className={`flex-1 py-2 text-sm font-bold rounded-md transition-all ${
                    frequency === 'monthly'
                      ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-sm'
                      : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'
                  }`}
                >
                  Monthly
                </button>
              </div>
            </div>

            <Button 
              type="submit" 
              variant="primary" 
              size="lg" 
              fullWidth
              rightIcon={CreditCard}
              disabled={!amount || Number(amount) <= 0}
              className="mt-4 shadow-md shadow-primary/20"
            >
              Give {amount ? formatCurrency(Number(amount)) : ''}
            </Button>
          </form>
        </Card>

        {/* Giving History Summary */}
        <section className="pt-4">
          <div className="flex items-center justify-between mb-4">
            <Text variant="h3" className="flex items-center gap-2">
              <History size={20} className="text-slate-400" />
              Recent Giving
            </Text>
            {donations.length > 3 && (
              <button
                type="button"
                onClick={() => setShowAllHistory((v) => !v)}
                className="text-body-sm text-primary font-bold hover:underline"
              >
                {showAllHistory ? 'Show less' : 'View All'}
              </button>
            )}
          </div>

          {isLoadingDonations ? (
            <div className="space-y-3">
              {Array.from({ length: 3 }).map((_, i) => (
                <Skeleton key={i} className="h-16 rounded-xl" />
              ))}
            </div>
          ) : donations.length === 0 ? (
            <EmptyState
              icon={History}
              title="Nothing recorded yet"
              description="Your giving history will appear here once a gift is recorded."
            />
          ) : (
            <div className="space-y-3">
              {visibleDonations.map((donation) => (
                <Card key={donation.id} className="flex justify-between items-center p-4">
                  <div>
                    <Text variant="body-sm" className="font-bold">{donation.fundName}</Text>
                    <Text variant="caption" color="muted">
                      {new Date(donation.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                    </Text>
                  </div>
                  <Text variant="body" color="primary" className="font-bold">
                    {formatCurrency(donation.amount)}
                  </Text>
                </Card>
              ))}
            </div>
          )}
        </section>

      </div>
    </div>
  );
}
