// probe.js: a read-only layout audit, run only when index.html is opened with ?probe.
// It measures the panes, the rows, the cards and the tables and writes one hidden
// JSON line, so the 1280 by 800 fit can be checked without a human looking at a shot.

const round = (value) => Math.round(value * 10) / 10;

export function writeProbe(model, state) {
  const vw = window.innerWidth;
  const vh = window.innerHeight;
  const box = (node) => node.getBoundingClientRect();
  const scroll = document.getElementById('ledger-scroll');
  const rows = scroll ? [...scroll.querySelectorAll('.row')] : [];
  const view = scroll ? box(scroll) : null;
  const visibleRows = view
    ? rows.filter((row) => {
        const b = box(row);
        return b.top >= view.top - 0.5 && b.bottom <= view.bottom + 0.5;
      }).length
    : 0;
  const cards = [...document.querySelectorAll('.stage-card')];
  const cardBoxes = cards.map((card) => box(card));
  const tableRows = [...document.querySelectorAll('.ledger-table tbody tr')];
  const head = document.getElementById('ledger-head');
  const panel = document.getElementById('panel');
  const rail = document.getElementById('rail');
  const auditMain = document.getElementById('audit-main');
  const auditSub = document.getElementById('audit-sub');

  let minFont = 99;
  for (const node of document.querySelectorAll('body *')) {
    if (!node.firstChild || node.firstChild.nodeType !== 3) continue;
    if (!node.textContent.trim()) continue;
    const size = Number.parseFloat(window.getComputedStyle(node).fontSize);
    if (size > 0 && size < minFont) minFont = size;
  }

  const wide = [...document.querySelectorAll('body *')]
    .filter((node) => {
      const b = box(node);
      return b.width > 0 && (b.right > vw + 0.5 || b.left < -0.5);
    })
    .slice(0, 6)
    .map((node) => `${node.tagName.toLowerCase()}.${String(node.className).split(' ')[0]}`);

  const data = {
    preset: new URLSearchParams(window.location.search).get('shot') || 'live',
    view: state.view,
    viewport: { w: vw, h: vh },
    document: { scrollW: document.documentElement.scrollWidth, scrollH: document.documentElement.scrollHeight },
    body: { scrollW: document.body.scrollWidth, scrollH: document.body.scrollHeight },
    audit: {
      mainW: auditMain ? [auditMain.scrollWidth, auditMain.clientWidth] : null,
      subW: auditSub ? [auditSub.scrollWidth, auditSub.clientWidth] : null,
      mainRun: auditMain && auditMain.firstElementChild ? round(box(auditMain.firstElementChild).width) : null,
      subRun: auditSub && auditSub.firstElementChild ? round(box(auditSub.firstElementChild).width) : null
    },
    rail: rail ? { h: round(box(rail).height), scrollH: rail.scrollHeight, bottom: round(box(rail).bottom) } : null,
    ledger: {
      rows: rows.length,
      visibleRows,
      headH: head ? round(box(head).height) : 0,
      scrollH: scroll ? round(box(scroll).height) : 0,
      rowH: rows.length > 0 ? round(box(rows[0]).height) : 0
    },
    panel: panel ? { clientH: panel.clientHeight, scrollH: panel.scrollHeight } : null,
    cards: { count: cards.length, heights: cardBoxes.map((b) => round(b.height)), maxBottom: cardBoxes.length ? round(Math.max(...cardBoxes.map((b) => b.bottom))) : 0 },
    table: { rows: tableRows.length, heights: tableRows.map((row) => round(box(row).height)) },
    minFont,
    wide,
    trophies: model.trophies.length,
    earned: state.earned.size
  };

  const pre = document.createElement('pre');
  pre.id = 'layout-probe';
  pre.setAttribute('aria-hidden', 'true');
  pre.style.cssText = 'position:fixed;left:-9999px;top:0;margin:0;font-size:9px;color:#191713;background:#f2ebdb';
  pre.textContent = JSON.stringify(data);
  document.body.append(pre);
}
