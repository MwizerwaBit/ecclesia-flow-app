/**
 * @file download.ts
 * @description Turn data already in the browser into a file the user keeps.
 *
 * Every "Export" in this app had a button and no behaviour. These exports are
 * real: the rows are already loaded to render the screen, so producing the file
 * needs no backend and works offline. When a real API arrives, server-side
 * generation can replace this for large datasets — but a working download now
 * beats a convincing button that does nothing.
 */

/** Values a cell can hold before it is stringified for CSV. */
export type CsvValue = string | number | boolean | null | undefined;

/**
 * RFC 4180 quoting: wrap in quotes when the value contains a comma, quote or
 * newline, and double any embedded quotes. Without this, one member with a
 * comma in their address silently shifts every later column.
 */
function escapeCell(value: CsvValue): string {
  if (value === null || value === undefined) return '';
  const text = String(value);
  return /[",\n\r]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
}

function triggerDownload(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  // Give the browser a tick to start the download before revoking.
  window.setTimeout(() => URL.revokeObjectURL(url), 1000);
}

/**
 * Download rows as CSV.
 *
 * @param filename  Without extension; a date stamp and `.csv` are appended.
 * @param columns   Ordered [header, accessor] pairs — the accessor keeps the
 *                  column order and the header text in one place.
 * @param rows      The records to write.
 */
export function downloadCsv<T>(
  filename: string,
  columns: Array<[header: string, accessor: (row: T) => CsvValue]>,
  rows: T[],
): void {
  const header = columns.map(([name]) => escapeCell(name)).join(',');
  const body = rows.map((row) => columns.map(([, get]) => escapeCell(get(row))).join(','));

  // The BOM makes Excel open UTF-8 correctly instead of mangling accented names.
  const csv = `﻿${[header, ...body].join('\r\n')}`;
  const stamp = new Date().toISOString().slice(0, 10);

  triggerDownload(new Blob([csv], { type: 'text/csv;charset=utf-8' }), `${filename}-${stamp}.csv`);
}

/** Download an object as formatted JSON — used for whole-organisation exports. */
export function downloadJson(filename: string, data: unknown): void {
  const stamp = new Date().toISOString().slice(0, 10);
  triggerDownload(
    new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' }),
    `${filename}-${stamp}.json`,
  );
}

/**
 * Print the current view. The browser's print dialog also offers "Save as PDF"
 * on every major platform, which is what the PDF buttons in this app mean.
 */
export function printPage(): void {
  window.print();
}

/**
 * Share via the native sheet where it exists, otherwise copy the link.
 * Returns what actually happened so the caller can tell the user.
 */
export async function shareOrCopy(payload: {
  title: string;
  text?: string;
  url?: string;
}): Promise<'shared' | 'copied' | 'failed'> {
  const url = payload.url ?? window.location.href;

  if (navigator.share) {
    try {
      await navigator.share({ ...payload, url });
      return 'shared';
    } catch {
      // Cancelling the sheet throws; fall through to copying.
    }
  }

  try {
    await navigator.clipboard.writeText(url);
    return 'copied';
  } catch {
    return 'failed';
  }
}
