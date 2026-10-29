import { afterEach, describe, expect, it, vi } from 'vitest';
import { toSnakeCase } from './adapter';
import { newRequestKey, rekeyPreferences } from './notificationsService';

describe('newRequestKey', () => {
  afterEach(() => vi.unstubAllGlobals());

  it('is something the API accepts: 8 to 100 letters, digits, dashes and underscores', () => {
    for (let i = 0; i < 20; i += 1) {
      expect(newRequestKey()).toMatch(/^[A-Za-z0-9_-]{8,100}$/);
    }
  });

  it('differs every time', () => {
    expect(new Set(Array.from({ length: 50 }, () => newRequestKey())).size).toBe(50);
  });

  it('still works where crypto.randomUUID is missing', () => {
    vi.stubGlobal('crypto', {});
    expect(newRequestKey()).toMatch(/^[A-Za-z0-9_-]{8,100}$/);
  });
});

describe('preference keys', () => {
  it('puts type and channel names back after the transport camel-cased them', () => {
    const fromTransport = {
      pastoralAlert: { email: true, push: false, inApp: true, sms: false },
      event: { email: false, inApp: true },
    };
    expect(rekeyPreferences(fromTransport)).toEqual({
      pastoral_alert: { email: true, push: false, in_app: true, sms: false },
      event: { email: false, in_app: true },
    });
  });

  it('copes with nothing', () => {
    expect(rekeyPreferences(undefined)).toEqual({});
    expect(rekeyPreferences(null)).toEqual({});
  });

  it('sends a change the way the API reads it: snake_case type and channel names stay as they are', () => {
    expect(toSnakeCase({ preferences: { pastoral_alert: { in_app: false }, event: { email: true } } })).toEqual({
      preferences: { pastoral_alert: { in_app: false }, event: { email: true } },
    });
  });

  it('sends a read/unread change with the key the API expects', () => {
    expect(toSnakeCase({ isRead: false })).toEqual({ is_read: false });
  });
});
