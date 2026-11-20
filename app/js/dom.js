// dom.js: the handful of document helpers the ledger uses, and the escaping every
// data-derived string passes through before it becomes markup.

const ESCAPES = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' };

export const byId = (id) => document.getElementById(id);

export const esc = (value) => String(value ?? '').replace(/[&<>"']/g, (char) => ESCAPES[char]);

export function setText(id, value) {
  const node = byId(id);
  if (node) node.textContent = value;
}

export function setHtml(id, html) {
  const node = byId(id);
  if (node) node.innerHTML = html;
}

export function setClass(id, name, on) {
  const node = byId(id);
  if (node) node.classList.toggle(name, Boolean(on));
}

/** A middot-separated run of facts, each already escaped. */
export const dotted = (parts) => parts.map((part) => `<span class="sep">\u00b7</span>${part}`).join('');

export const percent = (part, whole) => (whole > 0 ? Math.round((part / whole) * 100) : 0);

/** A number with a thousands comma, so 397 reads as itself and 1397 does not crowd. */
export const group = (value) => String(value).replace(/\B(?=(\d{3})+(?!\d))/g, ',');
