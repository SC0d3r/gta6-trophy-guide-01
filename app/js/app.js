// app.js: boot, state, events. One state object, one render pass, no globals besides these.

import { byId, setText, setHtml } from './dom.js';
import { loadModel, visibleTrophies } from './data.js';
import {
  renderAudit,
  renderRail,
  renderLedgerRows,
  ledgerFoot,
  activeLine,
  renderDetail,
  renderRoadmap,
  renderWatch,
  renderSources
} from './views.js';
import { readProgress, writeProgress, parseImport, downloadExport } from './store.js';

const state = {
  view: 'ledger',
  kind: 'all',
  grade: 'all',
  q: '',
  selected: 0,
  spoiler: true,
  missable: false,
  earned: new Set(),
  revealed: 0,
  demo: false
};

const params = new URLSearchParams(window.location.search);
let model = null;

function setStatus(text, bad = false) {
  const node = byId('io-status');
  if (!node) return;
  node.textContent = text;
  node.classList.toggle('bad', bad);
}

function render() {
  const rows = visibleTrophies(model, state);
  const rail = renderRail(model, state, rows.length);
  const audit = renderAudit(model);

  setHtml('audit-main', audit.main);
  setHtml('audit-sub', audit.sub);
  setHtml('ring', rail.ring);
  setText('progress-line', rail.progressLine);
  setText('progress-open', rail.progressOpen);
  setHtml('tallies', rail.tallies);
  setHtml('chips-kind', rail.kindChips);
  setHtml('chips-grade', rail.gradeChips);
  setHtml('kind-line', rail.kindLine);
  byId('spoiler').setAttribute('aria-checked', String(state.spoiler));

  const counts = {
    ledger: rows.length,
    roadmap: model.stages.length,
    watch: model.watch.length,
    sources: model.sources.length
  };
  document.querySelectorAll('[data-count]').forEach((node) => {
    node.textContent = String(counts[node.dataset.count] ?? '');
  });
  document.querySelectorAll('.nav-row').forEach((button) => {
    button.classList.toggle('active', button.dataset.view === state.view);
  });

  const full = state.view !== 'ledger';
  document.body.className = `view-${state.view}${full ? ' mode-full' : ''}`;

  setText('ledger-count', `${rows.length} of ${model.figures.total}`);
  setText('head-active', activeLine(state));
  setHtml('rows', renderLedgerRows(model, state, rows));
  setHtml('ledger-foot', ledgerFoot(model));

  if (state.view === 'roadmap') setHtml('panel', renderRoadmap(model, state));
  else if (state.view === 'watch') setHtml('panel', renderWatch(model, state));
  else if (state.view === 'sources') setHtml('panel', renderSources(model));
  else setHtml('panel', renderDetail(model, state, rows));
}

function select(id) {
  state.selected = id;
  render();
}

function toggle(id) {
  const trophy = model.byId.get(id);
  if (!trophy) return;
  if (state.earned.has(trophy.name)) state.earned.delete(trophy.name);
  else state.earned.add(trophy.name);
  if (!state.demo) {
    const saved = writeProgress(state.earned);
    setStatus(saved ? `${state.earned.size} names saved in this browser.` : 'This browser will not store progress.', !saved);
  } else {
    setStatus(`${state.earned.size} names in the demo state, nothing written.`);
  }
  render();
}

function doExport() {
  downloadExport(state.earned);
  setStatus(`Exported ${state.earned.size} names as JSON.`);
}

async function doImport(file) {
  let text;
  try {
    text = await file.text();
  } catch {
    setStatus('That file could not be read.', true);
    return;
  }
  const result = parseImport(text, model.trophies);
  if (result.error) {
    setStatus(result.error, true);
    return;
  }
  let added = 0;
  for (const name of result.names) {
    if (!state.earned.has(name)) {
      state.earned.add(name);
      added += 1;
    }
  }
  if (!state.demo) {
    const saved = writeProgress(state.earned);
    if (!saved) {
      setStatus('Imported in memory, but this browser will not store progress.', true);
      render();
      return;
    }
  }
  const skipped = result.unknown > 0 ? `, ${result.unknown} unknown skipped` : '';
  setStatus(`Imported ${added} new ${added === 1 ? 'name' : 'names'}${skipped}.`);
  render();
}

function wire() {
  const search = byId('search');
  search.addEventListener('input', () => {
    state.q = search.value;
    render();
  });

  const file = byId('import-file');
  file.addEventListener('change', () => {
    const chosen = file.files && file.files[0];
    if (chosen) doImport(chosen);
    file.value = '';
  });

  document.addEventListener('click', (event) => {
    const hit = event.target.closest('[data-act]');
    if (!hit) return;
    const act = hit.dataset.act;
    if (act === 'select') select(Number(hit.dataset.id));
    else if (act === 'toggle') toggle(Number(hit.dataset.id));
    else if (act === 'kind' || act === 'grade') {
      state[act] = hit.dataset.value;
      render();
    } else if (act === 'view') {
      state.view = hit.dataset.view;
      render();
    } else if (act === 'missable') {
      state.missable = !state.missable;
      render();
    } else if (act === 'spoiler') {
      state.spoiler = !state.spoiler;
      state.revealed = 0;
      render();
    } else if (act === 'reveal') {
      state.revealed = Number(hit.dataset.id);
      render();
    } else if (act === 'export') {
      doExport();
    } else if (act === 'import') {
      byId('import-file').click();
    }
  });

  document.addEventListener('keydown', (event) => {
    if (event.key === '/' && document.activeElement !== search) {
      event.preventDefault();
      search.focus();
    } else if (event.key === 'Escape' && document.activeElement === search) {
      search.value = '';
      state.q = '';
      search.blur();
      render();
    }
  });
}

function fail(error) {
  const panel = byId('panel');
  if (panel) {
    panel.innerHTML = [
      '<div class="empty">',
      '<h2 class="empty-title">The data files did not load</h2>',
      '<p class="empty-copy">Serve this folder with node serve.ts from the repository root and open app/index.html. The ledger reads its five JSON files from data/ and needs no network.</p>',
      `<p class="empty-copy">${String(error && error.message ? error.message : error)}</p>`,
      '</div>'
    ].join('');
  }
  setText('audit-main', 'DATA UNAVAILABLE');
  setText('audit-sub', 'OPEN THE APP OVER A STATIC SERVER');
}

async function boot() {
  try {
    model = await loadModel();
  } catch (error) {
    fail(error);
    return;
  }
  const preset = params.get('shot');
  let applied = false;
  if (preset) {
    const { applyPreset } = await import('./shots.js');
    applied = applyPreset(preset, model, state);
  }
  if (!applied) {
    state.earned = new Set(readProgress(model.trophies));
    state.selected = model.trophies.length > 0 ? model.trophies[0].id : 0;
  }
  if (!model.byId.has(state.selected)) state.selected = model.trophies.length > 0 ? model.trophies[0].id : 0;
  setStatus(state.demo ? 'Demo state, nothing written.' : 'Progress saved in this browser.');
  wire();
  render();
}

boot();
