/**
 * @file MasterDetail.tsx
 * @description A list beside the thing it selects — the desktop pattern for
 * screens that are a single scrolling list on a phone.
 *
 * On a phone there is only room for one of the two, so the list is the screen and
 * the detail is a route you push to. From lg up both are on screen at once and
 * selecting a row fills the right pane without navigating. The flow is the same
 * either way: pick someone, act on them.
 */
import { type ReactNode } from 'react';
import { cn } from '@/lib/cn';
import { Text } from '@/components/ui';

interface MasterDetailProps {
  /** The list. Always visible. */
  master: ReactNode;
  /** The pane beside it. Desktop only — a phone routes to a detail screen. */
  detail?: ReactNode;
  /** Shown in the detail pane before anything is selected. */
  emptyDetail?: ReactNode;
  /** Wider list for dense rosters; wider detail for record-heavy screens. */
  split?: 'even' | 'list-heavy' | 'detail-heavy';
  className?: string;
}

const SPLIT: Record<NonNullable<MasterDetailProps['split']>, string> = {
  even: 'lg:grid-cols-2',
  'list-heavy': 'lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)] xl:grid-cols-[minmax(0,7fr)_minmax(0,5fr)]',
  'detail-heavy': 'lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)] xl:grid-cols-[minmax(0,5fr)_minmax(0,7fr)]',
};

export function MasterDetail({
  master,
  detail,
  emptyDetail,
  split = 'detail-heavy',
  className,
}: MasterDetailProps) {
  return (
    <div className={cn('grid gap-5', SPLIT[split], className)}>
      <div className="min-w-0">{master}</div>

      {/* The detail pane only exists where there is room for it. */}
      <aside className="hidden lg:block min-w-0">
        <div className="sticky top-24">
          {detail ?? (
            <div className="rounded-xl border border-dashed border-slate-200 dark:border-slate-700 p-10 text-center">
              {emptyDetail ?? (
                <Text variant="body" color="muted">
                  Select someone from the list to see their details here.
                </Text>
              )}
            </div>
          )}
        </div>
      </aside>
    </div>
  );
}
