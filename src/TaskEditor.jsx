import { useEffect, useRef, useState } from 'react';
import { STAGES, TEAM, taskErrors } from './tasks.js';

const control = 'mt-1 block w-full rounded-lg border border-control-border bg-surface-card px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-primary focus-visible:ring-offset-2';
const button = 'min-h-9 rounded-lg border border-control-border px-4 py-2 text-sm font-medium focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-primary focus-visible:ring-offset-2';

export default function TaskEditor({ task, onSave, onDelete, onClose, storageError, storageBlocked, fallbackFocus }) {
  const dialog = useRef(null);
  const [draft, setDraft] = useState(() => ({ ...task }));
  const [errors, setErrors] = useState({});
  const [confirmDelete, setConfirmDelete] = useState(false);

  useEffect(() => {
    const element = dialog.current;
    const trigger = document.activeElement;
    element.showModal();
    return () => {
      element.close();
      const target = trigger?.isConnected ? trigger : fallbackFocus.current;
      target?.focus();
    };
  }, [fallbackFocus]);

  function submit(event) {
    event.preventDefault();
    if (confirmDelete) return;
    const nextErrors = taskErrors(draft);
    if (event.currentTarget.elements.dueDate.validity.badInput) {
      nextErrors.dueDate = 'Enter a valid date or leave it empty.';
    }
    setErrors(nextErrors);
    if (Object.keys(nextErrors).length) {
      event.currentTarget.elements.namedItem(Object.keys(nextErrors)[0])?.focus();
      return;
    }
    onSave(draft);
  }

  const fields = [
    { name: 'title', label: 'Title', required: true },
    { name: 'description', label: 'Description', multiline: true },
    { name: 'type', label: 'Type', required: true, options: [{ id: 'feature', label: 'Feature' }, { id: 'bug', label: 'Bug' }] },
    { name: 'status', label: 'Status', required: true, options: STAGES },
    { name: 'assignee', label: 'Owner', required: true, options: [{ id: '', label: 'Choose an owner' }, ...TEAM.map(name => ({ id: name, label: name }))] },
    { name: 'dueDate', label: 'Due date', inputType: 'date' },
    { name: 'context', label: 'Context', multiline: true },
  ];

  return (
    <dialog ref={dialog} aria-labelledby="task-editor-title"
      onCancel={event => { event.preventDefault(); onClose(); }}
      className="m-auto max-h-[calc(100dvh_-_2rem)] w-[calc(100%_-_2rem)] max-w-[640px] overflow-y-auto rounded-lg border border-border-subtle bg-surface-card p-6 text-text-primary backdrop:bg-text-primary/50">
      <header className="mb-4 flex items-start justify-between gap-4">
        <div>
          <h2 id="task-editor-title" className="text-base font-semibold">{task.id ? 'Edit task' : 'New task'}</h2>
          <p className="mt-1 text-xs text-text-muted">Required fields are marked *. Save to keep your changes.</p>
          {task.createdDate && <p className="mt-1 text-xs text-text-muted">Created {task.createdDate}</p>}
        </div>
        <button type="button" onClick={onClose} className={button}>Close</button>
      </header>
      {storageError && <p role="alert" className="mb-4 text-sm text-due-overdue-text">{storageError}</p>}
      <form noValidate onSubmit={submit}>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          {fields.map(field => {
            const props = {
              id: field.name, name: field.name, value: draft[field.name] ?? '',
              required: field.required, autoFocus: field.name === 'title',
              'aria-invalid': errors[field.name] ? true : undefined,
              'aria-describedby': errors[field.name] ? `${field.name}-error` : undefined,
              className: control + (field.name === 'context' ? ' min-h-40 font-mono' : ''),
              onChange: event => {
                const value = event.target.value;
                setDraft(current => ({ ...current, [field.name]: field.name === 'dueDate' ? value || null : value }));
                setErrors(current => ({ ...current, [field.name]: undefined }));
              },
            };
            return (
              <div key={field.name} className={field.multiline || field.name === 'title' ? 'sm:col-span-2' : ''}>
                <label htmlFor={field.name} className="text-sm font-medium">
                  {field.label}{field.required ? ' *' : ' (optional)'}
                </label>
                {field.options ? (
                  <select {...props}>{field.options.map(option => <option key={option.id} value={option.id}>{option.label}</option>)}</select>
                ) : field.multiline ? (
                  <textarea {...props} rows={field.name === 'context' ? 8 : 3} />
                ) : (
                  <input {...props} type={field.inputType || 'text'} />
                )}
                {errors[field.name] && <p id={`${field.name}-error`} role="alert" className="mt-1 text-sm text-due-overdue-text">{errors[field.name]}</p>}
              </div>
            );
          })}
        </div>
        <footer className="mt-6">
          {confirmDelete ? (
            <div>
              <p role="alert" className="mb-3 text-sm">Delete this task? This cannot be undone.</p>
              <div className="flex flex-wrap gap-3">
                <button type="button" onClick={() => onDelete(task.id)} disabled={storageBlocked}
                  className={button + ' border-due-overdue-text bg-due-overdue text-due-overdue-text disabled:cursor-not-allowed'}>Delete task</button>
                <button type="button" autoFocus onClick={() => setConfirmDelete(false)} className={button}>Keep task</button>
              </div>
            </div>
          ) : (
            <div className="flex flex-wrap gap-3">
              <button type="submit" disabled={storageBlocked}
                className={button + ' border-brand-primary bg-brand-primary text-text-on-brand hover:bg-brand-accent disabled:cursor-not-allowed'}>Save task</button>
              <button type="button" onClick={onClose} className={button}>Cancel</button>
              {task.id && <button type="button" onClick={() => setConfirmDelete(true)}
                className={button + ' text-due-overdue-text'}>Delete task</button>}
            </div>
          )}
        </footer>
      </form>
    </dialog>
  );
}
