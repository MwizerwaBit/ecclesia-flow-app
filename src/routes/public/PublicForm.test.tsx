// @vitest-environment jsdom
/**
 * The public page of a standalone form: what a visitor sees for an open form, a closed one and a
 * link that goes nowhere, and exactly what is sent when they submit.
 */
import '@testing-library/jest-dom/vitest';
import { cleanup, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { afterEach, describe, expect, it, vi } from 'vitest';
import type { PublicForm as PublicFormData } from '@/types';

const h = vi.hoisted(() => ({ publicForm: vi.fn(), submit: vi.fn() }));
vi.mock('@/services/formsService', () => ({ formsService: { publicForm: h.publicForm, submit: h.submit } }));

import { ApiError } from '@/services/adapter';
import { PublicForm } from './PublicForm';

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

const OPEN: PublicFormData = {
  title: 'Visitor card',
  description: 'Tell us about your visit',
  status: 'published',
  fields: [
    { id: '1', label: 'How did you hear about us?', fieldType: 'single_choice', options: ['Friend', 'Online'], required: true, position: 0 },
    { id: '2', label: 'Prayer request', fieldType: 'text', options: [], required: false, position: 1 },
    { id: '3', label: 'Interests', fieldType: 'checkbox', options: ['Choir', 'Youth'], required: false, position: 2 },
  ],
};

function page() {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={client}>
      <MemoryRouter initialEntries={['/c/grace/forms/key123']}>
        <Routes>
          <Route path="/c/:slug/forms/:key" element={<PublicForm />} />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

describe('PublicForm', () => {
  it('asks the right form of the right church', async () => {
    h.publicForm.mockResolvedValue(OPEN);
    page();
    expect(await screen.findByRole('heading', { name: 'Visitor card' })).toBeInTheDocument();
    expect(h.publicForm).toHaveBeenCalledWith('grace', 'key123');
    expect(screen.getByText('Tell us about your visit')).toBeInTheDocument();
  });

  it('says so when the link goes nowhere (a draft or a wrong key)', async () => {
    h.publicForm.mockRejectedValue(new ApiError(404, 'not_found', 'No such form'));
    page();
    expect(await screen.findByText('We couldn’t find that form')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Send' })).not.toBeInTheDocument();
  });

  it('shows a closed form as closed, with nothing to fill in', async () => {
    h.publicForm.mockResolvedValue({ ...OPEN, status: 'closed' });
    page();
    expect(await screen.findByText('This form is closed')).toBeInTheDocument();
    expect(screen.queryByLabelText(/your name/i)).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Send' })).not.toBeInTheDocument();
  });

  it('keeps Send off until there is a name and the required questions are answered', async () => {
    const user = userEvent.setup();
    h.publicForm.mockResolvedValue(OPEN);
    page();
    const send = await screen.findByRole('button', { name: 'Send' });
    expect(send).toBeDisabled();
    await user.type(screen.getByLabelText('Your name *'), 'Ruth');
    expect(send).toBeDisabled(); // the required question is still open
    await user.selectOptions(screen.getByLabelText('How did you hear about us? *'), 'Friend');
    expect(send).toBeEnabled();
  });

  it('sends the name, contact and only the answered questions, then thanks the person', async () => {
    const user = userEvent.setup();
    h.publicForm.mockResolvedValue(OPEN);
    h.submit.mockResolvedValue({ id: 'r1', createdAt: '2026-10-31T09:00:00Z' });
    page();
    await user.type(await screen.findByLabelText('Your name *'), '  Ruth Mukamana ');
    await user.type(screen.getByLabelText('Email (optional)'), 'ruth@example.com');
    await user.selectOptions(screen.getByLabelText('How did you hear about us? *'), 'Online');
    await user.click(screen.getByLabelText('Choir'));
    await user.click(screen.getByRole('button', { name: 'Send' }));

    await waitFor(() => expect(h.submit).toHaveBeenCalled());
    expect(h.submit).toHaveBeenCalledWith('grace', 'key123', {
      respondentName: 'Ruth Mukamana',
      respondentEmail: 'ruth@example.com',
      respondentPhone: undefined,
      answers: { 'How did you hear about us?': 'Online', Interests: ['Choir'] },
    });
    expect(await screen.findByText('Thank you')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Send' })).not.toBeInTheDocument();
  });

  it('names the field the server refused instead of a generic message', async () => {
    const user = userEvent.setup();
    h.publicForm.mockResolvedValue(OPEN);
    h.submit.mockRejectedValueOnce(
      new ApiError(422, 'validation_error', 'The request payload is invalid', {
        fields: [{ loc: ['body', 'respondent_phone'], msg: 'Value error, That doesn’t look like a phone number' }],
      }),
    );
    page();
    await user.type(await screen.findByLabelText('Your name *'), 'Ruth');
    await user.selectOptions(screen.getByLabelText('How did you hear about us? *'), 'Friend');
    await user.click(screen.getByRole('button', { name: 'Send' }));
    const alert = await screen.findByRole('alert');
    expect(alert).toHaveTextContent(/phone number/i);
    expect(alert).not.toHaveTextContent('request payload is invalid');
  });

  it('shows what the server refused, and lets the person fix it and try again', async () => {
    const user = userEvent.setup();
    h.publicForm.mockResolvedValue(OPEN);
    h.submit.mockRejectedValueOnce(new ApiError(429, 'rate_limited', 'Too many requests. Please try again shortly.'));
    page();
    await user.type(await screen.findByLabelText('Your name *'), 'Ruth');
    await user.selectOptions(screen.getByLabelText('How did you hear about us? *'), 'Friend');
    await user.click(screen.getByRole('button', { name: 'Send' }));
    expect(await screen.findByRole('alert')).toHaveTextContent('Too many requests');
    expect(screen.getByLabelText('Your name *')).toHaveValue('Ruth'); // nothing typed is lost

    h.submit.mockResolvedValueOnce({ id: 'r1', createdAt: '2026-10-31T09:00:00Z' });
    await user.click(screen.getByRole('button', { name: 'Send' }));
    expect(await screen.findByText('Thank you')).toBeInTheDocument();
  });
});
