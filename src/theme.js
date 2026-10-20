import { useEffect, useState } from 'react';
import { readCollection, writeCollection } from './storage.js';

export const THEME_KEY = 'vibetracker.theme';
export const THEME_QUERY = '(prefers-color-scheme: dark)';

export function normalizeTheme(value) {
  if (value !== 'light' && value !== 'dark') throw new Error('Invalid theme preference.');
  return value;
}

export function readTheme(environment) {
  const system = environment?.matchMedia?.(THEME_QUERY).matches ? 'dark' : 'light';
  try {
    if (!environment) return { theme: system, selection: null, error: '' };
    const saved = readCollection(environment.localStorage, THEME_KEY, () => system, normalizeTheme);
    return { theme: saved.value, selection: saved.isNew ? null : saved.value, error: '' };
  } catch {
    return { theme: system, selection: null, error: 'Theme preference could not be read. Using the system theme.' };
  }
}

export function applyTheme(theme, root = document.documentElement) {
  root.dataset.theme = normalizeTheme(theme);
}

export function useTheme() {
  const [state, setState] = useState(() => readTheme(typeof window === 'undefined' ? undefined : window));

  useEffect(() => { applyTheme(state.theme); }, [state.theme]);
  useEffect(() => {
    if (state.selection) return;
    const media = window.matchMedia?.(THEME_QUERY);
    if (!media) return;
    const followSystem = () => setState(current => current.selection ? current : { ...current, theme: media.matches ? 'dark' : 'light' });
    followSystem();
    media.addEventListener('change', followSystem);
    return () => media.removeEventListener('change', followSystem);
  }, [state.selection]);

  function toggle() {
    const theme = state.theme === 'dark' ? 'light' : 'dark';
    let error = '';
    try {
      writeCollection(window.localStorage, THEME_KEY, theme, normalizeTheme);
    } catch {
      error = 'Theme changed for this visit, but your selection could not be saved. Try again.';
    }
    setState({ theme, selection: theme, error });
  }

  return [state.theme, toggle, state.error];
}
