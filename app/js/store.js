// store.js: one localStorage key holds the earned names, plus the export and import
// of that same shape. Nothing here throws when storage is missing or full.

const KEY = 'leonida100/progress/v1';
const VERSION = 1;
const FILE_NAME = 'leonida-100-progress.json';

function storage() {
  try {
    const probe = '__leonida_probe__';
    window.localStorage.setItem(probe, '1');
    window.localStorage.removeItem(probe);
    return window.localStorage;
  } catch {
    return null;
  }
}

/** The stored payload, or null when there is none or it is unusable. */
function readPayload() {
  const store = storage();
  if (!store) return null;
  let raw;
  try {
    raw = store.getItem(KEY);
  } catch {
    return null;
  }
  if (!raw) return null;
  try {
    const value = JSON.parse(raw);
    const earned = Array.isArray(value) ? value : value && value.earned;
    if (!Array.isArray(earned)) return null;
    return value;
  } catch {
    return null;
  }
}

/** The earned names from storage, keeping only names the current list knows. */
export function readProgress(trophies) {
  const known = new Set(trophies.map((trophy) => trophy.name));
  const payload = readPayload();
  if (!payload) return [];
  const earned = Array.isArray(payload) ? payload : payload.earned;
  const seen = new Set();
  for (const name of earned) if (typeof name === 'string' && known.has(name)) seen.add(name);
  return [...seen];
}

/** Writes the earned names; returns false when this browser will not store them. */
export function writeProgress(names) {
  const store = storage();
  if (!store) return false;
  try {
    store.setItem(KEY, JSON.stringify({ version: VERSION, earned: [...names], saved: new Date().toISOString() }));
    return true;
  } catch {
    return false;
  }
}

/** The exported document: a version, the app name and every earned name. */
export function buildExport(names) {
  return { version: VERSION, app: 'leonida-100', earned: [...names].sort((a, b) => (a < b ? -1 : a > b ? 1 : 0)) };
}

/**
 * Validates an imported file's text against the same shape. Returns the names it
 * understood, or an error sentence, never a throw.
 */
export function parseImport(text, trophies) {
  let value;
  try {
    value = JSON.parse(text);
  } catch {
    return { error: 'That file is not JSON.' };
  }
  if (!value || typeof value !== 'object') return { error: 'That file holds no progress object.' };
  if (value.version !== VERSION) return { error: `That file is version ${JSON.stringify(value.version)}, not ${VERSION}.` };
  if (!Array.isArray(value.earned)) return { error: 'That file has no earned list.' };
  if (value.earned.some((name) => typeof name !== 'string')) return { error: 'The earned list holds a value that is not a name.' };
  const known = new Set(trophies.map((trophy) => trophy.name));
  const names = [];
  let unknown = 0;
  for (const name of value.earned) {
    if (known.has(name)) names.push(name);
    else unknown += 1;
  }
  return { names, unknown };
}

/** Hands the export to the browser as a download; no network is involved. */
export function downloadExport(names) {
  const body = JSON.stringify(buildExport(names), null, 1);
  const blob = new Blob([body], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = FILE_NAME;
  document.body.append(link);
  link.click();
  link.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
