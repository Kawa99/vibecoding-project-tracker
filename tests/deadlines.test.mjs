import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { test } from 'node:test';
import { getDeadline, watchDeadlineClock } from '../src/deadlines.js';
import { createExampleTasks } from '../src/tasks.js';

test('urgency respects exact 48-hour, 24-hour and midnight boundaries', () => {
  const task = { status: 'todo', dueDate: '2026-01-12' };
  assert.equal(getDeadline(task, new Date(2026, 0, 10, 23, 59, 59, 999)).state, 'safe');
  assert.deepEqual(getDeadline(task, new Date(2026, 0, 11)), { state: 'warning', label: 'Due soon' });
  assert.deepEqual(getDeadline(task, new Date(2026, 0, 12)), { state: 'warning', label: 'Due today' });
  assert.equal(getDeadline(task, new Date(2026, 0, 12, 23, 59, 59, 999)).state, 'warning');
  assert.deepEqual(getDeadline(task, new Date(2026, 0, 13)), { state: 'overdue', label: 'Overdue' });
  assert.deepEqual(getDeadline(task, new Date(2026, 0, 10)), { state: 'safe', label: 'Due 2026-01-12' });
});

test('Done overrides every date; reopening, changing and clearing a date recalculate urgency', () => {
  const now = new Date(2026, 0, 10, 12);
  for (const dueDate of ['2000-01-01', '2030-01-01', null]) {
    assert.deepEqual(getDeadline({ status: 'done', dueDate }, now), { state: 'neutral', label: 'Done' });
  }
  const task = { ...createExampleTasks()[0], status: 'done', dueDate: '2000-01-01' };
  const before = structuredClone(task);
  assert.equal(getDeadline({ ...task, status: 'review' }, now).state, 'overdue');
  assert.equal(getDeadline({ ...task, status: 'review', dueDate: '2030-01-01' }, now).state, 'safe');
  assert.deepEqual(getDeadline({ ...task, status: 'review', dueDate: null }, now), { state: 'neutral', label: 'No due date' });
  assert.deepEqual(task, before, 'urgency must not be stored in or mutate a task');
});

test('new example boards demonstrate safe, warning, overdue and Done-neutral states', () => {
  const now = new Date();
  assert.deepEqual(createExampleTasks().map(task => getDeadline(task, now).state), ['safe', 'warning', 'overdue', 'neutral']);
});

test('deadlines follow local dates in both positive and negative UTC offsets', () => {
  const moduleUrl = new URL('../src/deadlines.js', import.meta.url).href;
  const script = `
    import assert from 'node:assert/strict';
    import { getDeadline } from ${JSON.stringify(moduleUrl)};
    const task = { status: 'todo', dueDate: '2026-01-10' };
    assert.equal(getDeadline(task, new Date(2026, 0, 10, 23, 30)).state, 'warning');
    assert.equal(getDeadline(task, new Date(2026, 0, 11, 0, 0)).state, 'overdue');
  `;
  for (const TZ of ['America/Los_Angeles', 'Pacific/Auckland']) {
    execFileSync(process.execPath, ['--input-type=module', '-e', script], { env: { ...process.env, TZ } });
  }
});

test('local end-of-day handles 23-hour and 25-hour daylight-saving days', () => {
  const moduleUrl = new URL('../src/deadlines.js', import.meta.url).href;
  const script = `
    import assert from 'node:assert/strict';
    import { getDeadline } from ${JSON.stringify(moduleUrl)};
    const spring = new Date(2026, 2, 29);
    assert.equal((new Date(2026, 2, 30) - spring) / 3600000, 23);
    assert.deepEqual(getDeadline({ status: 'todo', dueDate: '2026-03-29' }, spring), { state: 'warning', label: 'Due today' });
    assert.equal(getDeadline({ status: 'todo', dueDate: '2026-03-29' }, new Date(2026, 2, 30)).state, 'overdue');
    const autumn = new Date(2026, 9, 25);
    assert.equal((new Date(2026, 9, 26) - autumn) / 3600000, 25);
    assert.deepEqual(getDeadline({ status: 'todo', dueDate: '2026-10-25' }, autumn), { state: 'warning', label: 'Due soon' });
    assert.equal(getDeadline({ status: 'todo', dueDate: '2026-10-25' }, new Date(2026, 9, 25, 23, 30)).state, 'warning');
    assert.equal(getDeadline({ status: 'todo', dueDate: '2026-10-25' }, new Date(2026, 9, 26)).state, 'overdue');
  `;
  execFileSync(process.execPath, ['--input-type=module', '-e', script], { env: { ...process.env, TZ: 'Europe/London' } });
});

test('clock refreshes each visible minute and on reactivation, then removes timers/listeners', t => {
  const previousDocument = globalThis.document;
  const previousWindow = globalThis.window;
  t.mock.timers.enable({ apis: ['setInterval'] });
  const document = new EventTarget();
  document.visibilityState = 'visible';
  globalThis.document = document;
  globalThis.window = new EventTarget();
  let ticks = 0;
  const stop = watchDeadlineClock(() => { ticks += 1; });
  try {
    t.mock.timers.tick(59999);
    assert.equal(ticks, 0);
    t.mock.timers.tick(1);
    assert.equal(ticks, 1);
    document.visibilityState = 'hidden';
    t.mock.timers.tick(60000);
    document.dispatchEvent(new Event('visibilitychange'));
    assert.equal(ticks, 1);
    document.visibilityState = 'visible';
    document.dispatchEvent(new Event('visibilitychange'));
    assert.equal(ticks, 2);
    window.dispatchEvent(new Event('focus'));
    assert.equal(ticks, 3);
    stop();
    t.mock.timers.tick(60000);
    document.dispatchEvent(new Event('visibilitychange'));
    window.dispatchEvent(new Event('focus'));
    assert.equal(ticks, 3);
  } finally {
    stop();
    t.mock.timers.reset();
    if (previousDocument === undefined) delete globalThis.document;
    else globalThis.document = previousDocument;
    if (previousWindow === undefined) delete globalThis.window;
    else globalThis.window = previousWindow;
  }
});
