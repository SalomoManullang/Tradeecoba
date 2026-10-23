# COMPASS Design Framework

A working framework for designing COMPASS screens. Two parts, used in order:

1. **CASTLE** — the pre-design lens. Ask what kind of workplace-software problem this screen solves *before* drawing anything.
2. **The 14 Criteria** — the execution checklist. Apply while designing, then re-run as a self-review before handoff.

CASTLE tells you **what matters**. The 14 criteria tell you **how to build it**. Neither replaces the [COMPASS DLS](https://www.figma.com/design/g0Pu0T8ObmVDWGMlYheMlO/COMPASS-UI-Kit) — components and tokens always come from the Compass UI Kit.

---

## Why this framework exists

COMPASS is workplace software. Its users don't choose it — they're assigned it. That changes what "good design" means:

- Nobody will explore a delightful easter egg. They want to finish the task and move on.
- Nobody will re-learn a pattern you changed. Consistency beats cleverness.
- An error costs real work — a rejected order, a wrong visit plan, a bad master-data record.
- Users satisfice: once they find *a* way to do something, they stop looking for a better way. If the good path isn't obvious on first encounter, it will never be found.

So the goal is not delight. The goal is: **low mental effort, few errors, fast repetition, easy recall.**

---

# Part 1 — CASTLE: The Pre-Design Lens

Source: [NN/g — CASTLE Framework for Workplace Applications](https://www.nngroup.com/articles/castle-framework/) (Page Laubheimer, 2023). CASTLE was published as a *metrics* framework; here it is used upstream, as a set of questions that shape the design brief.

Before opening Figma, answer these six. Write the answers into the design brief — they become the acceptance criteria for the screen.

## C — Cognitive Load
*How much mental effort does this screen demand?*

Ask:
- What must the user hold in working memory while using this screen? Can the screen hold it instead?
- If they get interrupted mid-task, can they resume without starting over?
- Is there any mental math, unit conversion, or code-to-meaning translation happening in the user's head?
- How much pogo-sticking between list and detail does the workflow require?

COMPASS red flags: a detail page that loses the user's place in the list; a status code shown without its label; a filter set that resets on back-navigation; a table with 15 columns where only 4 matter.

Design response: surface context (breadcrumbs, retained filters, sticky row identity), pre-compute derived values, default to the most common configuration.

## A — Advanced Feature Usage
*Will the powerful parts of this screen ever be found?*

Ask:
- Which features here are optional accelerators — bulk actions, saved filters, export, keyboard shortcuts, column config?
- Is each one discoverable *in place*, at the moment it becomes useful? Or is it buried in an overflow menu?
- If a user never discovers it, what slow workaround will they do instead — and how bad is that?

COMPASS red flags: bulk approve hidden behind a kebab menu; export only reachable from a settings page; a saved-filter feature nobody knows exists.

Design response: put accelerators in the action bar where they're visible during the task. Don't rely on onboarding tours to teach them.

## S — Satisfaction
*Not delight — absence of friction.*

Ask:
- Where in this flow is the user most likely to feel frustrated or blocked?
- Are there dead ends — states with no next action?
- Does the system ever make the user wait without telling them why?

COMPASS red flags: an empty state with no CTA; a form that fails validation on submit instead of on blur; a loading state with no indication of progress.

Design response: every state gets an exit. Every wait gets feedback. Every failure gets a fix.

## T — Task Efficiency
*How many steps and how much time to complete the core workflow?*

Ask:
- What is the single most-repeated task on this screen? How many clicks does it take today?
- What is the theoretical minimum number of steps? Where does the design add steps beyond that?
- Is this screen used once a month or 200 times a day? Design density accordingly.

COMPASS red flags: a confirmation dialog on a non-destructive, high-frequency action; a required field that could be defaulted; three clicks to open a filter that's used every session.

Design response: optimize the frequent path ruthlessly. Accept extra friction only on rare or risky actions.

## L — Learnability
*How fast does a new user become productive — and how much do they retain?*

Ask:
- If this screen follows an existing COMPASS pattern, does it follow it *exactly*? Any deviation costs relearning.
- Can a new user complete the primary task without training or documentation?
- After two weeks away, will they remember how?

COMPASS red flags: a table on one module behaving differently from tables on every other module; the same concept named two different things in two screens; an action labeled with an icon whose meaning is product-specific.

Design response: reuse patterns verbatim. New patterns must earn their existence.

## E — Errors
*What can go wrong, and what does it cost?*

Ask:
- What data-entry slips are possible here? What misunderstandings?
- Which actions are irreversible? Which affect other users' work?
- When the system rejects something, does the message name the problem *and* the fix?

COMPASS red flags: delete without confirmation; a validation message that says "Data tidak valid" without saying which field or why; a destructive action styled identically to a safe one.

Design response: prevent first (constrain inputs, disable impossible options), confirm second (for irreversible actions only), recover third (clear, specific, actionable errors).

---

## Weighting the lens

Not all six matter equally on every screen. Pick the two or three that dominate, and let them drive trade-offs:

| Screen type | Dominant CASTLE dimensions |
|---|---|
| High-frequency data entry (Order, Visit Report) | Task Efficiency, Errors |
| Master data / reference lookup (Product Rule, Holiday) | Cognitive Load, Learnability |
| Admin & configuration (Manage Users, Manage Roles) | Errors, Learnability |
| Monitoring & dashboards (Live Visit Tracking) | Cognitive Load, Satisfaction |
| Bulk / batch workflows (Master Call Plan) | Errors, Advanced Feature Usage |

When two dimensions conflict — e.g. Task Efficiency wants fewer confirmations, Errors wants more — resolve in favour of Errors for irreversible actions and Task Efficiency for everything else.

---

# Part 2 — The 14 Criteria: Execution Checklist

Apply while designing. Re-run as a self-review before handoff. Each criterion lists the principle, how it lands in COMPASS specifically, and a concrete do/don't.

---

### 1. Contrast
**Primary content, key data, and the CTA must stand out via size, colour, or whitespace.**

In COMPASS:
- Exactly **one** primary (filled `color/bg/brand` #215aa8) button per screen. Everything else is outline, ghost, or text.
- Page Title is `Headline/Small/Bold` (Plus Jakarta Sans 24px) — the largest thing on the page, no competition.
- KPI/summary values use `Title/Large/Bold` 22px against `Body/Medium/Medium` 14px labels — a 1.5× jump, not a subtle one.
- In tables, the data is the hero. Chrome (borders, sort icons, headers) stays at `neutral/200` weight.

❌ Two filled blue buttons in the action bar.
✅ Primary CTA filled right-aligned; Filter and Export as outline on the left.

**Self-check:** squint at the screen. What do you see first? Is it the thing the user came for?

---

### 2. Figure Clarity
**Foreground (content, CTA) must read as distinctly separate from the background.**

In COMPASS:
- Content cards are `color/bg/secondary` #ffffff on a `color/bg/primary` #f8f9fd page background, with `radius 8px` and the `md` shadow. That contrast is what makes the card read as a figure.
- Modals need a scrim. A modal floating on an unmasked page loses figure/ground entirely.
- Summary stat cards invert the relationship — #f8f9fd cards *inside* the white card. Keep that direction consistent; don't nest white-on-white.

❌ A white content card on a white page with no shadow or border.
✅ White card, `md` shadow, on the #f8f9fd app background.

**Self-check:** in greyscale, is it still obvious where the card ends and the page begins?

---

### 3. Proximity
**Related items sit close together or share a card. Unrelated items are separated.**

In COMPASS:
- The standard 24px gap separates *sections*. Within a section, use 8px or 12px. A 24px gap between a label and its own input signals they're unrelated — wrong.
- Action bar: search, filter, and export are one group (24px between, but visually a left cluster); the CTA is flush right, clearly a different group.
- In forms, the label-input pair is one unit. Error text belongs to that unit (4–8px below the input), not floating in the section gap.
- In detail views, group by meaning — "Informasi Umum" in one card, "Cakupan / Applied Scope" in another. Don't run 20 fields in one undifferentiated list.

❌ Helper text 24px below its input, level with the next field's label.
✅ Input → 4px → helper/error text → 24px → next field.

**Self-check:** cover the labels. Can you still tell which things belong together, from spacing alone?

---

### 4. Similarity
**Elements that behave alike look alike — colour, shape, size, icon.**

In COMPASS:
- Every row-level action button is the same: outline, `Label/Large/SemiBold` 14px, `radius/base` 4px, no icon. If "Detail" looks one way in Manage Users, it looks identical in Product Rule.
- Status pills: one colour vocabulary across the whole product. Green = success/active, red = failed/inactive, amber = pending/warning, grey = draft/disabled. Never reassign these per module.
- Anything clickable looks clickable. If plain text is a link in one table, plain text must not be inert in another.

❌ "Detail" as an outline button on one screen and a blue text link on another.
✅ Same component, same variant, everywhere the same action appears.

**Self-check:** list every interactive element type on the screen. Does each visual treatment map to exactly one behaviour, and vice versa?

---

### 5. Alignment
**Everything snaps to the grid. Headings, inputs, and CTAs align vertically and horizontally. Text alignment is consistent across screens and states.**

In COMPASS:
- One left edge for the whole content column: 24px inset from the card, which is itself inset in the page. Page Title, action bar, table, and pagination all share it.
- Table columns: text left-aligned, numbers right-aligned, status/action centered — and that rule holds on **every** table in the product.
- Column headers align with their cell content. A right-aligned numeric column gets a right-aligned header.
- Form labels: pick top-aligned or left-aligned once, per the DLS, and never mix within a screen.

❌ Numbers left-aligned in one table and right-aligned in the next.
✅ Numeric columns right-aligned product-wide, decimals lined up.

**Self-check:** drop vertical guides at each element's left edge. How many distinct guides are there? It should be very few.

---

### 6. Consistency
**Visual language, type scale, colour roles, spacing, iconography, and copy terms stay consistent across screens and states.**

In COMPASS:
- Typography is Plus Jakarta Sans for the Page Title only; **Lato for everything else.** This is deliberate — don't "fix" it.
- Spacing comes from the token scale (8 / 10 / 12 / 16 / 24). No 13px, no 22px gaps.
- **Copy terms are part of consistency.** Pick one Indonesian term per concept and use it everywhere: "Ubah" not "Edit" *and* "Ubah"; "Hapus" not "Delete"; "Simpan" not "Save". Same for column headers — "Update Terakhir" formatted as `15 Apr 2026, 08:00`, everywhere, no author suffix.
- Table structure: `No | [data columns] | Action`. No checkbox column unless the brief explicitly calls for bulk selection.
- Pagination is always the DLS `PaginationHelpers` + `PageNumbers` components. Never custom-built.

❌ "Tambah Data" on one screen, "Buat Baru" on the next, for the same action.
✅ One term per concept, locked into a shared glossary.

**Self-check:** open the two nearest sibling screens. Any difference you can spot that isn't intentional is a defect.

---

### 7. Accessibility
**Sufficient contrast between text and background — especially for status messages and small text.**

In COMPASS:
- Body text 16px and below needs **4.5:1** minimum. Large text (18.66px bold / 24px regular) needs **3:1**. Non-text UI — borders, icons, focus rings — needs **3:1**.
- Reserve low-contrast greys for genuinely inert content like input placeholders — never for helper text, error messages, or disabled labels the user must comprehend.
- Status pills are the most common failure: pale tint background with a mid-tone text colour. Check every one.
- Never encode meaning in colour alone. A red pill needs a label; a red input border needs an error message.
- Interactive targets: 44×44px minimum. Icon-only buttons must have accessible labels.
- Every interactive element needs a visible focus state. Keyboard order follows visual order.

❌ Amber #F5A623 status text on a #FEF6E7 pill (≈1.9:1).
✅ Darkened amber text on the tint, verified ≥4.5:1, plus a text label.

**Self-check:** run every text/background pair through a contrast checker. Not eyeball — measure.

---

### 8. Style Cohesion
**Reuse colours, type, icon style, and card shells to build recognition — while allowing small, purposeful variation to avoid monotony.**

In COMPASS:
- The card shell (#ffffff, `radius 8px`, `md` shadow, 24px padding) is the recurring motif. It makes any screen instantly recognisable as COMPASS.
- Purposeful variation earns its place: the #f8f9fd summary stat card differentiates aggregate data from row data. That's meaning, not decoration.
- Icons: one family, one stroke weight, one corner treatment. Don't mix outline and filled arbitrarily — pick a rule (e.g. filled = active/selected state, outline = default) and hold it.
- Blue #215aa8 is the action colour. Don't spend it on decoration, or it stops meaning "act here."

❌ A gradient header on one module because it "needed some life."
✅ Differentiate by content density and card grouping, not by inventing new surface styles.

**Self-check:** screenshot this screen next to three other COMPASS screens. Does it look like the same product without looking like a carbon copy?

---

### 9. Iconography
**Icons stay recognisable across sizes and themes.**

In COMPASS:
- Standard sizes: 18px inline (buttons, inputs, table cells), 16px for compact metadata, 24px for standalone. Don't scale an 18px icon to 12px — strokes collapse.
- At 16px, an icon must still read. Detailed multi-element glyphs don't survive; simplify or use a different icon.
- Icons never carry meaning alone unless universally understood (search, close, chevron, plus, calendar). Everything else gets a text label — see criterion 12.
- Icon colour follows text colour in the same context, so contrast rules carry over.

❌ A custom "master data sync" glyph at 14px with four internal details.
✅ 18px icon + text label; simple silhouette that survives downscaling.

**Self-check:** view at 50% zoom. Still identifiable? Now view in greyscale. Still distinguishable from its neighbours?

---

### 10. Continuity
**The eye follows a smooth reading path — F or Z pattern.**

In COMPASS:
- Standard COMPASS page flow: sidebar (left, persistent) → top nav → Page Title → summary (if present) → action bar → table → pagination. Top-left to bottom-right, no backtracking.
- Action bar reads left-to-right as *narrow the data* (search → filter → export) and terminates at the right edge with *do the thing* (CTA). That's a Z.
- In tables, the identifying column comes first and the action column last — the eye scans across the row and lands on what it can do.
- In forms, one column beats two. A two-column form forces the eye to zigzag and makes tab order ambiguous.

❌ The primary CTA parked at bottom-left, below the fold.
✅ CTA at the terminus of the natural reading path, above the fold.

**Self-check:** trace your own eye path with a finger. Any doubling back or hunting is a break in continuity.

---

### 11. Minimalism
**Only task-relevant elements remain. Remove redundant labels and decorative separators.**

In COMPASS:
- Every table column must justify itself. A 15-column table where 11 matter should show 11 by default and put the rest behind column config — not force horizontal scrolling on everyone.
- Whitespace and the card shell already do the separating. Adding divider lines between elements that are already 24px apart is redundant.
- Don't label the obvious. A search input with a magnifier icon and "Search" placeholder doesn't also need a "Search:" label above it.
- Remove decorative illustrations from operational screens. Keep them for empty and error states — and there, use the **greyscale** variant, not the colourful one.

❌ A section header, a divider rule, *and* a 24px gap, all separating the same two blocks.
✅ Pick one separation mechanism. Usually whitespace is enough.

**Self-check:** remove one element. Is the screen worse? If not, it stays removed. Repeat.

---

### 12. Recognition Over Recall
**Labels and important information are visible, not hidden behind hover or long-press. Icons carry text where meaning isn't universal.**

In COMPASS:
- Critical information never lives in a tooltip. Tooltips supplement; they don't inform. Desktop-only hover also excludes touch and keyboard users.
- Row actions: if there's one primary action, show it as a visible button ("Detail"). Only overflow *secondary* actions into a kebab menu.
- Applied filters must be visible as removable chips. "Filter (3)" tells the user filters exist but not what they are — that's recall.
- Show the current state explicitly: which page, which sort, which tab, which record. Don't make the user reconstruct it.
- Dropdowns beat free-text when the valid set is known and small. Recognition beats recall, and it prevents errors.

❌ Truncated cell text whose full value only appears on hover.
✅ Cells wrap to show full content — COMPASS rows expand rather than truncate.

**Self-check:** disable hover. Is any information now unavailable? If yes, it's mis-placed.

---

### 13. Feedback / States
**Loading, progress, success, error, and disabled states are timely, legible, and visually distinct. Status messages use plain language and clear hierarchy.**

In COMPASS, every screen ships with all applicable states designed — not just the happy path:

| State | Requirement |
|---|---|
| **Default / populated** | The normal case |
| **Loading** | Skeleton for content areas; spinner in-button for actions. Any wait >1s gets feedback; >10s gets progress or an estimate |
| **Empty (no data yet)** | Illustration + explanation + a CTA to create the first record |
| **Empty (no search results)** | Greyscale illustration + "clear filters" affordance. Distinct from no-data-yet |
| **Error** | What failed, why, and what to do — plus a retry |
| **Success** | Confirmation the action landed. Toast for transient, `Alert` for persistent |
| **Disabled** | Visually distinct *and* explained. Never disable something without saying why |
| **Hover / focus / active** | Every interactive element, all three |

- Feedback appears where the user is looking. A toast in the top-right after clicking a button at the bottom-left will be missed.
- Plain Indonesian. "Data pesanan gagal disimpan karena stok tidak mencukupi" — not "Error 422: Unprocessable Entity."
- `Alert` for inline persistent messages; `Toast` for transient. Don't swap them.

❌ A disabled "Simpan" button with no indication of what's blocking submission.
✅ Disabled button plus inline text naming the unmet condition.

**Self-check:** list every state this screen can enter. Is each one designed, or are some "the developer will figure it out"?

---

### 14. Error Prevention
**Destructive actions are visually clear. Risky steps confirm or validate intent. Error messages state the problem and provide a clear fix.**

In COMPASS, in priority order:

**1. Prevent.** Constrain before you validate. Date pickers instead of typed dates. Dropdowns instead of free text. Disable options that are invalid in the current context. Set sensible defaults.

**2. Validate early.** On blur, not on submit. Telling someone about a bad field after they've filled fourteen more is a Cognitive Load failure as much as an Errors one.

**3. Confirm — but only when it matters.** Confirmation dialogs on frequent, reversible actions are pure friction and train users to click through. Reserve them for irreversible or wide-blast-radius actions. When you do confirm:
   - Name the specific object: "Hapus role *Supervisor Area*?"
   - State the consequence: "3 pengguna akan kehilangan akses ini."
   - Label the button with the verb — "Hapus", not "OK".
   - Destructive confirm button is red; Cancel is the safe default and gets initial focus.

**4. Make destructive actions look destructive.** Red or clearly differentiated, never adjacent to a same-styled safe action, never the default focus target.

**5. Recover.** Every error message: what happened, why, how to fix it. Preserve the user's input — never clear a form on a failed submit. Offer undo where technically possible; undo beats confirmation for reversible actions.

❌ "Data tidak valid" as a generic toast after submitting a 20-field form.
✅ Field-level inline errors on blur, naming each problem and its fix, with the form state preserved.

**Self-check:** for each action, ask "what's the worst outcome if the user does this by mistake, and how does the design make that mistake unlikely?"

---

# Pre-Handoff Review

Run both parts before handing off. A screen isn't done until every row passes.

## CASTLE brief check

| | Question | ✓ |
|---|---|---|
| C | Is working memory held by the screen, not the user? | ☐ |
| A | Are optional accelerators discoverable in place? | ☐ |
| S | Does every state have a next action? | ☐ |
| T | Is the most-frequent task at its minimum step count? | ☐ |
| L | Does this follow existing COMPASS patterns exactly? | ☐ |
| E | Is every irreversible action prevented, confirmed, or undoable? | ☐ |

## 14-criteria check

| # | Criterion | ✓ |
|---|---|---|
| 1 | Contrast — one clear primary action, key data dominant | ☐ |
| 2 | Figure clarity — foreground separates from background | ☐ |
| 3 | Proximity — spacing groups related, separates unrelated | ☐ |
| 4 | Similarity — same behaviour, same appearance | ☐ |
| 5 | Alignment — one grid, consistent text alignment | ☐ |
| 6 | Consistency — tokens, type, icons, and copy terms match siblings | ☐ |
| 7 | Accessibility — contrast measured, not eyeballed | ☐ |
| 8 | Style cohesion — recognisable, variation is purposeful | ☐ |
| 9 | Iconography — legible at 16px, labelled where ambiguous | ☐ |
| 10 | Continuity — smooth F/Z path, no backtracking | ☐ |
| 11 | Minimalism — nothing on screen that isn't earning its place | ☐ |
| 12 | Recognition — nothing critical hidden behind hover | ☐ |
| 13 | Feedback/states — all states designed, plain-language copy | ☐ |
| 14 | Error prevention — destructive actions clear, errors actionable | ☐ |

---

# Reference Anchors

Design decisions are sourced from the DLS, not improvised. Quick pointers:

**Figma file key:** `g0Pu0T8ObmVDWGMlYheMlO` — [Compass UI Kit](https://www.figma.com/design/g0Pu0T8ObmVDWGMlYheMlO/COMPASS-UI-Kit)

**Core tokens**

| Token | Value | Use |
|---|---|---|
| `color/bg/primary` | `#f8f9fd` | App background, summary stat cards |
| `color/bg/secondary` | `#ffffff` | Content cards, table cells, inputs |
| `color/bg/brand` | `#215aa8` | Primary CTA, active pagination |
| `color/text/primary` | `#2a3d4a` | All primary text |
| `color/text/inverse` | `#ffffff` | Text on brand fills |
| `color/text/disabled` | `#999999` | Placeholders, inert content |
| `color/border/default` / `neutral/200` | `#d6d6d6` | Borders, dividers |
| `radius/base` | `4px` | Buttons, inputs |
| Card radius | `8px` | Content and summary cards |
| Section spacing | `24px` | Between sections, card padding |

**Typography** — Plus Jakarta Sans Bold 24px for Page Title; Lato for everything else (`Title/Large/Bold` 22px, `Title/Medium/SemiBold` 16px, `Body/Large/Regular` 16px, `Body/Medium/Regular` 14px, `Label/Large/SemiBold` 14px).

**Companion skills** — `compass-dls` (component and token lookup), `compass-content` (table screens), `compass-sidebar`, `compass-navigation-top`, `page-composition` (full-page assembly).

Component-level and screen-level conventions live in those references. This framework governs the *reasoning*; they govern the *specification*.

---

*Sources: 14 design criteria (internal COMPASS review framework) · [CASTLE Framework for Productivity/Workplace Applications](https://www.nngroup.com/articles/castle-framework/), Page Laubheimer, Nielsen Norman Group, 2023.*
