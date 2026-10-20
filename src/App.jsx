import { useState, useEffect, useRef } from 'react';
import { STAGES, TEAM, createExampleTasks, newTask, normalizeTasks, ownerInitials, prepareTask } from './tasks.js';
import { useLocalStorage } from './storage.js';
import AnchorBoard from './AnchorBoard.jsx';
import TaskEditor from './TaskEditor.jsx';
import TaskType, { TYPE_STYLES } from './TaskType.jsx';
import DeadlineBadge from './DeadlineBadge.jsx';
import CopyContext from './CopyContext.jsx';
import { getDeadline, watchDeadlineClock } from './deadlines.js';

export { STAGES, MEMBERS, TEAM, createExampleTasks } from './tasks.js';


export function TaskBoard({ tasks, onEdit, onHandoff, handoffDisabled = false }) {
  const [, setTick] = useState(0);
  useEffect(() => watchDeadlineClock(() => setTick(tick => tick + 1)), []);
  const now = new Date();

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
                    <article className={`min-w-0 rounded-lg border border-border-subtle border-l-4 bg-surface-card ${TYPE_STYLES[task.type]?.border || ''}`}>
                      <button type="button" onClick={() => onEdit?.(task)}
                        aria-label={`Edit task: ${task.title}, ${TYPE_STYLES[task.type]?.label || task.type}, owner: ${task.assignee}, ${getDeadline(task, now).label}`}
                        className="block w-full rounded-lg p-4 text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-primary focus-visible:ring-offset-2">
                        <span className="mb-3 flex justify-end"><TaskType type={task.type} /></span>
                        <span className="block break-words text-sm font-semibold">{task.title}</span>
                        {task.id.startsWith('example-') && <span className="mt-1 block text-xs text-text-muted">Example task</span>}
                        <span className="mt-3 flex items-center gap-2 text-xs text-text-muted">
                          <span aria-hidden="true" className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-surface-column font-semibold text-text-primary">
                            {ownerInitials(task.assignee)}
                          </span>
                          <span className="min-w-0 break-words"><span className="font-medium">Owner: </span>{task.assignee}</span>
                        </span>
                        <span className="mt-3 block"><DeadlineBadge task={task} now={now} /></span>
                      </button>
                      <div className="border-t border-border-subtle px-4 pb-4 pt-3">
                        <div className="mb-3"><CopyContext task={task} /></div>
                        <label className="block text-xs font-medium text-text-muted">
                          Hand off to…<span className="sr-only"> for {task.title}</span>
                          <select value="" disabled={handoffDisabled || TEAM.length < 2}
                            onChange={event => onHandoff?.(task.id, event.target.value)}
                            className="mt-1 block min-h-9 w-full rounded-lg border border-control-border bg-surface-card px-2 py-1 text-sm text-text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-primary focus-visible:ring-offset-2 disabled:cursor-not-allowed">
                            <option value="" disabled>Choose a member</option>
                            {TEAM.filter(name => name !== task.assignee).map(name => <option key={name} value={name}>{name}</option>)}
                          </select>
                        </label>
                        {TEAM.length < 2 && <p className="mt-2 text-xs text-text-muted">Add another configured member to enable handoff.</p>}
                      </div>
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
    useLocalStorage('vibetracker.tasks', createExampleTasks, normalizeTasks);
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

  function handOff(id, assignee) {
    setMessage('');
    const next = tasks.map(task => task.id === id ? { ...task, assignee } : task);
    if (saveTasks(next)) setMessage(`Assigned to ${assignee}.`);
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
        <AnchorBoard />
        <p className="mb-4 text-sm text-text-muted">Sample members demonstrate ownership. Saved in this browser only; clearing browser data removes your work.</p>
        <p role="status" className="mb-4 text-sm">{message}</p>
        {storageError && !editing && <p role="alert" className="mb-4 text-sm text-due-overdue-text">{storageError}</p>}
        <TaskBoard tasks={tasks} onEdit={openEditor} onHandoff={handOff} handoffDisabled={storageBlocked} />
      </main>
      {editing && <TaskEditor task={editing} onSave={saveTask} onDelete={deleteTask}
        onClose={() => setEditing(null)} storageError={storageError}
        storageBlocked={storageBlocked} fallbackFocus={addButton} />}
    </div>
  );
}
