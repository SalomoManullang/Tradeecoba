# COMPASS Design System

**COMPASS** — *Centralized Commercial Backoffice* — is an internal enterprise
web application by **Paragon Corp.** (an Indonesian consumer-goods company).
It is a data-heavy B2B backoffice for managing users, roles & permissions,
products, product rules, and business partners. The interface language is
**Bahasa Indonesia**. Authentication is SSO (Microsoft/Outlook).

This project is the design system extracted from the **"COMPASS All Design.fig"**
Figma file (mounted read-only during authoring). It packages COMPASS's tokens,
typography, iconography, logo, ~44 reusable React components, and a click-through
backoffice UI kit so agents can build on-brand COMPASS screens and assets.

## Source
- **Figma file:** "COMPASS All Design.fig" (pages: Login, Sidebar-Menu,
  Roles-Management, Users-Management, Business-Partner, Product-List,
  Product-Rules). The file's component families, Figma Variables, and text
  usage are the source of truth — values here are transcribed verbatim, never
  rounded to a grid.
- No external code repository was provided.

---

## Index / manifest
- `styles.css` — global CSS entry point (import this). `@import`s the token,
  font, typography and effects files below.
- `tokens/` — `fig-tokens.css` (195 Figma Variables incl. dark theme),
  `fonts.css` (Google Fonts), `typography.css` (type ramp + classes),
  `effects.css` (radius/spacing px aliases, elevation, focus ring).
- `assets/logo/` — `CompassLogo` component (real vector wordmark from the file).
- `assets/icons/` — `Icon` component + `icon-data.js` (real inline glyph geometry).
- `assets/images/` — bitmap assets copied from the file.
- `components/` — reusable primitives, grouped by concern (see below).
- `ui_kits/backoffice/` — interactive backoffice UI kit (login → users → detail).
- `foundations/` — foundation specimen cards (Colors, Type, Spacing).
- `SKILL.md` — Agent Skill wrapper.

### Components (built)
Forms: **Button, IconButton, Input, TextArea, Checkbox, CheckboxWithLabel,
RadioButton, Toggle, Label, Select, DropdownMenu**.
Feedback: **Alert, Toast, Tooltip, Badge, Tag, Loader, Indicator**.
Data display: **Table, HeaderCell, BodyCell, Avatar, Pagination, PageNumbers, Scrollbar, Image, AnnotationCard, Number**.
States: **EmptyState, ErrorState, ConfirmationState, ProcessingState**.
Navigation: **SidebarMenu, Tab, NavigationTop, Menu, DoubleChevron, DetailHeader**.
Overlays: **Modal, ButtonClose**.
Date & time: **Calendar, DatePicker, TimePicker, DateCell, MonthYearCell, TimeCell**.
States: **EmptyErrorState** (compact inline variant).
Brand: **CompassLogo, Icon, Illustration**.

Consume from the compiled bundle: `const { Button } = window.COMPASSDesignSystem_2e97fc`.

### Intentional additions
- **Icon** — a wrapper over a glyph set (see ICONOGRAPHY); the file's icons had
  no extractable geometry, so this is a substitution layer.
- **Illustration** — inline-SVG wrapper over the three real spot illustrations
  the author supplied (the .fig's illustration families had no extractable
  geometry); consumed by the state components.
- **Select** — a trigger+panel convenience over the file's **DropdownMenu**
  (which is authored separately as the bare option list).
- **BodyCell** / **HeaderCell** — the atomic `<td>`/`<th>` primitives behind the
  file's *Body Cell* / *Header Cell* families, exposed for hand-composed tables.

### Intentionally skipped / consolidated families
Pure Figma-documentation symbols that are not product UI: `Data`,
`Number`, `placeholder`, and the legacy duplicates
`Check Mark (old)`, `Toggle (Old)`.
Consolidated into a single generic component (same visuals, cleaner API):
- `TableBusinessPartner` / `TableProductList` / `TableProductRule` /
  `Header Cell` → **Table** (column-driven).
- `PageNumbers` / `PaginationHelpers` → **Pagination**.
- `Lanscape Image` / `Portrait Image` / `Image Size` / `Orientation` → **Image**.
- `SingleMonthCalendar` / `Month&YearCell` / `TimeCell` → **Calendar** /
  **TimePicker** / **DateCell**.
- `EmptyErrorState` → **EmptyState** / **ErrorState**.
- `Minus` → the `minus`/`MinusIcon` glyph; `Check Mark` → the `check`/`CheckIcon`
  glyph; `Double Chevron` → **DoubleChevron**.
- `SidebarMenuCollapsed` / `SidebarMenuExpand` → **SidebarMenu** (`collapsed` prop).

**Spot illustrations (partial):** the author supplied three real spot
illustrations, shipped as the **Illustration** component (`MessageInfoBlue`,
`SearchQuestionGrey`, `DocumentQuestionGrey`) and used by default in
**EmptyState** (mapped from `colour`) and **ErrorState** (`notFound`). The
remaining status-illustration families — `Exclamation/Failed/Success/Time` in
`Blue/Grey/Purple` — are still unbuilt: in the .fig they are bespoke boolean-op
illustrations with no recoverable vector data and no SVG export. Every state
component still accepts an `illustration` prop to drop in real artwork.

**Not built — legacy / duplicates:** `Check Mark (old)`, `Toggle (Old)`,
`SingleMonthCalendar` (= **Calendar**), `Lanscape Image` / `Portrait Image`
(= **Image**), `Minus` (= `MinusIcon`), `DetailHeader` (Figma doc symbol).

A **`templates/backoffice-page`** template is provided as the consumer-facing
starting point (sidebar + top bar + user table).

---

## CONTENT FUNDAMENTALS
COMPASS copy is **Bahasa Indonesia**, written in a plain, functional,
task-oriented register — this is internal enterprise software, not marketing.

- **Address:** neutral/imperative. Instructions use bare verbs ("Masuk dengan
  SSO", "Tambah User", "Simpan", "Batal", "Kembali"). Marketing surfaces (login
  hero) use the polite second person **Anda** ("Akses seluruh kebutuhan
  operasional komersial *Anda*…").
- **Casing:** Title Case for buttons, menu items, table headers and page titles
  ("Manajemen User", "Daftar User", "Tambah User"). Sentence case for helper and
  body text.
- **Tone:** clear, concise, reassuring. Status/processing copy explains what is
  happening and what comes next ("Menghubungkan Outlook dengan COMPASS" /
  "Jika proses ini berhasil kamu akan diarahkan ke halaman utama COMPASS").
- **Person:** mixes formal **Anda** (marketing) and informal **kamu** (system
  progress messages) — follow the surface's precedent.
- **No emoji.** None appear anywhere in the file.
- **Numbers/dates:** Indonesian formats — dates like "12 Jan 2024",
  counts like "(0/100)", pagination "1–10 dari 238".
- **Vibe:** trustworthy, efficient, unfussy. Every string earns its place.

## VISUAL FOUNDATIONS
- **Color:** a confident **royal blue** brand (`--primary-500` = `#304DDE`) over
  cool, near-white greys. Neutrals split into pure **neutral** (warm-neutral
  greys, `#EBEBEB`→`#1F1F1F`) and **neutral-variant** (cool blue-greys, used for
  text ink `#2A3D4A` and app background `#F8F9FD`). Semantic set: info (blue
  `#0056CC`), success (green `#33995E`), warning (amber `#FFCD00`), error (red
  `#E6001C`). Accent hues (secondary sky blue, tertiary plum, Heron violet,
  Paragon SFM deep blue) exist for sub-brands but are used sparingly. A dark
  theme is defined (`:root[data-theme="dark"]`).
- **Type:** **Lato** is the workhorse — the default UI text is Lato 14/20.
  Headings are Lato Bold (22/28 and down). **Inter** and **Plus Jakarta Sans**
  appear only as large display/hero type. Letter-spacing is subtly positive on
  small text (0.1–0.4px). See the Type cards.
- **Spacing:** a fine-grained scale — 2, 4, 6, 8, 10, 12, 14, 16, 20, 24, 40.
  Component padding is compact (buttons 8–10px vertical; table cells 12px;
  inputs 8×10). This is a dense, information-first product.
- **Corners:** small radii dominate — **4px** is the default (buttons, inputs,
  tags, badges); 6/8px for cards and dropdowns, 12px for modals, full for
  toggles/avatars/pills. Nothing is heavily rounded.
- **Backgrounds:** flat. App background is `#F8F9FD`; surfaces are white. **No**
  ambient gradients or textures in-app. The single prominent gradient is the
  **login/marketing key-visual** (`linear-gradient(146deg,#1A1F98,#304DDE,#1C95F0)`),
  also used inside the logo mark.
- **Shadows:** soft and low. Built from `rgba(0,0,0,0.06)` and `rgba(0,0,0,0.10)`
  — the two most-used shadow colors in the file. Cards get a hairline border
  first, shadow second; dropdowns and modals lift more (`--shadow-dropdown`,
  `--shadow-modal`). No hard/long shadows.
- **Borders:** hairline `1px` in `#D6D6D6` (`--neutral-300`) — the single
  most-used color in the whole file (5000+ uses). Tables, inputs, and cards all
  lean on it. Subtle borders use `#EBEBEB`.
- **Cards:** white, 8–12px radius, 1px subtle border, `--shadow-xs`/`sm`. Quiet.
- **Hover/press:** interactive blue darkens on hover (`--color-interactive-hover`
  = primary-600) and further on press (primary-700). Neutral/ghost controls get
  a light `--neutral-variant-100` wash on hover. Rows highlight on hover; the
  selected row uses `--primary-100`. No scale/bounce — transitions are short
  (~120ms) color/background fades.
- **Focus:** a 3px primary ring at low alpha (`--focus-ring`).
- **Transparency/blur:** minimal. Modal scrim is `rgba(42,61,74,0.45)`
  (ink-tinted, not pure black). No glassmorphism.
- **Imagery:** cool, blue-leaning flat illustrations (the login spot art). Photos
  are rare; when present, cool and clean.
- **Motion:** restrained — fades and short eases, spinner for loading. No
  decorative looping animation.

## ICONOGRAPHY
- The file defines ~45 line icons (24×24, outline style, single-color, painted
  in `#2A3D4A`), e.g. `AddPlusOutlineIcon`, `SearchOutlineIcon`, `SortDefaultIcon`,
  `ChevronDownIcon`, `UserOutlineIcon`, `DeleteOutlineIcon`, plus filled status
  glyphs (`InfoFilledIcon`, `HazardFilledIcon`, `CheckFilledIcon`).
- **Real inline vector glyphs.** The `Icon` component renders COMPASS glyphs
  extracted verbatim from the icon specimen sheet (24px glyphs on a 72px grid),
  stored as absolute-coordinate path data in `assets/icons/icon-data.js`
  (`iconPaths` name→{viewBox,d}; `iconAliases` maps legacy PascalCase names).
  Glyphs fill with `currentColor` (fill-rule evenodd, matching Figma's export
  intent). **No external dependency** — the vector data ships inside the bundle.
- **Coverage gap:** a few stroke-only glyphs (calendar, checkbox, resize-handle,
  login, dashboard, undo) were not in the captured specimen and fall through to
  a dashed placeholder box. **Provide those SVGs** and they drop straight into
  `icon-data.js`.
- Usage: `<Icon name="SearchOutlineIcon" size={20} />`. Icons inherit
  `currentColor`; override with the `color` prop.
- **No emoji, no unicode-glyph icons** are used anywhere in COMPASS.

## Logo / brand mark
- `CompassLogo` is the real vector wordmark extracted from the file — a compass
  ring wrapping a play-triangle, with the "COMPASS" wordmark and optional
  tagline "Centralized Commercial Backoffice". Variants: `color` | `black` |
  `white`, with `tagline` on/off. Use `white` on the blue key-visual, `color`
  on light surfaces.

## Fonts — substitution note
Lato, Inter, and Plus Jakarta Sans are all loaded from **Google Fonts** (they
are the genuine originals, so no visual substitution). One caveat: Google Fonts
serves Lato in **400/700 only**, but the file also references Lato **Medium (500)**
and **SemiBold (600)**; the browser synthesizes those weights. Supply real Lato
Medium/SemiBold files to remove synthesis.

## Theming
Light is default. A dark theme is available via `:root[data-theme="dark"]` (or
`.dark`) — set the attribute on a wrapping element to preview it.
