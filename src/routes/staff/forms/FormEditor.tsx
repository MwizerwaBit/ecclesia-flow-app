/**
 * @file FormEditor.tsx
 * @description Make a form, change it, open it to answers, close it. One screen for a new form
 * (`/staff/forms/new`) and an existing one (`/staff/forms/:id`).
 *
 * Details (title, description) and questions save separately: the API replaces the whole list of
 * questions in one call, and editing them never touches responses already collected.
 */
import { useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { ArrowLeft, ClipboardList, Copy, Trash2 } from 'lucide-react';
import type { Form, FormFieldDraft } from '@/types';
import { formsService } from '@/services/formsService';
import { orgService } from '@/services/orgService';
import { apiFieldErrors } from '@/lib/formErrors';
import { STATUS_LABEL, formShareUrl, problemWithFields, toDrafts } from '@/lib/forms';
import { shareOrCopy } from '@/lib/download';
import { required, useFieldErrors } from '@/lib/validation';
import { useRole } from '@/hooks/useRole';
import { toast } from '@/hooks/useToastStore';
import { Badge, Button, Card, Input, Skeleton, Text } from '@/components/ui';
import { QuestionEditor } from '@/components/forms/QuestionEditor';
import { ErrorNotice } from '@/components/feedback/ErrorNotice';

const STATUS_BADGE = { draft: 'neutral', published: 'success', closed: 'warning' } as const;
const RULES = { title: required('Title') };

export function FormEditor() {
  const { id } = useParams();
  if (!id) return <NewForm />;
  return <ExistingForm id={id} />;
}

// ── A new form ───────────────────────────────────────────────────────────

function NewForm() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [fields, setFields] = useState<FormFieldDraft[]>([]);

  const create = useMutation({
    mutationFn: () => formsService.create({ title: title.trim(), description: description.trim() || undefined, fields }),
    meta: { inline: true },
    onSuccess: (form) => {
      void queryClient.invalidateQueries({ queryKey: ['forms'] });
      navigate(`/staff/forms/${form.id}`, { replace: true });
    },
  });

  const server = apiFieldErrors(create.error);
  const { field, validateAll } = useFieldErrors({ title }, RULES, { title: server.title });

  function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (validateAll() && !problemWithFields(fields)) create.mutate();
  }

  return (
    <Shell>
      <Text variant="h1">New form</Text>
      <form onSubmit={onSubmit} className="space-y-5" noValidate>
        <Card variant="outline" padding="md" className="space-y-3">
          <Input label="Title" value={title} onChange={(e) => setTitle(e.target.value)} {...field('title')} />
          <Input label="Description (optional)" value={description} onChange={(e) => setDescription(e.target.value)} />
        </Card>
        <Card variant="outline" padding="md" className="space-y-3">
          <Text variant="label" color="muted">
            Questions
          </Text>
          <Text variant="caption" color="muted" className="block">
            People always give their name; add anything else you want to ask. You can change these later.
          </Text>
          <QuestionEditor fields={fields} onChange={setFields} />
        </Card>
        {create.isError && <ErrorNotice error={create.error} />}
        <Button type="submit" variant="primary" isLoading={create.isPending} disabled={Boolean(problemWithFields(fields))}>
          Create form
        </Button>
      </form>
    </Shell>
  );
}

// ── An existing form ─────────────────────────────────────────────────────

function ExistingForm({ id }: { id: string }) {
  const { can } = useRole();
  const canManage = can('forms:manage');

  const form = useQuery({ queryKey: ['forms', id], queryFn: () => formsService.get(id) });
  if (form.isLoading) {
    return (
      <Shell>
        <Skeleton className="h-9 w-64" />
        <Skeleton className="h-48 rounded-xl" />
      </Shell>
    );
  }
  if (form.isError || !form.data) {
    return (
      <Shell>
        <ErrorNotice error={form.error} />
        <Button variant="secondary" onClick={() => void form.refetch()}>
          Try again
        </Button>
      </Shell>
    );
  }
  return <FormView form={form.data} canManage={canManage} />;
}

function FormView({ form, canManage }: { form: Form; canManage: boolean }) {
  const { can } = useRole();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [title, setTitle] = useState(form.title);
  const [description, setDescription] = useState(form.description ?? '');
  const [edits, setEdits] = useState<FormFieldDraft[] | null>(null);
  const [confirmingDelete, setConfirmingDelete] = useState(false);
  const fields = edits ?? toDrafts(form.fields);

  const { data: org } = useQuery({ queryKey: ['org', 'profile'], queryFn: () => orgService.getProfile() });
  const shareUrl = org && form.status !== 'draft' ? formShareUrl(window.location.origin, org.slug, form.publicKey) : '';

  const saved = (next: Form) => {
    queryClient.setQueryData(['forms', form.id], next);
    void queryClient.invalidateQueries({ queryKey: ['forms'] });
  };

  const saveDetails = useMutation({
    mutationFn: () => formsService.update(form.id, { title: title.trim(), description: description.trim() }),
    meta: { inline: true },
    onSuccess: saved,
  });
  const saveFields = useMutation({
    mutationFn: () => formsService.setFields(form.id, fields),
    meta: { inline: true },
    onSuccess: async () => {
      setEdits(null);
      saved(await formsService.get(form.id));
    },
  });
  const move = useMutation({
    mutationFn: (to: 'publish' | 'close') => (to === 'publish' ? formsService.publish(form.id) : formsService.close(form.id)),
    onSuccess: saved,
  });
  const remove = useMutation({
    mutationFn: () => formsService.remove(form.id),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['forms'] });
      navigate('/staff/forms', { replace: true });
    },
  });

  const server = apiFieldErrors(saveDetails.error);
  const { field, validateAll } = useFieldErrors({ title }, RULES, { title: server.title });
  const detailsDirty = title.trim() !== form.title || description.trim() !== (form.description ?? '');

  async function copyLink() {
    const result = await shareOrCopy({ title: form.title, url: shareUrl });
    if (result === 'copied') toast.success('Link copied');
    else if (result === 'failed') toast.error('Couldn’t copy the link. Select it and copy it by hand.');
  }

  return (
    <Shell>
      <div className="flex items-start justify-between gap-3">
        <Text variant="h1" className="min-w-0 break-words">
          {form.title}
        </Text>
        <Badge variant={STATUS_BADGE[form.status]} size="sm" className="shrink-0 mt-2">
          {STATUS_LABEL[form.status]}
        </Badge>
      </div>

      {can('forms:responses') && (
        <Link
          to={`/staff/forms/${form.id}/responses`}
          className="text-body-sm text-primary hover:underline inline-flex items-center gap-1 min-h-11"
        >
          <ClipboardList size={14} aria-hidden /> {form.submissionCount}{' '}
          {form.submissionCount === 1 ? 'response' : 'responses'}
        </Link>
      )}

      {canManage && (
        <Card variant="outline" padding="md" className="space-y-3">
          <Text variant="label" color="muted">
            Sharing
          </Text>
          {form.status === 'draft' && (
            <Text variant="body-sm" color="muted">
              Only you can see this form. Open it to get a link anyone can fill in.
            </Text>
          )}
          {form.status === 'closed' && (
            <Text variant="body-sm" color="muted">
              The link still works but says the form is closed, and takes no more answers.
            </Text>
          )}
          {shareUrl && (
            <div className="flex items-end gap-2">
              <Input label="Link" value={shareUrl} readOnly className="font-mono text-caption" />
              <Button type="button" variant="secondary" leftIcon={Copy} aria-label="Copy link" onClick={() => void copyLink()}>
                Copy
              </Button>
            </div>
          )}
          <div className="flex flex-wrap gap-2">
            {form.status !== 'published' && (
              <Button variant="primary" isLoading={move.isPending} onClick={() => move.mutate('publish')}>
                {form.status === 'closed' ? 'Reopen form' : 'Open form'}
              </Button>
            )}
            {form.status === 'published' && (
              <Button variant="secondary" isLoading={move.isPending} onClick={() => move.mutate('close')}>
                Close form
              </Button>
            )}
          </div>
          {move.isError && <ErrorNotice error={move.error} />}
        </Card>
      )}

      <Card variant="outline" padding="md" className="space-y-3">
        <Text variant="label" color="muted">
          Details
        </Text>
        <Input
          label="Title"
          value={title}
          readOnly={!canManage}
          onChange={(e) => setTitle(e.target.value)}
          {...field('title')}
        />
        <Input label="Description" value={description} readOnly={!canManage} onChange={(e) => setDescription(e.target.value)} />
        {canManage && (
          <>
            {saveDetails.isError && <ErrorNotice error={saveDetails.error} />}
            <Button
              variant="primary"
              isLoading={saveDetails.isPending}
              disabled={!detailsDirty}
              onClick={() => validateAll() && saveDetails.mutate()}
            >
              Save details
            </Button>
          </>
        )}
      </Card>

      <Card variant="outline" padding="md" className="space-y-3">
        <Text variant="label" color="muted">
          Questions
        </Text>
        <Text variant="caption" color="muted" className="block">
          Changing the questions never changes answers already collected: each response keeps the questions it was
          given.
        </Text>
        {canManage ? (
          <>
            <QuestionEditor fields={fields} onChange={setEdits} emptyText="No questions yet. People will only give their name.">
              <Button
                type="button"
                variant="primary"
                isLoading={saveFields.isPending}
                disabled={edits === null || Boolean(problemWithFields(fields))}
                onClick={() => saveFields.mutate()}
              >
                Save questions
              </Button>
            </QuestionEditor>
            {saveFields.isError && <ErrorNotice error={saveFields.error} />}
          </>
        ) : (
          <ol className="list-decimal pl-5 space-y-1">
            {form.fields.map((f) => (
              <li key={f.id}>
                <Text variant="body-sm">
                  {f.label}
                  {f.required ? ' *' : ''}
                </Text>
              </li>
            ))}
          </ol>
        )}
      </Card>

      {canManage && form.submissionCount === 0 && (
        <div className="flex flex-wrap items-center gap-2">
          {!confirmingDelete ? (
            <Button variant="ghost" leftIcon={Trash2} onClick={() => setConfirmingDelete(true)}>
              Delete form
            </Button>
          ) : (
            <>
              <Text variant="body-sm">Delete this form? This can’t be undone.</Text>
              <Button variant="destructive" isLoading={remove.isPending} onClick={() => remove.mutate()}>
                Yes, delete it
              </Button>
              <Button variant="ghost" onClick={() => setConfirmingDelete(false)}>
                Keep it
              </Button>
            </>
          )}
        </div>
      )}
      {remove.isError && <ErrorNotice error={remove.error} />}
    </Shell>
  );
}

function Shell({ children }: { children: React.ReactNode }) {
  return (
    <div className="w-full max-w-3xl mx-auto px-4 py-6 animate-fade-in space-y-5">
      <Link
        to="/staff/forms"
        className="text-body-sm text-slate-500 hover:text-primary transition-colors inline-flex items-center gap-1"
      >
        <ArrowLeft size={14} aria-hidden /> All forms
      </Link>
      {children}
    </div>
  );
}
