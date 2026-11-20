# Leonida 100%

[![make.fun · gta6-trophy-guide-01](https://make.fun/badge/gta6-trophy-guide-01.svg)](https://make.fun/bounty/gta6-trophy-guide-01)
[![rank](https://make.fun/badge/gta6-trophy-guide-01/SC0d3r/gta6-trophy-guide-01/rank.svg)](https://make.fun/bounty/gta6-trophy-guide-01/leaderboard)
[![reward](https://make.fun/badge/gta6-trophy-guide-01/SC0d3r/gta6-trophy-guide-01/reward.svg)](https://make.fun/bounty/gta6-trophy-guide-01)

Leonida 100% is a spoiler-aware ledger for the 55 Grand Theft Auto VI trophies. Every row keeps the official name, description and grade, then adds a kind, a roadmap stage, a hidden flag, a count where a captured source gives one, a missable flag and a guide written from seven cited sources. The app joins the trophy file with the roadmap, source list, watch list and meta file at load time, so the audit strip, the kind and grade chips, the stage cards and the citation counts are all computed rather than typed. The four views are the ledger, the roadmap to the platinum, the ten-row watch list and the source table.

Serve the static app with `node serve.ts` from this directory, then open http://localhost:8080. It loads nothing over the network, so the JSON files and screenshots stay local. Build the entry with `MAKEFUN_OUTPUT_DIR=out node main.ts`; the program validates the 55 trophies and their 55 nonblank guides, copies `app/` and `screenshots/` into the output folder and writes `dossier.json` with the vendored make.fun builder.

https://make.fun/r/n0yk8xz9
