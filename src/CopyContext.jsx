import { useState } from 'react';
import { formatContext, writeContextToClipboard } from './context.js';

export default function CopyContext({ task }) {
  const [result, setResult] = useState({ status: 'idle', text: '' });

  async function copy() {
    const text = formatContext(task);
    setResult({ status: 'pending', text });
    try {
      await writeContextToClipboard(text);
      setResult({ status: 'success', text });
    } catch {
      setResult({ status: 'error', text });
    }
  }

  return (
    <div className="space-y-2">
      <button type="button" onClick={copy} disabled={result.status === 'pending'}
        aria-label={`Copy Context for ${task.title || 'untitled task'}`}
        className="min-h-9 rounded-lg border border-control-border bg-surface-card px-3 py-2 text-sm font-medium text-text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-primary focus-visible:ring-offset-2 disabled:cursor-wait">
        Copy Context
      </button>
      <p role="status" className="text-xs text-text-muted">
        {result.status === 'pending' ? 'Copying context…' : result.status === 'success' ? 'Context copied. Paste it into your AI tool.' : ''}
      </p>
      {result.status === 'error' && (
        <div>
          <p role="alert" className="mb-2 text-sm text-due-overdue-text">Couldn't copy. Select the text below and copy it manually.</p>
          <label className="block text-xs font-medium">
            Briefing from your last copy attempt
            <textarea readOnly value={result.text} rows={6} onFocus={event => event.currentTarget.select()}
              className="mt-1 block w-full rounded-lg border border-control-border bg-surface-card p-3 font-mono text-sm text-text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-primary focus-visible:ring-offset-2" />
          </label>
        </div>
      )}
    </div>
  );
}
