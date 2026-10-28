/**
 * @file DataExchange.tsx
 * @description Import and export of the church's data as spreadsheets.
 *
 * Built for onboarding: download the empty template (or an export, which has
 * the same columns), fill it in, check it, then import. Checking saves nothing
 * and lists every problem by row, so a church fixes the sheet once instead of
 * discovering errors one person at a time.
 */
import { useRef, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { CheckCircle2, Download, FileSpreadsheet, TriangleAlert, Upload } from 'lucide-react';
import { dataService, type Dataset, type ImportReport } from '@/services/dataService';
import { saveBlob } from '@/lib/download';
import { errorMessage } from '@/lib/errors';
import { toast } from '@/hooks/useToastStore';
import { Badge, Button, Card, Checkbox, Text } from '@/components/ui';

const MAX_FILE_BYTES = 2 * 1024 * 1024;

function ColumnGuide({ dataset }: { dataset: Dataset }) {
  return (
    <details className="rounded-lg border border-slate-200 dark:border-slate-700">
      <summary className="min-h-11 cursor-pointer px-3 py-2.5 text-body-sm font-medium">
        What goes in each column ({dataset.columns.length})
      </summary>
      <div className="overflow-x-auto border-t border-slate-200 dark:border-slate-700">
        <table className="w-full text-left text-body-sm">
          <thead className="text-slate-500">
            <tr>
              <th className="px-3 py-2 font-medium">Column</th>
              <th className="px-3 py-2 font-medium">What to write</th>
              <th className="px-3 py-2 font-medium">Example</th>
            </tr>
          </thead>
          <tbody>
            {dataset.columns.map((c) => (
              <tr key={c.key} className="border-t border-slate-100 align-top dark:border-slate-800">
                <td className="whitespace-nowrap px-3 py-2 font-mono text-caption">
                  {c.key}
                  {c.required && <span className="ml-1 text-danger" title="Required">*</span>}
                </td>
                <td className="px-3 py-2">{c.help || c.label}</td>
                <td className="px-3 py-2 text-slate-500">{c.example}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </details>
  );
}

function ImportPanel({ dataset }: { dataset: Dataset }) {
  const queryClient = useQueryClient();
  const input = useRef<HTMLInputElement>(null);
  const [file, setFile] = useState<File | null>(null);
  const [report, setReport] = useState<ImportReport | null>(null);
  const [consent, setConsent] = useState(false);
  const [skipInvalid, setSkipInvalid] = useState(false);

  const check = useMutation({
    mutationFn: (f: File) => dataService.importFile(dataset.key, f, { commit: false }),
    onSuccess: setReport,
    meta: { inline: true },
  });
  const commit = useMutation({
    mutationFn: () => {
      if (!file) throw new Error('Choose a file first');
      return dataService.importFile(dataset.key, file, { commit: true, consentConfirmed: consent, skipInvalid });
    },
    onSuccess: (done) => {
      setReport(done);
      if (done.committed) {
        toast.success(`${done.valid} imported`);
        void queryClient.invalidateQueries({ queryKey: ['members'] });
      }
    },
    meta: { inline: true },
  });

  function pick(f: File | undefined) {
    if (!f) return;
    setReport(null);
    commit.reset();
    if (f.size > MAX_FILE_BYTES) {
      setFile(null);
      toast.error('That file is over 2 MB. Split it into smaller files.');
      return;
    }
    setFile(f);
    check.mutate(f);
  }

  const error = check.error ?? commit.error;
  const canImport = !!report && !report.committed && report.valid > 0 && consent && (report.failed === 0 || skipInvalid);

  return (
    <Card padding="lg" className="space-y-4">
      <div>
        <Text variant="h3">Import</Text>
        <Text variant="body-sm" color="muted">
          Choose your filled-in file. We check it first and save nothing until you confirm.
        </Text>
      </div>

      <input
        ref={input}
        type="file"
        accept=".csv,text/csv"
        className="sr-only"
        aria-label="Spreadsheet file (CSV)"
        onChange={(e) => {
          pick(e.target.files?.[0]);
          e.target.value = '';
        }}
      />
      <Button variant="secondary" onClick={() => input.current?.click()} isLoading={check.isPending}>
        <Upload size={16} aria-hidden /> {file ? 'Choose a different file' : 'Choose a CSV file'}
      </Button>
      {file && <Text variant="body-sm" color="muted">{file.name}</Text>}

      {error && (
        <div role="alert" className="rounded-lg border border-danger/20 bg-danger-light p-3 text-body-sm font-medium text-danger">
          {errorMessage(error)}
        </div>
      )}

      {report && (
        <div className="space-y-3" aria-live="polite">
          {report.committed ? (
            <div className="flex items-start gap-2 rounded-lg bg-success-light p-3 text-body-sm text-success">
              <CheckCircle2 size={18} className="mt-0.5 shrink-0" aria-hidden />
              <span>
                Imported {report.valid} {report.valid === 1 ? 'person' : 'people'}.
                {report.duplicates > 0 && ` ${report.duplicates} already on file were left out.`}
                {report.failed > 0 && ` ${report.failed} could not be imported (listed below).`}
              </span>
            </div>
          ) : (
            <div className="flex flex-wrap gap-2">
              <Badge variant="success">{report.valid} ready</Badge>
              {report.duplicates > 0 && <Badge variant="neutral">{report.duplicates} already on file</Badge>}
              {report.failed > 0 && <Badge variant="danger">{report.failed} need fixing</Badge>}
            </div>
          )}

          {report.notes.map((n) => (
            <Text key={n} variant="body-sm" color="muted">{n}</Text>
          ))}

          {report.issues.length > 0 && (
            <ul className="max-h-80 divide-y divide-slate-100 overflow-y-auto rounded-lg border border-slate-200 text-body-sm dark:divide-slate-800 dark:border-slate-700">
              {report.issues.map((i) => (
                <li key={i.row} className="flex gap-3 p-3">
                  <TriangleAlert
                    size={16}
                    aria-hidden
                    className={i.status === 'error' ? 'mt-0.5 shrink-0 text-danger' : 'mt-0.5 shrink-0 text-slate-400'}
                  />
                  <div>
                    <strong>Row {i.row}: {i.name}</strong>
                    {i.messages.map((m) => (
                      <div key={m} className="text-slate-600 dark:text-slate-300">{m}</div>
                    ))}
                  </div>
                </li>
              ))}
              {report.issuesTruncated && <li className="p-3 text-slate-500">Only the first problems are shown. Fix these and check again.</li>}
            </ul>
          )}

          {!report.committed && report.valid > 0 && (
            <div className="space-y-2 border-t border-slate-100 pt-3 dark:border-slate-800">
              {report.failed > 0 && (
                <Checkbox
                  checked={skipInvalid}
                  onChange={(e) => setSkipInvalid(e.target.checked)}
                  label="Import the good rows and leave out the ones that need fixing"
                />
              )}
              <Checkbox
                checked={consent}
                onChange={(e) => setConsent(e.target.checked)}
                label="These people agreed to have their details recorded by this church"
                description="Membership reveals religious belief, which data-protection law treats as sensitive. This is recorded in the audit log."
              />
              <Button onClick={() => commit.mutate()} isLoading={commit.isPending} disabled={!canImport}>
                Import {skipInvalid || report.failed === 0 ? report.valid : 0} {report.valid === 1 ? 'person' : 'people'}
              </Button>
            </div>
          )}
        </div>
      )}
    </Card>
  );
}

function DatasetSection({ dataset }: { dataset: Dataset }) {
  const download = useMutation({
    mutationFn: async (kind: 'template' | 'export') => {
      const blob = kind === 'template' ? await dataService.templateFile(dataset.key) : await dataService.exportFile(dataset.key);
      saveBlob(blob, kind === 'template' ? `${dataset.key}-template.csv` : `${dataset.key}.csv`);
    },
    onError: (e) => toast.error(errorMessage(e)),
  });

  return (
    <section className="space-y-4">
      <Card padding="lg" className="space-y-4">
        <div className="flex items-start gap-3">
          <FileSpreadsheet size={24} className="mt-0.5 text-primary" aria-hidden />
          <div>
            <Text variant="h3">{dataset.label}</Text>
            <Text variant="body-sm" color="muted">{dataset.description}</Text>
          </div>
        </div>

        <div className="flex flex-wrap gap-2">
          {dataset.canImport && (
            <Button variant="secondary" onClick={() => download.mutate('template')} isLoading={download.isPending && download.variables === 'template'}>
              <Download size={16} aria-hidden /> Empty template
            </Button>
          )}
          {dataset.canExport && (
            <Button variant="secondary" onClick={() => download.mutate('export')} isLoading={download.isPending && download.variables === 'export'}>
              <Download size={16} aria-hidden /> Export current data
            </Button>
          )}
        </div>
        {dataset.canExport ? (
          <Text variant="caption" color="muted">
            An export uses the same columns as the template, so it works as a template too. Downloads are recorded in the audit log and need two-step sign-in.
          </Text>
        ) : (
          <Text variant="caption" color="muted">Exporting existing data needs the export permission.</Text>
        )}
        <ColumnGuide dataset={dataset} />
      </Card>

      {dataset.canImport && <ImportPanel dataset={dataset} />}
    </section>
  );
}

export function DataExchange() {
  const { data: datasets = [], isLoading, error } = useQuery({
    queryKey: ['data', 'datasets'],
    queryFn: () => dataService.datasets(),
  });

  return (
    <div className="mx-auto max-w-3xl space-y-6 p-4 xl:p-6">
      <div>
        <Text variant="h1" className="mb-1">Import and export</Text>
        <Text variant="body" color="muted">
          Move your people in from a spreadsheet, or take them out. Start with the empty template.
        </Text>
      </div>
      {isLoading && <Text variant="body-sm" color="muted">Loading…</Text>}
      {error && <div role="alert" className="text-body-sm text-danger">{errorMessage(error)}</div>}
      {datasets.map((d) => (
        <DatasetSection key={d.key} dataset={d} />
      ))}
    </div>
  );
}

export default DataExchange;
