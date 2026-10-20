import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';
import { createExampleTasks, moveTask, readTasks, STAGES, writeTasks } from '../src/tasks.js';
import { getDeadline } from '../src/deadlines.js';
import { applyTheme, normalizeTheme, readTheme, THEME_KEY } from '../src/theme.js';
import { writeCollection } from '../src/storage.js';

function memoryStorage() {
  const data = new Map();
  return { getItem: key => data.get(key) ?? null, setItem: (key, value) => data.set(key, value) };
}

test('moves preserve all task data, avoid duplicates and survive reload in every stage', () => {
  const storage = memoryStorage();
  let tasks = createExampleTasks();
  const original = { ...tasks[0], context: 'Line 1\nUnicode café', contextTool: 'Claude',
    contextUpdatedAt: '2026-01-01T10:00:00Z', extra: { keep: true } };
  tasks[0] = original;
  for (const stage of [...STAGES.slice(1), STAGES[0]]) {
    const before = structuredClone(tasks);
    const moved = moveTask(tasks, original.id, stage.id);
    assert.deepEqual(moved[0], { ...original, status: stage.id });
    assert.deepEqual(tasks, before);
    assert.equal(moved.length, tasks.length);
    assert.equal(new Set(moved.map(task => task.id)).size, tasks.length);
    tasks.slice(1).forEach((task, index) => assert.equal(moved[index + 1], task));
    writeTasks(storage, 'vibetracker.tasks', moved);
    tasks = readTasks(storage, 'vibetracker.tasks', () => { throw new Error('Must restore'); }).tasks;
    assert.deepEqual(tasks, moved);
  }
});

test('invalid or same-stage moves are no-ops and failed storage preserves the saved board', () => {
  const storage = memoryStorage();
  const tasks = createExampleTasks();
  writeTasks(storage, 'vibetracker.tasks', tasks);
  const raw = storage.getItem('vibetracker.tasks');
  for (const [id, status] of [[tasks[0].id, 'todo'], ['missing', 'done'], [tasks[0].id, 'invalid'], [tasks[0].id, null]]) {
    assert.equal(moveTask(tasks, id, status), tasks);
  }
  storage.setItem = () => { throw new Error('Quota exceeded'); };
  assert.throws(() => writeTasks(storage, 'vibetracker.tasks', moveTask(tasks, tasks[0].id, 'done')), /Quota/);
  assert.equal(storage.getItem('vibetracker.tasks'), raw);
  assert.equal(tasks[0].status, 'todo');
});

test('moving to Done neutralizes every deadline state and reopening restores urgency', () => {
  const now = new Date(2026, 9, 20, 12);
  for (const [dueDate, state] of [['2026-10-19', 'overdue'], ['2026-10-20', 'warning'], ['2026-10-24', 'safe'], [null, 'neutral']]) {
    const task = { ...createExampleTasks()[0], dueDate };
    const done = moveTask([task], task.id, 'done')[0];
    assert.equal(getDeadline(done, now).state, 'neutral');
    assert.equal(getDeadline(done, now).label, 'Done');
    const reopened = moveTask([done], task.id, 'review')[0];
    assert.equal(getDeadline(reopened, now).state, state);
    assert.equal(reopened.type, 'feature');
  }
});

test('theme follows system without writing a preference and explicit selection survives reload', () => {
  for (const dark of [false, true]) {
    const localStorage = memoryStorage();
    const environment = { localStorage, matchMedia: () => ({ matches: dark }) };
    const expected = dark ? 'dark' : 'light';
    assert.deepEqual(readTheme(environment), { theme: expected, selection: null, error: '' });
    assert.equal(localStorage.getItem(THEME_KEY), null);
    const selected = dark ? 'light' : 'dark';
    writeCollection(localStorage, THEME_KEY, selected, normalizeTheme);
    assert.deepEqual(readTheme(environment), { theme: selected, selection: selected, error: '' });
    const root = { dataset: {} };
    applyTheme(selected, root);
    assert.equal(root.dataset.theme, selected);
    localStorage.setItem(THEME_KEY, 'null');
    assert.ok(readTheme(environment).error);
    localStorage.setItem(THEME_KEY, '"' + expected + '"');
  }
});

test('unreadable and malformed theme preferences fall back safely without overwriting data', () => {
  const localStorage = memoryStorage();
  for (const raw of ['{broken', '"sepia"', '[]', 'null']) {
    localStorage.setItem(THEME_KEY, raw);
    const value = readTheme({ localStorage, matchMedia: () => ({ matches: true }) });
    assert.equal(value.theme, 'dark');
    assert.equal(value.selection, null);
    assert.ok(value.error);
    assert.equal(localStorage.getItem(THEME_KEY), raw);
  }
  assert.ok(readTheme({ localStorage: { getItem() { throw new Error('Denied'); } } }).error);
  assert.throws(() => normalizeTheme('auto'));
  assert.throws(() => applyTheme('sepia', { dataset: {} }));
});

test('both palettes meet text, control-boundary and keyboard-focus contrast targets', () => {
  const css = readFileSync(new URL('../src/index.css', import.meta.url), 'utf8');
  function luminance(rgb) {
    const linear = rgb.map(value => value / 255).map(value => value <= 0.04045 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4);
    return linear[0] * 0.2126 + linear[1] * 0.7152 + linear[2] * 0.0722;
  }
  const blocks = [...css.matchAll(/:root(?:\[data-theme="dark"\])?\s*\{([^}]+)\}/g)];
  assert.equal(blocks.length, 2);
  for (const [index, block] of blocks.entries()) {
    const colors = Object.fromEntries([...block[1].matchAll(/--([\w-]+):\s*(\d+) (\d+) (\d+);/g)]
      .map(([, name, ...rgb]) => [name, rgb.map(Number)]));
    const contrast = (a, b) => {
      const [low, high] = [luminance(colors[a]), luminance(colors[b])].sort((x, y) => x - y);
      return (high + 0.05) / (low + 0.05);
    };
    for (const surface of ['surface-page', 'surface-card', 'surface-column']) {
      for (const text of ['text-primary', 'text-muted', 'brand-primary', 'due-overdue-text', 'type-feature', 'type-bug']) {
        assert.ok(contrast(text, surface) >= 4.5, `${index}: ${text} on ${surface}`);
      }
      for (const indicator of ['control-border', 'brand-primary']) {
        assert.ok(contrast(indicator, surface) >= 3, `${index}: ${indicator} on ${surface}`);
      }
    }
    for (const brand of ['brand-primary', 'brand-accent']) assert.ok(contrast('text-on-brand', brand) >= 4.5);
    for (const urgency of ['safe', 'warning', 'overdue', 'neutral']) assert.ok(contrast(`due-${urgency}-text`, `due-${urgency}`) >= 4.5);
  }
});
