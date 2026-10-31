/**
 * @file forms.types.ts
 * @description Forms: questions, the forms built from them, and what people answer.
 * Matches the API's forms module; an event's registration form is the same shape.
 */

export type FormFieldType = 'text' | 'single_choice' | 'checkbox';

export interface FormField {
  id: string;
  label: string;
  fieldType: FormFieldType;
  options: string[];
  required: boolean;
  position: number;
}

/** What's sent to replace a form's questions: no id or position, the server numbers them in order. */
export interface FormFieldDraft {
  label: string;
  fieldType: FormFieldType;
  options: string[];
  required: boolean;
}

/** Keyed by the question's wording, not an id, so a later edit never reattaches an answer. */
export type FormAnswers = Record<string, string | string[]>;

export type FormStatus = 'draft' | 'published' | 'closed';

export interface FormListItem {
  id: string;
  title: string;
  status: FormStatus;
  unitId: string | null;
  submissionCount: number;
  createdAt: string;
  updatedAt: string;
}

export interface Form extends FormListItem {
  description: string | null;
  /** The unguessable part of the public link, `/c/<church>/forms/<publicKey>`. */
  publicKey: string;
  fields: FormField[];
  publishedAt: string | null;
  closedAt: string | null;
}

export interface FormCreateInput {
  title: string;
  description?: string;
  fields: FormFieldDraft[];
}

/** What the public link shows: the questions and nothing about the church's own data. */
export interface PublicForm {
  title: string;
  description: string | null;
  status: 'published' | 'closed';
  fields: FormField[];
}

export interface FormSubmissionInput {
  respondentName: string;
  respondentEmail?: string;
  respondentPhone?: string;
  answers: FormAnswers;
}

export interface FormSubmission {
  id: string;
  respondentName: string;
  respondentEmail: string | null;
  respondentPhone: string | null;
  answers: FormAnswers;
  createdAt: string;
}

/** A response with the questions as they were when it was sent. */
export interface FormSubmissionDetail extends FormSubmission {
  formSnapshot: {
    formTitle: string;
    reconstructed: boolean;
    fields: Array<Omit<FormField, 'id'>>;
  };
}
