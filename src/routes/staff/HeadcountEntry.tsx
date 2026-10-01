/**
 * @file HeadcountEntry.tsx
 * @description The ten-second alternative to individual check-in.
 *
 * Many gatherings are counted, not registered — a midweek prayer meeting, an
 * outreach service. Two numbers and a submit, with steppers big enough to hit
 * without looking. The total is derived, never typed.
 */
import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Baby, Check, Minus, Plus, Users } from 'lucide-react';
import { eventsService } from '@/services/eventsService';
import { Button, Card, Text } from '@/components/ui';
import { formatDate } from '@/lib/formatters';

interface CounterProps {
  label: string;
  icon: typeof Users;
  value: number;
  onChange: (next: number) => void;
}

function Counter({ label, icon: Icon, value, onChange }: CounterProps) {
  return (
    <Card variant="outline" padding="md">
      <div className="flex items-center gap-2 mb-4">
        <Icon size={18} className="text-primary" aria-hidden />
        <Text variant="label" color="muted">
          {label}
        </Text>
      </div>

      <div className="flex items-center justify-between gap-3">
        <button
          type="button"
          onClick={() => onChange(Math.max(0, value - 1))}
          aria-label={`Decrease ${label}`}
          className="flex size-14 items-center justify-center rounded-full bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 active:scale-95 transition-transform disabled:opacity-40"
          disabled={value === 0}
        >
          <Minus size={24} />
        </button>

        <input
          type="number"
          inputMode="numeric"
          min={0}
          value={value}
          aria-label={`${label} count`}
          onChange={(e) => onChange(Math.max(0, Number(e.target.value) || 0))}
          className="w-full min-w-0 bg-transparent border-none text-center font-sans text-[2.5rem] font-medium tabular-nums text-slate-900 dark:text-slate-100 focus:ring-0 outline-none"
        />

        <button
          type="button"
          onClick={() => onChange(value + 1)}
          aria-label={`Increase ${label}`}
          className="flex size-14 items-center justify-center rounded-full bg-primary text-white active:scale-95 transition-transform"
        >
          <Plus size={24} />
        </button>
      </div>
    </Card>
  );
}

export function HeadcountEntry() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const eventId = searchParams.get('eventId');

  const [adults, setAdults] = useState(0);
  const [children, setChildren] = useState(0);
  const [isSaving, setIsSaving] = useState(false);
  const [isSaved, setIsSaved] = useState(false);

  const { data: events } = useQuery({
    queryKey: ['events', 'upcoming'],
    queryFn: () => eventsService.list({ upcoming: true }),
  });

  const activeEvent = events?.find((e) => e.id === eventId) ?? events?.[0];
  const total = adults + children;

  async function submit() {
    if (!activeEvent || total === 0) return;
    setIsSaving(true);
    try {
      await eventsService.submitHeadcount({
        eventId: activeEvent.id,
        adults,
        children,
        total,
      });
      setIsSaved(true);
    } finally {
      setIsSaving(false);
    }
  }

  // The acknowledgement moment — this is ministry work, and the software says so.
  if (isSaved) {
    return (
      <div className="flex min-h-[60vh] flex-col items-center justify-center px-6 text-center animate-fade-in">
        <div className="mb-5 flex size-20 items-center justify-center rounded-full bg-success-light animate-scale-in">
          <Check size={40} className="text-success" strokeWidth={2.5} aria-hidden />
        </div>
        <Text variant="h2" className="mb-2">
          Counted — thank you
        </Text>
        <Text variant="body" color="muted" className="max-w-xs mb-8">
          {total} present at {activeEvent?.title}. That is recorded and safe.
        </Text>
        <div className="flex flex-col gap-3 w-full max-w-xs">
          <Button variant="primary" fullWidth onClick={() => navigate('/staff/events')}>
            Back to events
          </Button>
          <Button
            variant="ghost"
            fullWidth
            onClick={() => {
              setAdults(0);
              setChildren(0);
              setIsSaved(false);
            }}
          >
            Record another count
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full max-w-2xl mx-auto px-4 py-6 animate-fade-in">
      <header className="mb-6">
        <Text variant="h1" className="mb-1">
          Headcount
        </Text>
        <Text variant="body" color="muted">
          {activeEvent
            ? `${activeEvent.title} · ${formatDate(activeEvent.startDateTime)}`
            : 'No event selected'}
        </Text>
      </header>

      <div className="space-y-4">
        <Counter label="Adults" icon={Users} value={adults} onChange={setAdults} />
        <Counter label="Children" icon={Baby} value={children} onChange={setChildren} />

        <Card variant="flat" padding="md" className="flex items-center justify-between">
          <Text variant="label" color="muted">
            Total
          </Text>
          <Text variant="number" className="tabular-nums">
            {total}
          </Text>
        </Card>
      </div>

      <Button
        variant="primary"
        size="lg"
        fullWidth
        className="mt-8"
        isLoading={isSaving}
        disabled={total === 0}
        onClick={submit}
      >
        Submit headcount
      </Button>
    </div>
  );
}
