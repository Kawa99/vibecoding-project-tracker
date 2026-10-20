export const ANCHORS = [
  { id: 'presentation', label: 'Presentation' },
  { id: 'demo', label: 'Demo' },
  { id: 'report', label: 'Report' },
  { id: 'documentation', label: 'Documentation' },
];

export function createAnchors() {
  return ANCHORS.map(anchor => ({ ...anchor, url: null }));
}

export function parseAnchorUrl(value) {
  if (typeof value !== 'string') throw new Error('Enter a full http:// or https:// URL.');
  const url = value.trim();
  if (!url) return null;
  try {
    const parsed = new URL(url);
    if (!/^https?:\/\//i.test(url) || !['http:', 'https:'].includes(parsed.protocol)) throw new Error();
  } catch {
    throw new Error('Enter a full http:// or https:// URL.');
  }
  return url;
}

export function normalizeAnchors(value) {
  if (!Array.isArray(value) || value.length !== ANCHORS.length) throw new Error('Four deliverable slots are required.');
  return ANCHORS.map(slot => {
    const record = value.find(item => item?.id === slot.id);
    if (!record || Array.isArray(record) || record.label !== slot.label) throw new Error('Invalid deliverable record.');
    return { ...record, url: record.url === null ? null : parseAnchorUrl(record.url) };
  });
}
