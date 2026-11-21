// store.js: one localStorage key holds the earned names, plus the export and import
// of that same shape. Nothing here throws when storage is missing or full.

const KEY = 'leonida100/progress/v1';
const TALLY_KEY = 'leonida100/tallies/v1';
const VERSION = 1;
const FILE_NAME = 'leonida-100-progress.json';

function storage() {
  try {
    const testKey = '__leonida_test__';
    window.localStorage.setItem(testKey, '1');
    window.localStorage.removeItem(testKey);
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

/** The target for every tally trophy, keyed by the trophy id as a string. */
function tallyTargets(trophies) {
  const targets = new Map();
  for (const trophy of trophies) {
    const target = Number(trophy && trophy.tally && trophy.tally.target);
    if (Number.isFinite(target) && target > 0) targets.set(String(trophy.id), Math.floor(target));
  }
  return targets;
}

/** Keeps only known tally ids, whole numbers inside each target. */
function normalizeTallies(value, trophies) {
  const out = {};
  if (!value || typeof value !== 'object' || Array.isArray(value)) return out;
  for (const [id, target] of tallyTargets(trophies)) {
    const count = Number(value[id]);
    if (Number.isFinite(count)) out[id] = Math.max(0, Math.min(target, Math.floor(count)));
  }
  return out;
}

/** The stored tally counts, clamped to the current targets. */
export function readTallies(trophies) {
  const store = storage();
  if (!store) return {};
  let raw;
  try {
    raw = store.getItem(TALLY_KEY);
  } catch {
    return {};
  }
  if (!raw) return {};
  try {
    return normalizeTallies(JSON.parse(raw), trophies);
  } catch {
    return {};
  }
}

/** Writes the tally counts under their own key; returns false when storage refuses. */
export function writeTallies(tallies) {
  const store = storage();
  if (!store) return false;
  const clean = {};
  for (const [id, count] of Object.entries(tallies || {})) {
    const value = Number(count);
    if (Number.isFinite(value) && value >= 0) clean[id] = Math.floor(value);
  }
  try {
    store.setItem(TALLY_KEY, JSON.stringify(clean));
    return true;
  } catch {
    return false;
  }
}

/** The exported document: a version, the app name, every earned name and the tally counts. */
export function buildExport(names, tallies = {}) {
  const counts = {};
  for (const [id, count] of Object.entries(tallies || {})) {
    const value = Number(count);
    if (Number.isFinite(value) && value >= 0) counts[id] = Math.floor(value);
  }
  return {
    version: VERSION,
    app: 'leonida-100',
    earned: [...names].sort((a, b) => (a < b ? -1 : a > b ? 1 : 0)),
    tallies: counts
  };
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
  let tallies = null;
  if (Object.prototype.hasOwnProperty.call(value, 'tallies')) {
    if (!value.tallies || typeof value.tallies !== 'object' || Array.isArray(value.tallies)) {
      return { error: 'The tallies field is not an object.' };
    }
    tallies = normalizeTallies(value.tallies, trophies);
  }
  return { names, unknown, tallies };
}

/** Hands the export to the browser as a download; no network is involved. */
export function downloadExport(names, tallies) {
  const body = JSON.stringify(buildExport(names, tallies), null, 1);
  const blob = new Blob([body], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = FILE_NAME;
  document.body.append(link);
  link.click();
  link.remove();
  // Revoking at once can cancel the download, so the object URL lives for one second.
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
