import { getDeadline } from './deadlines.js';

const styles = {
  safe: 'bg-due-safe text-due-safe-text',
  warning: 'bg-due-warning text-due-warning-text',
  overdue: 'bg-due-overdue text-due-overdue-text',
  neutral: 'bg-due-neutral text-due-neutral-text',
};

export default function DeadlineBadge({ task, now }) {
  const deadline = getDeadline(task, now);
  return (
    <span className={`inline-flex max-w-full items-center gap-1.5 rounded px-2 py-1 text-xs font-medium ${styles[deadline.state]}`}
      title={task.dueDate ? `Due ${task.dueDate}, at the end of the local day` : undefined}>
      <svg aria-hidden="true" focusable="false" viewBox="0 0 16 16"
        className="h-4 w-4 shrink-0" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        {task.status === 'done' ? <path d="m4 8 2.5 2.5L12 5" /> : (
          <><circle cx="8" cy="8" r="6" /><path d="M8 4.5V8l2.5 1.5" /></>
        )}
      </svg>
      <span className="break-words">{deadline.label}</span>
    </span>
  );
}
