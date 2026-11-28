import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { ThemeProvider, ThemeToggle } from './theme';

beforeEach(() => {
  localStorage.clear();
  document.documentElement.classList.remove('dark');
});
afterEach(() => { cleanup(); vi.restoreAllMocks(); });

describe('Theme preference', () => {
  it('switches to dark mode and remembers the choice', () => {
    render(<ThemeProvider><ThemeToggle /></ThemeProvider>);
    fireEvent.click(screen.getByRole('button', { name: 'Switch to dark mode' }));
    expect(document.documentElement.classList.contains('dark')).toBe(true);
    expect(localStorage.getItem('unitracker-theme')).toBe('dark');
    fireEvent.click(screen.getByRole('button', { name: 'Switch to light mode' }));
    expect(document.documentElement.classList.contains('dark')).toBe(false);
    expect(localStorage.getItem('unitracker-theme')).toBe('light');
  });

  it('restores a saved dark preference on return', () => {
    localStorage.setItem('unitracker-theme', 'dark');
    render(<ThemeProvider><ThemeToggle /></ThemeProvider>);
    expect(document.documentElement.classList.contains('dark')).toBe(true);
    expect(document.documentElement.style.colorScheme).toBe('dark');
  });

  it('uses the device theme when there is no saved choice', () => {
    const media = window.matchMedia('(prefers-color-scheme: dark)');
    vi.spyOn(window, 'matchMedia').mockReturnValue({ ...media, matches: true });
    render(<ThemeProvider><ThemeToggle /></ThemeProvider>);
    expect(document.documentElement.classList.contains('dark')).toBe(true);
    expect(localStorage.getItem('unitracker-theme')).toBeNull();
  });
});