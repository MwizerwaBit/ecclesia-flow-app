/**
 * @file ReportsHome.tsx
 * @description The Reports module's first screen: pick a report, set its
 * filters, read the table, download it as a spreadsheet.
 *
 * Reports are described by the API (title, columns, filters), so a new report
 * appears here without a new screen. Richer filters, charts and formatted
 * exports are the next step; the shape for them is already in the response.
 */
import { useState } from 'react';
import { useMutation, useQuery } from '@tanstack/react-query';
import { Download } from 'lucide-react';
import { reportsService, type ReportColumn, type ReportInfo } from '@/services/reportsService';
import { saveBlob } from '@/lib/download';
import { errorMessage } from '@/lib/errors';
import { toast } from '@/hooks/useToastStore';
import { Button, Card, Input, Text } from '@/components/ui';

function cell(value: string | number, column: ReportColumn): string {
  if (column.kind === 'percent') return `${(Number(value) * 100).toFixed(1)}%`;
  if (column.kind === 'number') return Number(value).toLocaleString();
  return String(value);
}

function ReportView({ report }: { report: ReportInfo }) {
  const [filters, setFilters] = useState<Record<string, string>>({});
  const [applied, setApplied] = useState<Record<string, string>>({});

  const result = useQuery({
    queryKey: ['reports', report.key, applied],
    queryFn: () => reportsService.run(report.key, applied),
  });

  const download = useMutation({
    mutationFn: async () => saveBlob(await reportsService.csv(report.key, applied), `${report.key}.csv`),
    onError: (e) => toast.error(errorMessage(e)),
  });

  return (
    <Card padding="lg" className="space-y-4">
      <div>
        <Text variant="h3">{report.title}</Text>
        <Text variant="body-sm" color="muted">{report.description}</Text>
      </div>

      {report.filters.length > 0 && (
        <form
          className="flex flex-wrap items-end gap-3"
          onSubmit={(e) => {
            e.preventDefault();
            // Fields left alone keep the server's defaults, so send what is shown.
            setApplied(Object.fromEntries(report.filters.map((f) => [f.key, filters[f.key] ?? result.data?.filters[f.key] ?? ''])));
          }}
        >
          {report.filters.map((f) => (
            <Input
              key={f.key}
              label={f.label}
              type="date"
              value={filters[f.key] ?? result.data?.filters[f.key] ?? ''}
              onChange={(e) => setFilters({ ...filters, [f.key]: e.target.value })}
              className="w-44"
            />
          ))}
          <Button type="submit" variant="outline">Apply</Button>
        </form>
      )}

      {result.isError && <div role="alert" className="text-body-sm text-danger">{errorMessage(result.error)}</div>}

      {result.data && (
        <div className="overflow-x-auto rounded-lg border border-slate-200 dark:border-slate-700">
          <table className="w-full text-left text-body-sm">
            <thead className="bg-slate-50 text-slate-500 dark:bg-slate-800/50">
              <tr>
                {result.data.columns.map((c) => (
                  <th key={c.key} className={`px-3 py-2 font-medium ${c.kind === 'text' ? '' : 'text-right'}`}>{c.label}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {result.data.rows.map((row, i) => (
                <tr key={i} className="border-t border-slate-100 dark:border-slate-800">
                  {result.data.columns.map((c) => (
                    <td key={c.key} className={`px-3 py-2 ${c.kind === 'text' ? '' : 'text-right tabular-nums'}`}>
                      {cell(row[c.key], c)}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <Button variant="outline" onClick={() => download.mutate()} isLoading={download.isPending} disabled={!result.data}>
        <Download size={16} aria-hidden /> Download as spreadsheet
      </Button>
    </Card>
  );
}

export function ReportsHome() {
  const { data: reports = [], isLoading, error } = useQuery({
    queryKey: ['reports', 'list'],
    queryFn: () => reportsService.list(),
  });

  return (
    <div className="mx-auto max-w-3xl space-y-6 p-4 xl:p-6">
      <div>
        <Text variant="h1" className="mb-1">Reports</Text>
        <Text variant="body" color="muted">Counts and trends for the people you can see, with spreadsheet downloads.</Text>
      </div>
      {isLoading && <Text variant="body-sm" color="muted">Loading…</Text>}
      {error && <div role="alert" className="text-body-sm text-danger">{errorMessage(error)}</div>}
      {reports.map((r) => (
        <ReportView key={r.key} report={r} />
      ))}
    </div>
  );
}

export default ReportsHome;
