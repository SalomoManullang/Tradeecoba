# COMPASS UI Kit — Self-Contained Design Spec (for Claude Design)

Use this whenever you design or build any **COMPASS** UI as HTML/CSS/React (or any coded output). Everything you need to stay on-system — color hex, fonts, type scale, spacing, radius, shadows, and component structure/layout — is described **in this document**. You do **not** need to open Figma or call the Figma MCP to build a faithful COMPASS screen; build directly from the values below.

**Two rules that always apply:**
1. **Reuse before create.** Use the tokens, type styles, and component structures defined here. Don't invent a color, font, spacing, radius, or component when one is already specified.
2. **Communicate before inventing.** If a design needs something not covered here (a new component, a color outside this palette, a new pattern), **stop and ask** — see "When something is missing" at the end. Never silently freehand an off-system value.

> Fidelity note: **colors (107 primitives + 43 semantics), typography (families, weights, sizes, line-heights, tracking), spacing, and radius are all exact**, transcribed directly from the COMPASS UI Kit (colors are Light mode; dark-mode primitives differ). The only reconstructed values are the **composed shadow recipes** in §4 — the kit's spread/offset/blur building blocks are exact, but how they combine into each elevation and the exact shadow color/opacity aren't exposed in the collection tables. Never replace a value with an invented "looks right" one; flag it instead.

### Source-page boundary (which parts of the kit to use)
When sourcing anything from the COMPASS UI Kit file, respect these page rules:
- **Documentation** page → **excluded.** Do not use it as a source; if any value here was ever taken from it, remove that value rather than keeping it.
- **Examples** page and **Tree Map** page → **excluded from this canonical spec**, but **kept as reference only**. Use them at most for orientation (seeing how pieces fit together); never copy their contents in as canonical tokens/components. Anything drawn from them belongs in the "Reference-only" note below, not in §1–§6.
- **Canonical sources** = the color/typography/spacing variables and the component definitions (the pages that define the tokens and components themselves).

> **Reference-only (not canonical):** the *Examples* and *Tree Map* pages of the kit exist for orientation. They are excluded from the token/component specs in §1–§6 and must not be copied in as source-of-truth. (Currently nothing in this document is drawn from them.)

---

## 1. Color tokens

The **Color Primitives** ramps and the **Color Semantic** tokens below are the exact values from the COMPASS UI Kit. Semantic tokens (`color/bg/*`, `color/text/*`, `color/border/*`, `color/icon/*`, `color/interactive/*`) each map to a primitive — **use the semantic tokens in your CSS**; the primitive + hex is shown so you can see the source. Prefer semantic naming; never scatter raw hex through markup.

### Color Primitives (verified — Light = Dark)

**primary** (indigo — brand base): 100 `#D6DBF8` · 200 `#ADB7F2` · 300 `#8394EB` · 400 `#5A71E5` · 500 `#304DDE` · 600 `#273EB5` · 700 `#1E308B` · 800 `#152262` · 900 `#0C1338`

**secondary** (blue): 100 `#D2EAFC` · 200 `#A5D5F9` · 300 `#77C0F6` · 400 `#4AAAF3` · 500 `#1C95F0` · 600 `#1779C3` · 700 `#125D96` · 800 `#0C4169` · 900 `#07253C`

**tertiary** (magenta): 100 `#FBD4FC` · 200 `#F6A9F9` · 300 `#F27FF6` · 400 `#EE54F2` · 500 `#E929EF` · 600 `#BD21C2` · 700 `#921A96` · 800 `#661269` · 900 `#3A0A3C`

**info** (blue): 100 `#CCDDF5` · 200 `#99BBEB` · 300 `#669AE0` · 400 `#3378D6` · 500 `#0056CC` · 600 `#0045A3` · 700 `#00347A` · 800 `#002252` · 900 `#000914`

**success** (green): 100 `#D9F2E3` · 200 `#B3E5C8` · 300 `#8CD9AC` · 400 `#66CC91` · 500 `#40BF75` · 600 `#33995E` · 700 `#267346` · 800 `#1A4C2F` · 900 `#06130C`

**warning** (yellow): 100 `#FFFBE4` · 200 `#FFF2AB` · 300 `#FFE86E` · 400 `#FFDD0C` · 500 `#FFCD00` · 600 `#D1A400` · 700 `#9D7B00` · 800 `#695200` · 900 `#342900`

**error** (red): 100 `#FFEDEF` · 200 `#F599A4` · 300 `#F06677` · 400 `#EB3349` · 500 `#E6001C` · 600 `#B80016` · 700 `#8A0011` · 800 `#5C000B` · 900 `#170003`

**neutral** (grey): 100 `#FFFFFF` · 200 `#EBEBEB` · 300 `#D6D6D6` · 400 `#C2C2C2` · 500 `#ADADAD` · 600 `#999999` · 700 `#7A7A7A` · 800 `#5C5C5C` · 900 `#3D3D3D` · 950 `#1F1F1F`

**neutral-variant** (cool grey — the main UI greys): 100 `#F8F9FD` · 200 `#DEE2E7` · 300 `#C4CAD0` · 400 `#ABB3BA` · 500 `#919BA4` · 600 `#77848D` · 700 `#5E6C77` · 800 `#445560` · 900 `#2A3D4A` · 950 `#000000`

**status** (categorical, 12 hues): 100 `#6D7C8C` · 200 `#276ED2` · 300 `#008CAA` · 400 `#B77800` · 500 `#CC6600` · 600 `#008E89` · 700 `#009162` · 800 `#248430` · 900 `#7E8814` · 1000 `#D01A34` · 1100 `#993F94` · 1200 `#CB4832`

**status-bg** (subtle tint backgrounds paired 1:1 with the `status` hues above): 100 `#EDEFF1` · 200 `#E5EEFA` · 300 `#E0F1F5` · 400 `#F6EFE0` · 500 `#F9EDE0` · 600 `#E0F1F1` · 700 `#E0F2EC` · 800 `#E5F0E6` · 900 `#F0F1E3` · 1000 `#F9E4E7` · 1100 `#F3E8F2` · 1200 `#F9E9E6`

### Color Semantic (verified — full mapping, Light mode)
These are the 43 semantic tokens; each resolves to a primitive (hex shown). **Use these in your CSS**; the primitive is given so you can see the source. Dark-mode primitives differ — values below are Light. Bind `--color-*` semantic vars, not raw hex.

**bg** (`color/bg/*`)
| Token | Primitive | Hex |
|-------|-----------|-----|
| bg/primary (page) | neutral-variant/100 | `#F8F9FD` |
| bg/secondary (cards) | neutral/100 | `#FFFFFF` |
| bg/tertiary | neutral-variant/200 | `#DEE2E7` |
| bg/inverse | neutral/900 | `#3D3D3D` |
| bg/brand | primary/500 | `#304DDE` |
| bg/brand-subtle | primary/100 | `#D6DBF8` |
| bg/success | success/100 | `#D9F2E3` |
| bg/warning | warning/100 | `#FFFBE4` |
| bg/error | error/100 | `#FFEDEF` |
| bg/info | info/100 | `#CCDDF5` |
| bg/disabled | neutral/500 | `#ADADAD` |

**text** (`color/text/*`)
| Token | Primitive | Hex |
|-------|-----------|-----|
| text/primary | neutral-variant/900 | `#2A3D4A` |
| text/secondary | neutral-variant/800 | `#445560` |
| text/tertiary | neutral-variant/700 | `#5E6C77` |
| text/disabled | neutral/500 | `#ADADAD` |
| text/inverse | neutral/100 | `#FFFFFF` |
| text/brand | primary/500 | `#304DDE` |
| text/on-brand | primary/100 | `#D6DBF8` |
| text/success | success/700 | `#267346` |
| text/warning | warning/700 | `#9D7B00` |
| text/error | error/700 | `#8A0011` |
| text/info | info/700 | `#00347A` |

**border** (`color/border/*`)
| Token | Primitive | Hex |
|-------|-----------|-----|
| border/default | neutral/300 | `#D6D6D6` |
| border/strong | neutral-variant/900 | `#2A3D4A` |
| border/subtle | neutral/200 | `#EBEBEB` |
| border/disabled | neutral/500 | `#ADADAD` |
| border/focus | primary/500 | `#304DDE` |
| border/brand | primary/500 | `#304DDE` |
| border/success | success/500 | `#40BF75` |
| border/warning | warning/500 | `#FFCD00` |
| border/error | error/500 | `#E6001C` |

**icon** (`color/icon/*`)
| Token | Primitive | Hex |
|-------|-----------|-----|
| icon/primary | neutral-variant/900 | `#2A3D4A` |
| icon/secondary | neutral-variant/800 | `#445560` |
| icon/disabled | neutral/500 | `#ADADAD` |
| icon/inverse | neutral/100 | `#FFFFFF` |
| icon/brand | primary/500 | `#304DDE` |
| icon/success | success/500 | `#40BF75` |
| icon/warning | warning/500 | `#FFCD00` |
| icon/error | error/500 | `#E6001C` |

**interactive** (`color/interactive/*` — for interactive fills/links)
| Token | Primitive | Hex |
|-------|-----------|-----|
| interactive/default | primary/500 | `#304DDE` |
| interactive/hover | primary/600 | `#273EB5` |
| interactive/active | primary/700 | `#1E308B` |
| interactive/disabled | neutral/500 | `#ADADAD` |

> **Brand confirmed:** `bg/brand`, `text/brand`, `border/brand`, `icon/brand`, `interactive/default` all = **primary/500 `#304DDE`** (indigo), with hover primary/600 `#273EB5` and active primary/700 `#1E308B`. The earlier `#215AA8` was wrong and does not exist in the kit.

### Status → semantic color (tags/badges)
Green (success) = Aktif/Active · Yellow/Amber (warning) = Menunggu/Warning · Red (error) = Ditolak/Gagal/Error · Grey (neutral) = Draft/Neutral · Blue (info/secondary) = Info/In-progress. For categorical labels with no semantic meaning, use the **status** ramp for the foreground/hue and the matching **status-bg** step (same number) as its subtle background tint.

```css
:root {
  /* ===== Semantic tokens (verified, Light mode) ===== */
  /* bg */
  --color-bg-primary:      #F8F9FD; /* neutral-variant/100 */
  --color-bg-secondary:    #FFFFFF; /* neutral/100 */
  --color-bg-tertiary:     #DEE2E7; /* neutral-variant/200 */
  --color-bg-inverse:      #3D3D3D; /* neutral/900 */
  --color-bg-brand:        #304DDE; /* primary/500 */
  --color-bg-brand-subtle: #D6DBF8; /* primary/100 */
  --color-bg-success:      #D9F2E3; /* success/100 */
  --color-bg-warning:      #FFFBE4; /* warning/100 */
  --color-bg-error:        #FFEDEF; /* error/100 */
  --color-bg-info:         #CCDDF5; /* info/100 */
  --color-bg-disabled:     #ADADAD; /* neutral/500 */
  /* text */
  --color-text-primary:    #2A3D4A; /* neutral-variant/900 */
  --color-text-secondary:  #445560; /* neutral-variant/800 */
  --color-text-tertiary:   #5E6C77; /* neutral-variant/700 */
  --color-text-disabled:   #ADADAD; /* neutral/500 */
  --color-text-inverse:    #FFFFFF; /* neutral/100 */
  --color-text-brand:      #304DDE; /* primary/500 */
  --color-text-on-brand:   #D6DBF8; /* primary/100 */
  --color-text-success:    #267346; /* success/700 */
  --color-text-warning:    #9D7B00; /* warning/700 */
  --color-text-error:      #8A0011; /* error/700 */
  --color-text-info:       #00347A; /* info/700 */
  /* border */
  --color-border-default:  #D6D6D6; /* neutral/300 */
  --color-border-strong:   #2A3D4A; /* neutral-variant/900 */
  --color-border-subtle:   #EBEBEB; /* neutral/200 */
  --color-border-focus:    #304DDE; /* primary/500 */
  --color-border-success:  #40BF75; /* success/500 */
  --color-border-warning:  #FFCD00; /* warning/500 */
  --color-border-error:    #E6001C; /* error/500 */
  /* icon */
  --color-icon-primary:    #2A3D4A; /* neutral-variant/900 */
  --color-icon-secondary:  #445560; /* neutral-variant/800 */
  --color-icon-brand:      #304DDE; /* primary/500 */
  /* interactive (links / interactive fills) */
  --color-interactive:         #304DDE; /* primary/500 */
  --color-interactive-hover:   #273EB5; /* primary/600 */
  --color-interactive-active:  #1E308B; /* primary/700 */

  /* Convenience aliases */
  --color-border: var(--color-border-default);
  --color-brand:  var(--color-bg-brand);

  /* Full primitive ramps also available as --primary-100..900, --secondary-*,
     --tertiary-*, --info-*, --success-*, --warning-*, --error-*, --neutral-*,
     --neutral-variant-*, --status-*, --status-bg-* per the ramp tables above. */
}
```

---

## 2. Typography

**Font families** (font/family): **display** = `Plus Jakarta Sans` · **body** = `Lato` · **mono** = `JetBrains Mono`. By role: display & headline styles use **Plus Jakarta Sans**; title, label, and body styles use **Lato**; mono is for code/tabular numerals.

**Font weights** (font/weight): regular `400` · medium `500` · semibold `600` · bold `700` · extrabold `800`.

**Type scale (exact — size / line-height / letter-spacing, all px).** Each named style has a size, a line-height, and a tracking value from the kit:

| Style | Family | Size | Line-height | Tracking |
|-------|--------|------|-------------|----------|
| display-lg | Plus Jakarta Sans | 57 | 64 | -0.25 |
| display-md | Plus Jakarta Sans | 45 | 52 | 0 |
| display-sm | Plus Jakarta Sans | 36 | 44 | 0 |
| headline-lg | Plus Jakarta Sans | 32 | 40 | 0 |
| headline-md | Plus Jakarta Sans | 28 | 36 | 0 |
| headline-sm | Plus Jakarta Sans | 24 | 32 | 0 |
| title-lg | Lato | 22 | 28 | 0 |
| title-md | Lato | 16 | 24 | 0.15 |
| title-sm | Lato | 14 | 20 | 0.1 |
| label-lg | Lato | 14 | 20 | 0.1 |
| label-md | Lato | 12 | 16 | 0.5 |
| label-sm | Lato | 11 | 16 | 0.5 |
| body-lg | Lato | 16 | 24 | 0.5 |
| body-md | Lato | 14 | 20 | 0.25 |
| body-sm | Lato | 12 | 16 | 0.4 |

(The kit lists one `headline` tracking value of 0 covering all headline sizes.)

Usage guide: page/screen titles → title-lg (22) or headline-sm (24) for larger; card/section titles → title-md (16); default body & table text → body-md (14, Lato); captions/help → body-sm (12); buttons & field labels → label-lg (14); small tags/labels → label-md/sm. Reserve display-* for marketing/hero, rarely in Backoffice. Weight per style is applied where the design calls for it (e.g. a bold title uses weight 700).

```css
:root {
  --font-display: "Plus Jakarta Sans", sans-serif; /* display + headline */
  --font-body:    "Lato", sans-serif;               /* title, label, body — default UI font */
  --font-mono:    "JetBrains Mono", monospace;

  --fw-regular: 400; --fw-medium: 500; --fw-semibold: 600; --fw-bold: 700; --fw-extrabold: 800;

  /* size / line-height / tracking (px) */
  --text-display-lg: 57px;  --lh-display-lg: 64px;  --ls-display-lg: -0.25px;
  --text-display-md: 45px;  --lh-display-md: 52px;  --ls-display-md: 0;
  --text-display-sm: 36px;  --lh-display-sm: 44px;  --ls-display-sm: 0;
  --text-headline-lg: 32px; --lh-headline-lg: 40px; --ls-headline: 0;
  --text-headline-md: 28px; --lh-headline-md: 36px;
  --text-headline-sm: 24px; --lh-headline-sm: 32px;
  --text-title-lg: 22px;    --lh-title-lg: 28px;    --ls-title-lg: 0;
  --text-title-md: 16px;    --lh-title-md: 24px;    --ls-title-md: 0.15px;
  --text-title-sm: 14px;    --lh-title-sm: 20px;    --ls-title-sm: 0.1px;
  --text-label-lg: 14px;    --lh-label-lg: 20px;    --ls-label-lg: 0.1px;
  --text-label-md: 12px;    --lh-label-md: 16px;    --ls-label-md: 0.5px;
  --text-label-sm: 11px;    --lh-label-sm: 16px;    --ls-label-sm: 0.5px;
  --text-body-lg: 16px;     --lh-body-lg: 24px;     --ls-body-lg: 0.5px;
  --text-body-md: 14px;     --lh-body-md: 20px;     --ls-body-md: 0.25px;
  --text-body-sm: 12px;     --lh-body-sm: 16px;     --ls-body-sm: 0.4px;
}
body {
  font-family: var(--font-body);
  font-size: var(--text-body-md); line-height: var(--lh-body-md); letter-spacing: var(--ls-body-md);
  color: var(--color-text-primary);
}
```

---

## 3. Spacing & radius

**Spacing scale (exact, px)** — `spacing/0`…`spacing/24`:
| # | px | | # | px | | # | px |
|---|----|--|---|----|--|---|----|
| 0 | 0 | | 9 | 18 | | 18 | 64 |
| 1 | 2 | | 10 | 20 | | 19 | 80 |
| 2 | 4 | | 11 | 24 | | 20 | 96 |
| 3 | 6 | | 12 | 28 | | 21 | 112 |
| 4 | 8 | | 13 | 32 | | 22 | 128 |
| 5 | 10 | | 14 | 36 | | 23 | 144 |
| 6 | 12 | | 15 | 40 | | 24 | 160 |
| 7 | 14 | | 16 | 48 | | | |
| 8 | 16 | | 17 | 56 | | | |

`spacing/11` = **24px** is the dominant card/section gap and content-area inset; `spacing/8` = 16 and `spacing/4` = 8 are the next most common.

**Radius (exact, px):** sm `2` · base `4` · md `6` · lg `8` · xl `12` · 2xl `16` · 3xl `24` · full `9999`. Controls (buttons/inputs) = **base 4px**; cards = **lg 8px**; pills/avatars = full.

```css
:root {
  /* spacing */
  --space-0:0; --space-1:2px; --space-2:4px; --space-3:6px; --space-4:8px;
  --space-5:10px; --space-6:12px; --space-7:14px; --space-8:16px; --space-9:18px;
  --space-10:20px; --space-11:24px; --space-12:28px; --space-13:32px; --space-14:36px;
  --space-15:40px; --space-16:48px; --space-17:56px; --space-18:64px; --space-19:80px;
  --space-20:96px; --space-21:112px; --space-22:128px; --space-23:144px; --space-24:160px;
  /* radius */
  --radius-sm:2px; --radius-base:4px; --radius-md:6px; --radius-lg:8px;
  --radius-xl:12px; --radius-2xl:16px; --radius-3xl:24px; --radius-full:9999px;
  --radius-control: var(--radius-base); /* buttons/inputs */
  --radius-card:    var(--radius-lg);   /* cards */
}
```

---

## 4. Elevation (shadows)

The kit builds shadows from three primitive scales rather than pre-composed box-shadows. Compose a shadow as `offset-x offset-y blur spread color`, drawing each part from these:

**shadow/spread (px):** none `0` · xs `-2` · s `-4` · m `-6`
**shadow/position — offset-y (px):** x `0` (offset-x, always 0) · y `4` · y1 `8` · y2 `10` · y3 `12` · y4 `14` · y5 `18` · and negatives y- `-4` · y1- `-8` · y2- `-10` · y3- `-12` · y4- `-14` · y5- `-18`
**shadow/blur (px):** none `0` · xs `4` · s `8` · m `16` · l `24` · xl `32` · 2xl `42` · 3xl `64` · dark `88`

Composition pattern: `box-shadow: 0 <position> <blur> <spread> <color>`, where color is a low-alpha neutral (the UI neutral-variant/900 `#2A3D4A` at low opacity reads correctly on the `#F8F9FD` page). Typical elevations:
- **Card / default:** `box-shadow: 0 4px 16px -6px rgba(42,61,74,0.12);`  (y · blur m · spread m)
- **Subtle / raised control:** `box-shadow: 0 4px 8px -4px rgba(42,61,74,0.10);`  (y · blur s · spread s)
- **Overlay / modal:** `box-shadow: 0 8px 24px -4px rgba(42,61,74,0.16);`  (y1 · blur l · spread s)

> The px building blocks (spread/position/blur) are exact from the kit. The **combination into each named elevation and the exact shadow color/opacity are not shown in these tables** — the composed values above are faithful reconstructions from the primitives. If you need a specific effect-style match, confirm the exact recipe from the Figma effect styles.

```css
:root {
  --shadow-card:    0 4px 16px -6px rgba(42,61,74,0.12);
  --shadow-subtle:  0 4px 8px  -4px rgba(42,61,74,0.10);
  --shadow-overlay: 0 8px 24px -4px rgba(42,61,74,0.16);
}
```

---

## 5. Page composition & layout (desktop Backoffice)

Three zones: **Sidebar** (left) + **NavigationTop** (top of right area) + **Content**.

| Measure | Value |
|---|---|
| Total frame | 1400 × ~1182px |
| Sidebar width — expanded | 240px |
| Sidebar width — collapsed | 58px |
| Right area width (expanded / collapsed) | 1160px / 1342px |
| NavigationTop height | 76px |
| Content area padding | 24px top/left/right, **40px bottom** |
| Content card working width (expanded, after 24+24) | 1064px |

Structure: a horizontal layout — `[ Sidebar (full height) ][ Right area → NavigationTop (full width, 76px) + Content (fills) ]`. Page background = `--color-bg-primary` (#F8F9FD); cards = `--color-bg-secondary` (#FFFFFF), radius lg (8px), card shadow, 24px (spacing/11) padding, full-width inside content.

Layout conventions:
- Auto-layout wrappers hug vertically; only the sidebar fills full height.
- Cards: radius lg (8px), 24px internal padding, white bg (`--color-bg-secondary`), `--shadow-card`.
- Section/card gap: 24px.
- No tabs when sections simply stack on one page — render as stacked cards. Tabs only for mutually exclusive views.

---

## 6. Component structures

Build these to match — same anatomy, padding, radius, and states. Reuse one set of classes across the whole output.

### Sidebar
240px wide (58px collapsed), full height, contains logo + search field + menu (grouped items, one active state per page). Active item uses brand color; hover = light brand tint.

### NavigationTop
76px tall, spans the right area. Right cluster: date/time, user avatar (initials circle, with status indicator), user name. Avatar = circular, brand or neutral fill, inverse text.

### Button
Radius **4px**. Sizes XS / S / M (S is the list-page default). Variants:
- **Primary** — brand fill `#304DDE` (primary/500; hover `#273EB5`, active `#1E308B`), inverse (`#FFFFFF`) text.
- **Secondary** — white/neutral fill, brand or primary text, 1px border.
- **Subtle** — low-emphasis (used for **Filter** and **Export** in toolbars).
- **Ghost / Link** — no fill (e.g. "← Kembali" back link: brand indigo (`#304DDE`), label-lg (14px Lato, semibold 600), with left arrow icon).
Label = label-lg (14px Lato, weight 600/700). Optional left/right icon (16px). States: hover (darker/tint), active (darker), disabled (`--color-text-disabled`, reduced-emphasis fill).

### Input
Radius 4px, sizes S/M. Anatomy: optional label (Label), field with optional left icon (e.g. search), placeholder in secondary/tertiary text, optional helper/error text below. Border `--color-border` (#D6D6D6); focus = brand border.

### Table
Vertical stack: one **header row** + N **body rows** (default 10 mock rows). Cells sized to fixed column widths summing to content width (1064px expanded).
- **Header cell:** small bold label, bottom border, optional sort indicator. COMPASS Manage Users/Roles use **no checkbox column**.
- **Body cell (XS):** one slot per column — text, or a status **Tag**, or an action **Button**. Left-align cell content under left-aligned headers.
- **Action column:** fixed **75px**; row action is an XS Secondary button labeled e.g. "Detail". Give freed width to a flexible content column so the table stays full-width.

### Tag / badge
Small pill, S size. Color variants Green/Yellow/Red/Grey/Blue per the status mapping in §1. Label = label-md (12px Lato). Widen the status column so labels aren't clipped.

### Pagination
Row with "Items per page" (default 10) + page-number controls + prev/next helpers.

### Modal
Centered dialog on a scrim; white card, radius lg (8px), `--shadow-overlay`, 24px padding; header (title + close), body, footer with Secondary + Primary buttons.

### Alert
Full-width banner with status color (Info/Success/Warning/Error), icon, message; used e.g. for dashboard "What's New".

### Empty / error state
Centered illustration + title + description (+ optional CTA) inside a white card. States: Data Not Available (empty record), Search not Found (empty results), 404 / Access Forbidden / Connection Lost (errors). Use the neutral **Grey** visual variant. Write copy in Indonesian for COMPASS.

### Detail header (detail pages)
A white card (radius lg 8px, ~24px padding, ~84px tall) — **not** a breadcrumb: left = **← Kembali** ghost back button (brand indigo `#304DDE`, label-lg semibold) → 1px vertical divider (`#D6D6D6`, ~36px tall) → title (title-lg 22px, bold 700, e.g. "Detail User: <name>"); right = action buttons (e.g. Edit, Secondary/Primary). May carry status Tags + subtitle lines (ERP ID, lifecycle, timestamps). Below it: sectioned label/value cards. With CTAs → space-between; without CTAs → left-align with a 24px gap.

---

## 7. Reuse checklist (per element)

Color → §1 token. Font/size/weight → §2 style. Padding/gap → §3 spacing. Radius → §3 (4 control / 8 card). Shadow → §4. Layout dimensions → §5. Component anatomy → §6. Route everything through the CSS variables; keep one token file + one component stylesheet as the single source of truth for the whole deliverable.

---

## 8. When something is missing

If a design needs a component, color, token, or pattern **not** defined above:

1. **Stop** — don't add the off-system value yet.
2. **Name the gap** — which element needs it, what you looked for here, what's closest.
3. **Propose the closest existing option** from this spec.
4. **Ask** — reuse the closest match, or get explicit OK to create a new, clearly-named off-system asset.

```
⚠️ Not in the COMPASS UI Kit spec: <what's missing>
- Needed for: <which element / why>
- Closest match in the spec: <existing token/component>
- Options:
  1. Reuse <closest existing> (recommended, stays on-system)
  2. Create a new <component/color/token> — needs your OK, off-system
How would you like to proceed?
```

Never let "it wasn't in the spec" become a silent excuse to freehand. **Reuse, or ask.**
