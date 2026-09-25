# SiteBrief — Final Design Specification
**Date**: September 24, 2026 | **HEAD**: `d203f79` | **Status**: APPROVED WITH CORRECTIONS (Rev 2)

---

> **`viewport-fit=cover` CONFIRMED MISSING**  
> Line 7 of `index.html`: `content="width=device-width, initial-scale=1.0"` — no `viewport-fit=cover`.  
> All `env(safe-area-inset-*)` values currently return **0** on every iPhone.  
> This is a P0 fix in Checkpoint 1.

---

## A. DESIGN TOKENS

All tokens live in `:root` in `src/index.css`. Values refined from the north-star image's design panel (`#1A5276` primary, `#F8F8FC` background, `#FFFFFF` surface) and owner decisions.

### Color Tokens

```css
:root {
  /* ── Brand ──────────────────────────────────── */
  --color-primary:        #1A5276;   /* Navy — headings, active nav, primary buttons */
  --color-primary-hover:  #154360;   /* Pressed / hover state */
  --color-primary-active: #0F3047;   /* Deep press */
  --color-primary-soft:   #EBF3F9;   /* Selected nav item background */
  --color-primary-muted:  rgba(26,82,118,0.10); /* Badge fill, focus ghost */

  /* ── Action (secondary interactive) ─────────── */
  --color-action:         #2563EB;   /* from north-star panel — CTAs, links */
  --color-action-hover:   #1D4ED8;

  /* ── Semantic ────────────────────────────────── */
  --color-success:        #16A34A;
  --color-success-soft:   #F0FDF4;
  --color-warning:        #D97706;
  --color-warning-soft:   #FFFBEB;
  --color-danger:         #DC2626;
  --color-danger-soft:    #FEF2F2;

  /* ── Neutrals ────────────────────────────────── */
  --color-background:     #F8F8FC;   /* Page background — very slightly blue-tinted grey */
  --color-surface:        #FFFFFF;   /* Card / input surface */
  --color-surface-raised: #FFFFFF;   /* Elevated surfaces (same until shadow differentiates) */
  --color-border:         #E5E7EB;   /* Dividers, input borders, card strokes */
  --color-border-subtle:  #F0F1F3;   /* Ultra-subtle within-card dividers */

  /* ── Text ────────────────────────────────────── */
  --color-text:           #111827;   /* Primary text */
  --color-text-secondary: #374151;   /* Secondary labels */
  --color-text-muted:     #6B7280;   /* Captions, metadata */
  --color-text-disabled:  #9CA3AF;   /* Disabled state */
  --color-text-inverse:   #FFFFFF;   /* Text on primary/dark backgrounds */

  /* ── Focus ────────────────────────────────────── */
  --color-focus-ring:     rgba(26,82,118,0.22);
}
```

### Derived Semantic Aliases (reference only, not extra tokens)
- "Positive / active subscription" → `--color-success`
- "Warning / trial" → `--color-primary` (trial is a positive state, not a warning)
- "Danger / expired / error" → `--color-danger`
- "Coming soon / disabled" → `--color-text-disabled`

---

## B. TYPOGRAPHY SCALE

No external font dependency. System font stack only. Premium feel is achieved through **deliberate size steps, weight discipline, and line-height control**.

```css
:root {
  /* ── Font stack ──────────────────────────────── */
  --font-sans: -apple-system, BlinkMacSystemFont, "SF Pro Text",
               "Segoe UI", Roboto, Helvetica, Arial, sans-serif;

  /* ── Scale ───────────────────────────────────── */
  --text-2xl:  26px;   /* Screen titles (Projects, More) */
  --text-xl:   22px;   /* Project names on detail page */
  --text-lg:   18px;   /* Report number header, section titles */
  --text-md:   16px;   /* Body text, input text, button labels */
  --text-sm:   14px;   /* Secondary info, timestamps, card meta */
  --text-xs:   12px;   /* Badges, tiny labels, save status */
  --text-2xs:  11px;   /* ALL-CAPS section headers, caption overlines */

  /* ── Weight ──────────────────────────────────── */
  --weight-regular:   400;
  --weight-medium:    500;
  --weight-semibold:  600;
  --weight-bold:      700;

  /* ── Line heights ────────────────────────────── */
  --leading-tight:   1.25;   /* Headings */
  --leading-snug:    1.4;    /* Sub-headings, card titles */
  --leading-normal:  1.55;   /* Body prose, textarea content */
  --leading-relaxed: 1.65;   /* Long-form reading (preview sections) */
}
```

### Typographic Roles (applied via CSS classes)

| Class | Size | Weight | Line Height | Use |
|-------|------|--------|-------------|-----|
| `.t-screen-title` | 26px | 700 | 1.25 | "Projects", "More" page headings |
| `.t-page-title` | 18px | 700 | 1.25 | Report #N header, project name on detail |
| `.t-project-name` | 16px | 600 | 1.4 | Project card title |
| `.t-body` | 16px | 400 | 1.55 | Report prose, input values |
| `.t-label` | 14px | 500 | 1.4 | Form labels, card meta labels |
| `.t-meta` | 13px | 400 | 1.4 | Dates, addresses, secondary info |
| `.t-caption` | 12px | 500 | 1.25 | Badge text, save status, photo count |
| `.t-overline` | 11px | 600 | 1.2 | Section headers ("ACCOUNT", "SUBSCRIPTION") |

---

## C. SPACING SCALE

4px base grid. Pixel values only — no mixing with other units except where `env(safe-area-inset-*)` is required.

```css
:root {
  --space-1:   4px;
  --space-2:   8px;
  --space-3:   12px;
  --space-4:   16px;
  --space-5:   20px;
  --space-6:   24px;
  --space-8:   32px;
  --space-10:  40px;
  --space-12:  48px;
}
```

### Application Rules
- **Screen edge padding**: `--space-4` (16px) on mobile, `--space-6` (24px) on desktop
- **Card internal padding**: `--space-4` vertical, `--space-4` horizontal
- **Section gap (between cards/sections)**: `--space-3` (12px) on mobile, `--space-4` (16px) on desktop
- **Header internal padding**: `--space-3` vertical, `--space-4` horizontal; top padding defers to safe-area
- **Form field gap**: `--space-4` (16px) between fields
- **List item gap**: `--space-2` (8px) between project/report cards
- **Inline gap (icon+label)**: `--space-2` (8px)

---

## D. RADIUS, BORDER, AND SHADOW RULES

```css
:root {
  --radius-sm:   6px;    /* Small inputs, small buttons, photo slots */
  --radius-md:   10px;   /* Cards, form cards, report cards */
  --radius-lg:   14px;   /* Modal-like forms, onboarding card */
  --radius-full: 9999px; /* Pill badges, FAB button, avatar circles */

  --border-width:      1px;
  --border-color:      var(--color-border);      /* E5E7EB */
  --border-subtle:     var(--color-border-subtle); /* F0F1F3 — within-card */

  --shadow-none: none;
  --shadow-xs:   0 1px 2px rgba(0,0,0,0.05);
  --shadow-sm:   0 1px 4px rgba(0,0,0,0.06), 0 1px 2px rgba(0,0,0,0.04);
  --shadow-md:   0 4px 12px rgba(0,0,0,0.07), 0 2px 4px rgba(0,0,0,0.04);
  --shadow-lg:   0 8px 24px rgba(0,0,0,0.09), 0 2px 6px rgba(0,0,0,0.05);

  --transition-fast: 0.12s ease;
  --transition-base: 0.18s ease;
}
```

### Usage Rules
- **Project/report list cards**: `--shadow-sm` + `--radius-md` border `1px solid var(--color-border)`
- **Form inline cards** (new project form, billing card): `--shadow-sm` + `--radius-md`
- **Page headers**: no shadow — use `border-bottom: 1px solid var(--color-border)` only
- **Tab bar**: `border-top: 1px solid var(--color-border)` only; no shadow
- **Primary buttons**: `--shadow-sm` (subtle lift); no shadow on secondary/ghost
- **Photo thumbnails**: `--radius-sm` + `border: 1px solid var(--color-border-subtle)`
- **NO floating shadows on content surfaces** — surface separation via background color + border, not elevation

---

## E. BUTTON SYSTEM

### Variants

| Variant | Background | Text | Border | Min-height | Usage |
|---------|-----------|------|--------|-----------|-------|
| Primary | `--color-primary` | white | none | 52px | "New Daily Report", "Mark as Final", "Create Project" |
| Action | `--color-action` | white | none | 52px | "Share PDF", "Download PDF" |
| Secondary | `--color-surface` | `--color-primary` | `1px solid --color-primary` | 48px | "Edit", secondary actions |
| Ghost | transparent | `--color-text-muted` | `1px solid --color-border` | 48px | "Cancel" |
| Danger | `--color-surface` | `--color-danger` | `1px solid --color-border` | 48px | "Sign Out" |
| Destructive-fill | `--color-danger` | white | none | 52px | (reserved — no current use) |

### Shared Button Rules
- `border-radius: var(--radius-md)`
- `font-size: var(--text-md)` (16px), `font-weight: var(--weight-semibold)` (600)
- `padding: 0 var(--space-5)` horizontally minimum
- `-webkit-tap-highlight-color: transparent` on all
- Hover: darken background by one step (hover token)
- Disabled: `opacity: 0.50`, `cursor: not-allowed`
- Transition: background/opacity `var(--transition-fast)`
- **Full-width CTAs** (New Daily Report, Mark as Final, Share PDF): `width: 100%`
- **Icon+label buttons**: `display: flex; align-items: center; gap: var(--space-2); justify-content: center`
- **Minimum touch target**: 48px height on all interactive elements; 52px for primary actions

### FAB (Floating Action Button)
- Used only for "New Project" on the Projects screen
- **48×48px** minimum tap target, `--radius-full`, `--color-primary`, white `+` icon SVG
- `box-shadow: 0 2px 8px rgba(26,82,118,0.30)`
- Lives in the page header row (not floating over content)

---

## F. FORM / INPUT SYSTEM

### Input Field Rules
- Height: 48px minimum
- Border: `1px solid var(--color-border)`, radius `var(--radius-sm)`
- Focused: border `--color-primary`, `box-shadow: 0 0 0 3px var(--color-focus-ring)`
- Background: `var(--color-surface)` (`#FFFFFF`)
- Font: `var(--text-md)` / `var(--weight-regular)` / `var(--color-text)`
- Placeholder: `var(--color-text-disabled)` (`#9CA3AF`)
- Padding: `0 14px` horizontal

### Textarea Rules (report editor)
- Auto-growing: JS sets `height: auto` then `height: scrollHeight + 'px'` on every input event
- Minimum height: 80px (≈3 lines)
- Maximum height: none — grows without limit (content scrolls within the editor's scroll context)
- `resize: none` — user drag-resize removed; auto-grow handles sizing
- `line-height: var(--leading-normal)` (1.55) for comfortable prose entry
- `padding: 12px 14px`

### Label Rules
- `font-size: var(--text-sm)` (14px), `font-weight: var(--weight-medium)` (500)
- `color: var(--color-text-secondary)` (`#374151`)
- `margin-bottom: var(--space-1)` (4px) between label and input

### Error State
- Input border becomes `--color-danger`
- Error message below input: `font-size: var(--text-xs)` (12px), `color: var(--color-danger)`

### Form Card Container (New Project form, Onboarding)
- Background `--color-surface`, `--radius-md`, `--shadow-sm`, border `1px solid --color-border`
- Padding `--space-5` (20px) all sides on mobile

---

## G. MOBILE APPSHELL SPECIFICATION

### Constraints
- **Breakpoint**: this spec applies at < 1024px
- **Target viewport**: 390–430px width (iPhone 14/15/16 Pro range)

### Structure
```
┌─────────────────────────────┐
│  [PAGE CONTENT SCROLLS]     │  flex: 1, overflow-y: auto
│                             │  padding-bottom: calc(60px + env(safe-area-inset-bottom))
│                             │
│                             │
├─────────────────────────────┤
│  [FIXED TAB BAR — 60px]     │  position: fixed; bottom: 0; left: 0; right: 0;
│  Projects | Reports | More  │  + padding-bottom: env(safe-area-inset-bottom)
└─────────────────────────────┘
```

### Content Scroll Area
- `flex: 1` child of `.app-shell`
- No `overflow: hidden` — natural scroll
- `padding-bottom: calc(var(--tab-bar-height) + env(safe-area-inset-bottom))` prevents content being hidden under the tab bar

### Tab Bar
- `height: 60px` (fixed, before safe area)
- `background: var(--color-surface)` (`#FFFFFF`)
- `border-top: 1px solid var(--color-border)`
- `backdrop-filter: blur(8px)` — subtle glass effect when content scrolls behind
- `-webkit-backdrop-filter: blur(8px)`
- `background: rgba(255,255,255,0.92)` when backdrop-filter applies

---

## H. DESKTOP RESPONSIVE APPSHELL SPECIFICATION

### Constraints
- **Breakpoint**: ≥ 1024px

### Structure
```
┌────────────┬──────────────────────────────────────────┐
│  SIDEBAR   │  [PAGE CONTENT SCROLLS]                  │
│  220px     │  max-width: 920px; margin: 0 auto        │
│  sticky    │  min-height: 100dvh                       │
│  top: 0    │                                          │
│  height:   │                                          │
│  100vh     │                                          │
└────────────┴──────────────────────────────────────────┘
```

### Sidebar
- `width: 220px`, `flex-shrink: 0`
- `position: sticky; top: 0; height: 100vh` — stays visible while content scrolls
- `background: var(--color-surface)` — flat white, no gradient (owner decision)
- `border-right: 1px solid var(--color-border)`
- `padding-top: max(24px, env(safe-area-inset-top))`
- `padding-left: max(0px, env(safe-area-inset-left))`
- `order: -1` — renders left of content

### Sidebar Wordmark
- "SiteBrief" text — `font-size: 17px; font-weight: 700; color: var(--color-primary)`
- `padding: 0 20px 20px`
- `border-bottom: 1px solid var(--color-border)`
- `margin-bottom: var(--space-2)` (8px)
- No logo image, no decorative furniture, no avatar (owner decision)

### Content Zone
- `flex: 1; min-width: 0`
- `max-width: 920px; margin: 0 auto; width: 100%`
- At 1280px+: max-width expands to 960px

### Desktop Nav Items (sidebar rows)
- Height: 44px minimum
- `flex-direction: row; gap: 12px; padding: 10px 16px; margin: 2px 10px`
- `border-radius: var(--radius-md)`
- Active: `background: var(--color-primary-soft)`, label `color: var(--color-primary)`, icon inherits
- Inactive: label/icon `color: var(--color-text-muted)`
- Hover: `background: var(--color-border-subtle)`

---

## I. NAVIGATION SPECIFICATION

### Tab / Nav Items (three items — owner decision confirmed)

| Tab | Icon | Route | Behavior |
|-----|------|-------|----------|
| Projects | Folder SVG | `/projects` | Navigate; no-op if already on `/projects` or any `/projects/*` sub-route |
| Reports | Document SVG | — | Shows "coming soon" toast; tab rendered visually distinct (opacity 0.5, no active state possible) |
| More | Three-dots SVG | `/more` | Navigate; no-op if already on `/more` |

### Active State Derivation
Remove the `activeTab` prop from `AppShell`. Derive active state from `useLocation()` inside the shell:

```typescript
const location = useLocation()
const activeTab = location.pathname.startsWith('/projects') ? 'projects'
                : location.pathname === '/more' ? 'more'
                : 'none'
```

### Mobile Tab Item Anatomy
```
[icon 24×24]
[label 11px, weight 600]
```
- Active icon: `var(--color-primary)`, label same
- Inactive icon/label: `var(--color-text-muted)`
- Coming-soon: `opacity: 0.40`; no active treatment ever
- Touch target: `min-height: 44px; min-width: 44px` — tap entire cell, not just icon
- No tap highlight: `-webkit-tap-highlight-color: transparent`

### Coming-Soon Toast
- Appears above tab bar: `bottom: calc(60px + env(safe-area-inset-bottom) + 12px)`
- Background `var(--color-text)`, white text, `font-size: 13px`
- `border-radius: var(--radius-full)`, `padding: 8px 18px`
- Auto-dismisses after 2 seconds
- Animate in/out with `opacity` + `translateY` transitions

---

## J. PROJECTS SCREEN SPECIFICATION

### Header
- Background: `var(--color-surface)`, `border-bottom: 1px solid var(--color-border)`
- Padding: `max(16px, env(safe-area-inset-top))` top, `16px` sides, `14px` bottom
- **Left**: "SiteBrief" wordmark on mobile (`font-size: 22px; font-weight: 700; color: var(--color-primary)`) — acts as the de-facto logo
- **Right**: round FAB (`44×44px`) with `+` icon, `--color-primary` fill

> Note: north-star image shows a search field below the wordmark. Search is **not in MVP scope** — omit the search bar but keep the layout position clean for future addition.

### Project List
- Edge padding: `16px` sides
- Card gap: `8px` between cards
- No section labels above the list

### Project Card Anatomy
```
┌──────────────────────────────────────────┐
│ [small icon]  Project Name               │
│               Customer Name              │
│               Address                    │
│               4 reports · Last 9/24/26   │
│                                   [···] │
└──────────────────────────────────────────┘
```
- Card: `background: --color-surface; border: 1px solid --color-border; border-radius: --radius-md; shadow: --shadow-sm; padding: 14px 16px`
- **No thumbnail region**: do not reserve a 56×56px image slot. There is no project photo in the data model. Typography and spacing are the primary hierarchy.
- **Optional visual anchor**: a small building/folder SVG icon (`20×20px`, `--color-text-muted`) may appear left of the project name as a subtle anchor — it must not dominate the layout.
- **Project name**: `--text-md` (16px), `--weight-semibold`, `--color-text`, one line, ellipsis
- **Client name**: `--text-sm` (14px), `--weight-regular`, `--color-text-muted`, one line, ellipsis
- **Address**: `--text-sm` (14px), `--color-text-muted`, one line, ellipsis
- **Report count + last date**: `--text-xs` (12px), `--color-text-muted` — "4 reports · Last 9/24/26"
- **Three-dot menu** (`···`): top-right corner, minimum `44×44px` tap target area, visual icon `--color-text-muted`. On tap: shows inline "Archive" action (current confirm dialog behavior stays)

### Empty State
- Centered vertically, SVG illustration (folder), "No projects yet", "Tap + to create your first project.", primary button "New Project"

### New Project Form
- Slides in **below the header** as an inline card (current behavior) — do not modal
- Form fields: Project Name*, Customer Name, Address, Customer Email, Customer Phone
- Submit: "Create Project" primary button; Cancel: ghost button

### Loading State
- Skeleton: two grey rounded rectangles (card-sized), pulsing `opacity` animation, no spinner

---

## K. PROJECT DETAIL SPECIFICATION

### Header
- Back button (`←` SVG chevron, `40×40px`, `border: 1px solid --color-border`, `--radius-sm`)
- Project name (`--text-lg`, `--weight-bold`, `--color-primary`), truncates to one line
- No secondary action in header

### Info Strip (replaces north-star hero photo)
The north-star shows a large project photo hero below the header. **This is rejected for MVP** — no project photo schema column exists. Replace with a compact info strip:
```
┌────────────────────────────────────────┐
│ 👤 Paul Phantom                        │
│ 📍 44 Jasper Industries Ln             │
│ 4 Reports · Last Report Sep 24         │
└────────────────────────────────────────┘
```
- Background: `--color-surface`, `border: 1px solid --color-border`, `--radius-md`, `margin: 12px 16px`
- Icons: small SVG (person, pin), `--color-text-muted`
- **No Active/status badge** — subscription entitlement is not project status and must not be represented as such. Subscription state gates the New Daily Report action and shows the upsell banner only.
- Report count + last date: `--text-sm`, `--color-text-muted`

### Upsell Banner
- Shown when `!subscription.entitled`
- `background: --color-warning-soft; border: 1px solid --color-warning; border-radius: --radius-md`
- `margin: 0 16px`
- Text + "View Plans" ghost button inline
- Compact — single row when possible

### Primary CTA
- "**+ New Daily Report**" — Primary button, `width: 100%`, `52px` height, `margin: 12px 16px`
- Disabled state (expired subscription) shows `opacity: 0.50`, `cursor: not-allowed`
- Creating state: shows spinner + "Creating…" label

### Recent Reports Section
- Section label: "RECENT REPORTS" in `.t-overline` style (`11px`, `600`, `--color-text-muted`, uppercase, `margin: 0 0 8px 4px`)
- Report cards stacked with `8px` gap

### Report Card Anatomy
```
[doc icon]  Report #4           [Draft pill]  [›]
            Sep 24, 2026
```
- `background: --color-surface; border: 1px solid --color-border; --radius-md; --shadow-sm; padding: 14px 16px`
- Report number: `--text-sm` (14px), `--weight-semibold`, `--color-text`
- Date: `--text-xs` (12px), `--color-text-muted`
- Badge: `Draft` (warning color), `Final` (success color) — pill shape, `--radius-full`

### NAVIGATION FIX (owner decision 15)
```typescript
onClick={() => navigate(
  r.is_draft
    ? `/update/${id}/new?reportId=${r.id}`   // editor
    : `/preview/${r.id}`                      // preview
)}
```

### Empty Report History
- Dashed border empty box: "No reports yet. Tap + New Daily Report above."

---

## L. REPORT EDITOR SPECIFICATION

### Shell
- **No AppShell tab bar** — full-screen focused editor (current behavior, keep)
- Background: `--color-background`

### Header (sticky)
- `position: sticky; top: 0; z-index: 50`
- `background: var(--color-surface); border-bottom: 1px solid var(--color-border)`
- `padding: max(12px, env(safe-area-inset-top)) 16px 12px`
- **Left**: back chevron button (`40×40px`)
- **Center**: "Report #N" (`--text-lg`, `--weight-bold`, `--color-primary`) + date on the line below in `--text-xs --color-text-muted` ("Thu, Sep 24, 2026")
- **Right**: save status indicator (see §U)

### Recovery Banner
- Below header, `margin: 8px 16px 0`
- `background: --color-warning-soft; border: 1px solid #FCD34D; --radius-sm`
- "Unsaved draft recovered." text + Restore / Dismiss buttons inline
- Clean sans serif — no emoji

### Editor Body
- `padding: 16px`
- `display: flex; flex-direction: column; gap: 0` — sections separated by dividers, not card gaps (owner decision: avoid card soup)
- Sections are NOT wrapped in individual border cards
- Instead: each section is a **labelled group** separated from the next by `border-bottom: 1px solid var(--color-border-subtle)` and `padding-bottom: 16px; margin-bottom: 16px`

### Report Sections (three fields)
Each section follows this pattern:
```
[SECTION LABEL — 11px, 600, muted, uppercase]
[textarea — auto-growing, no resize handle]
```

Section labels and placeholder text:
- **Work Completed** → placeholder: "e.g. Framing, rough plumbing completed — crew of 4"
- **Problems / Delays** → placeholder: "e.g. Material delivery delayed, weather hold"
- **Next Steps** → placeholder: "e.g. Electrical rough-in Monday, inspector call Tuesday"

Textarea rules:
- `border: 1px solid var(--color-border); --radius-sm; padding: 12px 14px`
- `font-size: --text-md (16px); line-height: --leading-normal (1.55)`
- Focused: primary border + focus ring
- **Auto-grow**: `resize: none; overflow: hidden; min-height: 80px`
- On `onInput` (not onChange — fires even from programmatic sets): `el.style.height = 'auto'; el.style.height = el.scrollHeight + 'px'`
- Must also re-trigger on initial load to correctly size pre-filled content

### Photos Section (see also §M)
- Section label: "PHOTOS (N/10)"
- `border-bottom: none` (last section before action bar)

### Action Bar (sticky bottom — keyboard safety architecture)
```css
.editor-action-bar {
  position: sticky;
  bottom: 0;
  background: var(--color-surface);
  border-top: 1px solid var(--color-border);
  padding: 12px 16px;
  padding-bottom: max(12px, env(safe-area-inset-bottom));
}
```
- **Single primary action**: "Mark as Final" — Primary button, `width: 100%`
- The report is continuously autosaved while editing. No explicit "Save Draft" button is needed — back navigation leaves the report as a draft automatically, and autosave guarantees persistence.
- If there is a specific technical scenario where an explicit save action is required beyond autosave, that reason must be identified and reported before a Save Draft control is added.
- Finishing state: button shows inline spinner + "Finalizing…", disabled
- Error state: inline `--color-danger` text above the action bar row

> **iOS keyboard safety**: This `position: sticky; bottom: 0` architecture is the correct approach to keep the finalization action accessible when the keyboard is raised. However, do **not** treat sticky positioning as a Safari guarantee. The actual behavior must be empirically validated on a physical iPhone or Safari simulator during Checkpoint 6. If validation reveals the action is still obscured, address it during mobile hardening using the safest approach available at that time.

---

## M. PHOTO UX SPECIFICATION

### Photo Grid (within editor)
- `display: grid; grid-template-columns: repeat(auto-fill, minmax(100px, 1fr)); gap: 8px`
- On a 390px viewport at 16px padding: ~3 cells across at ≈112px each

### Photo Slot — Existing Photo
- Aspect ratio `1/1` (square), `--radius-sm`, `overflow: hidden`
- `border: 1px solid var(--color-border-subtle)`
- Image: `object-fit: cover; width: 100%; height: 100%`
- **Delete button**: `position: absolute; top: 4px; right: 4px`
  - **Visual circle**: `width: 28px; height: 28px`, `background: rgba(0,0,0,0.60); border-radius: --radius-full`
  - **Tappable hit area**: the wrapping `<button>` element must be `min-width: 44px; min-height: 44px` with negative margin or padding to extend the hit area beyond the 28px visual boundary, e.g. `padding: 8px; margin: -8px`
  - SVG ✕ icon (white, 14×14), not a Unicode character; centered within the visual circle
  - Disabled during `deleting` state: `opacity: 0.50`

### Photo Slot — Uploading
- Same size slot
- Centered `<Spinner size="sm" />` on `--color-background`
- No progress bar (upload is fast after compression)

### Photo Slot — Error
- `background: --color-danger-soft`
- Small red `--text-2xs` error message centered
- Delete button still shows to allow clearing the failed slot

### Add Photo Slot (when < 10 photos)
- Dashed border: `2px dashed var(--color-border)`; `--radius-sm`; same aspect ratio square
- Center content: camera SVG icon (`24×24`, `--color-text-muted`) + "Add Photo" label below (`--text-2xs`, `--color-text-muted`)
- Entire slot is the `<label>` wrapping the hidden `<input type="file" accept="image/*">`
- On tap: iOS camera/library picker

### Photo Count
- "PHOTOS (3/10)" — section label shows count live; no separate counter

---

## N. PREVIEW SPECIFICATION

### Shell
- Wrapped in AppShell (tab bar visible) — current behavior is correct

### Header
- Back → project detail
- "Report #N" (`--text-lg`, `--weight-bold`, `--color-primary`)
- Draft/Final badge (pill, right-aligned in header)

### Preview Body
- `padding: 16px`
- Meta row: project name + date — `--text-xs --color-text-muted`, space-between

### Content Sections (Work Completed, Problems/Delays, Next Steps)
- Background `--color-surface`, `--radius-md`, `border: 1px solid --color-border`, `--shadow-sm`
- Section label: `.t-overline` (11px, 600, muted, uppercase)
- Body text: `--text-md` (16px), `--leading-relaxed` (1.65), `pre-wrap`
- Sections that are empty/null are **omitted entirely** (current behavior correct)
- "2 more sections →" collapsed indicator (from north-star) is **rejected for MVP** — show all sections always; collapsing adds complexity without benefit

### Photo Section
- Label: "SITE PHOTOS (N)"
- Grid: `repeat(auto-fill, minmax(120px, 1fr)); gap: 8px` — slightly larger than editor thumbnails
- Photos: `border-radius: --radius-sm; object-fit: cover; aspect-ratio: 4/3` (landscape on preview — matches real photo orientation better than square)

### Action Area
```
[Edit]           [Share PDF / Download PDF]
48px secondary   48px action (blue), flex: 1
```
- Generating state: action button shows spinner + "Generating PDF…"
- Error state: inline danger banner above actions
- "Building your PDF — this may take a moment…" helper text below buttons while generating

---

## O. MORE / BILLING SPECIFICATION

### Header
- "More" — `.t-screen-title` (26px, 700, `--color-primary`)
- Avatar: the north-star shows a user avatar circle top-right. Since this provides no MVP function (owner decision 8), **omit**. Keep header simple.

### Body Layout
- `padding: 20px 16px`
- Sections separated by `--space-5` (20px) gaps
- Section labels: `.t-overline`

### Account Section (from north-star)
The north-star shows "Company" and "Email" as tappable list rows with a chevron (›), implying they navigate somewhere. Since settings editing is not implemented (MVP), **render as display-only rows without chevrons**. Do not add edit navigation.

Row anatomy:
```
[icon]  Company          Limbo Proxy      [no chevron — read only]
[icon]  Email            user@email.com
```
- `background: --color-surface; border: 1px solid --color-border; --radius-md`
- Each row: `padding: 14px 16px; border-bottom: 1px solid --color-border-subtle`
- Row icon: `20×20px SVG, --color-text-muted`
- Label: `--text-sm, --weight-medium, --color-text-secondary`
- Value: `--text-sm, --color-text-muted`, right-aligned, truncate

### Subscription Section
Unchanged functional logic. Visual improvements:

**Trial active + cancel scheduled** (from north-star):
```
┌─────────────────────────────────────────┐
│  Trial — 14 days left      [trial badge] │
│ ─────────────────────────────────────── │
│ ⚠ Automatic renewal canceled            │
│  Your trial will end on Oct 8, 2026.    │
│  Access remains active until then.       │
└─────────────────────────────────────────┘
```
- Warning row: `background: rgba(217,119,6,0.07)`, text `--color-warning`, icon ⚠ SVG
- All other states follow the same card-row pattern as Account section

**Billing row** (when entitled):
```
[clock icon]  Billing          [Manage →]
```
- "Manage" is a ghost/outline button (not a tappable row, to distinguish from navigation)

### Additional Rows
The north-star shows "Help & Support", "Terms of Service", and "Privacy Policy" rows. These destinations do not exist yet. **Omit these rows entirely** for this phase. They will be added when the actual static/legal/support destinations are built (Day 6+ work).

### Sign Out
- Full-width `Danger` variant button (white background, red text, border)
- `margin-top: 8px`
- Signing out state: `opacity: 0.50`, spinner inline

---

## P. AUTH / ONBOARDING SPECIFICATION

### Auth Pages (Login, SignUp, PasswordReset, UpdatePassword)
- `AuthLayout`: centered card, 420px max-width, `--radius-lg`, `--shadow-md`, `border: 1px solid --color-border`
- **Background**: `--color-background` (`#F8F8FC`) — not pure white
- **Wordmark**: "SiteBrief" `24px / 700 / --color-primary`; sub-label below
- Migrate all hardcoded hex values to CSS variable references
- Password show/hide: replace emoji toggle with `EyeIcon` / `EyeOffIcon` SVG (16×16)
- Error banner: `--color-danger-soft` background, `--color-danger` text, `--radius-sm`
- All auth pages share `AuthLayout` wrapper — no changes to routing logic

### Onboarding Page
- Same centered card treatment as auth
- "Set up your company profile" subtitle
- **Brand color picker**: keep, but add helper text: "Used as an accent in your PDF reports."
- **Logo placeholder**: keep the dashed placeholder with "Logo upload coming soon"
- Migrate all hardcoded hex values to CSS variables
- No structural changes to form fields or submit logic

---

## Q. PDF PAGE ARCHITECTURE

### Format: US Letter (8.5” × 11”), portrait

### Structure: Single Flowing Document

A daily field report is a concise professional construction record, not a presentation deck. All content flows on a single document. There is no separate cover page and no forced page breaks between sections.

**Page content flows in this order:**
```
┌─────────────────────────────────────────────┐
│  [DOCUMENT HEADER]                           │
│  SiteBrief | Daily Field Report  Report #N   │
│  [DRAFT/FINAL pill]               [date]     │
│ ─────────────────────────────────────────── │
│  [PROJECT + COMPANY INFO — two-column table]  │
│  Project:  514 Jasper Place                  │
│  Customer: Paul Phantom                      │
│  Address:  44 Jasper Industries Ln           │
│  Company:  Limbo Proxy                       │
│  Phone:    (if set)    Email: (if set)        │
│ ─────────────────────────────────────────── │
│  WORK COMPLETED                              │
│  [prose, wraps and paginates naturally]       │
│                                              │
│  ISSUES / DELAYS                             │
│  [prose, wraps and paginates naturally]       │
│                                              │
│  NEXT STEPS                                  │
│  [prose, wraps and paginates naturally]       │
│                                              │
│  [PHOTOS — 2-column grid, follow narrative]   │
│  [Photo 01]           [Photo 02]              │
│  [Photo 03]           [Photo 04]              │
│  …                                           │
└─────────────────────────────────────────────┘
```

### Document Header (repeats on every page via `fixed`)
- `SiteBrief` left (`18pt / Helvetica-Bold / PDF_NAVY`) + `Daily Field Report` secondary label below (`8pt / Helvetica / PDF_MUTED`)
- `Report #N` right-aligned (`14pt / Helvetica-Bold / PDF_NAVY`) + date below (`8pt / PDF_MUTED`)
- DRAFT/FINAL pill badge next to report number
- 2pt navy border below header
- Repeats on all pages using `fixed` prop

### Project + Company Info Block
- Immediately below the header
- Grey-background info row (`PDF_SURFACE`): 2-column layout, each column a label + value pair
  - Left column: Project, Customer, Address
  - Right column: Company, Phone (if set), Email (if set)
- `8pt / Helvetica` body, `7pt / Helvetica-Bold` uppercase labels
- `border-radius: 3pt`, `padding: 8pt`, `margin-bottom: 12pt`

### Narrative Sections
- Work Completed, Issues / Delays, Next Steps — each a labelled block
- Section label: `8pt / Helvetica-Bold / PDF_NAVY / uppercase / letter-spacing`
- Body: `10pt / Helvetica / PDF_TEXT / line-height 1.55`
- `margin-bottom: 12pt` between sections
- If a section is null/empty: show "None reported." in `PDF_MUTED`
- `@react-pdf/renderer` wraps and paginates text automatically

### Photo Section
- Follows the narrative directly — no forced page break inserted artificially
- If photos exist, a section label "SITE PHOTOS (N)" appears after the last narrative section
- Photos flow in the 2-column grid immediately below
- If the remaining vertical space on the current page is less than one photo row height + label, `@react-pdf/renderer` will naturally push to the next page; do not insert a forced break
- `wrap={false}` on each 2-column photo row ensures pairs are never split

### Expected Page Counts (approximate)
- Short report + 0 photos: 1 page
- Short report + 4 photos (2 rows): 1–2 pages
- Normal report + 0 photos: 1–2 pages
- Normal report + 10 photos (5 rows): 2–4 pages
- Long report + 10 photos: 3–5 pages

### When Sections Are Empty
- `work_completed` null/empty → "None reported."
- `problems` null/empty → "None reported."
- `next_steps` null/empty → "None reported."
- No photos → photo section omitted entirely

### Page Numbering
`<Text render={({ pageNumber, totalPages }) => \`Page ${pageNumber} of ${totalPages}\`} fixed />` in footer of every page.

---

## R. PDF TYPOGRAPHY AND SPACING

`@react-pdf/renderer` uses PDF points (1pt ≈ 1/72 inch). All values in points.

### PDF Color Constants
```typescript
const PDF_NAVY    = '#1A5276'    // brand primary
const PDF_ACCENT  = brandColor ?? '#1A5276'  // only if contrast safe (see §T)
const PDF_TEXT    = '#111827'
const PDF_MUTED   = '#6B7280'
const PDF_BORDER  = '#E5E7EB'
const PDF_SURFACE = '#F8F8FC'
const PDF_WHITE   = '#FFFFFF'
```

### Type Scale
| Role | Size (pt) | Weight | Font |
|------|-----------|--------|------|
| Document title | 20pt | Bold | Helvetica-Bold |
| Report number | 14pt | Bold | Helvetica-Bold |
| Section header | 9pt | Bold | Helvetica-Bold |
| Body text | 10pt | Regular | Helvetica |
| Meta / caption | 8pt | Regular | Helvetica |
| Footer | 7pt | Regular | Helvetica |
| "DRAFT" badge text | 7pt | Bold | Helvetica-Bold |

### Page Margins
- All pages: `44pt` top (below fixed header), `48pt` bottom (above fixed footer), `44pt` left/right
- The fixed document header and footer are positioned `absolute` with `fixed` prop; they repeat on all pages automatically

### Section Spacing
- Between major sections: 16pt
- Section header → body: 6pt
- Body line-height: 1.55

---

## S. PDF PHOTO LAYOUT AND PAGINATION RULES

### Column Structure
- Content width: 8.5" - (44+44)pt margins = 7.28" = 524pt
- 2-column layout with 12pt gap: each column = `(524 - 12) / 2` = **256pt wide**
- Photo height: maintain 4:3 aspect ratio → `256 × 3/4` = **192pt tall**
- Each photo element: `width: 256pt; height: 192pt; object-fit: 'cover'; border-radius: 3pt`
- Row bottom margin: 10pt between photo rows

### Photo Row Component
```jsx
<View style={{ flexDirection: 'row', gap: 12, marginBottom: 10 }} wrap={false}>
  <Image src={url1} style={{ width: 256, height: 192, objectFit: 'cover', borderRadius: 3, borderWidth: 1, borderColor: PDF_BORDER }} />
  <Image src={url2} style={{ ... }} />
</View>
```

### Overflow and Pagination
- `wrap={false}` on each row: a photo pair never splits across pages
- If odd number of photos: last row has one image left-aligned (right column empty)
- **No forced page break before photos.** Photos follow the narrative naturally. `@react-pdf/renderer` will start a new page automatically if insufficient space remains for the next row.
- Maximum photos in schema: 10 → 5 rows → approximately 2.5 pages of photos at this size (photos may run to page 3 or 4 for a 10-photo report)

### Signed URL vs Data URI Decision
- **Current behavior**: signed URLs passed directly to `<Image>` — defer change until Safari testing during mobile hardening phase (owner decision 19)
- **Risk acknowledgment**: potential Safari cross-origin restriction in pdf.js worker; memory with 10 compressed photos at ≤200KB each ≈ ≤2MB total — acceptable
- **Recommendation logged**: if Safari testing reveals missing photos in PDF, convert to data URIs in `handlePdfAction` before calling `generateReportPdfBlob`

---

## T. DRAFT / FINAL PDF TREATMENT

**Owner decision 12**: No large diagonal watermark. Restrained professional treatment.

### Draft Treatment
- **Cover page**: small pill badge top-right of the report number area
  - `background: #FEF2F2; color: #DC2626; border: 1px solid #DC2626; padding: 2pt 8pt; border-radius: 10pt`
  - Text: "DRAFT" — `7pt / Helvetica-Bold`
- **Footer**: every page footer shows "DRAFT" in the right badge — same pill, same red
- **No watermark** across page body

### Final Treatment
- **Cover page**: "FINAL" pill badge in green — `background: #F0FDF4; color: #16A34A; border: 1px solid #16A34A`
- **Footer**: "FINAL" pill in green

### Brand Color Safety Check for PDF Accent
`brand_color` from `company_profiles` is a user-entered hex string (from a `<input type="color">`, so it is always a valid 6-digit hex).

Contrast check: Compute relative luminance of `brand_color`. If WCAG contrast ratio against `#FFFFFF` is ≥ 3.5:1, use it as the PDF accent (header band, section borders). Otherwise fall back to `PDF_NAVY`. Implement this check as a pure TypeScript function in `pdf.tsx`.

`brand_color` is **not** applied to the application UI (owner decision 14).

---

## U. EMPTY / LOADING / ERROR / SAVE-STATE TREATMENT

### Loading States
**Skeleton screens preferred over full-page spinners where possible:**
- **Projects list loading**: 3 grey skeleton card rectangles, pulsing opacity animation (`@keyframes pulse: 0%/100% opacity 0.4, 50% opacity 0.8`)
- **Project detail loading**: skeleton info strip + skeleton CTA + 2 skeleton report rows
- **Report preview loading**: skeleton section cards
- **Editor loading**: spinner (editor is transient; skeleton not needed)

**Spinner component** (shared):
```typescript
// Sizes: sm=16px, md=24px, lg=32px
// Colors: primary (default), white (for dark backgrounds)
```

### Error States
- Retry button: Secondary variant, `"Try Again"`
- Error message: plain prose, `--color-danger`, `--text-sm`
- No technical details or error codes shown to user

### Save Status Indicator (editor header)
```
Saving…        →  [pulsing amber dot]  "Saving"
Saved           →  [solid green dot]   "Saved"
Not saved       →  [solid red dot]     "Not saved — check connection"
(nothing)       →  empty (before first save)
```
- Dot: `8×8px circle`, `margin-right: 6px`
- Text: `--text-xs` (12px), `--color-text-muted`
- All in the header, right-aligned, `flex-shrink: 0`
- Remove the time string (e.g., "Saved 3:24 PM") — unhelpful and leaks internal state

### Empty States (list contexts)
Pattern:
```
[SVG illustration — simple, thin-stroke, --color-border]
[Heading — --text-md, --weight-semibold, --color-text]
[Subtext — --text-sm, --color-text-muted]
[Optional: primary button action]
```

---

## V. MOBILE SAFARI CONSIDERATIONS

### 1. viewport-fit=cover (CONFIRMED FIX REQUIRED)
**Current**: Line 7 `index.html` — `content="width=device-width, initial-scale=1.0"` — **MISSING** `viewport-fit=cover`.  
**Fix**: `content="width=device-width, initial-scale=1.0, viewport-fit=cover"`  
**Impact**: Without this, all `env(safe-area-inset-*)` returns 0. The tab bar overlaps iPhone home indicator. Fixed in Checkpoint 1.

### 2. Keyboard + Sticky Action Bar
The report editor's current "Done" button is at the end of a flex column. On iPhone with keyboard raised, it is hidden behind the keyboard.  
**Architecture**: `position: sticky; bottom: 0` action bar with `padding-bottom: max(12px, env(safe-area-inset-bottom))`. Sticky positioning on iOS is intended to keep the bar above the keyboard's visual viewport.  
**Validation required**: Do not treat this as guaranteed behavior. Empirically confirm during Checkpoint 6 testing on a physical iPhone or Safari simulator with each textarea focused and the keyboard open. The finalization action must be reliably reachable without layout trapping or obscuring. If sticky alone does not satisfy the requirement, address it during mobile hardening.

### 3. 100dvh
`dvh` (dynamic viewport height) accounts for retractable browser chrome. All pages correctly use `min-height: 100dvh`. No change needed. Supported Safari 15.4+.

### 4. `-webkit-tap-highlight-color: transparent`
All tappable elements must have this property. Currently set on `.tab-item` class in `index.css`. Must be extended to all interactive elements in the shared button/card system.

### 5. `createImageBitmap` Compression
`imageCompression.ts` uses `createImageBitmap` with `resizeQuality: 'high'`. Safari ignores `resizeQuality` but does not error. No impact on compression output. No change needed.

### 6. Textarea Input Events
Auto-grow textareas should use the `input` event, not `change`. React's `onChange` maps to the `input` event — this is correct. The `onInput` attribute is not needed separately. Height recalculation must also fire on initial render to correctly size pre-loaded content (call `scheduleAutoResize()` after `loadReport()` populates state).

### 7. Safari PWA Standalone Mode
When added to home screen (`display: standalone`), Safari hides the browser UI. The status bar area at the top is governed by `env(safe-area-inset-top)`. Without `viewport-fit=cover` this is 0 — fixing in Checkpoint 1 resolves this.

### 8. Signed URLs and PDF Photos (deferred)
Confirmed as a risk but not yet a proven defect. Safari does support CORS fetch in Web Workers in current versions. Test during mobile hardening phase (Checkpoint 10+). No code change in this phase.

---

## W. EXACT IMPLEMENTATION CHECKPOINTS

### Checkpoint 1 — Foundation (P0 Fixes + Design System)
**Goal**: All P0 bugs fixed. Shared UI component library established. No visible regression.

Files changed:
- `index.html` — add `viewport-fit=cover`; add `<meta name="theme-color">`; fix favicon to reference a real icon instead of `vite.svg`
- `src/index.css` — full token expansion, new utility classes, skeleton animation, auto-grow textarea stub, action bar class
- `src/components/ui/Spinner.tsx` — NEW
- `src/components/ui/Button.tsx` — NEW
- `src/components/ui/Badge.tsx` — NEW
- `src/components/ui/PageHeader.tsx` — NEW
- `src/components/ui/SectionCard.tsx` — NEW
- `src/components/ui/EmptyState.tsx` — NEW
- `src/components/ui/ErrorState.tsx` — NEW
- `src/components/icons.tsx` — NEW (consolidate all SVG icons)
- `public/icon-192.png` — NEW (generated)
- `public/icon-512.png` — NEW (generated)

Acceptance:
- `npm test -- --run` passes all 37 tests (zero regressions)
- App renders correctly at 390px with no visual changes yet
- `viewport-fit=cover` confirmed in browser DevTools
- PWA install shows correct icon on iOS

---

### Checkpoint 2 — AppShell Redesign
**Goal**: Navigation correct, auto-derived, tab bar visually matches spec.

Files changed:
- `src/components/AppShell.tsx` — remove `activeTab` prop, derive from `useLocation()`, tab bar visual update, icon update via `icons.tsx`, coming-soon toast polish
- `src/index.css` — updated `.app-shell__tab-bar`, `.tab-item` rules

Acceptance:
- Active tab highlights correctly on `/projects`, `/projects/:id`, `/preview/:reportId`
- Reports tab shows coming-soon toast, no navigation
- Desktop sidebar renders flat (no gradient), wordmark visible
- Tab transition between Projects and More is smooth

---

### Checkpoint 3 — Auth + Onboarding Migration
**Goal**: Auth pages use design tokens, SVG icons, look consistent with app.

Files changed:
- `src/components/AuthLayout.tsx` — migrate hex → CSS vars
- `src/components/AuthGuard.tsx` — migrate hex → CSS vars, use `<Spinner>`
- `src/pages/LoginPage.tsx` — migrate hex → CSS vars, SVG eye icon
- `src/pages/SignUpPage.tsx` — migrate hex → CSS vars
- `src/pages/PasswordResetPage.tsx` — migrate hex → CSS vars
- `src/pages/UpdatePasswordPage.tsx` — migrate hex → CSS vars
- `src/pages/OnboardingPage.tsx` — migrate hex → CSS vars, add brand-color helper text

Acceptance:
- Full auth flow (login → onboarding → projects) works on 390px
- No raw hex values remain in auth page files
- Password show/hide uses SVG eye icon (not emoji)

---

### Checkpoint 4 — Projects Screen Redesign
**Goal**: Projects screen matches spec visually. Typography and spacing as primary hierarchy; no thumbnail region.

Files changed:
- `src/pages/ProjectsPage.tsx` — full visual redesign using shared components; optional small SVG icon anchor instead of 56×56 thumbnail; skeleton loading state

Acceptance:
- Projects load as skeleton then reveal cards
- Empty state displays correctly
- New Project form appears inline below header
- Create + Archive flows work
- No 56×56 image region in any card
- 390px and desktop (1024px+) layouts correct

---

### Checkpoint 5 — Project Detail + Navigation Fix
**Goal**: Project detail matches spec. Draft → editor, Final → preview navigation fixed.

Files changed:
- `src/pages/ProjectDetailPage.tsx` — full visual redesign; navigation fix; project info strip; report card redesign

Acceptance:
- Tapping a draft report navigates to editor
- Tapping a final report navigates to preview
- Subscription upsell banner displays only when not entitled
- New Daily Report button disabled + explained when expired
- Desktop layout correct

---

### Checkpoint 6 — Report Editor UX Polish
**Goal**: Editor is the primary field-use screen. Auto-grow, sticky action bar, and keyboard accessibility all correct.

**Pre-implementation check (autosave)**: Before implementing the action bar, verify `CreateReportPage` autosave behavior. If the existing autosave guarantees persistence such that back navigation correctly preserves all draft content, the action bar contains only "Mark as Final" (primary, full-width). A redundant Save Draft button must not be added. If investigation reveals a technical gap where autosave does not cover a specific scenario, report the reason before adding an explicit save control.

Files changed:
- `src/pages/CreateReportPage.tsx` — sticky header with date, auto-grow textareas, section layout (no card soup), sticky action bar with "Mark as Final", improved save status indicator, photo section improvements, recovery banner polish

Acceptance:
- On 390px iPhone (or simulator), "Mark as Final" button is reliably accessible with each textarea focused and the software keyboard open — no layout trapping, no obscured action
- Textareas grow as text is typed — no internal scroll
- Pre-loaded content in textareas is correctly sized on initial render
- Photo grid shows 100px minimum cells; delete button visual is 28px but hit area is 44×44px
- Back navigation leaves report as a draft (no explicit Save Draft button unless investigation requires it)
- "Mark as Final" marks `is_draft: false` and navigates to preview
- Recovery banner appears when appropriate; Restore works
- All 37 tests still pass

---

### Checkpoint 7 — Preview + More Screen Polish
**Goal**: Preview and More/billing screens match spec.

Files changed:
- `src/pages/ReportPreviewPage.tsx` — visual redesign; photo grid 4:3 aspect; action area
- `src/pages/MorePage.tsx` — Account section (read-only rows + icons); Billing section improvements; Help/ToS/Privacy rows **omitted** (not stubbed)
- `src/pages/Placeholders.tsx` — `BillingSuccessPage` and `BillingCancelPage` visual polish

Acceptance:
- Preview shows all sections with correct typography
- Photos display at 4:3 aspect in preview grid
- Edit / Share / Download buttons correct
- More page shows account info, subscription status (all states)
- No Help/Support, Terms, Privacy rows present
- Sign out works

---

### Checkpoint 8 — PDF Redesign
**Goal**: Professional single-flow PDF. Larger photos. Company contact info. Page numbers. Brand color accent. No forced page structure.

Files changed:
- `src/lib/pdf.tsx` — full document redesign: single flowing layout (header + project/company info block + narrative + photos), 2-column photo layout at 256×192pt, page numbers, company phone/email, brand color accent in header, draft/final pill treatment, contrast safety check for brand_color

Acceptance:
- PDF generates successfully on desktop Chrome
- Short report with 0 photos produces 1 page
- Normal report with 10 photos produces 3–5 pages (naturally, not forced)
- Company contact info appears in info block (if profile has phone/email)
- Photo pairs do not split across pages (`wrap={false}`)
- No forced page break between narrative and photos
- Draft shows "DRAFT" red pill in header and footer; Final shows green "FINAL"
- Brand color accent uses user color (if contrast safe) or navy fallback
- Page numbers ("Page 1 of N") appear on every page
- All 37 tests still pass

---

### Checkpoint 9 — PWA Icons and Manifest Hardening
**Goal**: PWA installation works correctly on iOS and Android.

**CP1 backlog item — maskable icons**: During CP1 review, `icon-192.png` and `icon-512.png` were set to `purpose: "any"` because the generated artwork (document+pencil, rounded-rect framing) extends into canvas corners that Android's circular maskable mask would clip. Dedicated maskable variants must be created here.

Files changed:
- `public/icon-192-maskable.png` — NEW: maskable variant; all artwork inside the 40%-radius safe zone (r=76.8px for 192px icon)
- `public/icon-512-maskable.png` — NEW: same at 512px (safe zone r=205px)
- `public/manifest.json` — add second entry per size: existing `purpose: "any"` + new `purpose: "maskable"`; verify all fields
- `index.html` — confirm `<link rel="apple-touch-icon">` present (done in CP1)

Acceptance:
- "Add to Home Screen" on iOS shows correct SiteBrief icon
- PWA installs in Chrome on Android with un-clipped artwork
- `display: standalone` confirmed in installed app
- Maskable icon artwork is fully inside the 40%-radius safe zone


---

### Checkpoint 10 — Final QA Pass and Regression Check
**Goal**: Full regression test across all screens and states.

Files changed: any fixes identified during QA.

Acceptance:
- All 37 automated tests pass
- `tsc --noEmit` reports 0 errors
- Full manual walkthrough: signup → onboarding → create project → create report → edit → add photos → mark final → preview → share/download PDF → more/billing
- Auth flows: login, logout, password reset (UI only — email delivery is H-series)
- Subscription states: trial, expired, cancelled — all show correctly
- 390px iPhone viewport (or closest simulator) passes all interactions
- 1024px desktop layout passes all interactions

---

## X. EXACT FILES PER CHECKPOINT

| Checkpoint | New Files | Modified Files |
|-----------|-----------|---------------|
| 1 | `src/components/ui/Spinner.tsx`, `Button.tsx`, `Badge.tsx`, `PageHeader.tsx`, `SectionCard.tsx`, `EmptyState.tsx`, `ErrorState.tsx`, `src/components/icons.tsx`, `public/icon-192.png`, `public/icon-512.png` | `index.html`, `src/index.css` |
| 2 | — | `src/components/AppShell.tsx`, `src/index.css` |
| 3 | — | `AuthLayout.tsx`, `AuthGuard.tsx`, `LoginPage.tsx`, `SignUpPage.tsx`, `PasswordResetPage.tsx`, `UpdatePasswordPage.tsx`, `OnboardingPage.tsx` |
| 4 | — | `src/pages/ProjectsPage.tsx` |
| 5 | — | `src/pages/ProjectDetailPage.tsx` |
| 6 | — | `src/pages/CreateReportPage.tsx` |
| 7 | — | `src/pages/ReportPreviewPage.tsx`, `src/pages/MorePage.tsx`, `src/pages/Placeholders.tsx` |
| 8 | — | `src/lib/pdf.tsx` |
| 9 | — | `public/manifest.json`, `index.html` |
| 10 | (fixes as needed) | (fixes as needed) |

---

## Y. ACCEPTANCE CRITERIA PER CHECKPOINT

(Embedded in §W above per checkpoint.)

**Global acceptance criteria** that apply to every checkpoint:
1. `npm test -- --run` → all tests pass
2. `npx tsc --noEmit` → 0 TypeScript errors
3. No `any` types introduced
4. No hardcoded hex values introduced in new code (use CSS variables or PDF constants)
5. No new dependencies added without explicit owner approval
6. No new report fields or schema changes
7. No service worker code

---

## Z. NORTH-STAR ELEMENTS REJECTED OR MODIFIED

### Rejected (do not implement)

| Element | Reason |
|---------|--------|
| Project hero photo on Project Detail | No `project_photos` schema column; not in MVP |
| Hero photo on PDF cover page | No separate cover page; document is single flowing record |
| Photo captions in editor and PDF | Owner decision 20 |
| Photo timestamp labels in PDF | No `created_at` per-photo in current `report_photos` select query |
| Photo reordering UI | Owner decision 20 |
| Photo numbering overlay (01, 02…) | Grid position implies order; no explicit numbering |
| Search field below wordmark on Projects | Week 2 feature |
| User avatar (circle "A") in headers | No MVP function — owner decision 8 |
| Chevron-link rows for Help, ToS, Privacy | Omitted entirely; added when actual destinations exist |
| Chevron-link rows for Account editing | Settings page not built — render as read-only |
| Weather field in editor | Not in schema — owner decision 20 |
| Crews & Labor table | Not in schema — owner decision 20 |
| Materials / Equipment | Not in schema — owner decision 20 |
| "2 more sections →" collapsed preview | Adds complexity; show all sections always |
| Diagonal draft watermark | Owner decision 12 |
| Voice input microphone button on textarea | Not in scope |
| "Save Draft" button | Autosave makes this redundant; back navigation preserves draft; add only if investigation reveals a gap |

### Modified (implement in a modified form)

| Element | North Star Shows | What We Implement |
|---------|-----------------|-------------------|
| Project list card photos | Real site thumbnail (56×56) | No thumbnail region at all; optional small 20×20 SVG icon anchor only |
| PDF cover page | Separate cover with hero photo | No separate cover; all content on one flowing document |
| PDF hero photo | Full-width site photo on cover | No separate cover; accent color in document header only |
| PDF photo captions | "West elevation framing, Sep 24, 10:14 AM" | Photos with no captions (not in schema) |
| PDF forced 3-page structure | Cover / Narrative / Photos rigid layout | Single flow: all sections followed by photos, paginating naturally |
| PDF Crews & Labor table | Full table | Omitted — not in schema |
| PDF Materials/Equipment | Bullet list | Omitted — not in schema |
| "Active" badge on project and detail | Green "Active" pill tied to subscription | No status badge; subscription state gates actions only, not project labeling |
| Typography: custom fonts | Implies Inter or similar | System font stack only (owner decision 2) |
| Sidebar gradients | Subtle blue gradient treatment | Flat white sidebar (owner decision 7) |
| Sidebar company/avatar furniture | Company name + initials avatar | Omitted (owner decision 8) |
| Reports tab navigation | Fully navigable Reports tab | Coming-soon (owner decision 1 — keep three tabs, Reports is placeholded) |
| Word counters | Not shown in image but discussed | Omitted (owner decision 3) |
| Save Draft button | Implied by autosave workflow | Omitted; autosave + back navigation replaces it |
| Help/ToS/Privacy stub rows | Tappable rows with coming-soon | Omitted entirely until destinations exist |

### Accepted As-Is (from north-star)

| Element | Notes |
|---------|-------|
| Clean flat card hierarchy for project list | ✅ |
| Section-based editor (no card soup) | ✅ Owner confirmed |
| 2-column PDF photo grid | ✅ Owner confirmed |
| Auto-growing textareas | ✅ Owner confirmed |
| Sticky action bar with single Mark as Final | ✅ Spec'd in §L; Save Draft removed per owner correction 7 |
| "Automatic renewal canceled" warning row in More | ✅ Already implemented; visual polish only |
| Professional navy/blue PDF brand | ✅ |
| Trial badge in More page subscription section | ✅ |
| 3-tab mobile nav (Projects, Reports, More) | ✅ Owner decision 1 |
| System font typography | ✅ Owner decision 2 |
| @react-pdf/renderer retention | ✅ Owner decision 9 |
| Restrained draft pill in PDF | ✅ Owner decision 12 |

---

*End of Final Design Specification. Implementation begins on owner approval.*
