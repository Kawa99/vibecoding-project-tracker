import assert from 'node:assert/strict';
import { after, test } from 'node:test';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { createServer } from 'vite';

const server = await createServer({ server: { middlewareMode: true }, appType: 'custom' });
after(() => server.close());
const { default: App, TaskBoard, createExampleTasks, STAGES, TEAM, MEMBERS } =
  await server.ssrLoadModule('/src/App.jsx');
const { default: TaskEditor } = await server.ssrLoadModule('/src/TaskEditor.jsx');
const { default: TaskType } = await server.ssrLoadModule('/src/TaskType.jsx');
const { default: DeadlineBadge } = await server.ssrLoadModule('/src/DeadlineBadge.jsx');
const { CONTEXT_TEMPLATE, CONTEXT_TOOLS, newTask } = await server.ssrLoadModule('/src/tasks.js');
const { AnchorSlot } = await server.ssrLoadModule('/src/AnchorBoard.jsx');
const { createAnchors } = await server.ssrLoadModule('/src/anchors.js');
const { default: ThemeToggle } = await server.ssrLoadModule('/src/ThemeToggle.jsx');

test('example tasks satisfy the task model and use configured sample members', () => {
  const tasks = createExampleTasks();
  assert.ok(tasks.length >= 3 && tasks.length <= 4);
  assert.equal(new Set(tasks.map(task => task.id)).size, tasks.length);
  assert.deepEqual(TEAM, MEMBERS.map(member => member.name));
  const now = new Date();
  const today = [now.getFullYear(), String(now.getMonth() + 1).padStart(2, '0'), String(now.getDate()).padStart(2, '0')].join('-');
  for (const task of tasks) {
    assert.ok(task.id && task.title.trim());
    assert.equal(typeof task.description, 'string');
    assert.ok(['feature', 'bug'].includes(task.type));
    assert.ok(STAGES.some(stage => stage.id === task.status));
    assert.ok(TEAM.includes(task.assignee));
    assert.equal(task.createdDate, today);
    assert.match(task.dueDate, /^\d{4}-\d{2}-\d{2}$/);
    assert.equal(task.context, '');
    assert.equal(task.contextTool, null);
    assert.equal(task.contextUpdatedAt, null);
  }
});

test('board renders every task exactly once in the correct ordered column', () => {
  const tasks = createExampleTasks().reverse();
  const html = renderToStaticMarkup(React.createElement(TaskBoard, { tasks }));
  const columns = [...html.matchAll(/<section\b[^>]*>(.*?)<\/section>/g)].map(match => match[1]);
  assert.equal(columns.length, 4);
  assert.deepEqual(STAGES.map(stage => stage.label), ['To Do', 'In Progress', 'Review', 'Done']);
  STAGES.forEach((stage, index) => {
    assert.ok(columns[index].includes(`>${stage.label}</h2>`));
    for (const task of tasks) {
      assert.equal(columns[index].includes(task.title), task.status === stage.id);
      if (task.status === stage.id) assert.ok(columns[index].includes(task.assignee));
    }
  });
  assert.equal((html.match(/<article\b/g) || []).length, tasks.length);
  assert.ok(renderToStaticMarkup(React.createElement(App)).includes('Add task'));
});

test('empty columns remain visible and task text is escaped', () => {
  const empty = renderToStaticMarkup(React.createElement(TaskBoard, { tasks: [] }));
  assert.equal((empty.match(/No tasks in this stage yet\./g) || []).length, 4);
  const tasks = [{ ...createExampleTasks()[0], title: '<script>alert("test")</script> — café' }];
  const html = renderToStaticMarkup(React.createElement(TaskBoard, { tasks }));
  assert.ok(html.includes('&lt;script&gt;'));
  assert.ok(html.includes('café'));
  assert.ok(!html.includes('<script>'));
  assert.equal((html.match(/No tasks in this stage yet\./g) || []).length, 3);
});

test('shared editor exposes labelled task controls, saved values and save/cancel/delete actions', () => {
  const task = { ...createExampleTasks()[2], description: 'Line 1\nLine 2', context: '<script>text only</script>' };
  const html = renderToStaticMarkup(React.createElement(TaskEditor, {
    task, fallbackFocus: { current: null },
  }));
  assert.ok(html.includes('<dialog'));
  assert.ok(html.includes('aria-labelledby="task-editor-title"'));
  assert.ok(html.includes('Edit task'));
  for (const field of ['title', 'description', 'type', 'status', 'assignee', 'dueDate', 'context', 'contextTool']) {
    assert.ok(html.includes(`for="${field}"`));
    assert.ok(html.includes(`name="${field}"`));
  }
  assert.ok(html.includes('value="review" selected=""'));
  assert.ok(html.includes(task.assignee));
  assert.ok(html.includes('Line 1\nLine 2'));
  assert.ok(html.includes('&lt;script&gt;text only&lt;/script&gt;'));
  for (const action of ['Save task', 'Cancel', 'Close', 'Delete task']) assert.ok(html.includes(action));
});

test('app restores saved data and keeps an intentionally empty board empty', () => {
  const previous = globalThis.window;
  try {
    let raw = JSON.stringify([{ ...createExampleTasks()[0], title: 'Previously saved task' }]);
    globalThis.window = { localStorage: {
      getItem: key => key === 'vibetracker.tasks' ? raw : null,
      setItem: () => { throw new Error('Rendering must not write'); },
    } };
    const saved = renderToStaticMarkup(React.createElement(App));
    assert.ok(saved.includes('Previously saved task'));
    assert.ok(!saved.includes('Build the four-column board'));
    raw = '[]';
    const empty = renderToStaticMarkup(React.createElement(App));
    assert.equal((empty.match(/No tasks in this stage yet\./g) || []).length, 4);
    raw = '{broken';
    const broken = renderToStaticMarkup(React.createElement(App));
    assert.ok(broken.includes('Saved data could not be read'));
    assert.equal(raw, '{broken');
  } finally {
    if (previous === undefined) delete globalThis.window;
    else globalThis.window = previous;
  }
});

test('Feature and Bug use consistent colours, distinct icons and text in cards and the editor', () => {
  const icons = [];
  for (const [type, label] of [['feature', 'Feature'], ['bug', 'Bug']]) {
    const task = { ...createExampleTasks()[0], type };
    const board = renderToStaticMarkup(React.createElement(TaskBoard, { tasks: [task] }));
    const editor = renderToStaticMarkup(React.createElement(TaskEditor, {
      task, fallbackFocus: { current: null },
    }));
    const badge = renderToStaticMarkup(React.createElement(TaskType, { type }));
    for (const html of [board, editor]) {
      assert.ok(html.includes(`border-l-type-${type}`));
      assert.ok(html.includes(`text-type-${type}`));
      assert.ok(html.includes(badge), 'both surfaces render the same labelled icon');
    }
    assert.ok(badge.includes(`</svg>${label}</span>`));
    assert.ok(badge.includes('aria-hidden="true"'));
    assert.ok(badge.includes('focusable="false"'));
    assert.ok(board.includes(`, ${label}, owner:`));
    icons.push(badge.match(/<svg.*?<\/svg>/)[0]);
  }
  assert.notEqual(icons[0], icons[1], 'type remains distinguishable without colour');
  assert.equal(renderToStaticMarkup(React.createElement(TaskType, { type: 'unsupported' })), '');
});

test('cards expose full owner names and handoff controls outside the edit buttons', () => {
  const tasks = createExampleTasks();
  const html = renderToStaticMarkup(React.createElement(TaskBoard, { tasks }));
  const cards = [...html.matchAll(/<article\b[^>]*>(.*?)<\/article>/g)].map(match => match[1]);
  assert.equal(cards.length, tasks.length);
  for (const [index, card] of cards.entries()) {
    const task = tasks[index];
    assert.ok(card.includes(task.assignee));
    assert.ok(card.includes('rounded-full'));
    assert.ok(card.includes('Hand off to…'));
    assert.ok(card.includes(`for ${task.title}`));
    const editorButton = card.match(/<button\b.*?<\/button>/)[0];
    assert.ok(!editorButton.includes('<select'), 'handoff must not trigger the card editor');
    const select = card.match(/<select\b.*?<\/select>/)[0];
    assert.ok(!select.includes(`value="${task.assignee}"`));
    for (const name of TEAM.filter(name => name !== task.assignee)) assert.ok(select.includes(name));
  }
  const blocked = renderToStaticMarkup(React.createElement(TaskBoard, { tasks, handoffDisabled: true }));
  assert.equal((blocked.match(/<select\b[^>]*disabled=""/g) || []).length, tasks.length);
});

test('one-member configuration keeps examples valid and explains disabled handoff', () => {
  const originalTeam = [...TEAM];
  try {
    TEAM.splice(1);
    const tasks = createExampleTasks();
    assert.ok(tasks.every(task => task.assignee === TEAM[0]));
    const html = renderToStaticMarkup(React.createElement(TaskBoard, { tasks }));
    assert.equal((html.match(/<select\b[^>]*disabled=""/g) || []).length, tasks.length);
    assert.equal((html.match(/Add another configured member to enable handoff\./g) || []).length, tasks.length);
  } finally {
    TEAM.splice(0, TEAM.length, ...originalTeam);
  }
});

test('deadline badges show four treatments with text/icons while preserving task type', () => {
  const now = new Date(2026, 0, 10, 12);
  const example = createExampleTasks()[0];
  const cases = [
    { dueDate: '2026-01-15', status: 'todo', state: 'safe', label: 'Due 2026-01-15' },
    { dueDate: '2026-01-10', status: 'todo', state: 'warning', label: 'Due today' },
    { dueDate: '2026-01-09', status: 'todo', state: 'overdue', label: 'Overdue' },
    { dueDate: '2026-01-09', status: 'done', state: 'neutral', label: 'Done' },
    { dueDate: null, status: 'todo', state: 'neutral', label: 'No due date' },
  ];
  for (const { state, label, ...values } of cases) {
    const html = renderToStaticMarkup(React.createElement(DeadlineBadge, { task: { ...example, ...values }, now }));
    assert.ok(html.includes(`bg-due-${state}`));
    assert.ok(html.includes(`text-due-${state}-text`));
    assert.ok(html.includes(label));
    assert.ok(html.includes('aria-hidden="true"'));
  }
  const overdue = { ...example, dueDate: '2000-01-01', status: 'todo', type: 'feature' };
  const html = renderToStaticMarkup(React.createElement(TaskBoard, { tasks: [overdue] }));
  assert.ok(html.includes('bg-due-overdue'));
  assert.ok(html.includes('text-type-feature'));
  assert.ok(html.includes('Overdue'));
  assert.ok(html.includes('</svg>Feature</span>'));
});

test('context section shows its template, tool choices and accessible saved/unsaved time hints', () => {
  const fresh = renderToStaticMarkup(React.createElement(TaskEditor, { task: newTask(), fallbackFocus: { current: null } }));
  assert.ok(fresh.includes(CONTEXT_TEMPLATE));
  assert.ok(fresh.includes('Context not saved yet.'));
  assert.ok(fresh.includes('aria-describedby="context-hint"'));
  assert.ok(fresh.includes('Plain text or Markdown.'));
  assert.ok(fresh.indexOf('name="contextTool"') > fresh.indexOf('name="context"'));
  assert.ok(fresh.includes('No tool selected'));
  for (const tool of CONTEXT_TOOLS) assert.ok(fresh.includes(`value="${tool}"`));
  const task = { ...createExampleTasks()[0], context: '', contextTool: 'Claude', contextUpdatedAt: '2000-01-01T00:00:00Z' };
  const existing = renderToStaticMarkup(React.createElement(TaskEditor, { task, fallbackFocus: { current: null } }));
  assert.ok(!existing.includes('## Background'), 'cleared contexts stay empty');
  assert.ok(existing.includes('value="Claude" selected=""'));
  assert.ok(existing.includes('Context updated'));
  assert.match(existing, /<time\b[^>]*datetime="2000-01-01T00:00:00Z"/i);
});

test('each card and the modal expose a separate non-submit Copy Context button', () => {
  const tasks = createExampleTasks();
  const html = renderToStaticMarkup(React.createElement(TaskBoard, { tasks }));
  const cards = [...html.matchAll(/<article\b[^>]*>(.*?)<\/article>/g)].map(match => match[1]);
  assert.equal(cards.length, tasks.length);
  for (const [index, card] of cards.entries()) {
    const buttons = [...card.matchAll(/<button\b[^>]*>.*?<\/button>/g)].map(match => match[0]);
    const copy = buttons.filter(button => button.includes('Copy Context'));
    assert.equal(copy.length, 1);
    assert.ok(copy[0].includes('type="button"'));
    assert.ok(copy[0].includes(`Copy Context for ${tasks[index].title}`));
    assert.ok(!buttons.find(button => button.includes('Edit task:')).includes('Copy Context'));
  }
  const draft = { ...newTask(), title: 'Visible draft title' };
  const modal = renderToStaticMarkup(React.createElement(TaskEditor, { task: draft, fallbackFocus: { current: null } }));
  assert.match(modal, /<button\b[^>]*type="button"[^>]*aria-label="Copy Context for Visible draft title"/);
});

test('deliverable slots expose one labelled URL field, saved status and safe saved-link actions', () => {
  const empty = createAnchors()[0];
  const html = renderToStaticMarkup(React.createElement(AnchorSlot, { anchor: empty }));
  assert.equal((html.match(/type="url"/g) || []).length, 1);
  assert.ok(html.includes('Presentation URL'));
  assert.ok(html.includes('No link'));
  assert.ok(html.includes('Save link'));
  assert.ok(html.includes('Clear'));
  assert.ok(!html.includes('<a '));
  const saved = renderToStaticMarkup(React.createElement(AnchorSlot, { anchor: { ...empty, url: 'https://example.com/slides' } }));
  assert.ok(saved.includes('Link saved'));
  assert.ok(saved.includes('bg-type-feature'));
  assert.ok(saved.includes('href="https://example.com/slides"'));
  assert.ok(saved.includes('target="_blank"'));
  assert.ok(saved.includes('rel="noopener noreferrer"'));
});

test('four deliverables stay above the board and bad anchor data does not break saved tasks', () => {
  const previous = globalThis.window;
  const task = { ...createExampleTasks()[0], title: 'My saved task' };
  let raw = null;
  globalThis.window = { localStorage: {
    getItem: key => key === 'vibetracker.tasks' ? JSON.stringify([task]) : raw,
    setItem: () => { throw new Error('Rendering must not write'); },
  } };
  try {
    const fresh = renderToStaticMarkup(React.createElement(App));
    assert.equal((fresh.match(/type="url"/g) || []).length, 4);
    assert.ok(fresh.indexOf('id="deliverables-title"') < fresh.indexOf('id="stage-todo"'));
    assert.ok(fresh.includes('My saved task'));
    for (const label of ['Presentation', 'Demo', 'Report', 'Documentation']) assert.ok(fresh.includes(label));
    raw = JSON.stringify(createAnchors().map(anchor => ({ ...anchor, url: 'https://example.com' })));
    assert.equal((renderToStaticMarkup(React.createElement(App)).match(/Open saved link/g) || []).length, 4);
    raw = '{broken';
    const broken = renderToStaticMarkup(React.createElement(App));
    assert.ok(broken.includes('Deliverables: Saved data could not be read'));
    assert.equal((broken.match(/type="url"/g) || []).length, 4);
    assert.equal((broken.match(/Unavailable/g) || []).length, 4);
    assert.equal((broken.match(/type="submit" disabled=""/g) || []).length, 4);
    assert.ok(broken.includes('My saved task'));
    assert.equal(raw, '{broken');
  } finally {
    if (previous === undefined) delete globalThis.window;
    else globalThis.window = previous;
  }
});

test('drag handles are separate from card actions and retain the labelled modal Status alternative', () => {
  const tasks = createExampleTasks();
  const html = renderToStaticMarkup(React.createElement(TaskBoard, { tasks, onMove() {} }));
  assert.equal((html.match(/draggable="true"/g) || []).length, tasks.length);
  const cards = [...html.matchAll(/<article\b[^>]*>(.*?)<\/article>/g)].map(match => match[1]);
  for (const card of cards) {
    const handle = card.match(/<button\b[^>]*draggable="true".*?<\/button>/)[0];
    assert.ok(handle.includes('aria-label="Drag task:'));
    assert.ok(handle.includes('aria-describedby="move-help"'));
    assert.ok(!handle.includes('Edit task:'));
    assert.ok(!handle.includes('Copy Context'));
    assert.ok(!handle.includes('<select'));
  }
  assert.ok(html.includes('edit the task and choose Status'));
  const blocked = renderToStaticMarkup(React.createElement(TaskBoard, { tasks, onMove() {}, handoffDisabled: true }));
  assert.equal((blocked.match(/draggable="false" disabled=""/g) || []).length, tasks.length);
});

test('theme toggle describes its next action with a visible label and decorative icon', () => {
  const html = renderToStaticMarkup(React.createElement(ThemeToggle));
  assert.ok(html.includes('aria-label="Switch to dark theme"'));
  assert.ok(html.includes('aria-hidden="true"'));
  assert.ok(html.includes('focus-visible:ring-brand-primary'));
});
