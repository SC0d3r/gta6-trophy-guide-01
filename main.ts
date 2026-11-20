// A working gta6-trophy-guide-01 entry (Node 22, standard library only): the guide is this directory's app/ folder,
// plain static files a browser opens at app/index.html (ES modules, CSS, no build step), offline: it loads nothing
// over the network, and its trophy list and guides are app/data/trophies.json. The program hands it in: it copies app/
// and screenshots/ from beside this file to /output and writes /output/dossier.json, the summary the judge reads (your
// screenshots, the first load's files and bytes, and your source), with the vendored make.fun library. Leave
// vendor/makefun-frontend.ts as it is: the scorer requires dossier.json to be byte for byte what its own copy writes.
//
// Serve it locally with `node serve.ts`, then open http://localhost:8080.
// Outside the grader's container, MAKEFUN_OUTPUT_DIR stands in for /output:
//   mkdir -p out && MAKEFUN_OUTPUT_DIR=out node main.ts

import { cpSync, existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildDossier } from './vendor/makefun-frontend.ts';

const here = fileURLToPath(new URL('.', import.meta.url));
const out = process.env.MAKEFUN_OUTPUT_DIR ?? '/output';

// The judge reads the ledger as the entry's guide, so refuse to package a short or empty one.
const trophyPath = join(here, 'app/data/trophies.json');
let trophyDoc;
try {
  trophyDoc = JSON.parse(readFileSync(trophyPath, 'utf8'));
} catch (error) {
  console.error(`Cannot read ${trophyPath}: ${error instanceof Error ? error.message : String(error)}`);
  process.exit(1);
}
const trophies = Array.isArray(trophyDoc?.trophies) ? trophyDoc.trophies : [];
const guides = trophies.filter(
  (trophy) => typeof trophy?.guide === 'string' && trophy.guide.trim() !== '' && !/guide in progress/i.test(trophy.guide)
).length;
if (trophies.length !== 55) {
  console.error(`Refusing to package: app/data/trophies.json has ${trophies.length} trophies, want 55.`);
  process.exit(1);
}
if (guides !== 55) {
  console.error(`Refusing to package: ${guides} of ${trophies.length} trophies have a nonblank guide, want 55.`);
  process.exit(1);
}

mkdirSync(out, { recursive: true });
cpSync(join(here, 'app'), join(out, 'app'), { recursive: true });
mkdirSync(join(out, 'screenshots'), { recursive: true });
if (existsSync(join(here, 'screenshots'))) cpSync(join(here, 'screenshots'), join(out, 'screenshots'), { recursive: true });

// The scorer's own caps (reference/gate.json): only text_max_bytes shapes the bytes; the others refuse an entry the
// scorer would refuse (more than 4 screenshots or one over 256 KiB; more than 993 files and directories in app/ or
// 48 MiB of app files: app/ counts beside /output's own 1000-entry cap, its screenshots/ and dossier.json).
writeFileSync(
  join(out, 'dossier.json'),
  buildDossier(out, { text_max_bytes: 163840, screenshots: { max: 4, max_bytes: 262144 }, app_max_files: 993, app_max_bytes: 50331648 }),
);
