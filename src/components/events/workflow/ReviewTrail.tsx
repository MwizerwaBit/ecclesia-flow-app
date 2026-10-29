/**
 * @file ReviewTrail.tsx
 * @description Who was asked to review a gathering, what each decided, and why.
 */
import { Check, Clock, MessageSquareWarning } from 'lucide-react';
import type { EventReview } from '@/types';
import { Badge, Card, Text } from '@/components/ui';
import { formatDateTime } from '@/lib/formatters';

const DECISION = {
  pending: { label: 'Waiting', variant: 'neutral', icon: Clock },
  approved: { label: 'Approved', variant: 'success', icon: Check },
  changes_requested: { label: 'Asked for changes', variant: 'warning', icon: MessageSquareWarning },
} as const;

export function ReviewTrail({ reviews, zone }: { reviews: EventReview[]; zone: string }) {
  if (reviews.length === 0) return null;
  const approved = reviews.filter((r) => r.status === 'approved').length;

  return (
    <section aria-labelledby="review-trail-title" className="space-y-3">
      <div className="flex items-baseline justify-between gap-3">
        <Text variant="h2" id="review-trail-title">
          Review
        </Text>
        <Text variant="caption" color="muted" className="tabular-nums">
          {approved} of {reviews.length} approved
        </Text>
      </div>
      <ul className="space-y-2">
        {reviews.map((review) => {
          const decision = DECISION[review.status];
          const Icon = decision.icon;
          return (
            <li key={review.reviewerUserId}>
              <Card variant="outline" padding="sm" className="space-y-1.5">
                <div className="flex items-center justify-between gap-2">
                  <Text variant="body" className="font-medium min-w-0 truncate">
                    {review.reviewerName}
                  </Text>
                  <Badge variant={decision.variant} size="sm">
                    <Icon size={11} aria-hidden />
                    {decision.label}
                  </Badge>
                </div>
                {review.comment && (
                  <Text variant="body-sm" className="whitespace-pre-line">
                    {review.comment}
                  </Text>
                )}
                {review.decidedAt && (
                  <Text variant="caption" color="muted">
                    {formatDateTime(review.decidedAt, 'en-US', zone)}
                  </Text>
                )}
              </Card>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
