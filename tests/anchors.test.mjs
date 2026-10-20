import assert from 'node:assert/strict';
import { test } from 'node:test';
import { ANCHORS, createAnchors, normalizeAnchors, parseAnchorUrl } from '../src/anchors.js';
import { readCollection, writeCollection } from '../src/storage.js';

const key = 'vibetracker.anchors';
function storageWith(raw) {
  const data = new Map([['vibetracker.tasks', '[]']]);
  if (raw !== undefined) data.set(key, raw);
  return {
    getItem: name => data.has(name) ? data.get(name) : null,
    setItem: (name, value) => data.set(name, value),
  };
}

test('anchors have exactly four fixed slots with independent empty records', () => {
  const anchors = createAnchors();
  assert.deepEqual(anchors.map(anchor => anchor.id), ['presentation', 'demo', 'report', 'documentation']);
  assert.deepEqual(anchors.map(anchor => anchor.label), ['Presentation', 'Demo', 'Report', 'Documentation']);
  assert.ok(anchors.every(anchor => anchor.url === null));
  anchors[0].url = 'https://example.com';
  assert.equal(createAnchors()[0].url, null);
  assert.equal(ANCHORS[0].url, undefined);
});

test('URL validation accepts absolute HTTP/HTTPS, trims input and treats blank as empty', () => {
  for (const url of ['https://example.com/report?version=1#page', 'http://localhost:5173/demo', 'HTTPS://example.com/slides']) {
    assert.equal(parseAnchorUrl(`  ${url}  `), url);
  }
  assert.equal(parseAnchorUrl('  '), null);
  for (const url of ['javascript:alert(1)', 'data:text/html,hello', 'file:///tmp/report', 'ftp://example.com', 'mailto:a@example.com', '//example.com', '/report', 'example.com', 'http:example.com', 'https://', 'https://exa mple.com', 'https://example.com:99999', undefined, null]) {
    assert.throws(() => parseAnchorUrl(url), /full http:\/\/ or https:\/\//, String(url));
  }
});

test('save/edit/clear/reload persists URLs without touching the task collection', () => {
  const storage = storageWith();
  const initial = readCollection(storage, key, createAnchors, normalizeAnchors);
  assert.equal(initial.isNew, true);
  assert.equal(storage.getItem(key), null);
  const first = initial.value.map(anchor => ({ ...anchor, url: `https://example.com/${anchor.id}` }));
  writeCollection(storage, key, first, normalizeAnchors);
  assert.deepEqual(readCollection(storage, key, createAnchors, normalizeAnchors).value, first);
  assert.equal(readCollection(storage, key, createAnchors, normalizeAnchors).isNew, false);
  const changed = first.map(anchor => anchor.id === 'report' ? { ...anchor, url: 'http://example.com/new-report' } : anchor);
  writeCollection(storage, key, changed, normalizeAnchors);
  assert.deepEqual(readCollection(storage, key, createAnchors, normalizeAnchors).value, changed);
  const cleared = changed.map(anchor => ({ ...anchor, url: null }));
  writeCollection(storage, key, cleared, normalizeAnchors);
  assert.deepEqual(readCollection(storage, key, () => { throw new Error('Must not reinitialize'); }, normalizeAnchors).value, cleared);
  assert.equal(storage.getItem('vibetracker.tasks'), '[]');
});

test('invalid URL saves and quota failures preserve the previous saved link', () => {
  const saved = createAnchors().map(anchor => ({ ...anchor, url: 'https://example.com' }));
  const raw = JSON.stringify(saved);
  const storage = storageWith(raw);
  assert.throws(() => writeCollection(storage, key, saved.map(anchor => ({ ...anchor, url: 'javascript:alert(1)' })), normalizeAnchors));
  assert.equal(storage.getItem(key), raw);
  storage.setItem = () => { throw new Error('Quota exceeded'); };
  assert.throws(() => writeCollection(storage, key, createAnchors(), normalizeAnchors), /Quota exceeded/);
  assert.equal(storage.getItem(key), raw);
  assert.throws(() => readCollection({ getItem() { throw new Error('Denied'); } }, key, createAnchors, normalizeAnchors), /Denied/);
});

test('malformed storage and missing, duplicate or unsafe anchor records are rejected untouched', () => {
  const anchors = createAnchors();
  for (const raw of [
    '{broken', 'null', '{}', '[]', JSON.stringify([null, ...anchors.slice(1)]),
    JSON.stringify(anchors.slice(1)), JSON.stringify([...anchors, anchors[0]]),
    JSON.stringify([anchors[0], anchors[0], ...anchors.slice(2)]),
    JSON.stringify(anchors.map(anchor => ({ ...anchor, label: 'Wrong label' }))),
    JSON.stringify(anchors.map(anchor => ({ ...anchor, url: 'javascript:alert(1)' }))),
    JSON.stringify(anchors.map(({ url, ...anchor }) => anchor)),
  ]) {
    const storage = storageWith(raw);
    assert.throws(() => readCollection(storage, key, createAnchors, normalizeAnchors));
    assert.equal(storage.getItem(key), raw);
  }
  const extra = { ...anchors[0], note: 'preserve this' };
  assert.deepEqual(normalizeAnchors([...anchors.slice(1), extra])[0], extra);
});
