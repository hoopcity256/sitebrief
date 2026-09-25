# SiteBrief — Implementation Status

_Update this file at every checkpoint commit. Git state is the source of truth._

---

## Project

**SiteBrief** — mobile-first contractor/jobsite daily-report SaaS.

---

## Accepted Baseline Before CP4 Commit

`4a00b78  feat(ui): redesign auth and onboarding`
Branch: `main` | Remote: `origin/main` in sync: **yes**

---

## Completed Checkpoints

| Checkpoint | Commit | Description |
|------------|--------|-------------|
| Billing | `d203f79` | Stripe subscription lifecycle |
| CP1 | `c04029d` | Design system foundation |
| CP2 | `8304967` | AppShell / Navigation (useLocation authoritative) |
| Docs | `08035d8` | Design spec restored to docs/final_design_spec.md |
| CP3 | `4a00b78` | Auth + Onboarding redesign |
| CP4 | _(see log after commit)_ | Projects experience — **APPROVED FOR COMMIT** |

---

## CP4 Quality Gate

| Gate | Result |
|------|--------|
| `git diff --check` | ✅ Clean |
| `npm test -- --run` | ✅ 37/37 passing (9 files) |
| `npx tsc --noEmit` | ✅ Clean |
| `npm run build` | ✅ Clean |

---

## CP4 Changes (committed)

- `src/pages/ProjectsPage.tsx` — full redesign: SiteBrief wordmark mobile header (hidden on desktop), 48×48 FAB, semantic `<button>` card body for navigation, `BuildingIcon` anchor, typography hierarchy, three-dot menu with archive action, skeleton loaders, polished empty state with CTA, error state, explicit label/id form associations, all existing CRUD logic preserved
- `src/index.css` — +483 lines of projects CSS classes (additive; no existing classes changed)
- `src/components/icons.tsx` — `ArchiveIcon` added to shared icon library
- Interaction defect fixed: `onBlur` for menu close moved from `.project-card__menu-zone` (which did not contain the popover) to the outer `.project-card-wrap` — prevents premature menu close when focus moves from the ellipsis button to the archive button

---

## CP4 Deferred

- **Report count / last-report-date**: not exposed by `listProjects` (no join to `reports`). `project_report_counters` view exists in schema but is not wired. Deferred until owner authorizes approach.
- iPhone Safari/Chrome visual validation: deferred to later mobile QA
- Browser automation: non-blocking/deferred

---

## Next Checkpoint

**CP5 — Project Detail**
Status: **NOT STARTED. Awaiting owner authorization.**

---

## Deferred Issues (running list)

| ID | Description | Target |
|----|-------------|--------|
| D1 | iPhone Safari/Chrome visual validation | Later mobile QA |
| D2 | PDF bundle chunk >500 kB (pre-existing) | CP8 |
| D3 | Dedicated maskable PWA icons | CP9 |
| D4 | Browser screenshot automation | Post-launch |
| D5 | Report count + last-report-date on project cards | Owner authorization required |

---

## Intentionally Untracked

```
North Star/
```
Owner visual reference material. Do **not** modify, stage, delete, or commit without explicit owner authorization.

---

## Roadmap

```
CP5   Project Detail + report navigation
CP6   Report Editor + Photo UX
CP7   Preview + More / Billing
CP8   Professional PDF redesign
CP9   PWA hardening
CP10  Final QA / regression
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
