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
    assert.equal(task.dueDate, null);
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
  for (const field of ['title', 'description', 'type', 'status', 'assignee', 'dueDate', 'context']) {
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
      getItem: () => raw,
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
    assert.ok(broken.includes('Saved tasks could not be read'));
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
