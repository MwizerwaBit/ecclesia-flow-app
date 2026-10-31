/**
 * @file FormsList.tsx
 * @description The church's own forms (a visitor card, a survey, a sign-up sheet) and how many
 * people have answered each. An event's registration questions are not listed here: they live on
 * the event.
 */
import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { ClipboardList, Plus } from 'lucide-react';
import type { FormStatus } from '@/types';
import { formsService } from '@/services/formsService';
import { STATUS_LABEL } from '@/lib/forms';
import { useRole } from '@/hooks/useRole';
import { formatDate } from '@/lib/formatters';
import { Badge, Button, Card, EmptyState, FilterChips, Skeleton, Text } from '@/components/ui';
import { ErrorNotice } from '@/components/feedback/ErrorNotice';

type Filter = 'all' | FormStatus;

const STATUS_BADGE = { draft: 'neutral', published: 'success', closed: 'warning' } as const;

export function FormsList() {
  const { can } = useRole();
  const [filter, setFilter] = useState<Filter>('all');

  const forms = useQuery({ queryKey: ['forms'], queryFn: () => formsService.list() });
  const visible = (forms.data ?? []).filter((f) => filter === 'all' || f.status === filter);

  return (
    <div className="w-full max-w-4xl mx-auto px-4 py-6 animate-fade-in space-y-5">
      <header className="flex items-start justify-between gap-3">
        <div>
          <Text variant="h1" className="mb-1">
            Forms
          </Text>
          <Text variant="body" color="muted">
            Collect answers from visitors and members with a link. No sign-in needed to fill one in.
          </Text>
        </div>
        {can('forms:manage') && (
          <Link to="/staff/forms/new" className="shrink-0">
            <Button variant="primary" leftIcon={Plus}>
              New form
            </Button>
          </Link>
        )}
      </header>

      <FilterChips
        label="Filter by status"
        value={filter}
        onChange={setFilter}
        options={[
          { value: 'all', label: 'All' },
          { value: 'draft', label: 'Drafts' },
          { value: 'published', label: 'Open' },
          { value: 'closed', label: 'Closed' },
        ]}
      />

      <div aria-live="polite" aria-busy={forms.isLoading}>
        {forms.isLoading && (
          <div className="space-y-3" role="status" aria-label="Loading forms">
            <Skeleton className="h-20 rounded-xl" />
            <Skeleton className="h-20 rounded-xl" />
          </div>
        )}
        {forms.isError && (
          <div className="space-y-3">
            <ErrorNotice error={forms.error} />
            <Button variant="secondary" onClick={() => void forms.refetch()}>
              Try again
            </Button>
          </div>
        )}
      </div>

      {forms.isSuccess && visible.length === 0 && (
        <EmptyState
          icon={ClipboardList}
          title={filter === 'all' ? 'No forms yet' : 'No forms here'}
          description={
            filter === 'all'
              ? 'Make a form for a visitor card, a survey or anything you need people to fill in.'
              : 'Try another filter.'
          }
        />
      )}

      <ul className="space-y-3">
        {visible.map((form) => (
          <li key={form.id}>
            <Link to={`/staff/forms/${form.id}`} className="block rounded-xl focus-visible:outline-2 focus-visible:outline-primary">
              <Card padding="md" variant="outline" className="flex items-center justify-between gap-3">
                <div className="min-w-0">
                  <Text variant="h3" className="truncate">
                    {form.title}
                  </Text>
                  <Text variant="caption" color="muted">
                    {form.submissionCount} {form.submissionCount === 1 ? 'response' : 'responses'} · started{' '}
                    {formatDate(form.createdAt)}
                  </Text>
                </div>
                <Badge variant={STATUS_BADGE[form.status]} size="sm" className="shrink-0">
                  {STATUS_LABEL[form.status]}
                </Badge>
              </Card>
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
