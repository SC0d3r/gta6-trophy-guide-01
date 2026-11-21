// views-more.js: the three full-width panes. This module is imported only when one
// of their tabs opens, so the ledger's first load does not carry it.

import { esc, percent } from './dom.js';
import { earnedIn } from './data.js';

const SEP = '<span class="sep">\u00b7</span>';

/** The guide that carries a fact: psq first, then gb, then the caller's fallback. */
function guideId(trophy, fallback = 'gb') {
  const sources = trophy.sources || [];
  if (sources.includes('psq')) return 'psq';
  if (sources.includes('gb')) return 'gb';
  if (fallback === 'first') return sources[0] || 'gb';
  return fallback;
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
    `<p class="view-note">${model.figures.watch} FLAGS ${SEP} ${model.figures.watchMissable} POSSIBLY MISSABLE ${SEP} ${model.figures.watchRisk} AT RISK</p>`,
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
    `<p class="view-note">${model.sources.length} SOURCES ${SEP} ${model.sources.length} PUBLISHERS ${SEP} ${model.figures.read.toUpperCase()}</p>`,
    '</div>',
    '<table class="ledger-table">',
    '<colgroup><col style="width:12%"><col style="width:24%"><col style="width:24%"><col style="width:7%"><col style="width:24.5%"><col style="width:8.5%"></colgroup>',
    '<thead><tr><th>Publisher</th><th>Title</th><th>What it supports</th><th>Read</th><th>URL</th><th>Cited by</th></tr></thead>',
    `<tbody>${rows}</tbody>`,
    '</table>',
    '<p class="view-foot">The app fetches nothing. A link opens only when you follow it, and the count is the number of guide steps that cite that source.</p>'
  ].join('');
}
