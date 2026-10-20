import { useState, useEffect, useRef } from 'react';
import { STAGES, TEAM, createExampleTasks, moveTask, newTask, normalizeTasks, ownerInitials, prepareTask } from './tasks.js';
import { useLocalStorage } from './storage.js';
import AnchorBoard from './AnchorBoard.jsx';
import TaskEditor from './TaskEditor.jsx';
import TaskType, { TYPE_STYLES } from './TaskType.jsx';
import DeadlineBadge from './DeadlineBadge.jsx';
import CopyContext from './CopyContext.jsx';
import ThemeToggle from './ThemeToggle.jsx';
import { getDeadline, watchDeadlineClock } from './deadlines.js';

export { STAGES, MEMBERS, TEAM, createExampleTasks } from './tasks.js';

const STAGE_ACCENTS = {
  todo: 'border-t-control-border',
  'in-progress': 'border-t-brand-primary',
  review: 'border-t-due-warning-text',
  done: 'border-t-due-safe-text',
};

export function TaskBoard({ tasks, onEdit, onHandoff, onMove, handoffDisabled = false }) {
  const [, setTick] = useState(0);
  const [draggedId, setDraggedId] = useState(null);
  const dragged = useRef(null);
  const suppressClick = useRef(false);
  const [dragHelp, setDragHelp] = useState('');
  useEffect(() => watchDeadlineClock(() => setTick(tick => tick + 1)), []);
  const now = new Date();
  const canDrag = Boolean(onMove) && !handoffDisabled;
  const source = tasks.find(task => task.id === draggedId);

  function endDrag() {
    dragged.current = null;
    setDraggedId(null);
  }

  function validTarget(stage) {
    const task = tasks.find(item => item.id === dragged.current);
    return canDrag && task && task.status !== stage.id;
  }

  return (
    <div onPointerDownCapture={() => { if (!dragged.current) suppressClick.current = false; }}
      onKeyDownCapture={() => { if (!dragged.current) suppressClick.current = false; }}
      onClickCapture={event => {
        if (suppressClick.current) { event.preventDefault(); event.stopPropagation(); }
      }} className="rounded-xl border border-border-subtle bg-surface-card p-4 shadow-sm sm:p-5">
      <p id="move-help" className="mb-4 text-sm text-text-muted">Drag a task's handle to move it, or edit the task and choose Status. Press Escape to cancel a drag.</p>
      <p role="status" className="mb-2 text-sm text-text-muted">{dragHelp}</p>
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
      {STAGES.map(stage => {
        const stageTasks = tasks.filter(task => task.status === stage.id);
        const highlighted = canDrag && source && source.status !== stage.id;
        return (
          <section key={stage.id} aria-labelledby={`stage-${stage.id}`}
            onDragOver={event => {
              if (validTarget(stage)) {
                event.preventDefault();
                event.dataTransfer.dropEffect = 'move';
              }
            }}
            onDrop={event => {
              event.preventDefault();
              event.stopPropagation();
              const id = dragged.current;
              const valid = validTarget(stage) && event.dataTransfer.getData('application/x-vibetracker-task') === id;
              endDrag();
              if (valid) onMove(id, stage.id);
            }}
            className={`min-h-32 min-w-0 rounded-lg border-t-2 bg-surface-column p-4 ${STAGE_ACCENTS[stage.id]} ${highlighted ? 'ring-2 ring-brand-primary' : ''}`}>
            <h2 id={`stage-${stage.id}`} className="mb-4 flex items-center justify-between gap-2 text-base font-semibold">
              <span>{stage.label}</span>
              <span className="flex h-7 min-w-7 items-center justify-center gap-1 rounded-full border border-border-subtle bg-surface-card px-2 text-xs font-medium text-text-muted">
                {stageTasks.length}<span className="sr-only">{stageTasks.length === 1 ? 'task' : 'tasks'}</span>
              </span>
            </h2>
            {highlighted && <p className="mb-3 rounded border border-dashed border-brand-primary p-2 text-sm text-brand-primary">Drop here to move to {stage.label}</p>}
            {stageTasks.length === 0 ? (
              <p className="rounded-lg border border-dashed border-control-border p-4 text-sm text-text-muted">
                No tasks in this stage yet.
              </p>
            ) : (
              <ul className="space-y-3">
                {stageTasks.map(task => (
                  <li key={task.id}>
                    <article className={`min-w-0 rounded-lg border border-border-subtle border-l-4 bg-surface-card ${TYPE_STYLES[task.type]?.border || ''}`}>
                      <div className="flex items-center justify-between gap-2 px-4 py-2">
                        <TaskType type={task.type} />
                        <button type="button" draggable={canDrag} disabled={!canDrag}
                          aria-label={`Drag task: ${task.title}`} aria-describedby="move-help"
                          onClick={() => setDragHelp('To move with a keyboard, edit the task and change Status.')}
                          onDragStart={event => {
                            if (!canDrag) { event.preventDefault(); return; }
                            event.stopPropagation();
                            event.dataTransfer.effectAllowed = 'move';
                            event.dataTransfer.setData('application/x-vibetracker-task', task.id);
                            dragged.current = task.id;
                            suppressClick.current = true;
                            setDraggedId(task.id);
                            setDragHelp('');
                          }}
                          onDragEnd={endDrag}
                          className="min-h-9 cursor-grab rounded-lg border border-control-border px-3 py-1 text-xs font-medium text-text-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-primary focus-visible:ring-offset-2 active:cursor-grabbing disabled:cursor-not-allowed">
                          <span aria-hidden="true">⠿ </span>Drag
                        </button>
                      </div>
                      <button type="button" onClick={() => onEdit?.(task)}
                        aria-label={`Edit task: ${task.title}, ${TYPE_STYLES[task.type]?.label || task.type}, owner: ${task.assignee}, ${getDeadline(task, now).label}`}
                        className="block w-full rounded-lg px-4 pb-3 pt-2 text-left hover:bg-surface-page focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-primary focus-visible:ring-offset-2">
                        <span className="block break-words text-sm font-semibold">{task.title}</span>
                        {task.id.startsWith('example-') && <span className="mt-1 block text-xs text-text-muted">Example task</span>}
                        <span className="mt-2 flex items-center gap-2 text-xs text-text-muted">
                          <span aria-hidden="true" className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-surface-column font-semibold text-text-primary">
                            {ownerInitials(task.assignee)}
                          </span>
                          <span className="min-w-0 break-words"><span className="font-medium">Owner: </span>{task.assignee}</span>
                        </span>
                        <span className="mt-2 block"><DeadlineBadge task={task} now={now} /></span>
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

  function move(id, status) {
    setMessage('');
    const next = moveTask(tasks, id, status);
    if (next !== tasks && saveTasks(next)) {
      setMessage(`Task moved to ${STAGES.find(stage => stage.id === status).label}.`);
    }
  }

  return (
    <div className="mx-auto min-h-screen max-w-screen-2xl bg-surface-page p-4 font-sans text-text-primary sm:p-6">
      <header className="-mx-4 -mt-4 mb-6 flex flex-wrap items-center justify-between gap-4 border-b border-border-subtle border-t-4 border-t-brand-primary bg-surface-card px-4 py-4 shadow-sm sm:-mx-6 sm:-mt-6 sm:px-6 sm:py-5">
        <div>
          <p className="mb-1 text-xs font-semibold uppercase tracking-widest text-text-muted">Project board</p>
          <h1 className="text-2xl font-semibold tracking-tight text-brand-primary sm:text-3xl">Vibecoding Project Tracker</h1>
          <p className="mt-1 text-sm text-text-muted">Keep the task. Keep the context.</p>
        </div>
        <div className="flex flex-wrap items-start gap-3">
          <ThemeToggle />
          <button id="add-task" ref={addButton} type="button" onClick={() => openEditor(newTask())}
            className="min-h-9 rounded-lg bg-brand-primary px-4 py-2 text-sm font-medium text-text-on-brand hover:bg-brand-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-primary focus-visible:ring-offset-2">
            <span aria-hidden="true">+ </span>Add task
          </button>
        </div>
      </header>
      <main aria-label="Task board">
        <AnchorBoard />
        <p className="mb-4 text-sm text-text-muted">Sample members demonstrate ownership. Saved in this browser only; clearing browser data removes your work.</p>
        <p role="status" className="mb-4 text-sm">{message}</p>
        {storageError && !editing && <p role="alert" className="mb-4 text-sm text-due-overdue-text">{storageError}</p>}
        <TaskBoard tasks={tasks} onEdit={openEditor} onHandoff={handOff} onMove={move} handoffDisabled={storageBlocked} />
      </main>
      {editing && <TaskEditor task={editing} onSave={saveTask} onDelete={deleteTask}
        onClose={() => setEditing(null)} storageError={storageError}
        storageBlocked={storageBlocked} fallbackFocus={addButton} />}
    </div>
  );
}
