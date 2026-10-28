/**
 * @file dataService.ts
 * @description Spreadsheet export and import of the church's own data.
 *
 * The empty template and an export share one header, so either is a valid file
 * to fill in and import. Importing is two steps: `check` saves nothing and
 * reports every problem; `commit` saves, and the server refuses a file with bad
 * rows unless `skipInvalid` is set.
 */
import { apiBlob, apiRequest, requireApi } from './adapter';

export interface DataColumn {
  key: string;
  label: string;
  required: boolean;
  help: string;
  example: string;
}

export interface Dataset {
  key: string;
  label: string;
  description: string;
  canImport: boolean;
  canExport: boolean;
  columns: DataColumn[];
}

export interface ImportRowResult {
  row: number;
  status: 'ok' | 'duplicate' | 'error';
  name: string;
  messages: string[];
}

export interface ImportReport {
  dataset: string;
  dryRun: boolean;
  committed: boolean;
  totalRows: number;
  valid: number;
  duplicates: number;
  failed: number;
  notes: string[];
  issues: ImportRowResult[];
  issuesTruncated: boolean;
}

export const dataService = {
  async datasets(): Promise<Dataset[]> {
    requireApi('Import and export');
    return apiRequest<Dataset[]>('/data/datasets');
  },

  templateFile(dataset: string): Promise<Blob> {
    requireApi('Import and export');
    return apiBlob(`/data/templates/${encodeURIComponent(dataset)}.csv`);
  },

  exportFile(dataset: string): Promise<Blob> {
    requireApi('Import and export');
    return apiBlob(`/data/exports/${encodeURIComponent(dataset)}.csv`);
  },

  async importFile(
    dataset: string,
    file: File,
    options: { commit: boolean; consentConfirmed?: boolean; skipInvalid?: boolean },
  ): Promise<ImportReport> {
    requireApi('Import');
    const body = new FormData();
    body.append('file', file);
    body.append('dry_run', String(!options.commit));
    body.append('consent_confirmed', String(!!options.consentConfirmed));
    body.append('skip_invalid', String(!!options.skipInvalid));
    return apiRequest<ImportReport>(`/data/imports/${encodeURIComponent(dataset)}`, {
      method: 'POST',
      body,
      rawBody: true,
    });
  },
};
