// views.js: the markup for every pane. Each function reads the model and the state
// and returns a string, so a render is one pass and no node is left half updated.

import { esc, percent } from './dom.js';
import { GRADE_LABEL, KIND_LABEL, isShielded, earnedIn } from './data.js';

const SEP = '<span class="sep">\u00b7</span>';

const gradeLabel = (grade) => GRADE_LABEL[grade] || String(grade).toUpperCase();
const kindLabel = (kind) => KIND_LABEL[kind] || String(kind).toUpperCase();

/** The audit strip: every figure on it is computed from the data files. */
export function renderAudit(model) {
  const f = model.figures;
  const main = `<span class="audit-run">${[`${f.total} OFFICIAL`, `${f.hidden} HIDDEN`, `${f.guides} OF ${f.total} GUIDES`].join(SEP)}</span>`;
  const sub = `<span class="audit-run">${[
    `${f.steps} STEPS`,
    `${f.cited} CITED`,
    `${f.sources} SOURCES`,
    `READ ${esc(f.read.toUpperCase())}`
  ].join(SEP)}</span>`;
  return { main, sub };
}

function ringSvg(earned, total) {
  const radius = 27;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference * (1 - (total > 0 ? earned / total : 0));
  return [
    `<svg viewBox="0 0 64 64" width="64" height="64" role="img" aria-label="${earned} of ${total} earned">`,
    `<circle cx="32" cy="32" r="${radius}" fill="none" stroke="#cec1a9" stroke-width="4"></circle>`,
    `<circle cx="32" cy="32" r="${radius}" fill="none" stroke="#8b2e20" stroke-width="4"`,
    ` stroke-dasharray="${circumference.toFixed(2)}" stroke-dashoffset="${offset.toFixed(2)}"`,
    ` transform="rotate(-90 32 32)"></circle>`,
    '</svg>',
    `<span class="ring-center"><span class="ring-earned">${earned}</span><span class="ring-of">of ${total}</span></span>`
  ].join('');
}

/** The rail's chips: a computed count on each, the active one filled. */
function chipRow(model, state, keys, group, afterAll = '') {
  const total = model.figures.total;
  const chips = [`all`].concat(keys).map((key) => {
    const active = state[group] === key;
    const label = key === 'all' ? 'ALL' : group === 'kind' ? kindLabel(key) : gradeLabel(key);
    const count = key === 'all' ? total : group === 'kind' ? model.figures.byKind[key] || 0 : model.figures.byGrade[key] || 0;
    const chip = `<button class="chip${active ? ' active' : ''}" type="button" data-act="${group}" data-value="${esc(key)}">${esc(label)}<span class="chip-n">${count}</span></button>`;
    return key === 'all' ? chip + afterAll : chip;
  });
  return chips.join('');
}

export function renderRail(model, state, shown) {
  const total = model.figures.total;
  const earned = earnedIn(model.trophies, state.earned);
  const tallies = ['platinum', 'gold', 'silver', 'bronze'].map((grade) => {
    const inGrade = model.trophies.filter((trophy) => trophy.grade === grade);
    return `<li class="tally"><span class="tally-label">${gradeLabel(grade)}</span><span class="tally-frac">${earnedIn(inGrade, state.earned)}/${inGrade.length}</span></li>`;
  }).join('');

  const kindCount = model.figures.byKind;
  const kindLine = [
    `STORY ${kindCount.story}`,
    `SIDE ${kindCount.side}`,
    `COLLECTIBLES ${kindCount.collectibles}`,
    `ACTIVITIES ${kindCount.activities}`,
    `ONLINE ${kindCount.online}`,
    `<span class="kind-total">TOTAL ${total}</span>`
  ].join(` ${SEP} `);

  const watchCount = model.trophies.filter((trophy) => model.watchByTrophy.has(trophy.name)).length;
  const missableChip = `<button class="chip chip-missable${state.missable ? ' active' : ''}" type="button" data-act="missable">MISSABLE<span class="chip-n">${watchCount}</span></button>`;

  return {
    ring: ringSvg(earned, total),
    progressLine: `${earned} earned / ${total - earned} to go`,
    progressOpen: `${percent(earned, total)} percent of the ledger`,
    tallies,
    kindChips: chipRow(model, state, ['story', 'side', 'collectibles', 'activities', 'online'], 'kind', missableChip),
    gradeChips: chipRow(model, state, ['platinum', 'gold', 'silver', 'bronze'], 'grade'),
    kindLine,
    shown,
    spoiler: state.spoiler
  };
}

/** One ledger row: checkbox, grade, official text, and the meta column. */
function rowHtml(model, state, trophy) {
  const shielded = isShielded(trophy, state);
  const earned = state.earned.has(trophy.name);
  const watched = model.watchByTrophy.has(trophy.name);
  const status = earned
    ? '<span class="badge earned">EARNED</span>'
    : shielded
      ? '<span class="badge hidden">HIDDEN</span>'
      : watched
        ? '<span class="badge watch">WATCH</span>'
        : '';
  const classes = ['row'];
  if (trophy.id === state.selected) classes.push('selected');
  if (earned) classes.push('earned');
  if (shielded) classes.push('masked');
  const name = shielded ? 'Hidden trophy' : trophy.name;
  const desc = shielded ? 'A story trophy, held back by the shield' : trophy.description;
  return [
    `<div class="${classes.join(' ')}" role="listitem" data-act="select" data-id="${trophy.id}">`,
    `<button class="box${earned ? ' on' : ''}" type="button" role="checkbox" aria-checked="${earned}"`,
    ` aria-label="${esc(trophy.name)}, ${earned ? 'earned' : 'not earned'}" data-act="toggle" data-id="${trophy.id}"></button>`,
    `<span class="grade ${esc(trophy.grade)}">${gradeLabel(trophy.grade)}</span>`,
    `<span class="row-text"><span class="row-name">${esc(name)}</span><span class="row-desc">${esc(desc)}</span></span>`,
    '<span class="row-meta">',
    `<span class="row-steps">${trophy.steps.length} steps</span>`,
    '<span class="row-badges">',
    trophy.hidden ? '<span class="mark-h" title="Hidden trophy">H</span>' : '',
    watched ? '<span class="dot-watch" title="On the watch list"></span>' : '',
    status,
    '</span></span></div>'
  ].join('');
}

export function renderLedgerRows(model, state, rows) {
  return rows.map((trophy) => rowHtml(model, state, trophy)).join('');
}

export function ledgerFoot(model) {
  const k = model.figures.byKind;
  return [
    `STORY ${k.story}`,
    `SIDE ${k.side}`,
    `COLLECTIBLES ${k.collectibles}`,
    `ACTIVITIES ${k.activities}`,
    `ONLINE ${k.online}`,
    `TOTAL ${model.figures.total}`
  ].join(` ${SEP} `);
}

export function activeLine(state) {
  const parts = [`KIND ${state.kind.toUpperCase()}`, `GRADE ${state.grade.toUpperCase()}`];
  if (state.missable) parts.push('MISSABLE');
  if (state.q.trim() !== '') parts.push(`SEARCH ${state.q.trim().toUpperCase()}`);
  parts.push(state.spoiler ? 'SHIELD ON' : 'SHIELD OFF');
  return parts.join(' \u00b7 ');
}

function sourceRow(model, id) {
  const source = model.sourceById.get(id);
  if (!source) return `<div class="src-row"><span class="src-id">${esc(id)}</span><span>Cited source</span></div>`;
  return [
    '<div class="src-row">',
    `<span class="src-id">${esc(source.id)}</span>`,
    '<span>',
    `<a href="${esc(source.url)}" target="_blank" rel="noopener noreferrer">${esc(source.title)}</a>`,
    `<span class="src-pub">${esc(source.publisher)}</span>`,
    '</span></div>'
  ].join('');
}

/** The guide that carries a fact: psq first, then gb, then the caller's fallback. */
function guideId(trophy, fallback = 'gb') {
  const sources = trophy.sources || [];
  if (sources.includes('psq')) return 'psq';
  if (sources.includes('gb')) return 'gb';
  if (fallback === 'first') return sources[0] || 'gb';
  return fallback;
}

function countSection(trophy) {
  const label = trophy.count ? esc(trophy.count) : 'Not yet confirmed';
  const note = trophy.count
    ? `exact target from the named guide <span class="src-chip">${esc(guideId(trophy, 'psnp'))}</span>`
    : `no number in the captured sources <span class="src-chip">${esc(trophy.sources[0] || 'gb')}</span>`;
  return [
    '<div class="section">',
    '<h3 class="section-title">COUNTS</h3>',
    `<div class="count-block"><span class="count-value">${label}</span><span class="count-note">${note}</span></div>`,
    '</div>'
  ].join('');
}

/** The one-line missable answer, with the named guide it was drawn from. */
function missableSection(trophy, watch) {
  if (watch) {
    return [
      '<div class="section missable-section">',
      '<h3 class="section-title">CAN IT BE MISSED?</h3>',
      '<p class="missable-answer">MISSABLE WINDOW</p>',
      `<p class="missable-row"><span class="missable-key">WINDOW</span>${esc(watch.window)}</p>`,
      `<p class="missable-row"><span class="missable-key">WHY</span>${esc(watch.why)}</p>`,
      `<p class="missable-row"><span class="missable-key">ACTION</span>${esc(watch.action)}</p>`,
      `<p class="missable-source">flag built from the named guide beside the official description <span class="src-chip">${esc(guideId(trophy, 'gb'))}</span></p>`,
      '</div>'
    ].join('');
  }
  return [
    '<div class="section missable-section">',
    '<h3 class="section-title">CAN IT BE MISSED?</h3>',
    '<p class="missable-answer quiet">No missable window in the official description. <span class="src-chip">psn</span></p>',
    '<p class="missable-source">Check the window before the chapter ends if a guide adds one later.</p>',
    '</div>'
  ].join('');
}

function roadmapSection(model, trophy) {
  const stage = model.stageByN.get(trophy.stage);
  return [
    '<div class="section">',
    '<h3 class="section-title">ROADMAP</h3>',
    `<p class="stage-line"><span class="stage-n">STAGE ${trophy.stage}</span>${esc(stage ? stage.title : 'Stage ' + trophy.stage)}</p>`,
    '</div>'
  ].join('');
}

function blockedDetail(model, state, trophy) {
  return [
    `<header class="trophy-head">`,
    `<p class="eyebrow"><span class="say-grade">${gradeLabel(trophy.grade)}</span> ${SEP} ${kindLabel(trophy.kind)} ${SEP} STAGE ${trophy.stage}</p>`,
    '<h2 class="trophy-name">Hidden trophy</h2>',
    '<p class="trophy-desc">A story trophy, held back until it is earned.</p>',
    '</header>',
    '<div class="blocked">',
    '<p class="blocked-title">Spoiler shield is on</p>',
    '<p class="blocked-copy">The name, the description and the guide stay behind the shield. Tick the trophy off in the ledger, turn the shield off, or reveal this one trophy.</p>',
    `<button class="reveal" type="button" data-act="reveal" data-id="${trophy.id}">Reveal this trophy</button>`,
    '</div>',
    countSection(trophy),
    roadmapSection(model, trophy)
  ].join('');
}

export function renderDetail(model, state, rows) {
  if (rows.length === 0) {
    return [
      '<div class="empty">',
      '<h2 class="empty-title">Nothing matches these filters</h2>',
      '<p class="empty-copy">The search reads names and descriptions. Kind and grade combine, and a shield hides unearned story trophies from the results. Clear a chip or the search to bring the ledger back.</p>',
      '</div>'
    ].join('');
  }
  const trophy = model.byId.get(state.selected) || rows[0];
  if (!trophy) return '';
  if (isShielded(trophy, state)) return blockedDetail(model, state, trophy);

  const earned = state.earned.has(trophy.name);
  const cited = trophy.steps.filter((step) => model.sourceById.has(step.source)).length;
  const steps = trophy.steps.map((step, index) =>
    `<li class="step"><span class="step-n">${index + 1}.</span><span class="step-body">${esc(step.text)} <span class="src-chip">${esc(step.source)}</span></span></li>`
  ).join('');
  const sources = trophy.sources.map((id) => sourceRow(model, id)).join('');
  const watch = model.watchByTrophy.get(trophy.name);

  const parts = [
    '<header class="trophy-head">',
    `<p class="eyebrow"><span class="say-grade">${gradeLabel(trophy.grade)}</span> ${SEP} ${kindLabel(trophy.kind)} ${SEP} STAGE ${trophy.stage}${earned ? ` ${SEP} EARNED` : ''}</p>`,
    `<h2 class="trophy-name">${esc(trophy.name)}</h2>`,
    `<p class="trophy-desc">${esc(trophy.description)}</p>`,
    '<p class="fact-line">Official name, description and grade: <span class="src-chip">psn</span> Exophase PSN list</p>',
    '</header>',
    missableSection(trophy, watch),
    '<div class="section">',
    `<h3 class="section-title">HOW TO EARN IT<span class="aside">${trophy.steps.length} STEPS ${SEP} ${cited} CITED</span></h3>`,
    `<ol class="steps">${steps}</ol>`,
    '</div>',
    '<div class="section">',
    `<h3 class="section-title">SOURCES FOR THIS TROPHY<span class="aside">${trophy.sources.length} OF 7</span></h3>`,
    `<div class="src-rows">${sources}</div>`,
    '</div>'
  ];

  parts.push(countSection(trophy));
  parts.push(roadmapSection(model, trophy));
  return parts.join('');
}

/** The roadmap: seven stage cards, two columns, the platinum card last. */
export function renderRoadmap(model, state) {
  const cards = model.stages.map((stage) => {
    const earned = earnedIn(stage.members, state.earned);
    const width = percent(earned, stage.members.length);
    const chips = stage.members.slice(0, 7).map((trophy) =>
      `<span class="t-chip${state.earned.has(trophy.name) ? ' on' : ''}">${esc(trophy.name)}</span>`
    ).join('');
    const more = stage.members.length > 7
      ? `<span class="t-chip more">+${stage.members.length - 7} more</span>`
      : '';
    return [
      `<article class="stage-card${stage.n === 7 ? ' final' : ''}">`,
      `<div class="card-top"><span class="card-n">${stage.n}</span><h3 class="card-title">${esc(stage.title)}</h3></div>`,
      `<p class="card-window">${esc(stage.window)}</p>`,
      `<p class="card-hours">${esc(stage.hours)}</p>`,
      `<p class="card-goal">${esc(stage.goal)}</p>`,
      '<div class="card-bar-row">',
      `<span class="card-bar"><span style="width:${width}%"></span></span>`,
      `<span class="card-bar-label">${earned} of ${stage.members.length} earned</span>`,
      '</div>',
      `<div class="card-chips">${chips}${more}</div>`,
      '</article>'
    ].join('');
  }).join('');

  return [
    '<div class="view-head">',
    '<h2 class="view-title">Roadmap to the platinum</h2>',
    `<p class="view-note">${model.stages.length} STAGES ${SEP} ${model.figures.total} TROPHIES ${SEP} ${earnedIn(model.trophies, state.earned)} EARNED</p>`,
    '</div>',
    `<div class="stage-grid">${cards}</div>`
  ].join('');
}

/** The watch list: ten rows joined to the trophy list by exact name. */
export function renderWatch(model, state) {
  const rows = model.watch.map((row) => {
    const missable = Boolean(row.trophy && row.trophy.missable);
    return [
      '<tr>',
      `<td class="cell-name">${esc(row.name)}</td>`,
      `<td class="cell-status${missable ? ' hot' : ''}">${missable ? 'POSSIBLY MISSABLE' : 'AT RISK'}</td>`,
      `<td class="cell-window">${esc(row.window)}</td>`,
      `<td>${esc(row.why)}</td>`,
      `<td>${esc(row.action)}</td>`,
      `<td class="cell-source"><span class="src-chip">${esc(guideId(row.trophy || { sources: [] }, 'first'))}</span></td>`,
      '</tr>'
    ].join('');
  }).join('');

  return [
    '<div class="view-head">',
    '<h2 class="view-title">Missable trophies</h2>',
    `<p class="view-note">${model.watch.length} FLAGS ${SEP} 1 POSSIBLY MISSABLE ${SEP} 9 AT RISK</p>`,
    '</div>',
    '<p class="view-lede">One of the ten is possibly missable and the other nine are easy to lose track of. The official descriptions mark no trophy as missable, so these are watch flags rather than confirmed misses.</p>',
    '<table class="ledger-table">',
    '<colgroup><col style="width:15.5%"><col style="width:11.5%"><col style="width:15%"><col style="width:24%"><col style="width:25%"><col style="width:9%"></colgroup>',
    '<thead><tr><th>Trophy</th><th>Status</th><th>Window</th><th>Why it is easy to miss</th><th>What to do</th><th>Source</th></tr></thead>',
    `<tbody>${rows}</tbody>`,
    '</table>',
    '<p class="view-foot">Status follows the missable flag in the trophy data. Names join the ledger by exact official spelling.</p>'
  ].join('');
}

/** The sources: seven rows, each with the count of steps that cite it. */
export function renderSources(model) {
  const rows = model.sources.map((source) => {
    const cited = model.figures.citations.get(source.id) || 0;
    return [
      '<tr>',
      `<td><span class="cell-id">${esc(source.id)}</span><span class="cell-pub">${esc(source.publisher)}</span></td>`,
      `<td>${esc(source.title)}</td>`,
      `<td class="cell-support">${esc(source.supports)}</td>`,
      `<td class="cell-window">${esc(source.read)}</td>`,
      `<td class="cell-url"><a href="${esc(source.url)}" target="_blank" rel="noopener noreferrer">${esc(source.url)}</a></td>`,
      `<td class="cell-count">${cited} steps</td>`,
      '</tr>'
    ].join('');
  }).join('');

  return [
    '<div class="view-head">',
    '<h2 class="view-title">Sources</h2>',
    `<p class="view-note">${model.sources.length} SOURCES ${SEP} ${model.figures.read.toUpperCase()}</p>`,
    '</div>',
    '<table class="ledger-table">',
    '<colgroup><col style="width:12%"><col style="width:24%"><col style="width:24%"><col style="width:7%"><col style="width:24.5%"><col style="width:8.5%"></colgroup>',
    '<thead><tr><th>Publisher</th><th>Title</th><th>What it supports</th><th>Read</th><th>URL</th><th>Cited by</th></tr></thead>',
    `<tbody>${rows}</tbody>`,
    '</table>',
    '<p class="view-foot">The app fetches nothing. A link opens only when you follow it, and the count is the number of guide steps that cite that source.</p>'
  ].join('');
}
