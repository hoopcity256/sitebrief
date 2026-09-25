# SiteBrief — Implementation Status

_Update this file at every checkpoint commit. Git state is the source of truth._

---

## Project

**SiteBrief** — mobile-first contractor/jobsite daily-report SaaS.

---

## Current Accepted Baseline

`b89574e  feat(ui): complete North Star auth and onboarding`
Branch: `main` | Remote: `origin/main` in sync: **yes**

---

## Completed Checkpoints

| Checkpoint | Commit | Description |
|------------|--------|-------------|
| Billing | `d203f79` | Stripe subscription lifecycle |
| CP1 | `c04029d` | Design system foundation |
| CP2 | `8304967` | AppShell / Navigation (useLocation authoritative) |
| Docs | `08035d8` | Design spec restored |
| CP3 | `4a00b78` | Auth + Onboarding redesign |
| CP4 | `cb6f2e5` | Projects experience redesign |
| CP5 | `1937f89` | Project Detail + Report History Navigation |
| **NS+CP6** | **`84d8ab9`** | **North Star visual transformation + CP6 editor + project cover photos** |
| **NS Auth** | **`b89574e`** | **North Star auth + onboarding redesign — OWNER APPROVED** |

---

## Current Checkpoint

### HOSTED SANDBOX DEPLOYMENT — LIVE ✅

**Accepted baseline:** `b89574e  feat(ui): complete North Star auth and onboarding`
**Status:** DEPLOYED — `https://sitebrief-sandbox.pages.dev`

#### What this checkpoint delivers

| Area | Detail |
|------|--------|
| ProjectsPage image-first redesign | 120px cover photo or initials-fallback, shadow card, no borders, pill "New Project" CTA |
| Whole-card navigation | `div[role=button][tabIndex=0]` — entire card (image + text) navigates to `/projects/{id}`. Enter/Space keyboard supported. `focus-visible` ring. No nested `<button>`. |
| Project cover photos — Add/Change/Remove | Three-dot overflow menu: "Add/Change project photo" + "Remove photo" (conditional). `projectCoverPhoto.ts` lib: compress → upload → signed URL. Inline error state (no `alert()`). |
| ProjectDetailPage hero redesign | 200px full-bleed hero image, overlaid 48×48 back button, single "Edit photo" pill → Change/Remove popover. No cover: "Add photo". |
| Report history redesign | Grouped card with dividers, no stray bullets (`ul { list-style: none }`), Draft→editor, Final→preview, entire row keyboard/click accessible |
| MorePage redesign | Inline styles → CSS classes (`more-*`). All billing/subscription logic preserved verbatim. |
| AppShell/navigation visual refinement | Solid white tab bar (no frosted glass), 1.5px top border, active dot indicator, semibold active label |
| CP6 Report Editor | 48×48 back button, primary-color "Mark as Final", two-layer photo-delete, autosave, IDB recovery, auto-grow textareas, max 10 photos, sticky finalize, no `capture="environment"` |
| Sandbox cover-photo migration | `supabase/migrations/20260925000000_project_cover_photos.sql` applied to `toitahshmkxazxqqopzg`. `cover_photo_path TEXT NULLABLE`, private `project-covers` bucket, 4 ownership RLS policies. |
| Real-photo owner visual review | Completed. NS visual direction approved with actual project photograph. |

#### Quality gate

| Gate | Result |
|------|--------|
| `npm test -- --run` | ✅ 37/37 passing (9 files) |
| `npx tsc --noEmit` | ✅ 0 errors |
| `npm run build` | ✅ Clean (PDF chunk >500 kB is pre-existing D2) |
| `git diff --check` | ✅ Clean |
| `North Star/` untracked | ✅ Confirmed — not staged, not committed |
| Production (`qbycpzfyugrsbckrpyak`) | ✅ Untouched |

---

## Next Phase

### Preview + Professional PDF

**Status: NOT STARTED.**

This phase has not begun as part of the NS+CP6 checkpoint.

---

## North Star Transformation — Scope

| Area | Change |
|------|--------|
| AppShell tab bar | Solid white (no frosted glass), 1.5px top border, active dot indicator beneath icon, semibold active label |
| ProjectsPage | Image-first NS card: 120px cover photo (or initials fallback), dominant name, compact meta, pill "New Project" button |
| ProjectDetailPage | Full-bleed 200px hero image header with overlaid back + photo buttons, dominant 22px project name, compact meta line, grouped report list |
| MorePage | Migrated from inline `styles` object to CSS classes: `more-*` classes. All billing logic preserved verbatim. |
| CSS: Global | `ul, ol { list-style: none; padding: 0; margin: 0 }` — fixes stray bullets in report list |
| Cover photos | `src/lib/projectCoverPhoto.ts` (upload, remove, URL), `supabase/migrations/…_project_cover_photos.sql` (applied to sandbox), `cover_photo_path` in `database.types.ts` |
| CP6 | Back button 48×48, Mark as Final → primary blue, photo delete two-layer — all preserved in working tree |

---

## North Star Polish Pass — Changes

| Item | Detail |
|------|--------|
| Whole project card navigates | `project-card` is now `div[role=button][tabIndex=0]`. Click/Enter/Space anywhere on card (image, fallback, name, address) opens `/projects/{id}`. Keyboard `focus-visible` ring (`box-shadow: 0 0 0 3px --color-action`). |
| Interactive child controls do not navigate | Three-dot menu zone uses `onClick e.stopPropagation()` + `onKeyDown e.stopPropagation()`. Menu popover `onClick e.stopPropagation()`. Menu/archive/photo handlers all `e.stopPropagation()`. `project-card__body` is now a `div` — no nested `<button>` inside `<button>`. |
| Cover photo management on ProjectsPage | Photo management moved **entirely to three-dot overflow menu**: "Add project photo" / "Change project photo" + "Remove photo" (only when cover exists) + "Archive project". No persistent overlay on the cover image — image click safely navigates. |
| Cover photo management on ProjectDetailPage | Two-button Remove+Change replaced with **single "Edit photo" pill** → small inline popover with "Change photo" + "Remove photo". No cover: single "Add photo" pill. No double-chrome. |
| Real photo visual review | Completed — owner approved NS direction with real project photograph. |
| Cover photo sandbox infrastructure | Migration `20260925000000_project_cover_photos.sql` applied to `toitahshmkxazxqqopzg`. Bucket + column + 4 policies active. |
| Add / Change / Remove | All three operations functional. Error handling is inline (`project-card__cover-error`, `detail-cover-error`) — no browser `alert()`. |
| Report history routing | Unchanged. Draft → editor, Final → preview. Entire report row is keyboard/click accessible. No stray bullets (`ul { list-style: none }`). |
| CP6 editor work | Fully preserved: autosave, IDB recovery, auto-grow textareas, photo picker, max 10 photos, 44px delete hit targets, sticky Mark as Final, safe-area, finalization → preview. |

---

## North Star Transformation — Quality Gate (Polish Pass)

| Gate | Result |
|------|--------|
| `npx tsc --noEmit` | ✅ Clean |
| `npm test -- --run` | ✅ 37/37 passing (9 files) |
| `npm run build` | ✅ Clean (PDF chunk warning is pre-existing D2) |
| `git diff --check` | ✅ Clean |
| North Star/ untracked | ✅ Confirmed |
| Production untouched | ✅ Confirmed |

---

## North Star No-Change Confirmations

- ✅ No billing/subscription logic changed
- ✅ No new npm dependencies added
- ✅ No Preview/PDF pages changed
- ✅ No `capture="environment"` added
- ✅ All autosave/recovery logic preserved
- ✅ CP6 editor changes preserved
- ✅ Back button ≥48×48 on all screens
- ✅ Cover photo migration applied to sandbox only
- ✅ Image proportions preserved (object-fit: cover, 120px card, 200px hero)
- ✅ AppShell, Editor, More not redesigned in this pass

---

## North Star Auth + Onboarding

**Baseline:** `84d8ab9  feat(ui): implement North Star experience and project covers`
**Status:** OWNER APPROVED — committed as `feat(ui): complete North Star auth and onboarding`

### Sandbox Redirect URL Configuration

`http://localhost:5173/update-password` added to sandbox (`toitahshmkxazxqqopzg`) `additional_redirect_urls` via `supabase config push`.

- Verified applied: `config diff` no longer shows `additional_redirect_urls` as a difference after push.
- `supabase/config.toml` updated to include `http://localhost:5173/update-password` in `additional_redirect_urls`.
- Storage push failed with 402 (vector buckets require paid tier) — unrelated to auth, no impact.
- **Production `qbycpzfyugrsbckrpyak` untouched.**

> **For production deploy**: add the hosted URL + `/update-password` to `qbycpzfyugrsbckrpyak` → Authentication → URL Configuration → Redirect URLs in the Supabase Dashboard.

### Reset email round-trip status

Code path verified in code. Sandbox redirect URL configured. **Actual email round-trip has NOT been manually tested yet** — ready for owner to perform after deployment.


### Changes

| File | Change |
|------|--------|
| `AuthLayout.tsx` | Two-zone NS layout: navy hero panel (wordmark + tagline) + white form panel with rounded top corners. Desktop: centred card with 4px navy accent bar + inline wordmark. `title` prop drives the page-level h1 inside the panel. |
| `LoginPage.tsx` | Uses new `AuthLayout` with `title="Sign In"`. Footer hierarchy: primary Create Account link → tertiary Forgot Password. Added `autoCapitalize="none"` and `spellCheck={false}` on email. |
| `SignUpPage.tsx` | Uses new layout with `title="Create Account"`. Inline "Minimum 8 characters" hint in label. |
| `PasswordResetPage.tsx` | Polished success state: `submitted` flag → shows icon (`MailIcon`) + heading + body + inline "try again" button. No form visible after success. Error path unchanged. |
| `UpdatePasswordPage.tsx` | Uses new layout with `title="New Password"`. Inline password minimum hint in label. |
| `OnboardingPage.tsx` | NS two-zone layout with `BuildingIcon` icon accent above title. Brand color picker: visible color preview swatch (CSS) + overlay native `<input type="color">` + hex display. Removed 'Logo upload coming soon' placeholder. All data model/logic preserved. |
| `src/index.css` | Entire CP3 auth CSS block replaced. New classes: `.auth-hero`, `.auth-hero__wordmark`, `.auth-hero__tagline`, `.auth-panel`, `.auth-panel__header`, `.auth-panel__title`, `.auth-panel__subtitle`, `.auth-panel__body`, `.auth-field-label__hint`, `.auth-field-label__required`, `.auth-link--tertiary`, `.auth-link-btn`, `.auth-sent-state` (+ children), `.onboarding-icon`, `.onboarding-color-row`, `.onboarding-color-preview`, `.onboarding-color-input`, `.onboarding-color-value`, desktop media query at 680px. Removed: `.auth-card`, `.auth-header`, `.auth-wordmark`, `.auth-subtitle`, `.auth-logo-placeholder`, `.auth-color-row`, `.auth-color-swatch`. |

### Auth business logic preserved

| Item | Status |
|------|--------|
| `signIn` | ✅ Unchanged |
| `signUp` | ✅ Unchanged |
| `signOut` | ✅ Unchanged |
| `resetPassword` | ✅ Unchanged |
| `updatePassword` | ✅ Unchanged |
| Password validation (≥8 chars, match) | ✅ Unchanged |
| `sanitizeAuthError` | ✅ Unchanged |
| Redirect-back after login (`location.state.from`) | ✅ Unchanged |
| `AuthGuard` → `/onboarding` redirect | ✅ Unchanged |
| `onboarding_complete: true` on submit | ✅ Unchanged |
| `upsertCompanyProfile` data model | ✅ Unchanged |

### Sign Out verification

`MorePage` → `handleSignOut()` → `await signOut()` → `supabase.auth.signOut()` → fires `onAuthStateChange` in `AuthContext` → `user = null` → `AuthGuard` redirects unauthenticated requests to `/login`. Path is **complete and functional**. No defects found.

### Password reset flow (code path)

1. `PasswordResetPage` → `resetPassword(email)` → `supabase.auth.resetPasswordForEmail(email, { redirectTo: window.location.origin + '/update-password' })`
2. Supabase sends email containing a magic link that redirects to `https://<origin>/update-password#access_token=...&type=recovery`
3. Browser loads `/update-password`; Supabase JS client fires `onAuthStateChange(PASSWORD_RECOVERY, session)` → `AuthContext` sets `user`
4. `UpdatePasswordPage` → `updatePassword(password)` → `supabase.auth.updateUser({ password })`
5. On success → `navigate('/projects')` → `AuthGuard` loads normally

### Reset redirect URL configuration required

The `redirectTo` value is `window.location.origin + '/update-password'`.

For local sandbox testing: `http://localhost:5173/update-password` must be listed in:
> Supabase Dashboard → `toitahshmkxazxqqopzg` → Authentication → URL Configuration → Redirect URLs

For production (do not touch yet): `https://<production-domain>/update-password` must be listed in:
> Supabase Dashboard → `qbycpzfyugrsbckrpyak` → Authentication → URL Configuration → Redirect URLs

Without this configuration, Supabase will reject the redirect URL and the email link will not work.

### Quality gate

| Gate | Result |
|------|--------|
| `npm test -- --run` | ✅ 37/37 passing |
| `npx tsc --noEmit` | ✅ 0 errors |
| `npm run build` | ✅ Clean |
| `git diff --check` | ✅ Clean |
| North Star/ untracked | ✅ Confirmed |
| Production untouched | ✅ Confirmed |

---

---

## Hosted Sandbox Deployment — COMPLETED

**Accepted baseline:** `b89574e  feat(ui): complete North Star auth and onboarding`
**Status:** ✅ LIVE — `https://sitebrief-sandbox.pages.dev`

### Deployment Record

| Field | Value |
|-------|-------|
| Provider | Cloudflare Pages |
| CF Account | Limboproxy@gmail.com's Account |
| Project name | `sitebrief-sandbox` |
| **Canonical sandbox URL** | **https://sitebrief-sandbox.pages.dev** |
| Deployment URL | https://23fdb73a.sitebrief-sandbox.pages.dev |
| Deployed | 2026-09-24 |
| Git baseline | `1ef7f4c` |
| Production URL (untouched) | `sitebrief.scope-guard.com` |
| Sandbox Supabase ref | `toitahshmkxazxqqopzg` (sitebrief-test) |
| Production Supabase (untouched) | `qbycpzfyugrsbckrpyak` |
| Stripe environment | Sandbox — Stripe Live untouched |

### HTTP Smoke Test Results

| Route | Status |
|-------|--------|
| `/` | ✅ 200 HTML |
| `/login` | ✅ 200 SPA fallback |
| `/signup` | ✅ 200 SPA fallback |
| `/reset-password` | ✅ 200 SPA fallback |
| `/update-password` | ✅ 200 SPA fallback |
| `/manifest.json` | ✅ 200 JSON |

### Auth Redirect Status

| URL | Status |
|-----|--------|
| `http://localhost:5173/update-password` | ✅ Applied (prior session) |
| `https://sitebrief-sandbox.pages.dev/update-password` | ✅ Applied 2026-09-24 |

### Billing Redirect Status

`APP_URL` secret updated to `https://sitebrief-sandbox.pages.dev` in sandbox Edge Functions.

| Redirect | URL |
|----------|-----|
| Checkout success | `https://sitebrief-sandbox.pages.dev/billing/success?session_id=...` ✅ |
| Checkout cancel | `https://sitebrief-sandbox.pages.dev/billing/cancel` ✅ |
| Portal return | `https://sitebrief-sandbox.pages.dev/more` ✅ |

### Quality Gate

| Gate | Result |
|------|--------|
| `npm test -- --run` | ✅ 37/37 passing |
| `npx tsc --noEmit` | ✅ 0 errors |
| `npm run build` | ✅ Clean |
| `git diff --check` | ✅ Clean |
| North Star/ untracked | ✅ Confirmed |
| Production untouched | ✅ Confirmed |

### Next Phase After Device Acceptance

**PREVIEW + PROFESSIONAL PDF — not started.**

---


## CP6 Owner Corrections Applied

| # | Correction | Detail |
|---|-----------|--------|
| A | Back button hit target | 40×40 → **48×48px** (ChevronLeftIcon remains ~18px) |
| B | Mark as Final color | `--color-success` (green) → **`--color-primary`** (#1A5276) |
| C | Photo delete geometry | Rebuilt as two-layer: **44×44 transparent `<button>`** + **28×28 `.photo-delete-visual` circle** + 14px `XIcon`. Previous single-layer `padding: 8px` on `box-sizing: content-box` made the dark circle 44px — now correctly 28px visual / 44px hit area. |

---

## CP6 Modified Files

| File | Change |
|------|--------|
| `src/pages/CreateReportPage.tsx` | Full redesign — CSS classes, sticky header, auto-grow textareas, recovery banner, photo grid, sticky action bar |
| `src/index.css` | +399 lines of CP6 editor CSS classes (additive; no existing classes changed) |

---

## CP6 Visual Changes

- **Sticky header**: `ChevronLeftIcon` back button (40×40) + Report #N (`--text-lg`/bold/primary) + date below (`--text-xs`/muted, "Mon, Sep 24, 2026") + save status right-aligned
- **Save status**: Three CSS modifier classes: `--saving` (muted), `--error` (danger/semibold), `--saved` (success). `aria-live="polite"` for screen readers.
- **Recovery banner**: No emoji — clean text "Unsaved draft recovered." + Restore / Dismiss buttons
- **Editor body**: `gap: 0`, sections separated by `border-bottom: 1px solid --color-border-subtle` dividers — no card soup
- **Field labels**: `.editor-section__label` — 11px/600/muted/uppercase (`.t-overline` style)
- **Textareas**: `.textarea-autogrow` (existing CP1 class) — `resize: none`, `overflow: hidden`, `min-height: 80px`, `onInput` auto-grow, re-triggered after initial load and after recovery restore
- **Photo grid**: `repeat(auto-fill, minmax(100px, 1fr))` — ~3 cells at 390px
- **Photo delete**: Visual circle 28×28px, hit area 44×44px via `padding: 8px; margin: -8px`. `XIcon` SVG (white, 14px) — no Unicode character
- **Add Photo slot**: `CameraIcon` SVG (24px) + "Add Photo" label, dashed border, hover state
- **Sticky action bar**: `position: sticky; bottom: 0` using existing `.editor-action-bar` class (CP1). `padding-bottom: max(12px, env(safe-area-inset-bottom))` — safe-area aware
- **Finalize button**: "Mark as Final" — 52px height, full width, success green. Finishing state shows spinner + "Finalizing…" inline
- **Finish error**: Shown above the sticky action bar (not inside scrollable body), with Retry button

---

## CP6 Autosave / Save Status Behavior

| State | Condition | Display |
|-------|-----------|---------|
| Initial / no changes | `!saving && !saveError && !lastSaved` | Empty string |
| Saving | `saving = true` | "Saving…" (muted) |
| Saved | `saving = false, saveError = null, lastSaved != null` | "Saved HH:MM:SS" (success green) |
| Error | `saveError != null` | Error message (danger red/semibold) |

- IDB debounce: 500ms (best-effort, always runs)
- Supabase debounce: 800ms
- Also flushes: `onBlur`, `visibilitychange → hidden`, `pagehide`, 30s interval
- Stale-save protection: `revisionRef` prevents overwriting newer edits with older saves

---

## CP6 Recovery Behavior

1. On load: `loadDraft(reportId)` compared against `report.updated_at`
2. If IDB draft is newer → `recoveryBanner = true`
3. Restore: replaces all three fields from IDB snapshot, re-triggers auto-grow, clears banner
4. Dismiss: clears IDB draft, clears banner
5. Logic unchanged — no new persistence system introduced

---

## CP6 Photo Input Behavior

- `<input type="file" accept="image/*">` — **NO `capture="environment"`** — library access fully available ✅
- Max 10 photos enforced via `photos.length >= 10` guard
- Compression via `uploadPhoto()` → `imageCompression.ts`
- `URL.createObjectURL(result.thumbnailBlob)` for immediate thumbnails
- Object URLs revoked on unmount via `photoUrlsRef`
- Signed URLs (1hr) for server-hydrated existing photos on load

---

## CP6 Finalization

- `handleDone()` → `updateReport(reportId, { ..., is_draft: false })` → `clearDraft(reportId)` → `navigate('/preview/${reportId}')`
- `finishing` boolean prevents duplicate submission ✅
- **Post-finalization destination: `/preview/${reportId}` (already correct before CP6)**
- No behavior change — logic preserved verbatim

---

## CP6 Keyboard / Safe-Area Architecture

- `position: sticky; bottom: 0` on action bar — correct approach per spec §L
- `padding-bottom: max(12px, env(safe-area-inset-bottom))` on action bar
- `editor-body` has `padding-bottom: --space-6 (24px)` so last field scrolls clear of action bar
- `100dvh` used on `.editor-page` (not `100vh`)
- Actual iPhone Safari/Chrome keyboard validation **deferred** — noted as non-blocking

---

## CP6 Defects Found and Fixed

| # | Defect | Fix |
|---|--------|-----|
| 1 | Delete button hit area 22×22px (below 44px minimum) | Increased to 28px visual / 44px hit area via `padding: 8px; margin: -8px` |
| 2 | Delete button used Unicode `✕` character | Replaced with `XIcon` SVG 14px |
| 3 | Add Photo icon used `+` text character | Replaced with `CameraIcon` SVG 24px |
| 4 | Recovery banner had `📝` emoji | Removed — clean text only |
| 5 | Textareas had `resize: vertical`, fixed `rows={4}` | `resize: none`, auto-grow via `onInput`, triggered on load and after recovery |
| 6 | "Done — Mark as Final" button not sticky — scrolled away | Moved to `position: sticky; bottom: 0` action bar |
| 7 | `saveError` displayed with `⚠ ` Unicode prefix | Removed emoji, CSS class conveys danger color |
| 8 | No report date in header | `report.created_at` formatted and shown below report number |
| 9 | Photo grid `minmax(80px, 1fr)` | Updated to `minmax(100px, 1fr)` per spec |

---

## CP6 Quality Gate

| Gate | Result |
|------|--------|
| `npx tsc --noEmit` | ✅ Clean |
| `npm test -- --run` | ✅ 37/37 passing (9 files) |
| `npm run build` | ✅ Clean |
| `git diff --check` | ✅ Clean |

---

## CP6 No-Change Confirmations

- ✅ No schema changes
- ✅ No billing/subscription changes
- ✅ No dependency additions
- ✅ No new persistence system
- ✅ No `capture="environment"` reintroduced
- ✅ No PDF changes
- ✅ No Preview page changes
- ✅ No Project Detail changes
- ✅ No CP7 started

---

## Next Checkpoint

**CP7 — Report Preview + More / Billing**
Status: **NOT STARTED. Awaiting owner authorization.**

---

## Deferred Items

| ID | Description | Target |
|----|-------------|--------|
| D1 | iPhone Safari/Chrome keyboard + sticky action bar validation | Mobile QA |
| D2 | PDF bundle chunk >500 kB (pre-existing) | CP8 |
| D3 | Dedicated maskable PWA icons | CP9 |
| D4 | Browser screenshot automation | Post-launch |
| D5 | Report count metadata on CP4 project cards | Owner authorization required |

---

## Intentionally Untracked

```
North Star/
```
Owner visual reference. Do **not** modify, stage, delete, or commit without explicit owner authorization.

---

## Roadmap

```
CP7   Preview + More / Billing
CP8   Professional PDF redesign
CP9   PWA hardening
CP10  Final QA / regression
```

---

## Checkpoint Workflow

```
IMPLEMENT → TEST → TYPECHECK → BUILD → OWNER REVIEW → UPDATE STATUS → COMMIT → PUSH → NEXT CP
```
