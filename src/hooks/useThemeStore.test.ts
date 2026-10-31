// @vitest-environment jsdom
import { beforeEach, describe, expect, it } from 'vitest';
import { applyTheme, resolveTheme, useThemeStore } from './useThemeStore';

describe('theme', () => {
  beforeEach(() => {
    document.documentElement.classList.remove('dark');
    useThemeStore.setState({ preference: 'system' });
  });

  it('cycles light, dark, system', () => {
    useThemeStore.setState({ preference: 'light' });
    useThemeStore.getState().cycle();
    expect(useThemeStore.getState().preference).toBe('dark');
    useThemeStore.getState().cycle();
    expect(useThemeStore.getState().preference).toBe('system');
    useThemeStore.getState().cycle();
    expect(useThemeStore.getState().preference).toBe('light');
  });

  it('puts the dark class on <html> only when dark is chosen', () => {
    applyTheme('dark');
    expect(document.documentElement.classList.contains('dark')).toBe(true);
    applyTheme('light');
    expect(document.documentElement.classList.contains('dark')).toBe(false);
    expect(resolveTheme('dark')).toBe('dark');
    expect(resolveTheme('light')).toBe('light');
  });
});
