import { useRef, useState } from 'react';
import { ANCHORS, createAnchors, normalizeAnchors, parseAnchorUrl } from './anchors.js';
import { useLocalStorage } from './storage.js';

const button = 'inline-flex min-h-9 items-center rounded-lg border border-control-border px-3 py-2 text-xs font-medium focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-primary focus-visible:ring-offset-2 disabled:cursor-not-allowed';

export function AnchorSlot({ anchor, onSave, blocked = false }) {
  const [draft, setDraft] = useState(anchor.url || '');
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const input = useRef(null);

  function save(value) {
    setError('');
    setMessage('');
    let url;
    try {
      url = parseAnchorUrl(value);
    } catch (failure) {
      setError(failure.message);
      input.current?.focus();
      return;
    }
    if (onSave(url)) {
      setDraft(url || '');
      setMessage(url ? 'Link saved.' : 'Link cleared.');
    }
  }

  return (
    <form noValidate onSubmit={event => { event.preventDefault(); save(draft); }}
      aria-labelledby={`anchor-${anchor.id}-title`} className="min-w-0 rounded-lg border border-border-subtle bg-surface-card p-4">
      <h3 id={`anchor-${anchor.id}-title`} className="text-sm font-semibold">{anchor.label}</h3>
      <p className="my-3 flex items-center gap-2 text-xs text-text-muted">
        <span aria-hidden="true" className={`h-2.5 w-2.5 rounded-full border ${anchor.url ? 'border-type-feature bg-type-feature' : 'border-control-border'}`} />
        {blocked ? 'Unavailable' : anchor.url ? 'Link saved' : 'No link'}
      </p>
      <label htmlFor={`anchor-${anchor.id}-url`} className="text-xs font-medium">{anchor.label} URL</label>
      <input ref={input} id={`anchor-${anchor.id}-url`} type="url" value={draft}
        aria-invalid={error ? true : undefined} aria-describedby={error ? `anchor-${anchor.id}-error` : undefined}
        onChange={event => { setDraft(event.target.value); setError(''); setMessage(''); }}
        className="mt-1 block w-full rounded-lg border border-control-border bg-surface-card px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-primary focus-visible:ring-offset-2" />
      {error && <p id={`anchor-${anchor.id}-error`} role="alert" className="mt-2 text-sm text-due-overdue-text">{error}</p>}
      <div className="mt-3 flex flex-wrap gap-2">
        <button type="submit" disabled={blocked} className={button}>Save link</button>
        <button type="button" onClick={() => save('')} disabled={blocked || (!anchor.url && !draft)} className={button}>Clear</button>
        {anchor.url && <a href={anchor.url} target="_blank" rel="noopener noreferrer"
          aria-label={`Open ${anchor.label} saved link (new tab)`} className={button + ' text-brand-primary underline'}>Open saved link</a>}
      </div>
      <p role="status" className="mt-2 text-xs text-text-muted">{message}</p>
    </form>
  );
}

export default function AnchorBoard() {
  const [anchors, saveAnchors, error, blocked] = useLocalStorage('vibetracker.anchors', createAnchors, normalizeAnchors);

  function save(id, url) {
    return saveAnchors(anchors.map(anchor => anchor.id === id ? { ...anchor, url } : anchor));
  }

  return (
    <section aria-labelledby="deliverables-title" className="mb-6">
      <h2 id="deliverables-title" className="text-base font-semibold">Deliverables</h2>
      <p className="mb-4 mt-1 text-xs text-text-muted">A saved link records its location; it does not verify the deliverable is complete.</p>
      {error && <p role="alert" className="mb-4 text-sm text-due-overdue-text">Deliverables: {error}</p>}
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
        {ANCHORS.map(slot => <AnchorSlot key={slot.id} anchor={anchors.find(anchor => anchor.id === slot.id) || { ...slot, url: null }}
          blocked={blocked} onSave={url => save(slot.id, url)} />)}
      </div>
    </section>
  );
}
