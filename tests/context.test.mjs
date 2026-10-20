import assert from 'node:assert/strict';
import { test } from 'node:test';
import { formatContext, writeContextToClipboard } from '../src/context.js';
import { createExampleTasks } from '../src/tasks.js';

async function withNavigator(value, run) {
  const previous = Object.getOwnPropertyDescriptor(globalThis, 'navigator');
  Object.defineProperty(globalThis, 'navigator', { configurable: true, value });
  try {
    return await run();
  } finally {
    if (previous) Object.defineProperty(globalThis, 'navigator', previous);
    else delete globalThis.navigator;
  }
}

test('copy briefing has labelled Markdown sections and preserves multiline Unicode exactly', () => {
  const task = Object.freeze({ ...createExampleTasks()[0], title: 'Fix café layout', description: 'Line one\n  Line two', context: '## Background\n界 🚀\n\nTried: <script>text only</script>\nNext: continue\n' });
  const before = structuredClone(task);
  assert.equal(formatContext(task), '# Fix café layout\n\n## Description\n\nLine one\n  Line two\n\n## Context\n\n## Background\n界 🚀\n\nTried: <script>text only</script>\nNext: continue\n');
  assert.deepEqual(task, before);
});

test('saved and unsaved briefings use their own snapshots without saving or truncation', () => {
  const saved = Object.freeze({ ...createExampleTasks()[0], title: 'Saved title', context: 'Saved context' });
  const draft = Object.freeze({ ...saved, title: 'Draft title', context: 'START\n' + '界🚀\n'.repeat(12500) + '\nEND' });
  const output = formatContext(draft);
  assert.ok(output.startsWith('# Draft title\n'));
  assert.ok(output.endsWith(draft.context));
  assert.ok(output.endsWith('\nEND'));
  assert.ok(formatContext(saved).endsWith('Saved context'));
  assert.equal(draft.contextUpdatedAt, saved.contextUpdatedAt);
  assert.equal(draft.id, saved.id);
  assert.equal(draft.status, saved.status);
  assert.equal(draft.assignee, saved.assignee);
  assert.equal(formatContext({ title: '', description: '', context: '' }), '# Untitled task\n\n## Description\n\n\n\n## Context\n\n');
});

test('clipboard completion waits for the exact text write to resolve', async () => {
  let complete;
  let received;
  const clipboard = {
    writeText(text) {
      assert.equal(this, clipboard);
      received = text;
      return new Promise(resolve => { complete = resolve; });
    },
  };
  await withNavigator({ clipboard }, async () => {
    const text = formatContext(createExampleTasks()[0]);
    let finished = false;
    const pending = writeContextToClipboard(text).then(() => { finished = true; });
    assert.equal(received, text);
    await Promise.resolve();
    assert.equal(finished, false, 'success must not be reported before permission/write succeeds');
    complete();
    await pending;
    assert.equal(finished, true);
  });
});

test('missing and rejected clipboard access fail instead of claiming success', async () => {
  for (const navigator of [undefined, {}, { clipboard: {} }]) {
    await withNavigator(navigator, async () => {
      await assert.rejects(writeContextToClipboard('Full briefing'), /unavailable/);
    });
  }
  await withNavigator({ clipboard: { writeText: async () => { throw new Error('Permission denied'); } } }, async () => {
    await assert.rejects(writeContextToClipboard('Full briefing'), /Permission denied/);
  });
});
