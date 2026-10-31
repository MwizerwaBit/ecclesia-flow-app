/**
 * @file reportsService.ts
 * @description Reports built by the API: a list of what exists, a run with
 * filters, and the same run as a CSV file.
 */
import { apiBlob, apiRequest, requireApi } from './adapter';

export interface ReportColumn {
  key: string;
  label: string;
  kind: 'text' | 'number' | 'percent';
}

export interface ReportFilter {
  key: string;
  label: string;
  kind: 'date';
}

export interface ReportInfo {
  key: string;
  title: string;
  description: string;
  columns: ReportColumn[];
  filters: ReportFilter[];
}

export interface ReportResult {
  key: string;
  title: string;
  columns: ReportColumn[];
  rows: Record<string, string | number>[];
  /** The filters as applied, after the server's defaults. */
  filters: Record<string, string>;
}

function query(filters: Record<string, string>): string {
  const params = new URLSearchParams(Object.entries(filters).filter(([, v]) => v));
  const text = params.toString();
  return text ? `?${text}` : '';
}

export const reportsService = {
  async list(): Promise<ReportInfo[]> {
    requireApi('Reports');
    return apiRequest<ReportInfo[]>('/reports');
  },

  async run(key: string, filters: Record<string, string> = {}): Promise<ReportResult> {
    requireApi('Reports');
    return apiRequest<ReportResult>(`/reports/${encodeURIComponent(key)}${query(filters)}`);
  },

  csv(key: string, filters: Record<string, string> = {}): Promise<Blob> {
    requireApi('Reports');
    return apiBlob(`/reports/${encodeURIComponent(key)}/export.csv${query(filters)}`);
  },
};
