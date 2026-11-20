// shots.js: the four deterministic demo states the screenshots are taken from.
// Each earned list is a fixed set of official names, never random, and a preset
// never writes to localStorage, so the normal app keeps the reader's own progress.

export const EARNED_LEDGER = [
  'Just Like Paradise',
  'Paradise Lost',
  'T**s Ass Drug Money',
  'Vice City, Baby!',
  'Top Of The World, Ma',
  'Trust',
  'Break the Bank',
  'Family Matters',
  'DWNFALL',
  'Hi-Jacked',
  'Baited My Tackle',
  'Master of None',
  'The Shootist',
  'Top Fun',
  'Earn Cash, Not Kudos',
  'Positive Mental Attitude',
  "Don't Touch My Deck",
  'You WAiNKer!',
  'Whip It Good',
  'Little Boxes',
  'On the Spot',
  'Dime on the Dollar',
  'Road to Rehabilitation',
  'The Lone Rider'
];

export const EARNED_COLLECT = [
  ...EARNED_LEDGER,
  'Stick Fiddler',
  'One Last Thing',
  'Hot Together',
  'Retail Therapy',
  'Gunslinger',
  'Maximum Withdrawal',
  'A Classic Blitz Play'
];

export const PRESETS = {
  ledger: {
    earned: EARNED_LEDGER,
    view: 'ledger',
    kind: 'all',
    grade: 'all',
    query: '',
    select: 'Cunning Stunts',
    spoiler: true
  },
  collect: {
    earned: EARNED_COLLECT,
    view: 'ledger',
    kind: 'collectibles',
    grade: 'all',
    query: '',
    select: 'You WAiNKer!',
    spoiler: true
  },
  roadmap: {
    earned: EARNED_LEDGER,
    view: 'roadmap',
    kind: 'all',
    grade: 'all',
    query: '',
    select: 'Cunning Stunts',
    spoiler: true
  },
  watch: {
    earned: EARNED_LEDGER,
    view: 'watch',
    kind: 'all',
    grade: 'all',
    query: '',
    select: 'Cunning Stunts',
    spoiler: false
  }
};

/** Applies a preset to the state in place; returns false for an unknown name. */
export function applyPreset(name, model, state) {
  const preset = PRESETS[name];
  if (!preset) return false;
  const known = new Set(model.trophies.map((trophy) => trophy.name));
  const earned = preset.earned.filter((trophyName) => known.has(trophyName));
  state.earned = new Set(earned);
  state.view = preset.view;
  state.kind = preset.kind;
  state.grade = preset.grade;
  state.q = preset.query;
  state.spoiler = preset.spoiler;
  const selected = model.byName.get(preset.select);
  state.selected = selected ? selected.id : model.trophies[0] ? model.trophies[0].id : 0;
  state.revealed = 0;
  state.demo = true;
  return true;
}
