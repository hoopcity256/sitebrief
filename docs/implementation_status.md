# SiteBrief — Implementation Status

_Update this file at every checkpoint commit. Git state is the source of truth._

---

## Project

**SiteBrief** — mobile-first contractor/jobsite daily-report SaaS.

---

## Accepted Baseline Before CP5 Commit

`cb6f2e5  feat(ui): redesign projects experience`
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
| CP5 | _(see log after commit)_ | Project Detail + Report History Navigation — **APPROVED FOR COMMIT** |

---

## CP5 Quality Gate

| Gate | Result |
|------|--------|
| `git diff --check` | ✅ Clean |
| `npm test -- --run` | ✅ 37/37 passing (9 files) |
| `npx tsc --noEmit` | ✅ Clean |
| `npm run build` | ✅ Clean |

---

## CP5 Changes (committed)

- `src/pages/ProjectDetailPage.tsx` — full redesign: CSS classes, skeleton loading, compact info strip with PersonIcon/MapPinIcon/phone SVG/MailIcon/FileTextIcon, upsell banner (no emoji), 52px New Report CTA, "Recent Reports" overline section label, semantic `<ul>/<li>/<button>` report cards, `badge--draft`/`badge--final` pills, all logic preserved
- `src/index.css` — +378 lines of project-detail CSS classes (additive; no existing classes changed)
- `docs/implementation_status.md` — updated

**Owner corrections applied:**
- Back button: increased from 40×40 → **48×48px** (ChevronLeftIcon remains 18px)
- Email icon: `DocumentIcon` → **`MailIcon`** (no icons.tsx modification required — already existed)

---

## CP5 Critical Navigation Fix

**Owner decision 15 (from final_design_spec.md §K):**

| Report Status | Old Behavior | New Behavior |
|---------------|-------------|-------------|
| `is_draft = true` | `/update/${id}/new?reportId=${r.id}` ✅ | `/update/${id}/new?reportId=${r.id}` ✅ unchanged |
| `is_draft = false` | `/update/${id}/new?reportId=${r.id}` ❌ | `/preview/${r.id}` ✅ FIXED |

---

## CP5 Behavior

- **Draft reports** → editor: `/update/${id}/new?reportId=${r.id}`
- **Final reports** → preview: `/preview/${r.id}`
- **New Report subscription gating** preserved exactly (`subscription.entitled` client gate + `disabled` prop + server-side RPC)
- **Report summary** (count + last date) derived from already-loaded `reports[]` array — no additional Supabase query introduced

---

## CP5 Deferred

- Actual iPhone Safari/Chrome visual validation remains deferred
- Browser automation remains non-blocking/deferred

---

## Next Checkpoint

**CP6 — Report Editor**
Status: **NOT STARTED. Awaiting owner authorization.**

---

## Deferred Issues (running list)

| ID | Description | Target |
|----|-------------|--------|
| D1 | iPhone Safari/Chrome visual validation | Later mobile QA |
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
CP6   Report Editor + Photo UX
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
