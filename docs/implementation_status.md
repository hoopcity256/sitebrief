# SiteBrief — Implementation Status

_Update this file at every checkpoint commit. Git state is the source of truth._

---

## Project

**SiteBrief** — mobile-first contractor/jobsite daily-report SaaS.

---

## Current Accepted Baseline

`31fb6be  chore(deploy): complete hosted sandbox deployment`
Branch: `main` | Remote: `origin/main` in sync: **yes**
Working tree: **modified — E2E hardening in progress (uncommitted)**

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
| **Deploy** | **`31fb6be`** | **Hosted sandbox deployment complete** |
| **E2E Hardening** | *(pending commit)* | **Onboarding, PDF, phone/email/cover, trial funnel, duplicate-trial prevention** |

---

## Current Checkpoint

### HOSTED MOBILE E2E HARDENING — DEPLOYED TO SANDBOX ✅

**Prior baseline:** `31fb6be  chore(deploy): complete hosted sandbox deployment`
**Sandbox:** `https://sitebrief-sandbox.pages.dev`

#### What this checkpoint delivers

| Area | Bug/Feature | Fix |
|------|-------------|-----|
| Onboarding redirect | Submit tapped → stayed on onboarding (looked like a refresh) | Fixed: `OnboardingPage` now calls `setProfile(saved)` from `useCompanyProfile` before `navigate('/projects')`. This updates AuthGuard's cached profile synchronously, preventing the stale-profile redirect loop. |
| PDF generation on mobile | "Could not generate PDF. Please try again." on every attempt | Fixed: pre-fetch all signed photo URLs as data-URLs in the main thread before calling `generateReportPdfBlob`. Eliminates Web Worker CORS/CSP issues. `public/_headers` CSP updated with `worker-src blob:` and `script-src blob:`. |
| PDF share vs generate error | All errors (generation AND share failures) collapsed into same message | Fixed: `blob` variable initialized to `null`; inner share failure caught separately. Generation fail → "Could not generate PDF". Share fail → "PDF was created but could not be shared. Use the Download button instead." + Download button appears on iOS share failure. |
| Download PDF fallback | No download option on mobile if sharing fails | Fixed: Download PDF button appears alongside Share PDF when `pdfState === 'error'`, and always shows on non-share-capable devices. |
| New Project — phone formatting | No formatting on phone input | Fixed: `formatUSPhone()` live-reformats as user types → `(555) 123-4567`. Digits only stored. |
| New Project — email validation | No email validation | Fixed: inline validation on blur + on submit. No `alert()`. Red border + error message below field. Blocks submission if invalid. |
| New Project — cover photo | No cover photo at creation time | Fixed: optional photo picker in New Project form. Sequence: create project → upload cover using project.id → navigate. If upload fails: project is kept, contextual error shown, user directed to project page to add photo later. |
| Trial funnel | New users discover "subscription required" only when trying to create a report | Fixed: prominent `TrialBanner` shown on Projects page for users with no subscription row (`subscription.row === null`). Monthly + Annual buttons go directly to Stripe Checkout. Dismissable. |
| Duplicate trial prevention | Same card can start multiple trials on different accounts | Fixed: `trial_redemptions` table tracks payment method fingerprints. `stripe-webhook` checks fingerprint on `checkout.session.completed`; duplicate found → subscription immediately cancelled + set to `incomplete_expired`. Fingerprint retrieved from payment intent, subscription default PM, or customer default PM (with fallbacks). |
| Trial cancellation safety | Cancel during trial may revoke access immediately | Verified: `cancel_at_period_end=true` used by Stripe; `has_active_access()` checks `trial_end > now()` independently of cancel flag — no change needed. |

#### Infrastructure applied to sandbox

| Item | Detail |
|------|--------|
| `trial_redemptions` migration | Applied to `toitahshmkxazxqqopzg` — new table with fingerprint index, RLS enabled (no browser policies) |
| `company_logos_bucket` migration | Applied to `toitahshmkxazxqqopzg` — private `company-logos` bucket, ownership-scoped RLS policies |
| `stripe-webhook` Edge Function | Redeployed to `toitahshmkxazxqqopzg` with duplicate-trial detection |
| Cloudflare Pages | Deployed `https://sitebrief-sandbox.pages.dev` — current deployment: `d39c6a3` |

---

## HARDENING PASS 2 — REAL iPHONE RETEST FINDINGS + FIXES ✅

**Commit:** `d39c6a3 fix(app): complete hosted mobile hardening pass 2`
**Sandbox:** `https://sitebrief-sandbox.pages.dev`
**Sandbox Supabase:** `toitahshmkxazxqqopzg`

### Root Cause Discoveries

| # | Issue | Root Cause |
|---|-------|-----------|
| 1 | Onboarding bounce | `OnboardingPage` and `AuthGuard` each called `useCompanyProfile()` as **independent hook instances** with isolated state. `setProfile()` in OnboardingPage only updated its own instance. AuthGuard still saw `onboarding_complete=false` and redirected back. |
| 2 | Auth "check email" mismatch | `config.toml` line 226: `enable_confirmations = false`. Sandbox does NOT require email confirmation. `signUp()` returns a session immediately. But the UI always showed "Check your email…" regardless. |
| 3 | PDF instrumentation needed | PDF pipeline was a single try/catch — exact failing stage unknown. Added 11-stage logging. |
| 4 | Download PDF not visible | Download PDF was hidden behind `(!supportsShare || isPdfError)`. On iPhone (supportsShare=true), it was invisible until Share failed. |
| 5 | Nav icon artifact | `.tab-item--active .tab-item__icon::after` positioned at `bottom: -4px` overflowed 2px past the icon container into the 2px `gap` before the label text. |
| 6 | Email validation | `@` alone accepted on some browsers. No shared validator — each page had its own regex or just `type="email"`. |
| 7 | Phone formatting | `formatUSPhone()` existed only in `ProjectsPage.tsx`. Onboarding had raw `type="tel"` with no formatting. |

### Fixes Applied

| Area | Fix |
|------|-----|
| **Onboarding architecture** | Created `src/context/CompanyProfileContext.tsx` — shared Context that both `AuthGuard` and `OnboardingPage` consume. `setProfile()` now updates state visible to all consumers. `useCompanyProfile.ts` re-exports from Context for backwards compatibility. |
| **Onboarding instrumentation** | Console logging added: `[onboarding] submit started`, `upsert start`, `upsert success`, `setProfile called, navigating`. Logs: boolean flags only, no PII. |
| **Auth flow** | `SignUpPage` now inspects `data.session`. Session returned → navigate to `/onboarding` (no "check email"). No session → dedicated `check-email` state, Create Account button locked. |
| **Confirm Password** | Added second password field to signup with: inline mismatch error, Create Account disabled until match, `aria-describedby` for accessibility. Confirm Password never sent to Supabase. |
| **PDF 11-stage instrumentation** | `ReportPreviewPage` now logs exact stage, error, photo count, MIME type, Blob size. Stages: load report → load profile → load project → resolve photos → create signed URLs → fetch images → convert to data URLs → construct PDF data → render Blob → validate → share/download. HEIC/HEIF files detected and skipped with `console.warn`. |
| **Download always visible** | Both Share PDF and Download PDF buttons always shown from start. They share the same generated `Blob` — no duplicate generation. |
| **PDF error states** | Four distinct states: `generating`, `generation-failed`, `share-failed`, `download-failed`. Only generation-failed disables Download. |
| **Shared email validator** | `src/lib/validation.ts`: `isValidEmail()` — pragmatic regex, rejects `john@`, `@company.com`, `john@company`, `john@.com`, `john@company.`, `@`. Applied to: signup, password reset, onboarding, project forms. |
| **Shared phone formatter** | `src/lib/validation.ts`: `formatUSPhone()`, `normalizeUSPhone()`. Applied to: onboarding and project forms. Duplicate local copies removed from `ProjectsPage.tsx`. |
| **Company logo in onboarding** | Optional logo upload to private `company-logos` Supabase bucket. Compressed before upload (max 400 KB). Preview + Change + Remove. `logo_storage_path` already existed in DB types. |
| **Nav icon artifact** | Replaced `::after` bottom-overflow dot with `::before` top-bar on `.tab-item`. Added `position: relative` and `overflow: hidden` to `.tab-item`. |

### Quality Gate

| Gate | Result |
|------|--------|
| `npm test -- --run` | ✅ **74/74 passing** (11 test files) |
| `npx tsc --noEmit` | ✅ 0 errors |
| `npm run build` | ✅ Clean (PDF chunk warning is pre-existing, D2) |
| `git diff --check` | ✅ Clean |
| Production (`qbycpzfyugrsbckrpyak`) | ✅ Untouched |
| Sandbox DB | ✅ `company_logos_bucket` migration applied |

### Manual PDF Diagnostic Required (Owner)

Before declaring PDF fixed, verify against these three scenarios on real iPhone:

| Test | What to do | Pass condition |
|------|------------|----------------|
| A — text only | Create a new finalized report with NO photos | PDF generates and Share/Download both work |
| B — one JPEG photo | Add one project photo, finalize, PDF | PDF includes the photo |
| C — multiple photos | Multiple photos, finalize, PDF | All photos appear |

Open Safari DevTools → Console before testing to capture `[pdf:*]` logs identifying the exact failing stage.

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
