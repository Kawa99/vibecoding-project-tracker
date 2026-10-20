import { useState, useEffect, useRef } from 'react';
import { STAGES, createExampleTasks, newTask, prepareTask, readTasks, writeTasks } from './tasks.js';
import TaskEditor from './TaskEditor.jsx';

export { STAGES, MEMBERS, TEAM, createExampleTasks } from './tasks.js';

// Persist before updating the board so failed saves leave the draft intact.
export function useLocalStorage(key, initialValue) {
  const [state, setState] = useState(() => {
    try {
      if (typeof window === 'undefined') {
        return { tasks: initialValue(), isNew: false, blocked: false, error: '' };
      }
      return { ...readTasks(window.localStorage, key, initialValue), blocked: false, error: '' };
    } catch {
      return {
        tasks: [], isNew: false, blocked: true,
        error: 'Saved tasks could not be read. Existing browser data was left unchanged. Reload to retry.',
      };
    }
  });

  useEffect(() => {
    if (!state.isNew) return;
    try {
      writeTasks(window.localStorage, key, state.tasks);
      setState(current => ({ ...current, isNew: false }));
    } catch {
      setState(current => ({
        ...current, isNew: false,
        error: 'Example tasks could not be saved. Keep this window open and retry by saving a task.',
      }));
    }
  }, [key, state]);

  function save(tasks) {
    if (state.blocked) return false;
    try {
      const saved = writeTasks(window.localStorage, key, tasks);
      setState({ tasks: saved, isNew: false, blocked: false, error: '' });
      return true;
    } catch {
      setState(current => ({
        ...current,
        error: 'Changes could not be saved in this browser. Keep this window open and copy your work, then retry.',
      }));
      return false;
    }
  }

  return [state.tasks, save, state.error, state.blocked];
}

export function TaskBoard({ tasks, onEdit }) {
  return (
    <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
      {STAGES.map(stage => {
        const stageTasks = tasks.filter(task => task.status === stage.id);
        return (
          <section key={stage.id} aria-labelledby={`stage-${stage.id}`} className="min-w-0 rounded-lg bg-surface-column p-4">
            <h2 id={`stage-${stage.id}`} className="mb-4 text-base font-semibold">
              {stage.label}
            </h2>
            {stageTasks.length === 0 ? (
              <p className="rounded-lg border border-dashed border-control-border p-4 text-sm text-text-muted">
                No tasks in this stage yet.
              </p>
            ) : (
              <ul className="space-y-3">
                {stageTasks.map(task => (
                  <li key={task.id}>
                    <article className="min-w-0 rounded-lg border border-border-subtle bg-surface-card">
                      <button type="button" onClick={() => onEdit?.(task)}
                        aria-label={`Edit task: ${task.title}, owner: ${task.assignee}`}
                        className="block w-full rounded-lg p-4 text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-primary focus-visible:ring-offset-2">
                        <span className="block break-words text-sm font-semibold">{task.title}</span>
                        {task.id.startsWith('example-') && <span className="mt-1 block text-xs text-text-muted">Example task</span>}
                        <span className="mt-3 block break-words text-xs text-text-muted">
                          <span className="font-medium">Owner: </span>{task.assignee}
                        </span>
                      </button>
                    </article>
                  </li>
                ))}
              </ul>
            )}
          </section>
        );
      })}
    </div>
  );
}


export default function App() {
  const [tasks, saveTasks, storageError, storageBlocked] =
    useLocalStorage('vibetracker.tasks', createExampleTasks);
  const [editing, setEditing] = useState(null);
  const [message, setMessage] = useState('');
  const addButton = useRef(null);

  function openEditor(task) {
    setMessage('');
    setEditing(task);
  }

  function saveTask(draft) {
    const original = editing.id ? tasks.find(task => task.id === editing.id) : null;
    const task = prepareTask(draft, original);
    const next = original ? tasks.map(item => item.id === original.id ? task : item) : [...tasks, task];
    if (saveTasks(next)) {
      setEditing(null);
      setMessage(original ? 'Task updated.' : 'Task added.');
    }
  }

  function deleteTask(id) {
    if (saveTasks(tasks.filter(task => task.id !== id))) {
      setEditing(null);
      setMessage('Task deleted.');
    }
  }

  return (
    <div className="min-h-screen bg-surface-page p-6 font-sans text-text-primary">
      <header className="mb-6 flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-brand-primary">Vibecoding Project Tracker</h1>
          <p className="mt-1 text-sm text-text-muted">Keep the task. Keep the context.</p>
        </div>
        <button id="add-task" ref={addButton} type="button" onClick={() => openEditor(newTask())}
          className="min-h-9 rounded-lg bg-brand-primary px-4 py-2 text-sm font-medium text-text-on-brand hover:bg-brand-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-primary focus-visible:ring-offset-2">
          <span aria-hidden="true">+ </span>Add task
        </button>
      </header>
      <main aria-label="Task board">
        <p className="mb-4 text-sm text-text-muted">Sample members demonstrate ownership. Saved in this browser only; clearing browser data removes your work.</p>
        <p role="status" className="mb-4 text-sm">{message}</p>
        {storageError && !editing && <p role="alert" className="mb-4 text-sm text-due-overdue-text">{storageError}</p>}
        <TaskBoard tasks={tasks} onEdit={openEditor} />
      </main>
      {editing && <TaskEditor task={editing} onSave={saveTask} onDelete={deleteTask}
        onClose={() => setEditing(null)} storageError={storageError}
        storageBlocked={storageBlocked} fallbackFocus={addButton} />}
    </div>
  );
}
