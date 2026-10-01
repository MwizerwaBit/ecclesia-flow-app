/**
 * @file adapter.ts
 * @description The swap-point between mock data and real API.
 *
 * Set API_MODE = 'rest' and provide BASE_URL when a real backend is ready.
 * Components never import from this file directly — they go through /services/*.
 *
 * Simulates realistic network latency in mock mode so loading states are visible during dev.
 */

export const API_MODE: 'mock' | 'rest' = 'mock';
export const BASE_URL = import.meta.env.VITE_API_URL ?? 'http://localhost:8000/api/v1';

/** Simulate network delay in mock mode (ms) */
const MOCK_LATENCY = { min: 150, max: 400 };

function randomLatency(): number {
  return Math.random() * (MOCK_LATENCY.max - MOCK_LATENCY.min) + MOCK_LATENCY.min;
}

/**
 * Mock adapter — returns typed data after a simulated delay.
 * In 'rest' mode this is bypassed; real fetch calls happen in service files.
 */
export async function mockResponse<T>(data: T, latencyMs?: number): Promise<T> {
  const delay = latencyMs ?? randomLatency();
  await new Promise((resolve) => setTimeout(resolve, delay));
  return structuredClone(data) as T;
}

/**
 * Real API adapter — wraps fetch with auth headers and error handling.
 * Only used when API_MODE = 'rest'.
 */
export async function apiRequest<T>(
  path: string,
  options?: RequestInit & { token?: string },
): Promise<T> {
  const { token, ...fetchOptions } = options ?? {};
  const res = await fetch(`${BASE_URL}${path}`, {
    ...fetchOptions,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...fetchOptions.headers,
    },
  });

  if (!res.ok) {
    const error = await res.json().catch(() => ({ message: res.statusText }));
    throw new Error(error.message ?? `Request failed: ${res.status}`);
  }

  return res.json() as Promise<T>;
}
