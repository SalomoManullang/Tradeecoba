# COMPASS Backoffice — Design Guardrail

> **Purpose.** This is the *foundation* for any COMPASS Backoffice design (Account Management, Master Data, Dashboard, and other modules). It is **not a mandatory checklist** — treat it as the default starting point and shared visual language. Establish this base first, then iterate and improve the design from here. When you deviate, do so deliberately.

COMPASS is a **desktop web** Backoffice suite. Every module shares one visual language from the **COMPASS UI Kit**. The single most important habit: **compose screens from the design system's components, don't hand-build them.**

---

## 1. The Golden Principle

**Build with DLS (Design Language System) components; avoid hand-drawing UI.** Hand-built versions of standard elements tend to drift off-spec. Prefer the real components for:

- **Sidebar** — use the `SidebarMenu` component. It can be assembled piece by piece if needed, but always use the existing sidebar components — never build a new sidebar from scratch.
- **Top bar** — one `NavigationTop` component (time, date, avatar, user).
- **Tables** — header-cell + body-cell components, with tag/button slots.
- **Action bar** — input + button components.
- **Pagination** — pagination helper + page-number components.
- **Buttons, inputs, tags, badges, checkboxes, modals, alerts, empty states** — their DLS components.

Only draw plain frames for layout containers (the page frame, card wrappers, row wrappers), and bind their fills/spacing to the design tokens below rather than hardcoding.

---

## 2. Canvas & Page Composition

Desktop screens use three zones: **Sidebar** (left) + **NavigationTop** (top of the right area) + **Content**.

- **Total frame:** 1400 × 1182px, background = `color/bg/primary` (#F8F9FD).
- **NavigationTop:** 76px tall, spans the right area width.
- **Content area:** padding **24px** top / left / right, **40px** bottom. Cards inside are full (fill) width.
- **Frame naming (Figma only):** when building in Figma, name each screen `Page Name - State` — e.g. `Manage Users - Default`, `Detail User - Default`, `Dashboard - Default`. Use `Default` when there's no special state; otherwise name it (`Empty State`, `Loading`, `Error`). This is not required when vibing/prototyping or designing in Claude Design.

Layout: the frame is a **horizontal** stack — `[ Sidebar (fill height) ][ Right area (fill) → NavigationTop (fill width) + Content (fill) ]`.

**Responsiveness.** The composition should be responsive, not pixel-locked. Treat the measurements above as the reference desktop layout, and let zones flex: the sidebar has fixed expanded/collapsed widths while the **right area and content cards fill remaining width**, and cards, tables, and rows should resize with the viewport rather than stay a fixed pixel width. Column widths in tables scale with the content width (see §5), and layouts should reflow gracefully at narrower desktop widths instead of clipping or overflowing.

| Measure | Sidebar Expanded | Sidebar Collapsed |
|---|---|---|
| Sidebar width | 240px | 58px |
| Right area width | 1160px | 1342px |
| Content card working width (after 24+24 insets) | 1064px | 1246px |

---

## 3. Design Tokens (foundation values)

Always prefer bound tokens over raw values so the design stays consistent and themeable.

### Color — semantic roles

| Token | Hex / note |
|---|---|
| color/bg/primary | #F8F9FD (page background) |
| color/bg/secondary | #FFFFFF (cards, surfaces) |
| color/bg/brand | #215AA8 |
| color/bg/success | success-subtle |
| color/bg/warning | warning-subtle |
| color/text/primary | #2A3D4A |
| color/text/secondary | ~#5A6B77 |
| color/text/brand | #215AA8 |
| color/text/warning | amber |
| color/text/error | red |
| color/text/disabled | #999999 |
| color/text/inverse | #FFFFFF |
| color/icon/primary | — |
| neutral/200 | #D6D6D6 (dividers, subtle borders) |
| success/600 · success/800 | green text · green dark |
| warning/700 | amber dark |

DLS `Tag` / `Alert` / `Button` instances carry their own colors — don't recolor them. Bind colors only on your own wrapper frames (page background, cards) and any manual text.

**Flow-board connector blue:** #1779C3 (used only for flow-diagram arrows, see §9).

### Spacing & radius

- Spacing scale (in px): 8, 10, 16, and **24** — where **24 is the dominant card/section gap**.
- Radius: **4** for buttons and inputs; **8** for cards.

### Elevation (shadows)

Prefer a design-system **effect style** over a hand-made drop shadow. The default card/elevation shadow is **`md`**; a subtler option is **`base`**.

### Typography

Two families: **Plus Jakarta Sans** (display / headline only) and **Lato** (everything else). Common styles:

- **Titles:** Title/Large (Bold, SemiBold), Title/Medium (Bold, SemiBold).
- **Body:** Body/Large, Body/Medium, Body/Small (Regular).
- **Labels:** Label/Large and Label/Medium in Bold / SemiBold / Medium.

Notes: `Headline/*` and `Title/Small/*` aren't published as reusable styles — for a page/card title use **Title/Large/Bold**. Most table and card text already comes styled inside DLS components, so you rarely set type manually except on titles.

---

## 4. Component Rules (which component, and how it behaves)

Use the design-system component for each role rather than a custom build. Key behaviors:

**Navigation & layout**
- **SidebarMenu** — the whole left rail. Pick the variant whose active item matches the current page (Dashboard, Manage Users, Manage Roles, Project, Business Partner, Employee, Holiday, Product List, Product Rule, Master Call Plan, Visit Report, LiveVisit Tracking, …).
- **NavigationTop** — 76px top bar; edit the nested time / date / user-name text rather than rebuilding.
- **Avatar** — small circle (with indicator) lives inside NavigationTop; a large circle is used on detail-page profiles.

**Action bar (list pages)** — all controls **Size S**, laid out space-between:
- **Left cluster** (gap 24): **Search** input (~300px, left search icon, placeholder, no header/label/help) · **Filter** button (Subtle) with filter icon · **Export** button (**always Subtle**) with download icon.
- **Right:** **Primary** button with plus icon (e.g. "Tambah User").
- Always swap each control's left icon to the correct named icon — don't leave the default placeholder.

**Buttons** — Primary (CTA), Secondary (secondary detail-page actions), Subtle (Filter & Export), Ghost (e.g. "← Kembali" back link), plus sizes XS/S/M. Row-level actions (e.g. "Detail") use **XS Secondary**.

**Tables** — assemble from Header Cell + Body Cell components (see §5).

**Tags (status)** — Green, Yellow, Red, Grey, Blue variants (Size S). See §5 for color mapping.

**Pagination** — pagination helper (item-per-page) + page numbers.

**Other DLS components** — IconButton, DropdownMenu, Checkbox / CheckboxWithLabel, RadioButtonWithLabel, Toggle, TextArea, InputDatePicker, Label, Modal, Alert, and **EmptyErrorState** (see §8).

---

## 5. Table Convention

A table is a **vertical** frame: one header row (`THead`) + N data rows (`TRow`, each a horizontal frame). Cells are component instances at fixed column widths summing to the content width (1064px expanded).

- **Header:** one Header Cell per column, with its title set; sort toggle optional. COMPASS Manage Users / Manage Roles use **no checkbox column**.
- **Body cell:** turn on exactly one slot per column — text, status tag, or action button — and keep the others off.
- **Left-align:** headers and cell values are left-aligned (body cells default to center — override to align under the header).
- **Status tags → state mapping:** **Green** = Aktif/Active · **Yellow** = Menunggu/Warning · **Red** = Ditolak/Gagal/Error · **Grey** = Draft/Neutral · **Blue** = Info/In-progress. Widen the status column so the label isn't clipped.
- **Action column:** fixed **75px**; give freed width to a flexible content column (e.g. Name) so the table stays full-width.
- **Rows:** show **10 mock rows** by default (matching "Item per page = 10").

---

## 6. Layout Conventions

1. **Auto-layout frames hug vertically.** Every wrapper (content area, cards, rows, sections, tables) uses vertical resize = **Hug**. Exception: the **sidebar** stays **Fill** so it spans full height.
2. **Screen height is driven by the right area**, not the sidebar. Clip content so a tall sidebar menu is clipped rather than stretching the page.
3. **Content area padding:** 24 top / left / right, **40 bottom**.
4. **Action column** in tables is a fixed **75px**; **10 mock rows** per table.
5. **No tabs when sections share a page.** If sections (e.g. General Info + Applied Scope) stack on the same detail page, render them as plain stacked cards. Use tabs only for mutually exclusive views.
6. **DetailHeader alignment:** with right-side CTAs → space-between; **without CTAs → left-align** with a fixed 24 gap (don't leave it on the space-between auto gap).
7. **Responsive by default.** Use fill/hug sizing (not fixed pixel widths) for content, cards, and rows so they adapt to the viewport. The sidebar keeps its fixed expanded/collapsed width; everything to its right flexes. Table columns scale with the content width, and layouts should reflow gracefully at narrower desktop widths rather than clip or overflow.

---

## 7. Screen Templates

Standard screen types: **list**, **detail**, **create/edit form**, **modal**, **dashboard** (KPI stat cards + table + a "What's New" alert), **empty**, and **error/validation**. Every screen still gets the `SidebarMenu` (correct active page) + `NavigationTop` + content card.

**Detail pages use a `DetailHeader` card, not a breadcrumb.** It's a white card (radius 8, 24px padding, ~84px tall):
- **Left:** Ghost **← Kembali** back button (brand blue, Label/Large/SemiBold) → 1px vertical divider (`neutral/200`, 36px tall) → title (Title/Large/Bold, e.g. "Detail User: <name>"). It may also carry status/type tags beside the title and subtitle lines (ID, lifecycle, created/updated).
- **Right:** Secondary/Primary actions (e.g. **Edit User** with an edit icon).
- Below it sit the sectioned label/value cards.

---

## 8. Empty & Error States

Use the DLS **EmptyErrorState** component, **Grey** variant (neutral greyscale look), with the `State` that fits:
- **Data Not Available** — empty detail/record.
- **Search not Found** — empty search results.
- **404 / Access Forbidden / Connection Lost / General Error / Under Maintenance** — errors.

Center it in a white card. For a **detail** empty state, keep the `DetailHeader` (back + title, no right CTA → left-aligned) above the card. Set the title/description on the visible text, hide the CTA button's icons, and write copy in Indonesian.

---

## 9. Flow Boards & Connectors

> Applies to **Figma only** — relevant when arranging multiple screens on a flow board. Not required for vibing/prototyping or designing in Claude Design.

When arranging screens into a flow board (list → detail → empty state):
- Draw connectors as **vector paths** stroked in the COMPASS flow blue **#1779C3**, with a small triangular arrowhead at the target.
- **Straight line** when the target is directly adjacent (same row, immediately right).
- **Smooth curved line** (rounded bézier, never a right-angle elbow) when the target is offset (e.g. bottom-right).
- Start at the source control's right-center; end at the target frame's left edge.
- **Caption:** a small white pill (blue border, blue Semibold 12px text) at the line's midpoint labeling the flow (e.g. "Detail", "Empty State"), grouped with the line as one unit.
- Arrange screens in rows with consistent ~300px gaps; place an alternate state (e.g. Empty State) below its base screen.

---

## 10. Working Process (for updates, reskins, recreations)

- **Create** — build from the composition + components + tokens above.
- **Update / change** — inspect the current structure first, then change incrementally (colors → typography → components → layout), validating after each step. Preserve everything already on-spec; touch only what the change requires.
- **Reskin / restyle** — discard old values (colors, fonts, spacing, effects) and re-apply only these tokens, styles, and components.
- **Recreate** — use the old design only to understand *what* goes where; build the *how* entirely from these components and tokens. Name the new frame `Page Name - State` (Figma only).
- **Clone 1:1 (HTML ↔ Figma)** — this guardrail also applies when porting a design exactly between HTML and Figma in either direction (HTML → Figma or Figma → HTML). Preserve the source layout, content, and structure faithfully, while mapping every element to the equivalent COMPASS token, text style, and DLS component (rather than reproducing raw hardcoded values). The goal is a pixel-faithful clone that is still built on the design system.

---

## 11. Reference Designs

The authoritative reference file is **COMPASS All Design** (Figma `fileKey: tioVvGGMOxxUwKkoTL4ZGo`). When in doubt, look at the matching module screen at full fidelity rather than guessing, then build from the tokens/components here.

| Module page | Node ID |
|---|---|
| Sidebar Menu | `1-10157` |
| Roles Management | `1-12797` |
| Users Management | `1-44902` |
| Business Partner | `1-87724` |
| Product List | `1-230466` |
| Product Rules | `1-271350` |

Each module page is a full **list → detail → form → modal → empty/error** flow.

The design system itself lives in the **COMPASS UI Kit** (Figma `fileKey: g0Pu0T8ObmVDWGMlYheMlO`) — the source of the tokens, text styles, effect styles, and components referenced throughout this guardrail.

---

### Quick foundation checklist

- [ ] Three zones present: Sidebar + NavigationTop + Content, on a 1400px-wide frame.
- [ ] Page bg `color/bg/primary`; cards `color/bg/secondary`, radius 8, `md` shadow.
- [ ] Content padding 24 / 24 / 24 / 40; 24px dominant gap between sections.
- [ ] Standard components used (not hand-built) for sidebar, top bar, table, action bar, pagination.
- [ ] Titles in Title/Large/Bold; other text via DLS component styles.
- [ ] Action bar: Search + Filter(Subtle) + Export(Subtle) left, Primary CTA right, all Size S.
- [ ] Table: correct status-tag color mapping, 75px action column, 10 mock rows, left-aligned.
- [ ] Detail page uses DetailHeader (not breadcrumb); alignment matches CTA presence.
- [ ] Layout is responsive — fill/hug sizing, content flexes, no clipping/overflow.
- [ ] Frame named `Page Name - State` (Figma only).
