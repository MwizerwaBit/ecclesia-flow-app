/**
 * @file GroupChips.tsx
 * @description A person's groups as small coloured chips, collapsing the overflow to "+n".
 */
import { Link } from 'react-router-dom';
import type { MemberGroupRef } from '@/types';
import { cn } from '@/lib/cn';

interface GroupChipsProps {
  groups: MemberGroupRef[];
  /** Show at most this many; the rest become "+n" with the names in its tooltip. */
  max?: number;
  /** Link each chip to its group. Off inside rows that already navigate. */
  linked?: boolean;
  className?: string;
}

export function GroupChips({ groups, max = groups.length, linked = false, className }: GroupChipsProps) {
  const shown = groups.slice(0, max);
  const hidden = groups.slice(max);

  return (
    <div className={cn('flex flex-wrap items-center gap-1.5', className)}>
      {shown.map((group) => {
        const chip = (
          <span
            className="inline-flex max-w-40 items-center gap-1.5 rounded-md bg-slate-100 dark:bg-slate-800 px-2 py-0.5 text-caption text-slate-700 dark:text-slate-300"
            title={group.role === 'member' ? group.name : `${group.name} · ${group.role}`}
          >
            <span className="size-2 shrink-0 rounded-full" style={{ backgroundColor: group.color }} aria-hidden />
            <span className="truncate">{group.name}</span>
          </span>
        );
        return linked ? (
          <Link key={group.id} to={`/staff/groups/${group.id}`} className="hover:opacity-80">
            {chip}
          </Link>
        ) : (
          <span key={group.id}>{chip}</span>
        );
      })}
      {hidden.length > 0 && (
        <span
          className="rounded-md bg-slate-100 dark:bg-slate-800 px-1.5 py-0.5 text-caption text-slate-500"
          title={hidden.map((g) => g.name).join(', ')}
        >
          +{hidden.length}
        </span>
      )}
    </div>
  );
}
