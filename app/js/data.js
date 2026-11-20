// data.js: loads the five data files, joins them, and computes every figure the
// audit strip, the rail and the views show. Nothing is counted by hand anywhere else.

export const KIND_ORDER = ['story', 'side', 'collectibles', 'activities', 'online'];
export const KIND_LABEL = {
  story: 'STORY',
  side: 'SIDE',
  collectibles: 'COLLECTIBLES',
  activities: 'ACTIVITIES',
  online: 'ONLINE'
};
export const GRADE_ORDER = ['platinum', 'gold', 'silver', 'bronze'];
export const GRADE_LABEL = { platinum: 'PLATINUM', gold: 'GOLD', silver: 'SILVER', bronze: 'BRONZE' };

const FILES = ['trophies', 'roadmap', 'sources', 'watch', 'meta'];

async function readJson(name) {
  const response = await fetch(`data/${name}.json`, { cache: 'no-store' });
  if (!response.ok) throw new Error(`data/${name}.json answered ${response.status}`);
  return response.json();
}

/** Every file at once; a failure names the file that did not answer. */
export async function loadModel() {
  const [trophyDoc, roadmapDoc, sourceDoc, watchDoc, meta] = await Promise.all(FILES.map(readJson));
  return buildModel(trophyDoc, roadmapDoc, sourceDoc, watchDoc, meta);
}

export function buildModel(trophyDoc, roadmapDoc, sourceDoc, watchDoc, meta) {
  const trophies = (trophyDoc.trophies || []).map((trophy) => ({
    ...trophy,
    steps: Array.isArray(trophy.steps) ? trophy.steps : [],
    sources: Array.isArray(trophy.sources) ? trophy.sources : []
  }));
  const byId = new Map(trophies.map((trophy) => [trophy.id, trophy]));
  const byName = new Map(trophies.map((trophy) => [trophy.name, trophy]));
  const sources = sourceDoc.sources || [];
  const sourceById = new Map(sources.map((source) => [source.id, source]));

  const steps = trophies.reduce((total, trophy) => total + trophy.steps.length, 0);
  const cited = trophies.reduce(
    (total, trophy) => total + trophy.steps.filter((step) => sourceById.has(step.source)).length,
    0
  );
  const guides = trophies.filter((trophy) => typeof trophy.guide === 'string' && trophy.guide.trim() !== '').length;

  const byKind = {};
  for (const kind of KIND_ORDER) byKind[kind] = trophies.filter((trophy) => trophy.kind === kind).length;
  const byGrade = {};
  for (const grade of GRADE_ORDER) byGrade[grade] = trophies.filter((trophy) => trophy.grade === grade).length;

  const citations = new Map(sources.map((source) => [source.id, 0]));
  for (const trophy of trophies) {
    for (const step of trophy.steps) {
      if (citations.has(step.source)) citations.set(step.source, citations.get(step.source) + 1);
    }
  }

  const stages = (roadmapDoc.stages || []).map((stage) => ({
    ...stage,
    members: trophies.filter((trophy) => trophy.stage === stage.n)
  }));
  const stageByN = new Map(stages.map((stage) => [stage.n, stage]));

  const watch = (watchDoc.watch || []).map((row) => ({ ...row, trophy: byName.get(row.name) || null }));
  const watchByTrophy = new Map(watch.filter((row) => row.trophy).map((row) => [row.trophy.name, row]));

  const readDates = [...new Set(sources.map((source) => source.read))];
  const figures = {
    total: trophies.length,
    hidden: trophies.filter((trophy) => trophy.hidden).length,
    guides,
    steps,
    cited,
    byKind,
    byGrade,
    citations,
    sources: sources.length,
    read: readDates.join(' / ')
  };

  return {
    trophies,
    byId,
    byName,
    sources,
    sourceById,
    stages,
    stageByN,
    watch,
    watchByTrophy,
    meta: meta || {},
    figures
  };
}

/** The shield covers story trophies that are not earned yet, unless one was revealed. */
export const isShielded = (trophy, state) =>
  Boolean(state.spoiler) &&
  trophy.kind === 'story' &&
  !state.earned.has(trophy.name) &&
  state.revealed !== trophy.id;

/** The rows the ledger shows: kind and grade combine, and the search reads name and description. */
export function visibleTrophies(model, state) {
  const query = state.q.trim().toLowerCase();
  return model.trophies.filter((trophy) => {
    if (state.kind !== 'all' && trophy.kind !== state.kind) return false;
    if (state.grade !== 'all' && trophy.grade !== state.grade) return false;
    if (query !== '' && isShielded(trophy, state)) return false;
    if (query === '') return true;
    return trophy.name.toLowerCase().includes(query) || trophy.description.toLowerCase().includes(query);
  });
}

/** The head line under the ledger title: what is on, in the order it narrows. */
export function activeFilterSummary(model, state, shown) {
  const parts = [`${shown} of ${model.trophies.length} shown`];
  if (state.kind !== 'all') parts.push(KIND_LABEL[state.kind] || state.kind.toUpperCase());
  if (state.grade !== 'all') parts.push((GRADE_LABEL[state.grade] || state.grade).toUpperCase());
  if (state.q.trim() !== '') parts.push(`SEARCH "${state.q.trim()}"`);
  if (state.spoiler) parts.push('SHIELD ON');
  return parts.join('  \u00b7  ');
}

/** The earned count for a set of trophies. */
export const earnedIn = (trophies, earned) => trophies.filter((trophy) => earned.has(trophy.name)).length;
