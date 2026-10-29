// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { TimeZoneNotice } from './TimeZoneNotice';
import { isUnsetTimeZone } from './unsetTimeZone';

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

function browserZoneIs(timeZone: string) {
  const real = Intl.DateTimeFormat.prototype.resolvedOptions;
  vi.spyOn(Intl.DateTimeFormat.prototype, 'resolvedOptions').mockImplementation(function (this: Intl.DateTimeFormat) {
    return { ...real.call(this), timeZone };
  });
}

const renderNotice = (zone: string) =>
  render(
    <MemoryRouter>
      <TimeZoneNotice zone={zone} />
    </MemoryRouter>,
  );

describe('isUnsetTimeZone', () => {
  it('is true only for a UTC church seen from a browser that is not on UTC', () => {
    expect(isUnsetTimeZone('UTC', 'Africa/Kigali')).toBe(true);
    expect(isUnsetTimeZone('UTC', 'UTC')).toBe(false);
    expect(isUnsetTimeZone('UTC', 'Etc/UTC')).toBe(false);
    expect(isUnsetTimeZone('Africa/Kigali', 'Africa/Kigali')).toBe(false);
    expect(isUnsetTimeZone('Africa/Kigali', 'America/New_York')).toBe(false);
  });
});

describe('<TimeZoneNotice />', () => {
  it('says the zone is not set and links to Settings', () => {
    browserZoneIs('Africa/Kigali');
    renderNotice('UTC');
    expect(screen.getByRole('status').textContent).toContain('time zone isn’t set');
    expect(screen.getByRole('link', { name: /set it in settings/i }).getAttribute('href')).toBe('/staff/settings');
  });

  it('renders nothing once the church has a zone', () => {
    browserZoneIs('Africa/Kigali');
    const { container } = renderNotice('Africa/Kigali');
    expect(container.innerHTML).toBe('');
  });

  it('renders nothing when the browser is on UTC too', () => {
    browserZoneIs('UTC');
    const { container } = renderNotice('UTC');
    expect(container.innerHTML).toBe('');
  });
});
