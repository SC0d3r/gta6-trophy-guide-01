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
  const main = [
    '<span class="audit-tag">AUDIT</span>',
    `${f.official}/${f.total} OFFICIAL NAME, DESCRIPTION, GRADE`,
    `${f.hidden} PSN-HIDDEN`,
    `${f.cited}/${f.steps} STEPS CITED`,
    `${f.guides2}/${f.total} GUIDES CITE 2+ SOURCES`
  ].join(` ${SEP} `);
  const sub = [
    `${f.watch} WATCH FLAGS`,
    `${f.watchMissable} POSSIBLY MISSABLE`,
    `${f.watchRisk} AT RISK`,
    `${f.sources} SOURCES READ ${esc(f.read.toUpperCase())}`,
    'OFFLINE'
  ].join(` ${SEP} `);
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
  const masked = model.trophies.filter((trophy) => isShielded(trophy, state)).length;
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
    spoiler: state.spoiler,
    spoilerNote: state.spoiler ? `${masked} story names hidden now` : 'all names shown',
    masked
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

export function activeLine(model, state) {
  const parts = [`KIND ${state.kind.toUpperCase()}`, `GRADE ${state.grade.toUpperCase()}`];
  if (state.missable) parts.push('MISSABLE');
  if (state.q.trim() !== '') parts.push(`SEARCH ${state.q.trim().toUpperCase()}`);
  if (state.spoiler) {
    const masked = model.trophies.filter((trophy) => isShielded(trophy, state)).length;
    parts.push(`SHIELD ON, ${masked} MASKED`);
  } else {
    parts.push('SHIELD OFF');
  }
  return parts.join(' \u00b7 ');
}

/** Every source the detail cites, in trophy.sources order, then any step source not listed. */
function citationList(trophy) {
  const list = [...trophy.sources];
  for (const step of trophy.steps) {
    if (step.source && !list.includes(step.source)) list.push(step.source);
  }
  return list;
}

function sourceRow(model, id, number, stepCount) {
  const source = model.sourceById.get(id);
  if (!source) {
    return [
      '<div class="src-row">',
      `<span class="src-num">${number}</span>`,
      `<span class="src-body"><span class="src-title">${esc(id)}</span></span>`,
      '<span class="src-read">read date unknown</span>',
      `<span class="src-count">${stepCount} ${stepCount === 1 ? 'step' : 'steps'}</span>`,
      '</div>'
    ].join('');
  }
  return [
    '<div class="src-row">',
    `<span class="src-num">${number}</span>`,
    '<span class="src-body">',
    `<a href="${esc(source.url)}" target="_blank" rel="noopener noreferrer">${esc(source.publisher)}</a>`,
    `<span class="src-title">${esc(source.title)}</span>`,
    '</span>',
    `<span class="src-read">${esc(source.read)}</span>`,
    `<span class="src-count">${stepCount} ${stepCount === 1 ? 'step' : 'steps'}</span>`,
    '</div>'
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

/** Three one-line attributions for the header: the official facts, the target and our own route notes. */
function factRows(model, trophy) {
  const psn = model.sourceById.get('psn');
  const psnp = model.sourceById.get('psnp');
  const rows = [
    `<p class="fact-row">Official name, description and grade <span class="src-chip">psn</span> ${esc(psn ? psn.publisher : 'psn')} PSN list</p>`
  ];
  if (trophy.tally) {
    rows.push(`<p class="fact-row">Target <span class="src-chip">psnp</span> ${esc(String(trophy.tally.target))} ${esc(trophy.tally.unit)} on ${esc(psnp ? psnp.publisher : 'psnp')}</p>`);
  }
  rows.push('<p class="fact-row">Route notes <span class="src-chip">OURS</span> checked against the sources below, not yet played in the game</p>');
  return `<div class="fact-rows">${rows.join('')}</div>`;
}

/** The tracker for a trophy whose target is counted, or the official count when it is not. */
function countSection(model, state, trophy) {
  if (trophy.tally) {
    const target = Math.max(1, Math.floor(Number(trophy.tally.target) || 1));
    const current = Math.max(0, Math.min(target, Math.floor(Number(state.tallies[trophy.id]) || 0)));
    const togo = target - current;
    const note = state.demo ? 'demo counts, nothing written' : 'saved in this browser';
    return [
      '<div class="section">',
      `<h3 class="section-title">YOUR COUNT<span class="aside">${esc(trophy.count || trophy.tally.unit)}</span></h3>`,
      '<div class="tally-track">',
      `<button class="tally-btn" type="button" data-act="tally" data-id="${trophy.id}" data-delta="-1" aria-label="One fewer ${esc(trophy.tally.unit)}">-</button>`,
      `<span class="tally-count">${current} / ${target} ${esc(trophy.tally.unit)}</span>`,
      `<button class="tally-btn" type="button" data-act="tally" data-id="${trophy.id}" data-delta="1" aria-label="One more ${esc(trophy.tally.unit)}">+</button>`,
      `<span class="tally-togo">${togo} to go</span>`,
      `<span class="tally-note">${note}</span>`,
      '</div>',
      '</div>'
    ].join('');
  }
  const label = trophy.count ? esc(trophy.count) : 'Not yet confirmed';
  const note = trophy.count
    ? `exact target from the named guide <span class="src-chip">${esc(guideId(trophy, 'psnp'))}</span>`
    : `no number in the captured sources <span class="src-chip">${esc(trophy.sources[0] || 'gb')}</span>`;
  return [
    '<div class="section">',
    '<h3 class="section-title">YOUR COUNT</h3>',
    `<div class="count-block"><span class="count-value">${label}</span><span class="count-note">${note}</span></div>`,
    '</div>'
  ].join('');
}

/** The last-chance callout for a watch trophy, or one quiet line for every other trophy. */
function missableSection(trophy, watch, citations) {
  if (watch) {
    const source = guideId(trophy, 'gb');
    const number = citations.indexOf(source) + 1;
    const heading = trophy.missable ? 'POSSIBLY MISSABLE, LAST CHANCE' : 'AT RISK, EASY TO MISS';
    return [
      '<div class="section last-chance">',
      `<h3 class="last-chance-title">${heading}</h3>`,
      `<p class="missable-row"><span class="missable-key">WINDOW</span>${esc(watch.window)}</p>`,
      `<p class="missable-row"><span class="missable-key">WHY</span>${esc(watch.why)}</p>`,
      `<p class="missable-row"><span class="missable-key">PROTECT IT</span>${esc(watch.action)} <span class="src-chip">[${number}]</span></p>`,
      '</div>'
    ].join('');
  }
  const source = citations.includes('psn') ? 'psn' : citations[0];
  const number = citations.indexOf(source) + 1;
  return [
    '<div class="section last-chance quiet">',
    `<p class="missable-answer quiet">No missable window in the official description <span class="src-chip">[${number}]</span></p>`,
    '</div>'
  ].join('');
}

/** The numbered steps: every step ends in the citation number of its source. */
function stepsSection(trophy, citations) {
  const steps = trophy.steps.map((step, index) => {
    const number = citations.indexOf(step.source) + 1;
    return `<li class="step"><span class="step-n">${index + 1}.</span><span class="step-body">${esc(step.text)} <span class="src-chip">[${number}]</span></span></li>`;
  }).join('');
  const cited = trophy.steps.filter((step) => citations.includes(step.source)).length;
  return [
    '<div class="section">',
    `<h3 class="section-title">HOW TO EARN IT<span class="aside">${trophy.steps.length} STEPS ${SEP} ${cited} CITED</span></h3>`,
    `<ol class="steps">${steps}</ol>`,
    '</div>'
  ].join('');
}

/** The numbered rail: every source once, with its publisher link and this trophy's step count. */
function sourcesSection(model, trophy, citations) {
  const rows = citations.map((id, index) => {
    const stepCount = trophy.steps.filter((step) => step.source === id).length;
    return sourceRow(model, id, index + 1, stepCount);
  }).join('');
  return [
    '<div class="section">',
    '<h3 class="section-title">SOURCES FOR THIS TROPHY<span class="aside">EVERY STEP CITED</span></h3>',
    `<div class="src-rows">${rows}</div>`,
    '</div>'
  ].join('');
}

/** The next four unearned trophies after this one in stage, then id order. */
function nextUpSection(model, state, trophy) {
  const order = [...model.trophies].sort((a, b) => a.stage - b.stage || a.id - b.id);
  const position = order.findIndex((row) => row.id === trophy.id);
  const unearned = order.filter((row) => !state.earned.has(row.name));
  const after = unearned.filter((row) => order.findIndex((candidate) => candidate.id === row.id) > position);
  const picks = after.concat(unearned.filter((row) => !after.includes(row))).slice(0, 4);
  if (!picks.length) return '';
  const rows = picks.map((row) => {
    const watch = model.watchByTrophy.get(row.name);
    const chip = watch
      ? `<span class="next-chip${row.missable ? ' hot' : ''}">${row.missable ? 'MISSABLE' : 'AT RISK'}</span>`
      : '';
    const hidden = isShielded(row, state);
    return [
      `<button class="next-row" type="button" data-act="select" data-id="${row.id}">`,
      `<span class="next-stage">STAGE ${row.stage}</span>`,
      `<span class="next-name${hidden ? ' masked' : ''}">${hidden ? 'Hidden trophy' : esc(row.name)}</span>`,
      chip,
      '</button>'
    ].join('');
  }).join('');
  return [
    '<div class="section">',
    `<h3 class="section-title">NEXT UP, ROADMAP ORDER<span class="aside">${picks.length} UNEARNED</span></h3>`,
    `<div class="next-rows">${rows}</div>`,
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
    countSection(model, state, trophy),
    nextUpSection(model, state, trophy),
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
  const citations = citationList(trophy);
  const watch = model.watchByTrophy.get(trophy.name);

  return [
    '<header class="trophy-head">',
    `<p class="eyebrow"><span class="say-grade">${gradeLabel(trophy.grade)}</span> ${SEP} ${kindLabel(trophy.kind)} ${SEP} STAGE ${trophy.stage}${earned ? ` ${SEP} EARNED` : ''}</p>`,
    `<h2 class="trophy-name">${esc(trophy.name)}</h2>`,
    `<p class="trophy-desc">${esc(trophy.description)}</p>`,
    factRows(model, trophy),
    '</header>',
    countSection(model, state, trophy),
    missableSection(trophy, watch, citations),
    stepsSection(trophy, citations),
    sourcesSection(model, trophy, citations),
    nextUpSection(model, state, trophy),
    roadmapSection(model, trophy)
  ].join('');
}
