/**
 * @file FundManagement.tsx
 * @description The funds giving can be designated to, and how each is doing.
 *
 * Funds with a target get a progress bar; funds without one get a total. Mixing
 * the two would imply every fund is a campaign, and the general fund is not.
 */
import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { PiggyBank, Plus } from 'lucide-react';
import { financeService } from '@/services/financeService';
import {
  Badge,
  BottomSheet,
  Button,
  Card,
  EmptyState,
  Fab,
  Input,
  Text,
} from '@/components/ui';
import { formatCurrency, formatCurrencyCompact, formatPercent } from '@/lib/formatters';

export function FundManagement() {
  const [isSheetOpen, setSheetOpen] = useState(false);
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [target, setTarget] = useState('');

  const { data: funds = [], isLoading } = useQuery({
    queryKey: ['funds'],
    queryFn: () => financeService.listFunds(),
  });

  const total = funds.reduce((sum, f) => sum + f.totalReceived, 0);

  return (
    <div className="w-full max-w-5xl mx-auto px-4 py-6 animate-fade-in">
      <header className="mb-6">
        <Text variant="h1" className="mb-1">
          Funds
        </Text>
        <Text variant="body" color="muted">
          {formatCurrency(total)} received across {funds.length} funds.
        </Text>
      </header>

      {isLoading && (
        <Text variant="body" color="muted" className="text-center py-10">
          Loading funds…
        </Text>
      )}

      {!isLoading && funds.length === 0 && (
        <EmptyState
          icon={PiggyBank}
          title="No funds yet"
          description="A fund is what a gift is designated to — general offerings, a building project, benevolence."
          action={
            <Button variant="primary" leftIcon={Plus} onClick={() => setSheetOpen(true)}>
              Create the first fund
            </Button>
          }
        />
      )}

      <div className="grid gap-3 xl:grid-cols-2">
        {funds.map((fund) => {
          const progress = fund.target ? fund.totalReceived / fund.target : null;

          return (
            <Card key={fund.id} padding="md" variant="elevated">
              <div className="flex items-start justify-between gap-3 mb-2">
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <Text variant="h3" className="truncate">
                      {fund.name}
                    </Text>
                    {fund.isDefault && (
                      <Badge variant="primary" size="sm">
                        Default
                      </Badge>
                    )}
                  </div>
                  {fund.description && (
                    <Text variant="caption" color="muted">
                      {fund.description}
                    </Text>
                  )}
                </div>
                <Text variant="h3" className="tabular-nums shrink-0">
                  {formatCurrencyCompact(fund.totalReceived)}
                </Text>
              </div>

              {progress !== null ? (
                <>
                  <div className="h-2 rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden">
                    <div
                      className="h-full rounded-full bg-primary transition-all duration-slow"
                      style={{ width: `${Math.min(100, progress * 100)}%` }}
                    />
                  </div>
                  <div className="flex justify-between mt-1.5">
                    <Text variant="caption" color="muted">
                      {formatPercent(progress, 0)} of {formatCurrencyCompact(fund.target ?? 0)}
                    </Text>
                    <Text variant="caption" color="muted" className="tabular-nums">
                      {formatCurrency(Math.max(0, (fund.target ?? 0) - fund.totalReceived))} to go
                    </Text>
                  </div>
                </>
              ) : (
                <Text variant="caption" color="muted">
                  No target — an ongoing fund
                </Text>
              )}
            </Card>
          );
        })}
      </div>

      <Fab icon={Plus} label="New fund" onClick={() => setSheetOpen(true)} />

      {isSheetOpen && (
        <BottomSheet
          open
          onClose={() => setSheetOpen(false)}
          title="New fund"
          description="Givers will see this name when they choose where their gift goes."
          footer={
            <Button
              variant="primary"
              size="lg"
              fullWidth
              disabled={name.trim().length === 0}
              onClick={() => setSheetOpen(false)}
            >
              Create fund
            </Button>
          }
        >
          <div className="space-y-4">
            <Input
              label="Fund name"
              autoFocus
              placeholder="Building Fund"
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
            <Input
              label="Description"
              placeholder="Optional — what this fund is for"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
            />
            <Input
              label="Target amount"
              inputMode="decimal"
              placeholder="Optional — leave blank for an ongoing fund"
              value={target}
              onChange={(e) => setTarget(e.target.value.replace(/[^0-9.]/g, ''))}
            />
            <Text variant="caption" color="muted">
              A target turns this fund into a campaign with a progress bar on the dashboard.
            </Text>
          </div>
        </BottomSheet>
      )}
    </div>
  );
}
