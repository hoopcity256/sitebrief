# SiteBrief — Implementation Status

_Update this file at every checkpoint commit. Git state is the source of truth._

---

## Project

**SiteBrief** — mobile-first contractor/jobsite daily-report SaaS.

---

## Baseline Before CP2 Commit

`c04029d  feat(ui): establish SiteBrief design system foundation`

---

## Completed Checkpoints

| Checkpoint | Commit | Description |
|------------|--------|-------------|
| Billing | `d203f79` | Stripe subscription lifecycle |
| CP1 | `c04029d` | Design system foundation |
| CP2 | _(see commit hash below)_ | AppShell / Navigation |

> **CP2 commit hash**: to be recorded after push. See session report.

---

## CP2 Verified Behavior

- `useLocation()` is authoritative for navigation active state
- `/projects` and `/projects/*` → Projects active
- `/preview/*` → Projects active
- `/more` → More active
- Reports remains Coming Soon; does not navigate
- `activeTab` prop is `@deprecated`, retained for callsite compatibility, silently ignored
- `CreateReportPage` is standalone and outside AppShell (full-screen, intended)
- `ReportPreviewPage` remains inside AppShell (intended)
- CP2 did not alter either page's architecture
- Mobile fixed bottom navigation retained, safe-area aware
- Desktop flat white sidebar retained (≥1024px)
- Shared CP1 icons used (`FolderIcon`, `DocumentIcon`, `EllipsisHIcon`)

---

## Latest Quality Gate (CP2)

| Gate | Result |
|------|--------|
| `npm test -- --run` | ✅ 37/37 passing (9 files) |
| `npx tsc --noEmit` | ✅ Clean |
| `npm run build` | ✅ Clean |

**Pre-existing advisory:** `@react-pdf/renderer` produces a >500 kB chunk. Non-blocking. Deferred to CP8.

---

## Current Checkpoint

**CP3 — Auth + Onboarding**
Status: NOT STARTED — awaiting owner authorization.

> ⚠️ `docs/final_design_spec.md` must be restored before CP3 implementation begins.

---

## Intentionally Untracked

```
North Star/
```
Owner visual reference material. Do **not** modify, stage, delete, or commit without explicit owner authorization.

---

## Deferred Issues

| ID | Description | Target |
|----|-------------|--------|
| D1 | `docs/final_design_spec.md` must be restored before CP3 | Before CP3 |
| D2 | PDF bundle chunk >500 kB (pre-existing, `@react-pdf/renderer`) | CP8 |
| D3 | Dedicated maskable PWA icons | CP9 |
| D4 | Browser screenshot automation | Post-launch or explicit authorization |

---

## Roadmap

```
CP3   Auth + Onboarding
CP4   Projects
CP5   Project Detail + report navigation
CP6   Report Editor + Photo UX
CP7   Preview + More / Billing
CP8   Professional PDF redesign
CP9   PWA hardening
CP10  Final QA / regression

Then:
  - Security / RLS production gate
  - Static / legal / deployment requirements
  - Production Supabase
  - Production Stripe
  - Cloudflare deployment
  - Live acceptance testing
  - Launch
```

---

## Safety Rule

No Antigravity / plugin / MCP / browser-tool configuration changes while application work is uncommitted.

---

## Checkpoint Workflow

```
IMPLEMENT
  → TEST  (npm test -- --run)
  → TYPECHECK  (npx tsc --noEmit)
  → BUILD  (npm run build)
  → OWNER REVIEW
  → UPDATE  docs/implementation_status.md
  → COMMIT
  → PUSH
  → NEXT CHECKPOINT
```
