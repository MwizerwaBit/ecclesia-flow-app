/**
 * @file StatementPreview.tsx
 * @description The rendered statement, exactly as the giver will receive it.
 *
 * Laid out as a document rather than an app screen — white paper, serif headings,
 * a real total. It is checked before several hundred copies go out, so it is
 * worth showing the thing itself rather than a summary of it.
 */
import { useQuery } from '@tanstack/react-query';
import { Download, Mail } from 'lucide-react';
import { financeService } from '@/services/financeService';
import { printPage } from '@/lib/download';
import { Button, Card, Text } from '@/components/ui';
import { formatCurrency, formatDate } from '@/lib/formatters';

const ORG = {
  name: "St. Jude's Parish",
  address: '14 Cathedral Close, Springfield, IL 62701',
  taxReference: 'EIN 47-2810394',
};

const STATEMENT_YEAR = new Date().getFullYear() - 1;

export function StatementPreview() {
  const { data: donations = [] } = useQuery({
    queryKey: ['donations', 'batch-1'],
    queryFn: () => financeService.listDonations('batch-1'),
  });

  const lines = donations.filter((d) => !d.isVoided);
  const total = lines.reduce((sum, d) => sum + d.amount, 0);
  const recipient = lines[0]?.memberName ?? 'Aaron Smith';

  return (
    <div className="w-full max-w-2xl mx-auto px-4 py-6 animate-fade-in space-y-5">
      <header>
        <Text variant="h1" className="mb-1">
          Statement preview
        </Text>
        <Text variant="body" color="muted">
          Check this before sending — it goes out under your church&rsquo;s name.
        </Text>
      </header>

      {/* The document. Fixed light styling: this is paper, not UI. */}
      <Card padding="none" className="overflow-hidden">
        <div className="bg-white p-8 text-slate-900">
          <div className="flex items-start justify-between gap-6 border-b border-slate-200 pb-5 mb-6">
            <div>
              <h2 className="font-display text-h2 font-semibold">{ORG.name}</h2>
              <p className="text-body-sm text-slate-500 mt-1">{ORG.address}</p>
              <p className="text-body-sm text-slate-500">{ORG.taxReference}</p>
            </div>
            <div className="text-right shrink-0">
              <p className="text-label uppercase tracking-wider text-slate-400">Statement</p>
              <p className="font-display text-h3">{STATEMENT_YEAR}</p>
            </div>
          </div>

          <div className="mb-6">
            <p className="text-label uppercase tracking-wider text-slate-400 mb-1">Issued to</p>
            <p className="font-display text-h3">{recipient}</p>
          </div>

          <table className="w-full mb-6">
            <thead>
              <tr className="border-b border-slate-200 text-left">
                <th className="pb-2 text-label uppercase tracking-wider text-slate-400 font-bold">
                  Date
                </th>
                <th className="pb-2 text-label uppercase tracking-wider text-slate-400 font-bold">
                  Fund
                </th>
                <th className="pb-2 text-label uppercase tracking-wider text-slate-400 font-bold text-right">
                  Amount
                </th>
              </tr>
            </thead>
            <tbody>
              {lines.map((donation) => (
                <tr key={donation.id} className="border-b border-slate-100">
                  <td className="py-2.5 text-body-sm">{formatDate(donation.createdAt)}</td>
                  <td className="py-2.5 text-body-sm">{donation.fundName}</td>
                  <td className="py-2.5 text-body-sm text-right tabular-nums">
                    {formatCurrency(donation.amount)}
                  </td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr>
                <td colSpan={2} className="pt-4 text-body font-medium">
                  Total contributions
                </td>
                <td className="pt-4 text-right font-display text-h3 tabular-nums">
                  {formatCurrency(total)}
                </td>
              </tr>
            </tfoot>
          </table>

          <p className="text-body-sm text-slate-500 leading-relaxed border-t border-slate-200 pt-4">
            No goods or services were provided in exchange for these contributions other than
            intangible religious benefits. Please retain this statement for your records.
          </p>

          <p className="text-body-sm text-slate-400 mt-6 text-center">
            Thank you for your faithfulness this year.
          </p>
        </div>
      </Card>

      <div className="flex gap-2">
        <a
          href={`mailto:?subject=${encodeURIComponent(`Your ${STATEMENT_YEAR} contribution statement`)}`}
          className="flex-1"
        >
          <Button variant="primary" fullWidth leftIcon={Mail}>
            Send to {recipient.split(' ')[0]}
          </Button>
        </a>
        <Button variant="secondary" leftIcon={Download} onClick={printPage}>
          PDF
        </Button>
      </div>
    </div>
  );
}
