/**
 * @file PublicEventRegister.tsx
 * @description The public share link for one gathering: what it is, when,
 * and — if the organiser attached any — the questions to answer before
 * showing up. No sign-in, because asking a first-time visitor to create an
 * account before they can say they're coming is the opposite of welcoming.
 */
import { useMemo, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { useMutation, useQuery } from '@tanstack/react-query';
import { CalendarDays, CheckCircle2, Clock, MapPin } from 'lucide-react';
import { eventsService } from '@/services/eventsService';
import type { RegistrationAnswers } from '@/types';
import { Badge, Button, Card, Checkbox, EmptyState, Input, Select, Skeleton, Text } from '@/components/ui';
import { formatDate, formatTime } from '@/lib/formatters';
import { ApiError } from '@/services/adapter';

export function PublicEventRegister() {
  const { slug = '', eventId = '' } = useParams();

  const { data: event, isLoading } = useQuery({
    queryKey: ['public', 'event', slug, eventId],
    queryFn: () => eventsService.publicEventDetail(slug, eventId),
    enabled: Boolean(slug && eventId),
  });

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [answers, setAnswers] = useState<RegistrationAnswers>({});
  const [error, setError] = useState<string | null>(null);

  const register = useMutation({
    mutationFn: () =>
      eventsService.register(slug, eventId, {
        respondentName: name.trim(),
        respondentEmail: email.trim() || undefined,
        respondentPhone: phone.trim() || undefined,
        answers,
      }),
    onError: (err) => setError(err instanceof ApiError ? err.message : 'Something went wrong — please try again.'),
  });

  const missingRequired = useMemo(() => {
    if (!event) return [];
    return event.registrationFields.filter((f) => {
      if (!f.required) return false;
      const value = answers[f.label];
      return value === undefined || (Array.isArray(value) ? value.length === 0 : value.trim().length === 0);
    });
  }, [event, answers]);

  const canSubmit = name.trim().length > 0 && missingRequired.length === 0;

  if (isLoading) {
    return (
      <div className="w-full max-w-xl mx-auto px-4 py-12 space-y-6">
        <Skeleton className="h-9 w-64 mx-auto" />
        <Skeleton className="h-64 rounded-xl" />
      </div>
    );
  }

  if (!event) {
    return (
      <div className="w-full max-w-xl mx-auto px-4 py-12">
        <EmptyState
          icon={CalendarDays}
          title="We couldn't find that gathering"
          description="It may have been canceled or the link may be out of date."
          action={
            <Link to={`/c/${slug}/calendar`}>
              <Button variant="primary">See the full calendar</Button>
            </Link>
          }
        />
      </div>
    );
  }

  if (register.isSuccess) {
    return (
      <div className="w-full max-w-xl mx-auto px-4 py-16 text-center animate-fade-in">
        <div className="mx-auto bg-success-light text-success w-16 h-16 rounded-full flex items-center justify-center mb-6">
          <CheckCircle2 size={32} />
        </div>
        <Text variant="h1" className="mb-2">
          You&rsquo;re on the list
        </Text>
        <Text variant="body-lg" color="muted" className="mb-8">
          Thanks, {name.trim().split(' ')[0]} — we look forward to seeing you at {event.title}.
        </Text>
        <Link to={`/c/${slug}/calendar`}>
          <Button variant="secondary">See what else is coming up</Button>
        </Link>
      </div>
    );
  }

  return (
    <div className="w-full max-w-xl mx-auto px-4 py-12 animate-fade-in">
      <Link to={`/c/${slug}/calendar`} className="text-body-sm text-slate-500 hover:text-primary transition-colors mb-6 inline-block">
        &larr; Back to the calendar
      </Link>

      <Card padding="lg" className="mb-6">
        <div className="flex items-start justify-between gap-2 mb-2">
          <Text variant="h1" className="min-w-0">
            {event.title}
          </Text>
          <Badge variant="primary" size="sm" className="shrink-0 capitalize">
            {event.type}
          </Badge>
        </div>
        {event.description && (
          <Text variant="body" color="muted" className="mb-4">
            {event.description}
          </Text>
        )}
        <div className="space-y-2">
          <Text variant="body" className="flex items-center gap-2">
            <CalendarDays size={16} className="text-slate-400 shrink-0" aria-hidden /> {formatDate(event.startDateTime)}
          </Text>
          <Text variant="body" className="flex items-center gap-2">
            <Clock size={16} className="text-slate-400 shrink-0" aria-hidden /> {formatTime(event.startDateTime)}
          </Text>
          {event.location && (
            <Text variant="body" className="flex items-center gap-2">
              <MapPin size={16} className="text-slate-400 shrink-0" aria-hidden /> {event.location}
            </Text>
          )}
        </div>
      </Card>

      <Card padding="lg">
        <Text variant="h3" className="mb-4">
          Save your spot
        </Text>
        <form
          className="space-y-4"
          onSubmit={(e) => {
            e.preventDefault();
            if (canSubmit) register.mutate();
          }}
        >
          <Input autoComplete="name" label="Your name" autoFocus value={name} onChange={(e) => setName(e.target.value)} />
          <Input label="Email (optional)" type="email" value={email} onChange={(e) => setEmail(e.target.value)} />
          <Input label="Phone (optional)" type="tel" value={phone} onChange={(e) => setPhone(e.target.value)} />

          {event.registrationFields.map((field) => (
            <div key={field.id}>
              {field.fieldType === 'text' && (
                <Input
                  label={field.required ? `${field.label} *` : field.label}
                  value={(answers[field.label] as string) ?? ''}
                  onChange={(e) => setAnswers((prev) => ({ ...prev, [field.label]: e.target.value }))}
                />
              )}
              {field.fieldType === 'single_choice' && (
                <Select
                  label={field.required ? `${field.label} *` : field.label}
                  value={(answers[field.label] as string) ?? ''}
                  onChange={(e) => setAnswers((prev) => ({ ...prev, [field.label]: e.target.value }))}
                  options={[{ value: '', label: 'Choose one' }, ...field.options.map((o) => ({ value: o, label: o }))]}
                />
              )}
              {field.fieldType === 'checkbox' && (
                <div className="space-y-1.5">
                  <Text variant="label" color="muted" className="block">
                    {field.required ? `${field.label} *` : field.label}
                  </Text>
                  {field.options.map((option) => {
                    const selected = (answers[field.label] as string[] | undefined) ?? [];
                    return (
                      <Checkbox
                        key={option}
                        label={option}
                        checked={selected.includes(option)}
                        onChange={(e) =>
                          setAnswers((prev) => {
                            const current = (prev[field.label] as string[] | undefined) ?? [];
                            const next = e.target.checked ? [...current, option] : current.filter((o) => o !== option);
                            return { ...prev, [field.label]: next };
                          })
                        }
                      />
                    );
                  })}
                </div>
              )}
            </div>
          ))}

          {error && (
            <Text variant="body-sm" className="text-danger">
              {error}
            </Text>
          )}

          <Button type="submit" variant="primary" size="lg" fullWidth disabled={!canSubmit} isLoading={register.isPending}>
            I&rsquo;ll be there
          </Button>
        </form>
      </Card>
    </div>
  );
}
