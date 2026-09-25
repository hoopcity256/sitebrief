# SiteBrief — Implementation Status

_Update this file at every checkpoint commit. Git state is the source of truth._

---

## Project

**SiteBrief** — mobile-first contractor/jobsite daily-report SaaS.

---

## Accepted Baseline Before CP3 Commit

`08035d8  docs: preserve SiteBrief design specification`
Branch: `main` | Remote: `origin/main` in sync: **yes**

---

## Completed Checkpoints

| Checkpoint | Commit | Description |
|------------|--------|-------------|
| Billing | `d203f79` | Stripe subscription lifecycle |
| CP1 | `c04029d` | Design system foundation |
| CP2 | `8304967` | AppShell / Navigation (useLocation authoritative) |
| Docs | `08035d8` | Design spec restored to docs/final_design_spec.md |
| CP3 | _(see log after commit)_ | Auth + Onboarding — **APPROVED FOR COMMIT** |

---

## CP3 Quality Gate

| Gate | Result |
|------|--------|
| `npm test -- --run` | ✅ 37/37 passing (9 files) |
| `npx tsc --noEmit` | ✅ Clean |
| `npm run build` | ✅ Clean |

---

## CP3 Changes (committed)

- `src/index.css` — 240 lines of auth/onboarding CSS classes; all tokens; no hardcoded hex
- `src/components/AuthLayout.tsx` — inline styles → CSS classes
- `src/pages/LoginPage.tsx` — CSS classes; SVG eye icons; explicit label associations
- `src/pages/SignUpPage.tsx` — CSS classes; SVG eye icons; explicit label associations
- `src/pages/PasswordResetPage.tsx` — CSS classes; explicit label associations
- `src/pages/UpdatePasswordPage.tsx` — CSS classes; SVG eye icons; explicit label associations
- `src/pages/OnboardingPage.tsx` — CSS classes; brand-color helper text; camera SVG

All Supabase auth calls, redirect logic, validation rules, and onboarding writes preserved unchanged.

---

## Next Checkpoint

**CP4 — Projects**
Status: **NOT STARTED. Awaiting owner authorization.**

---

## Deferred Issues

| ID | Description | Target |
|----|-------------|--------|
| D1 | iPhone Safari/Chrome visual validation | Later mobile QA |
| D2 | PDF bundle chunk >500 kB (pre-existing, `@react-pdf/renderer`) | CP8 |
| D3 | Dedicated maskable PWA icons | CP9 |
| D4 | Browser screenshot automation | Post-launch or explicit authorization |

---

## Intentionally Untracked

```
North Star/
```
Owner visual reference material. Do **not** modify, stage, delete, or commit without explicit owner authorization.

---

## Roadmap

```
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
