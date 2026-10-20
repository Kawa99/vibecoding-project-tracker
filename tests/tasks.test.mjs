import assert from 'node:assert/strict';
import { test } from 'node:test';
import {
  createExampleTasks, isDateOnly, localDate, newTask, normalizeTasks,
  prepareTask, readTasks, taskErrors, TEAM, writeTasks,
} from '../src/tasks.js';

const key = 'vibetracker.tasks';
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
  assert.deepEqual(Object.keys(taskErrors(draft)).sort(), ['assignee', 'title']);
  assert.deepEqual(taskErrors({ ...draft, title: ' A task ', assignee: TEAM[0] }), {});
  for (const [field, value] of [
    ['title', '   '], ['title', 'x'.repeat(201)], ['description', 'x'.repeat(10001)],
    ['context', 'x'.repeat(50001)], ['type', 'unknown'], ['status', 'unknown'],
    ['assignee', 'unknown'], ['dueDate', '2026-02-29'],
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
  const draft = { ...newTask(), title: '  New task  ', assignee: TEAM[0] };
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
  const changed = prepareTask({ ...draft, title: 'Edited', status: 'review', dueDate: '2026-12-31' }, draft);
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
