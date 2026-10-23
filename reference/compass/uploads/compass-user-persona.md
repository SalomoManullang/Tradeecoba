# COMPASS User Persona Guideline

Who actually uses COMPASS, what they are trying to get done, and what that means for the screen you are about to design.

Use this **before** you draw anything — alongside the [CASTLE lens](compass-design-framework.md) in the COMPASS Design Framework. CASTLE asks *what kind of workplace problem is this?* This document asks *whose problem is it?* Components and tokens still come from the [COMPASS UI Kit](https://www.figma.com/design/g0Pu0T8ObmVDWGMlYheMlO/COMPASS-UI-Kit).

---

## How to use this document

1. **Name the primary persona** for the screen. One primary. Write it in the design brief.
2. **Name the secondary persona(s)** who will also open this screen — they get accommodated, not optimised for.
3. Read that persona's **Design implications** and **Anti-patterns** sections. Those are your acceptance criteria.
4. When a business rule and a user need collide, use **Part 3 — Resolving the tension**.
5. Before handoff, run the **Persona check** at the end.

> A screen designed for "the user" is a screen designed for nobody. In COMPASS, an admin doing her 40th record of the morning and a director opening the same module once a quarter are not the same person and must not get the same screen.

---

## Part 0 — Framing: roles, not demographics

COMPASS is **assigned software**, not chosen software. Nobody signs up. Nobody churns. That changes what a persona is for.

In enterprise applications, users are defined primarily by **role and responsibility**, not by age, income, or lifestyle. Demographics are low-value here; what matters is:

- **What decision or transaction is this person accountable for?**
- **What happens to them if the data is wrong?**
- **How often do they come back, and for how long?**
- **Who is downstream of their action?**

So each persona below is written as a **role archetype + jobs-to-be-done**, with just enough human texture to build empathy — not a marketing bio. Names are illustrative placeholders so the team can say "would Sisca understand this label?" in a review.

**Status: these are proto-personas.** They are built from role definitions, module scope, and industry research — not yet from interviews with real COMPASS users. Treat them as a shared hypothesis. See **Part 6 — Validation backlog**.

---

## Part 1 — The five COMPASS personas

| # | Persona | Archetype | Share of total sessions | Session length |
|---|---------|-----------|------------------------|----------------|
| P1 | Admin Operasional | The Operator | Highest — all day, every day | Long (30–120 min) |
| P2 | Frontliner Captain / Manager | The Exception Hunter | High — several times daily | Short bursts (2–10 min) |
| P3 | Finance / Controller | The Verifier | Medium — daily to weekly cycles | Medium, deep focus (15–45 min) |
| P4 | Manager / Process Owner | The Steerer | Medium — weekly / monthly rhythm | Medium (10–30 min) |
| P5 | Top Management | The Glancer | Lowest — occasional, event-driven | Very short (<2 min) |

Plus one persona who never logs in but is affected by every decision — see **P6, the shadow user**.

---

### P1 — Admin Operasional · *"Sisca"*
**Archetype: The Operator.** COMPASS is her workplace, not her tool.

**Role.** Maintains the data the whole system runs on. Creates and deactivates users, assigns roles, maintains master data (product rules, holidays, outlets, territories), enters and corrects batch records, prepares plans for approval, fixes what other people got wrong.

**Jobs to be done**
- *When a new hire starts, I want to get their account and access right the first time, so I don't get a ticket tomorrow.*
- *When I have 200 rows to enter before the cut-off, I want to move without stopping, so I finish before end of day.*
- *When someone reports bad data, I want to find and correct the record quickly, so the downstream report is right.*

**Goals**
- Finish the batch. Zero rework.
- Never be the reason a report is wrong.
- Not have to remember which of the eight modules holds the thing she needs.

**Pain points**
- Repetitive entry with no bulk action, no duplicate, no template.
- Validation errors that appear only after submit, with a message that names a field she can't see.
- Filters and scroll position that reset every time she returns from a detail page.
- Bulk actions hidden in an overflow menu she never opens.
- No way to undo. So she works slowly and defensively instead of fast.

**Profile**
- **Frequency:** continuous. She has COMPASS open all day.
- **Expertise:** very high in COMPASS mechanics, moderate in business strategy. She knows the click path better than the reason for it.
- **Data literacy:** high for records and fields, low for analytics.
- **Stakes per action:** low individually, **high in aggregate** — errors compound silently across hundreds of records.
- **Context:** desktop, dual monitor or a single 1366–1440px laptop, often with an Excel file open beside COMPASS as the source of truth.
- **Emotional state:** time-pressured, interruption-prone, blamed when things break.

**Design implications**
- **Optimise for repetition, not first use.** She will do this 500 times. Save her two seconds and you have saved her half an hour a week.
- **Density is a feature.** She wants more rows per screen, not more whitespace. Compact table rows, no oversized cards.
- **Accelerators go in the action bar**, visible during the task — bulk edit, bulk approve, export, duplicate, import. Never in a kebab menu only.
- **Preserve state.** Filters, sort, page number, and scroll position survive detail navigation and back-nav.
- **Validate inline, at field blur.** Never let her discover an error only at submit.
- **Errors must name the record and the field**, in Indonesian, and link to it. `"Baris 12 — NIK sudah terdaftar"` beats `"Data tidak valid"`.
- **Defaults do the work.** Pre-fill the most common configuration; make the happy path the zero-decision path.
- **Undo over confirm.** Confirm dialogs on frequent actions become muscle memory and stop working. Reserve modals for genuinely destructive, irreversible acts.
- **Keyboard path for the full flow**: tab order matches visual order, Enter submits, Esc closes.

**Anti-patterns for P1**
- Wizards for a task she does daily.
- A confirmation dialog on every save.
- Whitespace-heavy "beautiful" layouts that halve her rows per screen.
- Onboarding tours as the only way to learn bulk actions.

---

### P2 — Frontliner Captain / Manager · *"Bayu"*
**Archetype: The Exception Hunter.** He doesn't want the data. He wants to know what's *wrong*.

**Role.** Runs a field team — frontliners, promotors, BAs, sales. Builds and adjusts visit plans, monitors execution live, reviews visit reports and orders, approves or rejects, coaches people who are off-plan.

**Jobs to be done**
- *When I start my day, I want to see who is off-plan right now, so I can intervene before the day is lost.*
- *When I review yesterday's reports, I want to approve the normal ones in bulk and spend my attention on the odd ones.*
- *When I plan next month's coverage, I want to see last month's actual, so I plan against reality.*

**Goals**
- Team hits coverage and target.
- Spot the deviation early, not in next week's report.
- Spend his limited desk time on exceptions, not on scanning.

**Pain points**
- A table of 300 rows where 6 matter and nothing tells him which 6.
- Data that is a day old when he needs it now.
- Summary numbers he can't drill into to find the person behind them.
- Having to check three modules to reconstruct one person's day.
- Approve/reject buried one detail-page deeper than it needs to be.

**Profile**
- **Frequency:** many short visits per day — morning check, midday check, end-of-day approvals.
- **Expertise:** high domain knowledge, medium system fluency. He learned COMPASS on the job.
- **Data literacy:** comfortable with KPIs, targets, and percentages. Not an analyst.
- **Stakes per action:** medium — a wrong rejection wastes a frontliner's day; a missed deviation costs coverage.
- **Context:** laptop, frequently mobile — car, distributor office, back room of a store. Variable connectivity. Sometimes on a phone in a pinch.
- **Emotional state:** accountable for people he can't see. Wants reassurance, then wants to act.

**Design implications**
- **Lead with exceptions, not with a full list.** The default view is "what needs you" — off-plan, overdue, pending approval, anomalous. Full list is one click away, not the entry point.
- **KPI summary must drill down.** Every number on a summary card is a filter into the rows behind it. A number he can't click is a number he can't act on.
- **Freshness is content.** Show `Diperbarui 5 menit lalu` next to live data. Ambiguity about recency destroys trust in the whole screen.
- **Status must be legible without a legend** — pill + label text, never colour alone. Use the DLS status pill set consistently across modules.
- **Approve/reject reachable from the list row**, with detail-on-demand. Batch approve for the normal cases, single review for the flagged ones.
- **Reason is required on reject, optional on approve.** The rejected frontliner needs to know why.
- **Degrade gracefully at narrow widths.** He will open this on a laptop at 1366px in a car. Frozen first column + horizontal scroll on wide tables; never a layout that breaks.
- **Person-centric drill path.** From any anomaly he should reach *that person's* day in one step.

**Anti-patterns for P2**
- A dashboard that shows totals but not who is behind them.
- Requiring him to configure filters before seeing anything useful.
- Real-time-looking data with no timestamp.
- Rejection with no comment field.

---

### P3 — Finance / Controller · *"Rina"*
**Archetype: The Verifier.** Her job is to not be wrong, and to be able to prove it.

**Role.** Validates transactions and claims, reconciles COMPASS figures against source systems, approves against policy and threshold, produces the numbers other people commit to, answers to audit.

**Jobs to be done**
- *When I review a batch, I want to see exactly what changed and who changed it, so I can sign off with evidence.*
- *When a total looks wrong, I want to trace it to the records that produced it, so I can explain the variance.*
- *When audit asks about a decision from four months ago, I want to retrieve the trail without asking IT.*

**Goals**
- The numbers tie out.
- Every figure is explainable and every action attributable.
- Approvals follow the delegation-of-authority rules without her policing them manually.

**Pain points**
- A number with no visible basis — she cannot tell if it includes tax, cancellations, or the adjusted rows.
- Silent edits: a record changed and nothing records who or when.
- Export that doesn't match the screen — different filters, different rounding, different row count.
- Fragmented workflow — COMPASS, ERP, spreadsheet, email approval, none of them agreeing.
- Being forced through the same heavy approval flow for a Rp 50,000 item as for a Rp 500,000,000 one.

**Profile**
- **Frequency:** rhythmic — daily verification, heavy at period close.
- **Expertise:** very high in numbers and policy, medium in COMPASS navigation.
- **Data literacy:** the highest of all personas. Reads tables natively, prefers precision over prettiness.
- **Stakes per action:** **highest per record.** A wrong approval is a real financial and compliance event.
- **Context:** desktop, long focused sessions, usually with a spreadsheet and the ERP open in parallel. She reconciles across windows.
- **Emotional state:** deliberate, sceptical by profession. She will not trust a screen that hides its work.

**Design implications**
- **Show the basis of every number.** Totals state their scope: `Total 4.320 order · filter: Juli 2026, Region Jawa Barat, exclude cancelled`. Derived values expose their formula on hover or in detail.
- **Audit trail is a first-class UI element**, not a hidden log. Who, what changed, from → to, when, and why. Visible on the record, not only in a system table.
- **Export mirrors the screen exactly** — same filter, same rows, same order — and the export file states the applied filters and generation timestamp in its header.
- **Never auto-refresh under her cursor.** Mid-review data shifts are worse than stale data. Offer a manual `Muat ulang` with a "data baru tersedia" hint.
- **Risk-tiered friction.** Low-value, low-risk items get a light path; high-value or exception items get the full review. Uniform friction is the enemy of both speed and control.
- **Irreversible or high-value actions get real confirmation** — restate the amount and count in the dialog, and require a reason. This is the one persona where a confirm modal is genuinely earned.
- **Precision is explicit.** Currency format, decimal places, and rounding rules stated and consistent. Never let two screens round the same figure differently.
- **Counts alongside sums, always.** `Rp 1,2 M · 340 transaksi` — a sum without a count is unverifiable.

**Anti-patterns for P3**
- Abbreviated figures (`1,2 M`) as the *only* representation, with no exact value available.
- Approve buttons with no record of who clicked them.
- A dashboard that "helpfully" rounds or estimates.
- Bulk approve with no per-item visibility.

---

### P4 — Manager / Process Owner · *"Dimas"*
**Archetype: The Steerer.** He is asking "how are we doing, and what should change?"

**Role.** Owns the business outcome of a module or region — coverage, productivity, order value, compliance. Sets targets, reviews performance, escalates, reports upward. Uses COMPASS to answer questions, not to transact.

**Jobs to be done**
- *When I prepare the weekly review, I want performance against target by region, so I can name what's working.*
- *When a number moves, I want to find the segment driving it, so my explanation is real and not a guess.*
- *When I present to management, I want to take the view with me, so I'm not rebuilding it in Excel at 11pm.*

**Goals**
- Understand performance without becoming an analyst.
- Find causes, not just symptoms.
- Report upward with confidence and evidence.

**Pain points**
- Dashboards too shallow to act on and too deep to skim — the classic one-size-fits-all failure.
- No comparison. A number with no target and no previous period is not information.
- Cannot get from an aggregate to the segment or record that explains it.
- The filter combination he needs every week is not saveable, so he rebuilds it every week.
- The view he needs isn't exportable in any form he can put in a deck.

**Profile**
- **Frequency:** weekly and monthly rhythm, spiking at period close and review meetings.
- **Expertise:** high domain, medium system. Delegates the doing; he needs the seeing.
- **Data literacy:** comfortable with trends, targets, and segmentation. Not comfortable with raw joins or pivot logic.
- **Stakes per action:** medium-high — his read of the data becomes someone's decision.
- **Context:** desktop, sometimes projected in a meeting room. Occasionally reviewing on a tablet before a meeting.
- **Emotional state:** needs to look prepared. Fears being surprised by a number in front of his boss.

**Design implications**
- **Three-layer hierarchy on every analytical screen:** summary → segment → record. He must be able to walk down and back up without losing his place.
- **Every KPI carries context**: value + comparison (vs target, vs previous period) + direction. A bare number is a question, not an answer.
- **Time range is a persistent, prominent control** — and it persists across navigation within the module.
- **Surface the movers.** "Top 5 naik / turun" does more for him than a perfectly rendered chart of everything.
- **Saveable views.** The filter set he uses every Monday should be one click, not eleven.
- **Export the view, not the raw table** — a chart image or a formatted summary he can drop into a deck.
- **Plain-language labels.** He knows the business; he does not know your field names. `Kunjungan efektif` not `eff_visit_cnt`.
- **Consistent metric definitions across modules.** If "coverage" means two things in two screens, he will stop trusting both.

**Anti-patterns for P4**
- A chart with no target line.
- Drill-down that opens a new page and loses the filter context.
- Metric names that differ between the dashboard and the report.
- Forcing him into the P1 transactional table to answer a P4 question.

---

### P5 — Top Management · *"Ibu Ratna"*
**Archetype: The Glancer.** Thirty seconds, once in a while, often with an audience.

**Role.** Director / BOD level. Does not operate COMPASS. Opens it to sense the state of the business, to check a claim someone made, or because it's on screen in a meeting.

**Jobs to be done**
- *When I open this, I want to know if anything is off, so I know what to ask about.*
- *When someone reports a number in a meeting, I want to see it myself, so the discussion moves on facts.*

**Goals**
- Confidence that the business is on track — or a clear flag that it isn't.
- No embarrassment in front of a room.

**Pain points**
- Login and navigation friction — three clicks and she has given up and asked someone to screenshot it.
- Internal jargon and unexplained acronyms.
- A wall of operational detail with no interpretation.
- No sense of *when* the data is from, so she can't tell if it reflects this morning.

**Profile**
- **Frequency:** occasional, event-driven — board prep, a rumour, a bad month.
- **Expertise:** very high business judgement, **low system fluency and low patience for learning it.**
- **Data literacy:** high conceptually, low tolerance for interaction. She reads, she does not configure.
- **Stakes per action:** she rarely acts *in* the system; her stake is in forming a correct impression.
- **Context:** laptop or tablet, often mid-meeting, sometimes projected. Occasionally a phone.
- **Emotional state:** time-scarce, and unwilling to look uncertain in public.

**Design implications**
- **The whole screen must be absorbable in about 30 seconds** with no interaction. If understanding requires a click, it fails for her.
- **Five top-level metrics maximum.** Everything else is one optional level down.
- **State, then explanation.** `Coverage 87% — di bawah target 92%` reads correctly to her; `87%` alone does not.
- **Status by colour *and* icon *and* word.** Never colour alone — for accessibility and for projector/print legibility.
- **`Data per 29 Jul 2026, 09:00 WIB`** on every executive view. Non-negotiable.
- **Plain Indonesian, zero acronyms** unless universally known internally. Expand on first use.
- **Bigger type, higher contrast** than the operational screens. Assume a projector and a back row.
- **Print / screenshot friendly.** She will screenshot it into WhatsApp. Make sure that image still makes sense — labels visible, no cut-off legends, no hover-dependent meaning.
- **Drill-down exists but is never required.** She may hand off to P4 to go deeper.

**Anti-patterns for P5**
- A dashboard requiring filter setup before it shows anything.
- Meaning encoded only in hover tooltips.
- Sparkline-dense "analyst" layouts.
- An empty state that says "select a period to begin."

---

### P6 — The Shadow User · *the frontliner in the field*
**Archetype: The Affected.** Never logs into COMPASS. Lives with everything COMPASS decides.

The frontliner, promotor, or BA whose visit plan is built in COMPASS, whose report is approved or rejected in COMPASS, and whose day is shaped by a table someone else edited. They usually experience COMPASS through a mobile app (Nova) or through their supervisor.

**Why they belong in this document:** most COMPASS screens are *authoring tools for someone else's day.* A design decision that makes P1's data entry two seconds faster but produces an unrealistic route costs P6 an hour of driving.

**Design implications**
- **Show the downstream consequence at the point of authoring.** When a plan is built, show the resulting load: how many visits, how far, is it feasible.
- **Rejection reasons are messages to a real person.** Require them, and make the field big enough to hold a sentence.
- **Never design a control whose only effect is to make P6's life harder** in exchange for a marginal reporting convenience.
- **Ask, for every screen: who receives the output of this action, and do they know why?**

---

## Part 2 — Comparison matrix

| Dimension | P1 Admin | P2 Captain | P3 Finance | P4 Manager | P5 Top Mgmt |
|---|---|---|---|---|---|
| **Primary need** | Throughput | Exceptions | Verifiability | Explanation | Assurance |
| **Frequency** | Continuous | Many/day | Daily–cyclical | Weekly | Occasional |
| **Session length** | Long | Very short | Long, focused | Medium | <2 min |
| **System fluency** | Very high | Medium | Medium | Medium | Low |
| **Data literacy** | Record-level | KPI-level | Highest | Trend-level | Conceptual |
| **Preferred density** | Dense | Medium | Dense | Medium | Sparse |
| **Tolerance for clicks** | Very low | Very low | Medium | Medium | Near zero |
| **Tolerance for friction on write** | Low | Low | **High, if justified** | n/a | n/a |
| **Stakes per action** | Low each, high in aggregate | Medium | Highest | Medium-high | Indirect |
| **Optimise for** | Repetition | Triage | Traceability | Comparison | Glance |
| **Entry point** | Full list | Exception list | Pending queue | Summary + target | Headline state |
| **Killer failure** | Lost work / rework | Missed deviation | Untraceable change | No comparison | Needs a click to understand |
| **Screen archetype** | Table + bulk actions | KPI + exception feed | Queue + audit detail | Dashboard + drill | Executive summary |

---

## Part 3 — Resolving the tension: business excellence ↔ user-centric

COMPASS exists to enforce process. Its users want to move fast. That conflict is the real design work.

**The reframe:** these are not opposite ends of one slider. A control that people route around delivers *neither* compliance nor usability. The genuine trade-off is not *control vs. speed* but **where control is placed** — and the best answer is almost always "earlier, lighter, and closer to the moment of the mistake."

### Five recurring tensions and how to resolve them

**1. Approval gates vs. speed**
> *Business:* every change must be approved. *User:* I approve 200 identical items a day.

**Resolve by risk-tiering.** Route by the facts of the record, not by uniform policy. Low-value, in-policy, no-exception items get a light or automatic path. Value thresholds, policy exceptions, and unusual patterns get the full review. Uniform friction trains people to click through everything — including the item that mattered.

**2. Data completeness vs. form length**
> *Business:* we need all 24 fields. *User:* I need to save this and move on.

**Resolve by staging, not by cutting.** Required = only what blocks the *next* step in the process. Everything else is progressive — optional now, prompted later, or inferred from context. A 24-field mandatory form produces 24 fields of garbage; a 6-field form produces 6 fields of truth and a completion prompt.

**3. Standardisation vs. local reality**
> *Business:* one process, nationally. *User:* my region genuinely works differently.

**Resolve by allowing the exception with a reason, not by blocking it.** A blocked exception becomes a WhatsApp message and a spreadsheet, and the system loses sight of it entirely. An exception captured with a reason is data — and the reasons, aggregated, tell you which rule is wrong.

**4. Visibility vs. surveillance**
> *Business:* we need to see field execution in real time. *User (P6):* I'm being watched.

**Resolve with symmetry.** Whatever is visible about a person should be visible *to* that person, in the same terms. Frame monitoring UI around the work (`kunjungan belum selesai`) rather than the person (`3 orang tidak patuh`). Design the coaching path, not just the flagging path.

**5. Governance vs. autonomy**
> *Business:* permissions must be tight. *User:* I can't do my job and I'm waiting three days for access.

**Resolve by making the request path as good as the grant path.** If access is tightly held, the request-and-approve flow must be fast, visible, and self-service to initiate. Tight permissions without a fast request path produce shared accounts — the worst of both worlds.

### The decision rule

When a business requirement and a user need collide, ask in this order:

1. **What failure is this control actually preventing?** Name it concretely. If nobody can, drop the control.
2. **How often does that failure occur, versus how often does the control fire?** A control that fires 500 times to prevent 2 failures belongs at a different point in the flow.
3. **Can it move earlier?** Prevention at input beats rejection at submit beats correction after the fact.
4. **Can it be tiered?** Apply friction proportional to risk.
5. **If it must stay heavy, does the user understand why?** Unexplained friction is experienced as disrespect and gets routed around. Explained friction is accepted.

> **The test:** if you can imagine a competent, well-intentioned user working around this control, the control is not designed correctly.

---

## Part 4 — Cross-persona rules

These hold regardless of who the primary persona is.

- **Consistency beats cleverness.** Nobody will re-learn a pattern you changed. Same action, same place, same word, every module.
- **One metric, one definition, everywhere.** If "coverage" differs between two screens, both become untrustworthy.
- **Indonesian, plain and consistent.** Fix the vocabulary once — `Ubah` not `Edit`/`Sunting` alternating; `Hapus` not `Delete`. Field names should read as the business says them out loud.
- **Every screen states its freshness and its scope.** As-of timestamp, and the active filter, visible without interaction.
- **Colour is never the only carrier of meaning.** Pair with icon and text — for accessibility, for projectors, for print, for screenshots.
- **Empty, loading, error, and no-permission states are designed**, not defaults. Every persona hits them; each needs a next action, not just a message.
- **Errors are written to the person who can fix them.** Name the record, name the field, say what to do.

---

## Part 5 — Persona × CASTLE weighting

Which of the six CASTLE dimensions to weight most heavily, per primary persona. Use this to prioritise when you cannot optimise everything.

| CASTLE dimension | P1 Admin | P2 Captain | P3 Finance | P4 Manager | P5 Top Mgmt |
|---|---|---|---|---|---|
| **C** — Cognitive Load | High | **Critical** | High | High | **Critical** |
| **A** — Advanced Feature Usage | **Critical** | High | Medium | High | Low |
| **S** — Satisfaction | High | High | Medium | Medium | High |
| **T** — Task Efficiency | **Critical** | **Critical** | Medium | Medium | Low |
| **L** — Learnability | Medium | High | Medium | High | **Critical** |
| **E** — Errors | High | Medium | **Critical** | Low | Low |

Read the extremes: P1 lives or dies on efficiency and accelerators. P3 lives or dies on error prevention. P5 lives or dies on learnability and cognitive load. Designing all three the same way fails all three.

---

## Part 6 — Validation backlog

These personas are hypotheses. Before treating them as fact, run a light research pass — even 5–6 interviews per role changes the picture materially.

**Questions to answer per role**

- What do you do in COMPASS *first* when you open it in the morning? (reveals the real entry point vs. the designed one)
- Which task takes the longest, and where exactly do you slow down?
- What do you keep in a spreadsheet outside COMPASS, and why? (every external spreadsheet is a missing feature or a broken one)
- What have you gotten wrong in COMPASS, and how did you find out?
- What do you ask someone else to do for you because it's easier than doing it yourself?
- Which number here do you not trust, and why?
- What screen or step do you work around, and how?

**Signals to instrument**

- Session length and return frequency per role (validates the frequency assumptions above)
- Where filters are re-applied repeatedly (missing saved views)
- Export usage per role (proxy for "the screen isn't answering the question")
- Rejection reasons, free-text — the cheapest source of process truth in the system
- Validation error frequency by field (design failures masquerading as user errors)

Update this document after each research round. Move personas from *proto* to *validated* explicitly, and note the date.

---

## Persona check — before handoff

- [ ] Primary persona named in the brief; secondary personas listed.
- [ ] The screen's **entry point** matches what the primary persona opens it to do.
- [ ] Density, click cost, and friction match the primary persona's row in the matrix.
- [ ] Every number on screen states its scope and freshness.
- [ ] Accelerators for P1/P2 are visible in the action bar, not hidden.
- [ ] Audit trail present wherever P3 will look at this data.
- [ ] Comparison context (target / previous period) present wherever P4 will.
- [ ] Understandable in 30 seconds with no interaction, wherever P5 will.
- [ ] Every control that adds friction has a named failure it prevents (Part 3, rule 1).
- [ ] Downstream effect on P6 considered for any authoring screen.
- [ ] Empty / loading / error / no-permission states designed.
- [ ] Copy in plain, consistent Indonesian; no colour-only meaning.

---

## Sources

Research informing this document:

- [Personas vs. Jobs-to-Be-Done — Nielsen Norman Group](https://www.nngroup.com/articles/personas-jobs-be-done/)
- [Personas: Turn User Data Into User-Centered Design — Nielsen Norman Group](https://www.nngroup.com/courses/personas/)
- [Creating enterprise personas for B2B UX — LogRocket](https://blog.logrocket.com/ux-design/creating-enterprise-personas-b2b-ux/)
- [Creating User Personas for Enterprise Applications — KoruUX](https://www.koruux.com/blog/creating-user-personas/)
- [How to Master Enterprise UX Design — KoruUX](https://www.koruux.com/blog/master-enterprise-ux-design/)
- [Enterprise UX Design: Core Principles — DePalma](https://depalma.io/blog/enterprise-ux-design)
- [UI/UX design services for B2B companies — The Growth UX Studio](https://thegrowthuxstudio.com/ui-ux-design-services-for-b2b-companies/)
- [Designing Analytics Apps? Know These 3 User Personas — Yellowfin BI](https://www.yellowfinbi.com/blog/three-personas-design-analytics-app)
- [Dashboard Design: Best Practices — Qlik](https://www.qlik.com/us/dashboard-examples/dashboard-design)
- [Dashboard Design UX Patterns — Pencil & Paper](https://www.pencilandpaper.io/articles/ux-pattern-analysis-data-dashboards)
- [Sales Force Automation: complete guide — Transart](https://www.transart.ro/en/sales-force-automation-complete-guide-to-what-sfa-software-does/)
- [Sales Force Automation Benefits for Every Sales Level — SoftServe](https://softservebs.com/en/resources/sales-force-automation-benefits/)
- [Audit Trail Accounting: Why Finance Teams Need Unified Systems — Cflow](https://www.cflowapps.com/audit-trail-accounting/)
- [Finance Workflow Automation for Audit Trails — sysgenpro](https://sysgenpro.com/automation/finance-workflow-automation-for-strengthening-audit-trails-in-high-volume-operations)
- [Optimising sales & distribution for FMCG in Indonesia — YCP Renoir](https://renoir.ycp.com/insights/articles/fmcg-retail/how-to-optimise-sales-distribution-for-peak-performance-for-fmcg-success-in-indonesia/)
- [FMCG Software Solutions and ERP Implementation: Lessons for Success — Arobit](https://www.arobit.com/blog/fmcg-software-solutions-implementation-lessons)

Companion documents: [COMPASS Design Framework (CASTLE + 14 criteria)](compass-design-framework.md) · [COMPASS UI Kit](https://www.figma.com/design/g0Pu0T8ObmVDWGMlYheMlO/COMPASS-UI-Kit)
