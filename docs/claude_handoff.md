# SiteBrief — Claude Session Handoff

_Read this file first at the start of every session. Do not rely on conversational memory._

---

## What SiteBrief Is

Mobile-first contractor/jobsite daily-report SaaS.

**Stack:** Vite · React · TypeScript · React Router · Supabase · Stripe · @react-pdf/renderer

**Primary target:** iPhone Safari and Chrome.
Desktop is responsive through the same codebase — no separate app.

---

## Read These First (in order)

1. `docs/claude_handoff.md` ← you are here
2. `docs/implementation_status.md` — current checkpoint, git state, deferred issues
3. `docs/final_design_spec.md` — controlling design specification (tokens, layout, UX rules)
4. `git status`
5. `git log --oneline -5`

**Always reconcile documentation against actual git state.**
If they disagree, git wins — but report the discrepancy before modifying anything.

### If final_design_spec.md is missing

**STOP.** Do not begin a new UI checkpoint. Report to the owner that the approved design specification must be restored before implementation continues.

---

## Core Product Constraints

**Report fields are fixed. Do not invent new ones:**
- Work Completed
- Problems
- Next Steps
- Photos

**Never do the following without explicit owner authorization:**
- Change database schema
- Change billing logic
- Add npm dependencies
- Add a service worker during the visual redesign
- Replace `@react-pdf/renderer`
- Modify or stage `North Star/`
- Perform a new architecture audit unless explicitly requested
- Investigate IDE / plugin / browser tooling while an application checkpoint is uncommitted

---

## Design Principle

Change **presentation architecture** aggressively when required by the approved specification.
Change **proven application / business logic** conservatively.

---

## Design Character

**Aim for:** professional construction field software · mobile-first · light · clean · restrained · efficient · strong typographic hierarchy · large touch targets · system fonts.

**Avoid:** gratuitous gradients · dominant glassmorphism · excessive shadows · card soup · decorative avatars · gimmicky animation · giant whitespace · tiny low-contrast text.

---

## Core Design Tokens

| Token | Value |
|-------|-------|
| Primary | `#1A5276` |
| Action | `#2563EB` |
| Success | `#16A34A` |
| Warning | `#D97706` |
| Danger | `#DC2626` |
| Background | `#F8F8FC` |
| Surface | `#FFFFFF` |
| Border | `#E5E7EB` |
| Text | `#111827` |

---

## Architecture Quick Reference

| Item | Status |
|------|--------|
| AppShell active state | `useLocation()` authoritative via `deriveActiveTab()` |
| `activeTab` prop | `@deprecated`, accepted for compat, silently ignored |
| CreateReportPage | Full-screen standalone, **outside** AppShell (intended) |
| ReportPreviewPage | **Inside** AppShell (intended) |
| Mobile nav | Fixed bottom tab bar, safe-area aware |
| Desktop nav | Flat white sidebar, ≥1024px |
| Reports tab | Permanent Coming Soon placeholder, does not navigate |

---

## Checkpoint Discipline

Work only on the currently authorized checkpoint. Do not silently expand scope.

**At the end of every checkpoint:**

```
1. npm test -- --run
2. npx tsc --noEmit
3. npm run build
4. Report results
5. Wait for owner review
6. Update docs/implementation_status.md
7. Commit and push only when authorized
```

**Safety rule:** No Antigravity / plugin / MCP / browser-tool configuration changes while application work is uncommitted.
