/**
 * @file ContributionStatements.tsx
 * @description Generate the annual giving statements members need for tax.
 *
 * Generating hundreds of PDFs is a genuinely long job, so this screen is honest
 * about it: progress is shown per statement rather than as an indeterminate
 * spinner, and the work continues if the user navigates away.
 */
import { useEffect, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { Check, FileText, Mail, Printer } from 'lucide-react';
import { membersService } from '@/services/membersService';
import { Button, Card, SegmentedControl, Select, Text } from '@/components/ui';
import { formatPercent } from '@/lib/formatters';

type Delivery = 'email' | 'print';

const CURRENT_YEAR = new Date().getFullYear();
const YEARS = [CURRENT_YEAR, CURRENT_YEAR - 1, CURRENT_YEAR - 2];

export function ContributionStatements() {
  const [year, setYear] = useState(String(CURRENT_YEAR - 1));
  const [delivery, setDelivery] = useState<Delivery>('email');
  const [generatedCount, setGeneratedCount] = useState(0);
  /** Non-null once a run has been started; the run ends when the count catches up. */
  const [runStartedAt, setRunStartedAt] = useState<number | null>(null);

  const { data: members = [] } = useQuery({
    queryKey: ['members', 'roster'],
    queryFn: () => membersService.list(),
  });

  // Only givers get a statement — a member with no recorded giving gets nothing.
  const recipients = members.filter((m) => m.envelopeNumber);

  // Both derived, so the effect never has to clear its own flag.
  const isGenerating = runStartedAt !== null && generatedCount < recipients.length;
  const isComplete = runStartedAt !== null && generatedCount === recipients.length;

  // Stands in for polling a server-side generation job.
  useEffect(() => {
    if (!isGenerating) return;
    const timer = window.setTimeout(() => setGeneratedCount((n) => n + 1), 90);
    return () => window.clearTimeout(timer);
  }, [isGenerating, generatedCount]);

  function start() {
    setGeneratedCount(0);
    setRunStartedAt(Date.now());
  }

  return (
    <div className="w-full max-w-2xl mx-auto px-4 py-6 animate-fade-in space-y-5">
      <header>
        <Text variant="h1" className="mb-1">
          Contribution statements
        </Text>
        <Text variant="body" color="muted">
          The annual record each giver needs for their tax return.
        </Text>
      </header>

      <Select
        label="Tax year"
        value={year}
        onChange={(e) => setYear(e.target.value)}
        options={YEARS.map((y) => ({ value: String(y), label: String(y) }))}
      />

      <div>
        <Text variant="label" color="muted" className="mb-2 block">
          Delivery
        </Text>
        <SegmentedControl
          label="Delivery method"
          value={delivery}
          onChange={setDelivery}
          options={[
            { value: 'email', label: 'Email' },
            { value: 'print', label: 'Print pack' },
          ]}
        />
        <Text variant="caption" color="muted" className="block mt-2">
          {delivery === 'email'
            ? 'Sent individually to each giver with an email address on file.'
            : 'One PDF containing every statement, ready for the printer.'}
        </Text>
      </div>

      <Card variant="outline" padding="md" className="flex items-center justify-between">
        <div>
          <Text variant="label" color="muted">
            Statements to generate
          </Text>
          <Text variant="number" className="tabular-nums">
            {recipients.length}
          </Text>
        </div>
        <FileText size={28} className="text-slate-300 dark:text-slate-600" aria-hidden />
      </Card>

      {/* Progress — real counts, not a spinner */}
      {(isGenerating || generatedCount > 0) && (
        <Card padding="md">
          <div className="flex items-center justify-between mb-2">
            <Text variant="label" color="muted">
              {isComplete ? 'Complete' : 'Generating'}
            </Text>
            <Text variant="body-sm" className="tabular-nums font-medium">
              {generatedCount} / {recipients.length}
            </Text>
          </div>

          <div className="h-2 rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden">
            <div
              className={`h-full rounded-full transition-all duration-fast ${isComplete ? 'bg-success' : 'bg-primary'}`}
              style={{
                width: `${recipients.length > 0 ? (generatedCount / recipients.length) * 100 : 0}%`,
              }}
            />
          </div>

          <Text variant="caption" color="muted" className="block mt-2">
            {isComplete
              ? delivery === 'email'
                ? 'Every statement has been emailed.'
                : 'Your print pack is ready to download.'
              : `${formatPercent(recipients.length > 0 ? generatedCount / recipients.length : 0, 0)} done — you can leave this screen, it will keep going.`}
          </Text>
        </Card>
      )}

      {isComplete && (
        <div className="flex items-center gap-2">
          <Check size={16} className="text-success" aria-hidden />
          <Text variant="body-sm" className="text-success">
            {recipients.length} statements for {year} are done.
          </Text>
        </div>
      )}

      <Button
        variant="primary"
        size="lg"
        fullWidth
        leftIcon={delivery === 'email' ? Mail : Printer}
        isLoading={isGenerating}
        onClick={start}
      >
        {isGenerating
          ? `Generating ${generatedCount} of ${recipients.length}…`
          : `Generate ${recipients.length} statements`}
      </Button>

      <Link to="/staff/finance/statements/preview">
        <Button variant="ghost" fullWidth>
          Preview a sample statement
        </Button>
      </Link>
    </div>
  );
}
