/**
 * @file DemoCheckout.tsx
 * @description The in-app payment page used when the configured billing
 * provider is the demo one instead of hosted Stripe Checkout — same place
 * in the flow, same two outcomes (paid or declined), but no real card
 * network involved. Test cards only: 4242 4242 4242 4242 succeeds,
 * 4000 0000 0000 0002 is declined (see billingService.payDemoCheckout).
 */
import { useState } from 'react';
import { useMutation, useQuery } from '@tanstack/react-query';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { CheckCircle2, CreditCard, Lock, XCircle } from 'lucide-react';
import { billingService, formatPlanPrice } from '@/services/billingService';
import { ApiError } from '@/services/adapter';
import { Button, Card, EmptyState, Input, Skeleton, Text } from '@/components/ui';

export function DemoCheckout() {
  const { sessionId = '' } = useParams();
  const navigate = useNavigate();

  const { data: session, isLoading } = useQuery({
    queryKey: ['billing', 'demo-checkout', sessionId],
    queryFn: () => billingService.getDemoCheckout(sessionId),
    enabled: Boolean(sessionId),
  });

  const [cardNumber, setCardNumber] = useState('');
  const [nameOnCard, setNameOnCard] = useState('');
  const [declined, setDeclined] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const pay = useMutation({
    mutationFn: () => billingService.payDemoCheckout(sessionId, { cardNumber, nameOnCard }),
    onSuccess: (result) => setDeclined(result.status === 'declined'),
    onError: (err) => setError(err instanceof ApiError ? err.message : 'Something went wrong — please try again.'),
  });

  const canSubmit = cardNumber.replace(/\s/g, '').length >= 12 && nameOnCard.trim().length > 0;

  if (isLoading) {
    return (
      <div className="w-full max-w-md mx-auto px-4 py-16 space-y-6">
        <Skeleton className="h-9 w-48 mx-auto" />
        <Skeleton className="h-80 rounded-xl" />
      </div>
    );
  }

  if (!session || session.status === 'expired') {
    return (
      <div className="w-full max-w-md mx-auto px-4 py-16">
        <EmptyState
          icon={XCircle}
          title="This checkout link has expired"
          description="Start again from your billing settings."
          action={
            <Link to="/staff/settings/billing">
              <Button variant="primary">Back to billing</Button>
            </Link>
          }
        />
      </div>
    );
  }

  if (session.status === 'completed' || pay.data?.status === 'paid') {
    return (
      <div className="w-full max-w-md mx-auto px-4 py-16 text-center animate-fade-in">
        <div className="mx-auto bg-success-light text-success w-16 h-16 rounded-full flex items-center justify-center mb-6">
          <CheckCircle2 size={32} />
        </div>
        <Text variant="h1" className="mb-2">
          Payment received
        </Text>
        <Text variant="body-lg" color="muted" className="mb-8">
          {session.churchName} is now on the {session.planName} plan.
        </Text>
        <Button variant="primary" onClick={() => navigate('/staff/settings/billing')}>
          Back to billing
        </Button>
      </div>
    );
  }

  return (
    <div className="w-full max-w-md mx-auto px-4 py-16 animate-fade-in">
      <div className="text-center mb-8">
        <Text variant="display" className="text-primary mb-2">
          EcclesiaFlow
        </Text>
        <Text variant="body-lg" color="muted">
          Demo checkout — no real card is charged
        </Text>
      </div>

      <Card padding="lg">
        <div className="flex items-center justify-between mb-6 pb-6 border-b border-slate-100 dark:border-slate-800">
          <div>
            <Text variant="body" className="font-medium">
              {session.planName} plan
            </Text>
            <Text variant="caption" color="muted">
              Billed {session.interval}
            </Text>
          </div>
          <Text variant="h2">{formatPlanPrice(session.amountCents, session.currency)}</Text>
        </div>

        {declined ? (
          <div className="text-center py-4 space-y-4">
            <div className="mx-auto bg-danger-light text-danger w-14 h-14 rounded-full flex items-center justify-center">
              <XCircle size={28} />
            </div>
            <Text variant="body" className="font-medium">
              Card declined
            </Text>
            <Text variant="body-sm" color="muted">
              Try 4242 4242 4242 4242, the test card that always succeeds.
            </Text>
            <Button variant="secondary" fullWidth onClick={() => setDeclined(false)}>
              Try again
            </Button>
          </div>
        ) : (
          <form
            className="space-y-4"
            onSubmit={(e) => {
              e.preventDefault();
              if (canSubmit) pay.mutate();
            }}
          >
            <Input label="Name on card" autoFocus value={nameOnCard} onChange={(e) => setNameOnCard(e.target.value)} />
            <Input
              label="Card number"
              leftIcon={CreditCard}
              placeholder="4242 4242 4242 4242"
              value={cardNumber}
              onChange={(e) => setCardNumber(e.target.value)}
            />
            {error && (
              <Text variant="body-sm" className="text-danger">
                {error}
              </Text>
            )}
            <Button type="submit" variant="primary" size="lg" fullWidth leftIcon={Lock} disabled={!canSubmit} isLoading={pay.isPending}>
              Pay {formatPlanPrice(session.amountCents, session.currency)}
            </Button>
            <Text variant="caption" color="muted" className="text-center block">
              Test mode — 4242 4242 4242 4242 succeeds, 4000 0000 0000 0002 is declined.
            </Text>
          </form>
        )}
      </Card>
    </div>
  );
}
