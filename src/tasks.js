import { readCollection, writeCollection } from './storage.js';

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

export function moveTask(tasks, id, status) {
  const task = tasks.find(item => item.id === id);
  if (!task || task.status === status || !STAGES.some(stage => stage.id === status)) return tasks;
  return tasks.map(item => item.id === id ? { ...item, status } : item);
}

// Sample profiles demonstrate ownership without implying real collaborators.
export const MEMBERS = [
  { name: 'Alex (example)', email: null, github: null },
  { name: 'Sam (example)', email: null, github: null },
  { name: 'Riley (example)', email: null, github: null },
];
export const TEAM = MEMBERS.map(member => member.name);
export const CONTEXT_TOOLS = ['Claude', 'ChatGPT', 'Cursor', 'Lovable', 'Replit', 'Other'];
export const CONTEXT_TEMPLATE = `## Background

## Constraints

## Tried so far / Outcome

## Pick up / Next steps
`;

export function createExampleTasks() {
  const now = new Date();
  const createdDate = localDate(now);
  const future = new Date(now);
  future.setDate(future.getDate() + 3);
  const yesterday = new Date(now);
  yesterday.setDate(yesterday.getDate() - 1);

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
      type: 'feature', status: 'in-progress', assignee: TEAM[1] || TEAM[0],
    },
    {
      id: 'example-title',
      title: 'Check long task titles stay readable',
      description: 'Verify titles wrap without overflowing their cards.',
      type: 'bug', status: 'review', assignee: TEAM[2] || TEAM[0],
    },
    {
      id: 'example-design',
      title: 'Define the design system',
      description: 'Choose the palette, typography and component principles.',
      type: 'feature', status: 'done', assignee: TEAM[0],
    },
  ].map(task => ({
    ...task, createdDate,
    dueDate: task.status === 'todo' ? localDate(future)
      : task.status === 'in-progress' ? createdDate : localDate(yesterday),
    context: '', contextTool: null, contextUpdatedAt: null,
  }));
}


export function localDate(now = new Date()) {
  return [String(now.getFullYear()).padStart(4, '0'), String(now.getMonth() + 1).padStart(2, '0'), String(now.getDate()).padStart(2, '0')].join('-');
}

export function ownerInitials(name) {
  return name.replace(/\s*\(example\)$/, '').trim().split(/\s+/)
    .filter(Boolean).slice(0, 2).map(part => Array.from(part)[0]).join('').toUpperCase();
}

export function isDateOnly(value) {
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const [year, month, day] = value.split('-').map(Number);
  const date = new Date(0);
  date.setFullYear(year, month - 1, day);
  date.setHours(0, 0, 0, 0);
  return year > 0 && localDate(date) === value;
}

export function taskErrors(task) {
  const errors = {};
  if (typeof task.title !== 'string' || !task.title.trim() || task.title.trim().length > 200) {
    errors.title = 'Enter a title between 1 and 200 characters.';
  }
  if (typeof task.description !== 'string' || task.description.length > 10000) {
    errors.description = 'Keep the description within 10,000 characters.';
  }
  if (!['feature', 'bug'].includes(task.type)) errors.type = 'Choose Feature or Bug.';
  if (!STAGES.some(stage => stage.id === task.status)) errors.status = 'Choose a valid stage.';
  if (!TEAM.includes(task.assignee)) errors.assignee = 'Choose an owner.';
  if (task.dueDate !== null && !isDateOnly(task.dueDate)) errors.dueDate = 'Enter a valid date or leave it empty.';
  if (typeof task.context !== 'string' || task.context.length > 50000) {
    errors.context = 'Keep the context within 50,000 characters.';
  }
  if (task.contextTool !== null && !CONTEXT_TOOLS.includes(task.contextTool)) {
    errors.contextTool = 'Choose a supported AI tool or no selection.';
  }
  return errors;
}

export function normalizeTasks(value) {
  if (!Array.isArray(value)) throw new Error('Saved tasks must be a list.');
  const ids = new Set();
  return value.map(record => {
    if (!record || typeof record !== 'object' || Array.isArray(record)) throw new Error('Invalid task record.');
    const task = {
      ...record,
      context: record.context === undefined ? '' : record.context,
      contextTool: record.contextTool === undefined ? null : record.contextTool,
      contextUpdatedAt: record.contextUpdatedAt === undefined ? null : record.contextUpdatedAt,
    };
    const validTimestamp = task.contextUpdatedAt === null ||
      (typeof task.contextUpdatedAt === 'string' &&
        /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d+)?(?:Z|[+-]\d{2}:\d{2})$/.test(task.contextUpdatedAt) &&
        isDateOnly(task.contextUpdatedAt.slice(0, 10)) &&
        Number.isFinite(Date.parse(task.contextUpdatedAt)));
    if (typeof task.id !== 'string' || !task.id.trim() || ids.has(task.id) ||
        !isDateOnly(task.createdDate) || !validTimestamp ||
        Object.keys(taskErrors(task)).length) {
      throw new Error('Saved tasks contain invalid or duplicate records.');
    }
    ids.add(task.id);
    return task;
  });
}

export function newTask() {
  return {
    title: '', description: '', type: 'feature', status: 'todo',
    assignee: TEAM.length === 1 ? TEAM[0] : '', dueDate: null,
    context: CONTEXT_TEMPLATE, contextTool: null, contextUpdatedAt: null,
  };
}

export function prepareTask(draft, original) {
  return {
    ...original, ...draft,
    id: original ? original.id : crypto.randomUUID(),
    createdDate: original ? original.createdDate : localDate(),
    title: draft.title.trim(),
    contextUpdatedAt: draft.context !== (original?.context ?? '')
      ? new Date().toISOString() : (original?.contextUpdatedAt ?? null),
  };
}

export function contextUpdatedHint(timestamp, now = new Date()) {
  if (!timestamp) return 'Context not saved yet.';
  const minutes = Math.max(0, Math.floor((now.getTime() - Date.parse(timestamp)) / 60000));
  if (minutes < 1) return 'Context updated just now.';
  const [amount, unit] = minutes < 60 ? [minutes, 'minute']
    : minutes < 1440 ? [Math.floor(minutes / 60), 'hour'] : [Math.floor(minutes / 1440), 'day'];
  return `Context updated ${new Intl.RelativeTimeFormat('en').format(-amount, unit)}.`;
}

export function readTasks(storage, key, initialValue) {
  const { value, isNew } = readCollection(storage, key, initialValue, normalizeTasks);
  return { tasks: value, isNew };
}

export function writeTasks(storage, key, tasks) {
  return writeCollection(storage, key, tasks, normalizeTasks);
}
