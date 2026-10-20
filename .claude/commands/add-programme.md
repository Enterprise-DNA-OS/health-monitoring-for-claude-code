---
description: "Add a test to a group's programme, for a hazard. Audiograms and blood lead in model WHS states take their interval from the law; everything else needs the practitioner's interval (--every, months). --statutory marks monitoring the regulations require (so the regulator duties apply)."
---

# add-programme

Add a test to a group's programme, for a hazard. Audiograms and blood lead in model WHS states take their interval from the law; everything else needs the practitioner's interval (--every, months). --statutory marks monitoring the regulations require (so the regulator duties apply).

Run `node scripts/health.mjs add-programme <group> --test=<test> --hazard=<hazard> [--every=<months>] [--statutory] --actor="<your name>"`. Add `--json` when you need every field. Resolve the worker, employer, group or test by name first; if the CLI says a name is ambiguous, list the candidates and ask. Replace every angle-bracket value with a fact from the records or the operator. Never run a placeholder.

Never invent an interval. The occupational health practitioner sets it (NZ reg 34, AU r 370).
