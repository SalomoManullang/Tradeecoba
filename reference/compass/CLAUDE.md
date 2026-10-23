# Project notes

## Standalone HTML exports
Whenever the user asks to create or download a standalone HTML version of a page,
**always tell them if the standalone is out of sync with the current design** —
i.e. call out any changes made to the `.dc.html` source since that standalone was
last built, and list what will differ. Offer to rebuild any other standalones that
are also stale.

Existing standalone exports:
- `Order - Standalone.html` ← `Order.dc.html`
- `Standar Stok - Standalone.html` ← `Standard Stock Management.dc.html`
- `Retur - Standalone.html` ← `Retur.dc.html`
- `Business Partner Management - Standalone.html` ← `Business Partner Management.dc.html`

## Design pipeline (skill folder)
The `skill/` folder holds the pipeline files: `para-design.md` (orchestrator) and
stage files `01` to `07`. The user is still developing them and will replace files
and say when they change.

- **When to apply:** for new work (new menus, new products, revamps). Small edits to
  existing pages (a label, a color, one element) stay quick direct changes, with no pipeline.
- **Intake:** run the full Para Design intake each time: project type, scope, route, tracker.
- **Stages:** follow the stage files (01 to 07) only when Para Design's route needs that stage.
- **Checkpoints:** stop and check with the user only at the major ones: brief, blueprint, final review.
- **Language:** write pipeline documents in Bahasa Indonesia.
- **Saving documents:** save them in `skill/`, named as the pipeline says
  (`project-brief-<slug>.md`, `ux-blueprint-<slug>.md`, ...).
- **Existing menus:** treat them as already built. The pipeline applies from the next request on.
- **Conflicts:** treat these files and the earlier guardrail, framework and persona files
  equally. When they disagree, ask the user which one wins.
- **Staying current:** re-read the skill files only when the user says they changed.

## Known pending sync (as of last table typography change)
All four standalones above predate the "table body content = 12px" rule and other
recent edits; they need rebuilding to match.
