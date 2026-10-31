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
import { CalendarDays, CheckCircle2, Clock, MapPin, Repeat } from 'lucide-react';
import { eventsService } from '@/services/eventsService';
import type { RegistrationAnswers } from '@/types';
import { Badge, Button, Card, EmptyState, Input, Skeleton, Text } from '@/components/ui';
import { FormQuestionInputs } from '@/components/forms/FormQuestionInputs';
import { cleanAnswers, missingRequired as findMissing } from '@/lib/forms';
import { formatDate, formatTime } from '@/lib/formatters';
import { usePublicChurchZone } from '@/components/events/usePublicChurchZone';
import { describeRecurrence } from '@/components/events/workflow/recurrence';
import { dayKeyInZone } from '@/lib/calendar';
import { describeError } from '@/lib/formErrors';

export function PublicEventRegister() {
  const { slug = '', eventId = '' } = useParams();
  // The church's zone, so a 9:00 service reads 9:00 to a visitor anywhere.
  const zone = usePublicChurchZone(slug);

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
        answers: cleanAnswers(event?.registrationFields ?? [], answers),
      }),
    onError: (err) => setError(describeError(err)),
  });

  const missingRequired = useMemo(() => (event ? findMissing(event.registrationFields, answers) : []), [event, answers]);

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

  // A repeating event is about its next date, not the one it started on.
  const when = event.nextOccurrence ?? event.startDateTime;
  const repeats = event.isRecurring || Boolean(event.recurrenceRule);
  const repeatText = event.recurrenceRule ? describeRecurrence(event.recurrenceRule, zone, dayKeyInZone(event.startDateTime, zone)) : 'Repeats';

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
            <CalendarDays size={16} className="text-slate-400 shrink-0" aria-hidden /> {formatDate(when, 'en-US', zone)}
          </Text>
          <Text variant="body" className="flex items-center gap-2">
            <Clock size={16} className="text-slate-400 shrink-0" aria-hidden />{' '}
            {event.isAllDay ? 'All day' : formatTime(when, 'en-US', zone)}
          </Text>
          {repeats && (
            <Text variant="body" className="flex items-center gap-2">
              <Repeat size={16} className="text-slate-400 shrink-0" aria-hidden /> {repeatText}
            </Text>
          )}
          {event.location && (
            <Text variant="body" className="flex items-center gap-2">
              <MapPin size={16} className="text-slate-400 shrink-0" aria-hidden /> {event.location}
            </Text>
          )}
        </div>
      </Card>

      {!event.registrationOpen && (
        <Card padding="lg">
          <Text variant="h3" className="mb-1">
            Sign-ups are closed
          </Text>
          <Text variant="body" color="muted">
            The organisers aren’t taking more sign-ups for this gathering. Get in touch with them if you still want to come.
          </Text>
        </Card>
      )}

      {event.registrationOpen && (
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

            <FormQuestionInputs fields={event.registrationFields} answers={answers} onChange={setAnswers} />

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
      )}
    </div>
  );
}
