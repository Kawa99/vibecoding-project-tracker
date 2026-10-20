import assert from 'node:assert/strict';
import { test } from 'node:test';
import {
  CONTEXT_TEMPLATE, CONTEXT_TOOLS, contextUpdatedHint, createExampleTasks, isDateOnly, localDate, newTask, normalizeTasks,
  ownerInitials, prepareTask, readTasks, taskErrors, TEAM, writeTasks,
} from '../src/tasks.js';

const key = 'vibetracker.tasks';

test('owner initials omit example markers and support single and multiple names', () => {
  assert.equal(ownerInitials('Alex (example)'), 'A');
  assert.equal(ownerInitials(' Sam (example)'), 'S');
  assert.equal(ownerInitials('Élodie Patel'), 'ÉP');
  assert.equal(ownerInitials('  Ada   Lovelace  '), 'AL');
  assert.equal(ownerInitials('One Two Three'), 'OT');
});
function memoryStorage(initial) {
  const data = new Map(initial === undefined ? [] : [[key, initial]]);
  return {
    getItem: name => data.has(name) ? data.get(name) : null,
    setItem: (name, value) => data.set(name, value),
  };
}

test('new task defaults and validation require a title and explicit owner', () => {
  const draft = newTask();
  assert.equal(draft.status, 'todo');
  assert.equal(draft.type, 'feature');
  assert.equal(draft.dueDate, null);
  assert.equal(draft.context, CONTEXT_TEMPLATE);
  assert.equal(draft.contextTool, null);
  assert.equal(draft.contextUpdatedAt, null);
  assert.deepEqual(Object.keys(taskErrors(draft)).sort(), ['assignee', 'title']);
  assert.deepEqual(taskErrors({ ...draft, title: ' A task ', assignee: TEAM[0] }), {});
  for (const [field, value] of [
    ['title', '   '], ['title', 'x'.repeat(201)], ['description', 'x'.repeat(10001)],
    ['context', 'x'.repeat(50001)], ['type', 'unknown'], ['status', 'unknown'],
    ['assignee', 'unknown'], ['dueDate', '2026-02-29'], ['contextTool', 'unsupported'],
  ]) {
    assert.ok(taskErrors({ ...createExampleTasks()[0], [field]: value })[field], field);
  }
});

test('date validation handles leap days and rejects rolled-over or UTC-like values', () => {
  for (const valid of ['2024-02-29', '2026-12-31', '0001-01-01']) assert.equal(isDateOnly(valid), true);
  for (const invalid of ['2026-02-29', '2026-04-31', '2026-13-01', '2026-00-01', '2026-01-00', '2026-1-1', '2026-01-01T00:00:00Z', '0000-01-01', null]) {
    assert.equal(isDateOnly(invalid), false, String(invalid));
  }
});

test('saving creates stable identity, trims the title and does not mutate drafts', () => {
  const draft = { ...newTask(), title: '  New task  ', assignee: TEAM[0], context: '' };
  const saved = prepareTask(draft);
  assert.ok(saved.id);
  assert.equal(saved.createdDate, localDate());
  assert.equal(saved.title, 'New task');
  assert.equal(saved.contextUpdatedAt, null);
  assert.equal(draft.title, '  New task  ');
  assert.equal(draft.id, undefined);

  const edited = prepareTask({ ...saved, id: 'tampered', createdDate: '2000-01-01', status: 'done' }, saved);
  assert.equal(edited.id, saved.id);
  assert.equal(edited.createdDate, saved.createdDate);
  assert.equal(edited.status, 'done');
  assert.equal(saved.status, 'todo');
  assert.equal(new Set([saved.id, prepareTask(draft).id]).size, 2);
});

test('context timestamps change only when changed context is saved', () => {
  const original = { ...createExampleTasks()[0], context: 'Original', contextTool: 'Claude', contextUpdatedAt: '2000-01-01T00:00:00.000Z' };
  const unrelated = prepareTask({ ...original, title: 'Renamed', status: 'review' }, original);
  assert.equal(unrelated.contextUpdatedAt, original.contextUpdatedAt);
  assert.equal(unrelated.contextTool, 'Claude');
  const draft = { ...original, context: 'Changed\nContext' };
  const saved = prepareTask(draft, original);
  assert.notEqual(saved.contextUpdatedAt, original.contextUpdatedAt);
  assert.ok(Number.isFinite(Date.parse(saved.contextUpdatedAt)));
  assert.equal(draft.contextUpdatedAt, original.contextUpdatedAt);
  assert.equal(original.context, 'Original');
});

test('context template is editable, saved once, clearable and never reinserted on reload', () => {
  const draft = { ...newTask(), title: 'Context task', assignee: TEAM[0] };
  for (const section of ['Background', 'Constraints', 'Tried so far / Outcome', 'Pick up / Next steps']) {
    assert.ok(draft.context.includes(`## ${section}`));
  }
  const saved = prepareTask(draft);
  assert.equal(saved.context, CONTEXT_TEMPLATE);
  assert.ok(Number.isFinite(Date.parse(saved.contextUpdatedAt)));
  assert.equal(draft.contextUpdatedAt, null);
  const original = { ...saved, contextUpdatedAt: '2000-01-01T00:00:00Z' };
  const cleared = prepareTask({ ...original, context: '' }, original);
  assert.equal(cleared.context, '');
  assert.notEqual(cleared.contextUpdatedAt, original.contextUpdatedAt);
  const storage = memoryStorage();
  writeTasks(storage, key, [cleared]);
  assert.equal(readTasks(storage, key, createExampleTasks).tasks[0].context, '');
  assert.equal(newTask().context, CONTEXT_TEMPLATE);
});

test('all AI tools and no selection persist without changing the saved context timestamp', () => {
  const storage = memoryStorage();
  const original = { ...createExampleTasks()[0], context: '## Briefing\n  café 界\nOutcome: working', contextUpdatedAt: '2000-01-01T00:00:00Z' };
  for (const contextTool of [...CONTEXT_TOOLS, null]) {
    const saved = prepareTask({ ...original, contextTool }, original);
    writeTasks(storage, key, [saved]);
    const [restored] = readTasks(storage, key, createExampleTasks).tasks;
    assert.equal(restored.contextTool, contextTool);
    assert.equal(restored.context, original.context);
    assert.equal(restored.contextUpdatedAt, original.contextUpdatedAt);
  }
});

test('relative context hints distinguish unsaved, recent, minute, hour and day timestamps', () => {
  const now = new Date('2026-01-10T12:00:00Z');
  assert.equal(contextUpdatedHint(null, now), 'Context not saved yet.');
  for (const [elapsed, text] of [
    [0, 'just now'], [59000, 'just now'], [60000, '1 minute ago'],
    [120000, '2 minutes ago'], [3600000, '1 hour ago'],
    [7200000, '2 hours ago'], [86400000, '1 day ago'], [172800000, '2 days ago'],
  ]) {
    assert.equal(contextUpdatedHint(new Date(now.getTime() - elapsed).toISOString(), now), `Context updated ${text}.`);
  }
  assert.equal(contextUpdatedHint('2026-01-11T12:00:00Z', now), 'Context updated just now.');
});

test('reload retains edits, status movement, deletion and an intentionally empty board', () => {
  const storage = memoryStorage();
  const initial = readTasks(storage, key, createExampleTasks);
  assert.equal(initial.isNew, true);
  assert.equal(storage.getItem(key), null, 'reading alone must not write');
  writeTasks(storage, key, initial.tasks);
  const draft = prepareTask({ ...newTask(), title: 'Added', assignee: TEAM[0] });
  writeTasks(storage, key, [...initial.tasks, draft]);
  let restored = readTasks(storage, key, createExampleTasks);
  assert.equal(restored.isNew, false);
  assert.equal(restored.tasks.length, 5);
  const changed = prepareTask({ ...draft, title: 'Edited', type: 'bug', status: 'review', dueDate: '2026-12-31' }, draft);
  writeTasks(storage, key, restored.tasks.map(task => task.id === draft.id ? changed : task));
  restored = readTasks(storage, key, createExampleTasks);
  assert.deepEqual(restored.tasks.find(task => task.id === draft.id), changed);
  writeTasks(storage, key, restored.tasks.filter(task => task.id !== draft.id));
  assert.ok(!readTasks(storage, key, createExampleTasks).tasks.some(task => task.id === draft.id));
  writeTasks(storage, key, []);
  assert.deepEqual(readTasks(storage, key, () => { throw new Error('Must not reseed'); }).tasks, []);
});

test('storage preserves 50,000-character Unicode context without truncation', () => {
  const storage = memoryStorage();
  const task = { ...createExampleTasks()[0], context: 'café\n  '.repeat(7142).padEnd(50000, '界') };
  assert.equal(task.context.length, 50000);
  writeTasks(storage, key, [task]);
  assert.deepEqual(readTasks(storage, key, createExampleTasks).tasks, [task]);
});

test('older context fields gain safe defaults while unknown fields survive', () => {
  const { context, contextTool, contextUpdatedAt, ...legacy } = createExampleTasks()[0];
  const storage = memoryStorage(JSON.stringify([{ ...legacy, extra: 'retain me' }]));
  const before = storage.getItem(key);
  const [task] = readTasks(storage, key, createExampleTasks).tasks;
  assert.equal(task.context, '');
  assert.equal(task.contextTool, null);
  assert.equal(task.contextUpdatedAt, null);
  assert.equal(task.extra, 'retain me');
  assert.equal(storage.getItem(key), before);
});

test('malformed, invalid and duplicate stored records stay untouched', () => {
  const task = createExampleTasks()[0];
  for (const raw of [
    '{bad JSON', 'null', '{}', '[null]', JSON.stringify([task, task]),
    JSON.stringify([{ ...task, status: 'unknown' }]),
    JSON.stringify([{ ...task, assignee: 'unknown' }]),
    JSON.stringify([{ ...task, createdDate: '2026-02-30' }]),
    JSON.stringify([{ ...task, contextTool: 'unsupported' }]),
    JSON.stringify([{ ...task, contextUpdatedAt: 'not a timestamp' }]),
    JSON.stringify([{ ...task, contextUpdatedAt: '2000-01-01Z' }]),
    JSON.stringify([{ ...task, contextUpdatedAt: '2026-02-30T00:00:00.000Z' }]),
  ]) {
    const storage = memoryStorage(raw);
    assert.throws(() => readTasks(storage, key, createExampleTasks));
    assert.equal(storage.getItem(key), raw);
  }
});

test('storage access and quota failures propagate without replacing prior data', () => {
  assert.throws(() => readTasks({ getItem() { throw new Error('Denied'); } }, key, createExampleTasks), /Denied/);
  const storage = memoryStorage('[]');
  storage.setItem = () => { throw new Error('Quota exceeded'); };
  assert.throws(() => writeTasks(storage, key, createExampleTasks()), /Quota exceeded/);
  assert.equal(storage.getItem(key), '[]');
  const untouched = memoryStorage('[]');
  assert.throws(() => writeTasks(untouched, key, [{ ...createExampleTasks()[0], title: '' }]));
  assert.equal(untouched.getItem(key), '[]');
  assert.deepEqual(normalizeTasks([]), []);
});

test('handoff round trips preserve every field except the owner and reject invalid targets', () => {
  const original = { ...createExampleTasks()[0], context: 'Keep this context', contextUpdatedAt: '2026-01-01T12:00:00Z', extra: 'keep this too' };
  const storage = memoryStorage();
  for (const assignee of TEAM.filter(name => name !== original.assignee)) {
    writeTasks(storage, key, [{ ...original, assignee }]);
    const [restored] = readTasks(storage, key, createExampleTasks).tasks;
    assert.deepEqual(restored, { ...original, assignee });
    assert.equal(original.assignee, TEAM[0]);
  }
  const before = storage.getItem(key);
  assert.throws(() => writeTasks(storage, key, [{ ...original, assignee: 'Not a configured member' }]));
  assert.equal(storage.getItem(key), before);
  storage.setItem = () => { throw new Error('Quota exceeded'); };
  assert.throws(() => writeTasks(storage, key, [{ ...original, assignee: TEAM[1] }]), /Quota exceeded/);
  assert.equal(storage.getItem(key), before);
});
