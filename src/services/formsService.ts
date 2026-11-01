/**
 * @file formsService.ts
 * @description Forms: building them, sharing them, reading what people answered.
 * API only; an event's registration form lives in eventsService (same questions and answers).
 */
import type {
  Form,
  FormCreateInput,
  FormFieldDraft,
  FormField,
  FormListItem,
  FormStatus,
  FormSubmission,
  FormSubmissionDetail,
  FormSubmissionInput,
  PublicForm,
} from '@/types';
import { apiBlob, apiRequest, apiRequestAll, requireApi } from './adapter';

const enc = encodeURIComponent;

export const formsService = {
  async list(status?: FormStatus): Promise<FormListItem[]> {
    requireApi('Forms');
    return apiRequestAll<FormListItem>(`/forms${status ? `?status=${status}` : ''}`);
  },

  async get(id: string): Promise<Form> {
    requireApi('Forms');
    return apiRequest<Form>(`/forms/${enc(id)}`);
  },

  async create(input: FormCreateInput): Promise<Form> {
    requireApi('Forms');
    return apiRequest<Form>('/forms', { method: 'POST', body: JSON.stringify(input) });
  },

  async update(id: string, changes: { title?: string; description?: string }): Promise<Form> {
    requireApi('Forms');
    return apiRequest<Form>(`/forms/${enc(id)}`, { method: 'PATCH', body: JSON.stringify(changes) });
  },

  /** Replaces the whole set of questions, in the order given. */
  async setFields(id: string, fields: FormFieldDraft[]): Promise<FormField[]> {
    requireApi('Forms');
    return apiRequest<FormField[]>(`/forms/${enc(id)}/fields`, { method: 'PUT', body: JSON.stringify({ fields }) });
  },

  /** Opens a draft, or reopens a closed form, to answers through its public link. */
  async publish(id: string): Promise<Form> {
    requireApi('Forms');
    return apiRequest<Form>(`/forms/${enc(id)}/publish`, { method: 'POST' });
  },

  async close(id: string): Promise<Form> {
    requireApi('Forms');
    return apiRequest<Form>(`/forms/${enc(id)}/close`, { method: 'POST' });
  },

  async remove(id: string): Promise<void> {
    requireApi('Forms');
    await apiRequest<void>(`/forms/${enc(id)}`, { method: 'DELETE' });
  },

  async listSubmissions(id: string): Promise<FormSubmission[]> {
    requireApi('Forms');
    return apiRequestAll<FormSubmission>(`/forms/${enc(id)}/submissions`);
  },

  async getSubmission(formId: string, submissionId: string): Promise<FormSubmissionDetail> {
    requireApi('Forms');
    return apiRequest<FormSubmissionDetail>(`/forms/${enc(formId)}/submissions/${enc(submissionId)}`);
  },

  /** Every response as a CSV file the server builds (spreadsheet-safe, and on the audit log). */
  async exportSubmissions(id: string): Promise<Blob> {
    requireApi('Forms');
    return apiBlob(`/forms/${enc(id)}/submissions/export`);
  },

  // ── The public link: no sign-in ──────────────────────────────────────────

  async publicForm(slug: string, key: string): Promise<PublicForm> {
    requireApi('Forms');
    return apiRequest<PublicForm>(`/churches/${enc(slug)}/forms/${enc(key)}`, { skipAuth: true });
  },

  async submit(slug: string, key: string, input: FormSubmissionInput): Promise<{ id: string; createdAt: string }> {
    requireApi('Forms');
    return apiRequest<{ id: string; createdAt: string }>(`/churches/${enc(slug)}/forms/${enc(key)}/submit`, {
      method: 'POST',
      body: JSON.stringify(input),
      skipAuth: true,
    });
  },
};
