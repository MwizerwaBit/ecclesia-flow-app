// @vitest-environment jsdom
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import type { OrgListItem } from '@/types';
import { OrganisationsList } from './OrganisationsList';

const listOrgs = vi.fn();
vi.mock('@/services/platformService', () => ({
  platformService: { listOrgs: (...args: unknown[]) => listOrgs(...args) },
}));

const org = (over: Partial<OrgListItem>): OrgListItem =>
  ({
    id: 'o1',
    displayName: 'St Mark',
    slug: 'st-mark',
    country: 'RW',
    tier: 'free',
    status: 'active',
    memberCount: 12,
    ...over,
  }) as OrgListItem;

function renderList() {
  return render(
    <QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}>
      <MemoryRouter>
        <OrganisationsList />
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

describe('OrganisationsList', () => {
  beforeEach(() => listOrgs.mockReset());

  it('shows a church that has registered but not been activated yet', async () => {
    // The API sends 'pending' for these; the page used to crash reading a badge for it.
    listOrgs.mockResolvedValue([org({ status: 'pending' as OrgListItem['status'] })]);
    renderList();
    expect(await screen.findByText('St Mark')).toBeTruthy();
    expect(screen.getAllByText('Pending').length).toBeGreaterThan(0);
  });

  it('shows a status it does not know as itself instead of breaking the whole list', async () => {
    listOrgs.mockResolvedValue([
      org({ id: 'o1', displayName: 'Strange', status: 'archived' as OrgListItem['status'] }),
      org({ id: 'o2', displayName: 'Normal', status: 'active' }),
    ]);
    renderList();
    expect(await screen.findByText('Strange')).toBeTruthy();
    expect(screen.getByText('archived')).toBeTruthy();
    expect(screen.getByText('Normal')).toBeTruthy();
  });
});
