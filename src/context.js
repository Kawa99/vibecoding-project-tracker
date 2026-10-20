export function formatContext(task) {
  return `# ${task.title || 'Untitled task'}\n\n## Description\n\n${task.description}\n\n## Context\n\n${task.context}`;
}

export async function writeContextToClipboard(text) {
  if (typeof globalThis.navigator?.clipboard?.writeText !== 'function') {
    throw new Error('Clipboard is unavailable.');
  }
  await navigator.clipboard.writeText(text);
}
