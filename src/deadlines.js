import { localDate } from './tasks.js';

export function getDeadline(task, now = new Date()) {
  if (task.status === 'done') return { state: 'neutral', label: 'Done' };
  if (!task.dueDate) return { state: 'neutral', label: 'No due date' };

  const [year, month, day] = task.dueDate.split('-').map(Number);
  const deadline = new Date(0);
  // Advance the calendar day, not 24 hours: local days can cross a DST change.
  deadline.setFullYear(year, month - 1, day + 1);
  deadline.setHours(0, 0, 0, 0);
  const remaining = deadline.getTime() - now.getTime();
  if (remaining <= 0) return { state: 'overdue', label: 'Overdue' };
  if (remaining <= 48 * 60 * 60 * 1000) {
    const today = remaining <= 24 * 60 * 60 * 1000 && task.dueDate === localDate(now);
    return { state: 'warning', label: today ? 'Due today' : 'Due soon' };
  }
  return { state: 'safe', label: `Due ${task.dueDate}` };
}

export function watchDeadlineClock(update) {
  const refresh = () => {
    if (document.visibilityState === 'visible') update();
  };
  const timer = setInterval(refresh, 60000);
  document.addEventListener('visibilitychange', refresh);
  window.addEventListener('focus', refresh);
  return () => {
    clearInterval(timer);
    document.removeEventListener('visibilitychange', refresh);
    window.removeEventListener('focus', refresh);
  };
}
