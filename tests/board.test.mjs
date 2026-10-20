import assert from 'node:assert/strict';
import { after, test } from 'node:test';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { createServer } from 'vite';

const server = await createServer({ server: { middlewareMode: true }, appType: 'custom' });
after(() => server.close());
const { default: App, TaskBoard, createExampleTasks, STAGES, TEAM, MEMBERS } =
  await server.ssrLoadModule('/src/App.jsx');

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
  assert.ok(renderToStaticMarkup(React.createElement(App)).includes('Example board'));
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
