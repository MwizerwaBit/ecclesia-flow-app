/**
 * @file PublicForm.tsx
 * @description A standalone form, filled in from its public link (`/c/:slug/forms/:key`). No
 * sign-in. The server decides what the link shows: a published form, a closed one (with a note),
 * and nothing at all for a draft or a wrong key.
 */
import { useMemo, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { useMutation, useQuery } from '@tanstack/react-query';
import { CheckCircle2, ClipboardList, Lock } from 'lucide-react';
import { formsService } from '@/services/formsService';
import type { FormAnswers } from '@/types';
import { describeError } from '@/lib/formErrors';
import { cleanAnswers, missingRequired as findMissing } from '@/lib/forms';
import { Button, Card, EmptyState, Input, Skeleton, Text } from '@/components/ui';
import { FormQuestionInputs } from '@/components/forms/FormQuestionInputs';

export function PublicForm() {
  const { slug = '', key = '' } = useParams();

  const { data: form, isLoading } = useQuery({
    queryKey: ['public', 'form', slug, key],
    queryFn: () => formsService.publicForm(slug, key),
    enabled: Boolean(slug && key),
    retry: false,
  });

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [answers, setAnswers] = useState<FormAnswers>({});
  const [error, setError] = useState<string | null>(null);

  const submit = useMutation({
    mutationFn: () =>
      formsService.submit(slug, key, {
        respondentName: name.trim(),
        respondentEmail: email.trim() || undefined,
        respondentPhone: phone.trim() || undefined,
        answers: cleanAnswers(form?.fields ?? [], answers),
      }),
    meta: { inline: true },
    onError: (err) => setError(describeError(err)),
  });

  const missing = useMemo(() => (form ? findMissing(form.fields, answers) : []), [form, answers]);
  const canSubmit = name.trim().length > 0 && missing.length === 0;

  if (isLoading) {
    return (
      <div className="w-full max-w-xl mx-auto px-4 py-12 space-y-6">
        <Skeleton className="h-9 w-64 mx-auto" />
        <Skeleton className="h-64 rounded-xl" />
      </div>
    );
  }

  if (!form) {
    return (
      <div className="w-full max-w-xl mx-auto px-4 py-12">
        <EmptyState
          icon={ClipboardList}
          title="We couldn’t find that form"
          description="The link may be out of date, or the form isn’t open yet."
        />
      </div>
    );
  }

  if (submit.isSuccess) {
    return (
      <div className="w-full max-w-xl mx-auto px-4 py-16 text-center animate-fade-in">
        <div className="mx-auto bg-success-light text-success w-16 h-16 rounded-full flex items-center justify-center mb-6">
          <CheckCircle2 size={32} />
        </div>
        <Text variant="h1" className="mb-2">
          Thank you
        </Text>
        <Text variant="body-lg" color="muted">
          Your answers to “{form.title}” have been sent.
        </Text>
      </div>
    );
  }

  return (
    <div className="w-full max-w-xl mx-auto px-4 py-12 animate-fade-in">
      <Card padding="lg">
        <Text variant="h1" className="mb-2">
          {form.title}
        </Text>
        {form.description && (
          <Text variant="body" color="muted" className="mb-4">
            {form.description}
          </Text>
        )}

        {form.status === 'closed' ? (
          <div className="flex items-start gap-3 pt-2">
            <Lock size={18} className="text-slate-400 mt-0.5 shrink-0" aria-hidden />
            <div>
              <Text variant="h3" className="mb-1">
                This form is closed
              </Text>
              <Text variant="body" color="muted">
                It isn’t taking any more answers. <Link to={`/c/${slug}`} className="text-primary hover:underline">Visit the church page</Link> to get in touch.
              </Text>
            </div>
          </div>
        ) : (
          <form
            className="space-y-4 pt-2"
            onSubmit={(e) => {
              e.preventDefault();
              if (canSubmit) submit.mutate();
            }}
          >
            <Input autoComplete="name" label="Your name *" value={name} onChange={(e) => setName(e.target.value)} />
            <Input label="Email (optional)" type="email" value={email} onChange={(e) => setEmail(e.target.value)} />
            <Input label="Phone (optional)" type="tel" value={phone} onChange={(e) => setPhone(e.target.value)} />

            <FormQuestionInputs fields={form.fields} answers={answers} onChange={setAnswers} />

            {error && (
              <Text variant="body-sm" className="text-danger" role="alert">
                {error}
              </Text>
            )}

            <Button type="submit" variant="primary" size="lg" fullWidth disabled={!canSubmit} isLoading={submit.isPending}>
              Send
            </Button>
          </form>
        )}
      </Card>
    </div>
  );
}
