/**
 * @file ManualPayment.tsx
 * @description The checkout step for mobile-money billing: where to send the
 * money, then a short form reporting what was sent, with the screenshot as proof.
 *
 * A platform admin checks the proof and approves it, which unlocks the church
 * for the months paid. Until then free basics keep working, and this page shows
 * the payment as waiting.
 *
 * Reached from the plan picker (/billing/pay?tier=parish&months=3). Full page,
 * no app chrome, like the card checkout it stands in for.
 */
import { useEffect, useMemo, useRef, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { CheckCircle2, Clock, Copy, FileCheck2, ImagePlus, Smartphone, XCircle } from 'lucide-react';
import { billingService, describeMonths, formatPlanPrice, MAX_MONTHS } from '@/services/billingService';
import type { ManualPayment, OrgTier } from '@/types';
import { Button, Card, Input, Text } from '@/components/ui';
import { apiFieldErrors } from '@/lib/formErrors';
import { errorMessage } from '@/lib/errors';
import { formatDate } from '@/lib/formatters';
import { all, minLength, required, useFieldErrors } from '@/lib/validation';
import { toast } from '@/hooks/useToastStore';

const TIERS: OrgTier[] = ['seed', 'parish', 'growth', 'diocese'];
const MAX_PROOF_BYTES = 10 * 1024 * 1024;
const ACCEPT = 'image/png,image/jpeg,application/pdf';

const RULES = {
  senderName: all(required('The sender’s name'), minLength('The sender’s name', 2)),
  amount: (v: string) => (Number(v) > 0 ? null : 'Enter the amount you sent'),
};

function CopyButton({ text, label }: { text: string; label: string }) {
  return (
    <button
      type="button"
      onClick={async () => {
        try {
          await navigator.clipboard.writeText(text);
          toast.success(`${label} copied`);
        } catch {
          toast.info(`Select and copy ${label.toLowerCase()} by hand`);
        }
      }}
      className="inline-flex min-h-11 items-center gap-1.5 rounded-lg px-3 text-body-sm font-medium text-primary hover:bg-primary-light dark:hover:bg-primary/15"
    >
      <Copy size={16} aria-hidden /> Copy
    </button>
  );
}

function Shell({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-surface dark:bg-surface-dark px-4 py-10">
      <div className="mx-auto w-full max-w-xl space-y-6">{children}</div>
    </div>
  );
}

/** A payment that is waiting, was approved, or was turned away. */
function PaymentStatus({ payment }: { payment: ManualPayment }) {
  if (payment.status === 'pending') {
    return (
      <Card padding="lg" className="text-center">
        <div className="mx-auto mb-4 flex size-14 items-center justify-center rounded-full bg-warning-light">
          <Clock size={28} className="text-warning" aria-hidden />
        </div>
        <Text variant="h2" className="mb-2">We are checking your payment</Text>
        <Text variant="body" color="muted" className="mb-4">
          We received your proof for {describeMonths(payment.months)} of the {payment.tier} plan. As soon as the money is
          confirmed, your church is unlocked. Free basics keep working meanwhile.
        </Text>
        <Text variant="body-sm" className="mb-6">
          Your reference: <strong className="font-mono">{payment.referenceCode}</strong>
        </Text>
        <Link to="/staff/dashboard">
          <Button variant="primary" fullWidth>Go to the dashboard</Button>
        </Link>
      </Card>
    );
  }
  const approved = payment.status === 'approved';
  return (
    <Card padding="lg" className="text-center">
      <div className={`mx-auto mb-4 flex size-14 items-center justify-center rounded-full ${approved ? 'bg-success-light' : 'bg-danger-light'}`}>
        {approved ? <CheckCircle2 size={28} className="text-success" aria-hidden /> : <XCircle size={28} className="text-danger" aria-hidden />}
      </div>
      <Text variant="h2" className="mb-2">{approved ? 'Payment approved' : 'Payment not approved'}</Text>
      <Text variant="body" color="muted" className="mb-6">
        {approved
          ? `Your church is unlocked until ${payment.grantedUntil ? formatDate(payment.grantedUntil) : 'the end of your plan'}.`
          : payment.decisionNote ?? 'It could not be confirmed.'}
      </Text>
    </Card>
  );
}

export function ManualPayment() {
  const [params] = useSearchParams();
  const queryClient = useQueryClient();
  const tier = params.get('tier') as OrgTier;
  const months = Number(params.get('months'));
  const validChoice = TIERS.includes(tier) && Number.isInteger(months) && months >= 1 && months <= MAX_MONTHS;

  const overview = useQuery({ queryKey: ['billing', 'overview'], queryFn: () => billingService.overview() });
  // undefined = the server's default currency; set once the church picks one.
  const [currency, setCurrency] = useState<string | undefined>(undefined);
  const instructions = useQuery({
    queryKey: ['billing', 'instructions', tier, months, currency],
    queryFn: () => billingService.paymentInstructions(tier, months, currency),
    enabled: validChoice,
    placeholderData: (previous) => previous,
  });

  const [senderName, setSenderName] = useState('');
  const [amount, setAmount] = useState('');
  const [transactionId, setTransactionId] = useState('');
  const [proof, setProof] = useState<File | null>(null);
  const [proofError, setProofError] = useState<string | null>(null);
  const [sent, setSent] = useState<ManualPayment | null>(null);
  const fileInput = useRef<HTMLInputElement>(null);

  // The amount to send is the default; most people send exactly that. It is
  // refilled when the currency changes (the old number would be in the wrong
  // currency) but never over what someone has typed in the same currency.
  const shownCurrency = instructions.data?.currency;
  const filledFor = useRef<string | undefined>(undefined);
  useEffect(() => {
    if (!instructions.data || filledFor.current === instructions.data.currency) return;
    if (amount === '' || filledFor.current !== undefined) setAmount(String(instructions.data.amountCents / 100));
    filledFor.current = instructions.data.currency;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [shownCurrency]);

  const preview = useMemo(() => (proof && proof.type.startsWith('image/') ? URL.createObjectURL(proof) : null), [proof]);
  useEffect(() => () => { if (preview) URL.revokeObjectURL(preview); }, [preview]);

  const submit = useMutation({
    mutationFn: () =>
      billingService.submitManualPayment({
        tier,
        months,
        senderName: senderName.trim(),
        sentAmountCents: Math.round(Number(amount) * 100),
        currency: info?.currency,
        momoTransactionId: transactionId.trim() || undefined,
        proof: proof as File,
      }),
    meta: { inline: true },
    onSuccess: (payment) => {
      setSent(payment);
      void queryClient.invalidateQueries({ queryKey: ['billing'] });
    },
  });

  const server = apiFieldErrors(submit.error);
  const { field, validateAll } = useFieldErrors({ senderName, amount }, RULES, {
    senderName: server.senderName,
    amount: server.sentAmountCents,
  });

  function onPick(file: File | undefined) {
    if (!file) return;
    if (!ACCEPT.split(',').includes(file.type)) return setProofError('Use a screenshot (PNG or JPEG) or a PDF.');
    if (file.size > MAX_PROOF_BYTES) return setProofError('That file is over 10 MB.');
    setProofError(null);
    setProof(file);
  }

  function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    const fieldsOk = validateAll();
    if (!proof) setProofError('Add the screenshot of your payment.');
    if (!fieldsOk || !proof) return;
    submit.mutate();
  }

  if (!validChoice) {
    return (
      <Shell>
        <Card padding="lg" className="text-center">
          <Text variant="h2" className="mb-2">Choose a plan first</Text>
          <Link to="/onboarding/plan"><Button variant="primary">See the plans</Button></Link>
        </Card>
      </Shell>
    );
  }

  const waiting = sent ?? overview.data?.pendingPayment ?? null;
  if (waiting) {
    return <Shell><PaymentStatus payment={waiting} /></Shell>;
  }

  const info = instructions.data;
  const bannerError = submit.error && Object.keys(server).length === 0 ? errorMessage(submit.error) : null;
  const rejected = overview.data?.lastPayment?.status === 'rejected' ? overview.data.lastPayment : null;

  return (
    <Shell>
      <div className="text-center">
        <Text variant="h1" className="text-primary mb-1">Pay by mobile money</Text>
        <Text variant="body" color="muted">
          {info ? `${info.planName} plan for ${describeMonths(info.months)}` : 'Loading…'}
        </Text>
      </div>

      {rejected && (
        <div role="alert" className="rounded-lg border border-danger/20 bg-danger-light p-4 text-body-sm font-medium text-danger">
          Your last payment was not approved{rejected.decisionNote ? `: ${rejected.decisionNote}` : '.'} You can send it again below.
        </div>
      )}

      <Card padding="lg" className="space-y-4">
        <div className="flex items-center gap-3">
          <span className="flex size-9 items-center justify-center rounded-full bg-primary text-white font-bold" aria-hidden>1</span>
          <Text variant="h3">Send the money</Text>
        </div>

        {instructions.isError && (
          <div role="alert" className="text-body-sm text-danger">{errorMessage(instructions.error)}</div>
        )}

        {info && (
          <dl className="divide-y divide-slate-100 dark:divide-slate-800">
            <div className="flex items-center justify-between gap-3 py-2">
              <dt className="text-body-sm text-slate-500">Amount to send</dt>
              <dd className="text-h3 font-bold">{formatPlanPrice(info.amountCents, info.currency)}</dd>
            </div>
            <div className="flex items-center justify-between gap-3 py-2">
              <dt className="text-body-sm text-slate-500">{info.network} number</dt>
              <dd className="flex items-center gap-1">
                <Smartphone size={16} className="text-slate-400" aria-hidden />
                <strong className="font-mono text-body-lg">{info.number || 'Not set up yet'}</strong>
                {info.number && <CopyButton text={info.number} label="Number" />}
              </dd>
            </div>
            <div className="flex items-center justify-between gap-3 py-2">
              <dt className="text-body-sm text-slate-500">Account name</dt>
              <dd className="font-medium">{info.accountName || '—'}</dd>
            </div>
          </dl>
        )}
        <Text variant="caption" color="muted">
          In the message or reason, write your church’s name. Keep the payment confirmation: you will need a screenshot of it.
        </Text>
      </Card>

      <Card padding="lg">
        <div className="mb-4 flex items-center gap-3">
          <span className="flex size-9 items-center justify-center rounded-full bg-primary text-white font-bold" aria-hidden>2</span>
          <Text variant="h3">Tell us what you sent</Text>
        </div>

        <form onSubmit={onSubmit} noValidate className="space-y-4">
          {bannerError && (
            <div role="alert" className="rounded-lg border border-danger/20 bg-danger-light p-3 text-body-sm font-medium text-danger">
              {bannerError}
            </div>
          )}

          <Input
            label="Name of the person who sent the money"
            autoComplete="name"
            value={senderName}
            onChange={(e) => setSenderName(e.target.value)}
            {...field('senderName')}
          />
          <Input
            label="Amount you sent"
            suffix={
              info && info.options.length > 1 ? (
                <select
                  aria-label="Currency"
                  value={info.currency}
                  onChange={(e) => setCurrency(e.target.value)}
                  className="h-9 rounded-md border-0 bg-slate-100 px-2 text-body-sm font-semibold dark:bg-slate-800"
                >
                  {info.options.map((o) => (
                    <option key={o.currency} value={o.currency}>{o.currency.toUpperCase()}</option>
                  ))}
                </select>
              ) : info ? (
                <span className="px-2 text-body-sm font-semibold text-slate-500">{info.currency.toUpperCase()}</span>
              ) : undefined
            }
            type="number"
            inputMode="decimal"
            min="0"
            step="any"
            autoComplete="off"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            {...field('amount')}
          />
          <Input
            label="MoMo transaction ID (optional)"
            autoComplete="off"
            autoCapitalize="characters"
            spellCheck={false}
            value={transactionId}
            onChange={(e) => setTransactionId(e.target.value)}
          />

          <div>
            <Text variant="label" className="mb-1.5 block">Screenshot of the payment</Text>
            <input
              ref={fileInput}
              type="file"
              accept={ACCEPT}
              className="sr-only"
              aria-label="Screenshot of the payment"
              onChange={(e) => onPick(e.target.files?.[0])}
            />
            {proof ? (
              <div className="flex items-center gap-3 rounded-lg border border-slate-200 p-2 dark:border-slate-700">
                {preview ? (
                  <img src={preview} alt="Your payment screenshot" className="size-16 rounded object-cover" />
                ) : (
                  <FileCheck2 size={28} className="m-3 text-success" aria-hidden />
                )}
                <span className="min-w-0 flex-1 truncate text-body-sm">{proof.name}</span>
                <Button type="button" variant="ghost" size="sm" onClick={() => fileInput.current?.click()}>
                  Change
                </Button>
              </div>
            ) : (
              <Button type="button" variant="secondary" fullWidth leftIcon={ImagePlus} onClick={() => fileInput.current?.click()}>
                Add the screenshot
              </Button>
            )}
            {proofError && <p role="alert" className="mt-1.5 text-caption text-danger">{proofError}</p>}
          </div>

          <Button type="submit" variant="primary" fullWidth isLoading={submit.isPending}>
            Send for approval
          </Button>
          <Text variant="caption" color="muted" className="text-center block">
            We check the screenshot against our MoMo records. Please send a real one: false proof closes the account.
          </Text>
        </form>
      </Card>

      <div className="text-center">
        <Link to="/onboarding/plan" className="text-body-sm text-slate-500 underline underline-offset-2">
          Change the plan or the number of months
        </Link>
      </div>
    </Shell>
  );
}
