import { useEffect, useState } from 'react';

export function readCollection(storage, key, initialValue, normalize) {
  const raw = storage.getItem(key);
  const value = raw === null
    ? (typeof initialValue === 'function' ? initialValue() : initialValue)
    : JSON.parse(raw);
  return { value: normalize(value), isNew: raw === null };
}

export function writeCollection(storage, key, value, normalize) {
  const saved = normalize(value);
  storage.setItem(key, JSON.stringify(saved));
  return saved;
}

// Persist before updating the UI so failed writes leave drafts intact.
export function useLocalStorage(key, initialValue, normalize) {
  const [state, setState] = useState(() => {
    try {
      if (typeof window === 'undefined') {
        return { value: initialValue(), isNew: false, blocked: false, error: '' };
      }
      return { ...readCollection(window.localStorage, key, initialValue, normalize), blocked: false, error: '' };
    } catch {
      return {
        value: [], isNew: false, blocked: true,
        error: 'Saved data could not be read. Existing browser data was left unchanged. Reload to retry.',
      };
    }
  });

  useEffect(() => {
    if (!state.isNew) return;
    try {
      writeCollection(window.localStorage, key, state.value, normalize);
      setState(current => ({ ...current, isNew: false }));
    } catch {
      setState(current => ({
        ...current, isNew: false,
        error: 'Initial data could not be saved. Keep this window open and retry saving your changes.',
      }));
    }
  }, [key, normalize, state]);

  function save(value) {
    if (state.blocked) return false;
    try {
      const saved = writeCollection(window.localStorage, key, value, normalize);
      setState({ value: saved, isNew: false, blocked: false, error: '' });
      return true;
    } catch {
      setState(current => ({
        ...current,
        error: 'Changes could not be saved in this browser. Keep this window open and copy your work, then retry.',
      }));
      return false;
    }
  }

  return [state.value, save, state.error, state.blocked];
}
