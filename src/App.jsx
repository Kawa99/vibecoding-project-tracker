import { useState, useEffect } from 'react';

/**
 * Vibecoding Project Tracker — board and task model (M4).
 * Remaining milestones:
 *   - M5  crud-modal    : add the "+" button modal and the edit-on-click modal.
 *   - M6  tag-style     : feature vs. bug color coding (uses DESIGN.md §2 colors).
 *   - M7  task-owner    : assignee badge + "Hand off to..." dropdown.
 *   - M8  due-tint      : color cards by due date (uses DESIGN.md §2 due-state colors).
 *   - M9  context       : a curated Context briefing field on the modal.
 *   - M10 copy-prompt   : a "Copy as Prompt Context" button that serializes the task + context.
 *   - M11 anchors       : the Anchor Board above the Kanban.
 *   - M12 secret-sauce  : the one open-ended thing that makes your tracker yours.
 *
 */

/**
 * @typedef {Object} Task
 * @property {string} id
 * @property {string} title
 * @property {string} description
 * @property {'feature'|'bug'} type
 * @property {'todo'|'in-progress'|'review'|'done'} status
 * @property {string} assignee
 * @property {string|null} dueDate     ISO 'YYYY-MM-DD'
 * @property {string} createdDate      ISO 'YYYY-MM-DD'
 * @property {string} context
 * @property {string|null} contextTool
 * @property {string|null} contextUpdatedAt
 */

// The four columns of the board, in render order.
// Use these IDs everywhere — do not invent new ones.
export const STAGES = [
  { id: 'todo',        label: 'To Do' },
  { id: 'in-progress', label: 'In Progress' },
  { id: 'review',      label: 'Review' },
  { id: 'done',        label: 'Done' },
];

// Sample profiles demonstrate ownership without implying real collaborators.
export const MEMBERS = [
  { name: 'Alex (example)', email: null, github: null },
  { name: 'Sam (example)', email: null, github: null },
  { name: 'Riley (example)', email: null, github: null },
];
export const TEAM = MEMBERS.map(member => member.name);

export function createExampleTasks() {
  const now = new Date();
  const createdDate = [
    now.getFullYear(),
    String(now.getMonth() + 1).padStart(2, '0'),
    String(now.getDate()).padStart(2, '0'),
  ].join('-');

  return [
    {
      id: 'example-context',
      title: 'Add a context briefing to each task',
      description: 'Keep background, constraints and next steps together.',
      type: 'feature', status: 'todo', assignee: TEAM[0],
    },
    {
      id: 'example-board',
      title: 'Build the four-column board',
      description: 'Show each task in the column matching its status.',
      type: 'feature', status: 'in-progress', assignee: TEAM[1],
    },
    {
      id: 'example-title',
      title: 'Check long task titles stay readable',
      description: 'Verify titles wrap without overflowing their cards.',
      type: 'bug', status: 'review', assignee: TEAM[2],
    },
    {
      id: 'example-design',
      title: 'Define the design system',
      description: 'Choose the palette, typography and component principles.',
      type: 'feature', status: 'done', assignee: TEAM[0],
    },
  ].map(task => ({
    ...task, dueDate: null, createdDate,
    context: '', contextTool: null, contextUpdatedAt: null,
  }));
}

/**
 * A tiny localStorage hook — survives reloads, no library needed.
 *
 * Usage:
 *   const [tasks, setTasks] = useLocalStorage('vibetracker.tasks', []);
 */
export function useLocalStorage(key, initialValue) {
  const [value, setValue] = useState(() => {
    try {
      const raw = window.localStorage.getItem(key);
      return raw != null ? JSON.parse(raw) : initialValue;
    } catch {
      return initialValue;
    }
  });

  useEffect(() => {
    try {
      window.localStorage.setItem(key, JSON.stringify(value));
    } catch {
      /* quota or private-mode error — silently ignore for hackathon */
    }
  }, [key, value]);

  return [value, setValue];
}

export function TaskBoard({ tasks }) {
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
                    <article className="min-w-0 rounded-lg border border-border-subtle bg-surface-card p-4">
                      <h3 className="break-words text-sm font-semibold">{task.title}</h3>
                      <p className="mt-3 break-words text-xs text-text-muted">
                        <span className="font-medium">Owner: </span>{task.assignee}
                      </p>
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
  // M5 adds editing and persistence; M4 keeps the sample board in memory.
  const [tasks] = useState(createExampleTasks);

  return (
    <div className="min-h-screen bg-surface-page p-6 font-sans text-text-primary">
      <header className="mb-6">
        <h1 className="text-2xl font-semibold text-brand-primary">Vibecoding Project Tracker</h1>
        <p className="mt-1 text-sm text-text-muted">Keep the task. Keep the context.</p>
      </header>
      <main aria-label="Task board">
        <p className="mb-4 text-sm text-text-muted">Example board with sample tasks and members.</p>
        <TaskBoard tasks={tasks} />
      </main>
    </div>
  );
}
