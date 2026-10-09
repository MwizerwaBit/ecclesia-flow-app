/**
 * @file DataTable.tsx
 * @description The desktop half of a list screen.
 *
 * A phone shows a list as cards, because there is only room for one column.
 * Stretching those same cards across a 1440px screen produces truncated names,
 * wrapped meta lines and a column of very short, very wide boxes — which is
 * what the directory looked like before this existed.
 *
 * Desktop wants a table: one row per record, aligned columns you can scan down,
 * and a sticky header. Screens render <DataTable> inside `hidden lg:block` and
 * keep their card list in `lg:hidden`, so each width gets the right shape and
 * the data and actions stay identical.
 */
import { type ReactNode } from 'react';
import { useNavigate } from 'react-router-dom';
import { cn } from '@/lib/cn';
import { Text } from './Typography';

export interface DataTableColumn<T> {
  /** Stable key, also used for the React key. */
  key: string;
  header: ReactNode;
  render: (row: T) => ReactNode;
  align?: 'left' | 'right' | 'center';
  /** Width/visibility classes, e.g. 'w-40' or 'hidden xl:table-cell'. */
  className?: string;
}

interface DataTableProps<T> {
  columns: Array<DataTableColumn<T>>;
  rows: T[];
  rowKey: (row: T) => string;
  /** Makes the whole row navigate. Cells with their own links still win. */
  rowHref?: (row: T) => string;
  /** Shown in place of the table when there is nothing to list. */
  empty?: ReactNode;
  caption?: string;
  className?: string;
}

const ALIGN = {
  left: 'text-left',
  right: 'text-right',
  center: 'text-center',
} as const;

export function DataTable<T>({
  columns,
  rows,
  rowKey,
  rowHref,
  empty,
  caption,
  className,
}: DataTableProps<T>) {
  const navigate = useNavigate();

  if (rows.length === 0 && empty) return <>{empty}</>;

  return (
    <div
      className={cn(
        'overflow-x-auto rounded-xl border border-slate-200 dark:border-slate-800 bg-surface dark:bg-surface-dark',
        className,
      )}
    >
      <table className="w-full border-collapse">
        {caption && <caption className="sr-only">{caption}</caption>}

        <thead>
          <tr className="border-b border-slate-200 dark:border-slate-800">
            {columns.map((column) => (
              <th
                key={column.key}
                scope="col"
                className={cn(
                  'px-4 py-3 text-label text-slate-500 whitespace-nowrap',
                  ALIGN[column.align ?? 'left'],
                  column.className,
                )}
              >
                {column.header}
              </th>
            ))}
          </tr>
        </thead>

        <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
          {rows.map((row) => {
            const href = rowHref?.(row);
            return (
              <tr
                key={rowKey(row)}
                // Rows navigate on click rather than wrapping every cell in a
                // link, which would nest the per-cell actions inside anchors.
                onClick={href ? () => navigate(href) : undefined}
                className={cn(
                  'transition-colors',
                  href && 'cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-800/40',
                )}
              >
                {columns.map((column) => (
                  <td
                    key={column.key}
                    className={cn(
                      'px-4 py-3 align-middle',
                      ALIGN[column.align ?? 'left'],
                      column.className,
                    )}
                    // Let buttons and links inside a cell act without also
                    // triggering the row navigation behind them.
                    onClick={(event) => {
                      if ((event.target as HTMLElement).closest('a,button')) {
                        event.stopPropagation();
                      }
                    }}
                  >
                    {column.render(row)}
                  </td>
                ))}
              </tr>
            );
          })}
        </tbody>
      </table>

      {rows.length === 0 && (
        <div className="px-4 py-10 text-center">
          <Text variant="body" color="muted">
            Nothing to show.
          </Text>
        </div>
      )}
    </div>
  );
}
