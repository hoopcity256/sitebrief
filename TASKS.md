# TASKS.md — SiteBrief PWA Living Task Tracker

Format: `[x]` done · `[/]` in progress · `[ ]` not started · `[!]` blocked

---

## Day 2 — Foundation
- [x] Pivot architecture documentation to PWA/Supabase/Stripe
- [x] Create Vite + React + TypeScript project
- [x] Configure React Router and mobile-first design shell
- [x] Draft Supabase schema migrations `20260721000000_initial.sql` (do not run)
- [x] Supabase CLI initialised (`supabase/config.toml`, `supabase/.gitignore` committed)
- [x] Migration `20260721000000_initial.sql` applied to `sitebrief-test` (toitahshmkxazxqqopzg) — zero SQL errors, zero lint findings
- [!] RLS and Storage functional acceptance tests (T-SEC, T-STOR, T-PATH) **pending** — must run against `sitebrief-test`; production migration is prohibited until all pass
- [!] Migration `20260721000000_initial.sql` **pending on production** (`sitebrief`, qbycpzfyugrsbckrpyak) — **locked** until acceptance tests below pass

### Production Migration Gate

Production migration may be authorized only after:

- [ ] 1. Two-user RLS isolation tests pass (T-SEC-1 – T-SEC-4)
- [ ] 2. Subscription entitlement and expired-access tests pass (T-SEC-5, T-STRIPE-7 – T-STRIPE-9)
- [ ] 3. `create_report` atomic numbering tests pass (T-SEC-6, T-SEC-8)
- [ ] 4. Report and photo immutable-identity tests pass (T-SEC-7, T-SEC-9, T-SEC-11)
- [ ] 5. Canonical Storage-path and orphan-object tests pass (T-PATH-1 – T-PATH-4, T-STOR-11, T-STOR-12)
- [ ] 6. Actual Storage API upload/read/update/delete tests pass (T-STOR-1 – T-STOR-10, T-STOR-13)
- [ ] Configure Supabase allowed redirect URLs
- [ ] Implement Supabase Auth (email/password, confirmation, reset)
- [ ] Deploy staging URL to Cloudflare Pages

## Day 3 — Core App
- [x] T3.1 — Generate TypeScript database types from `sitebrief-test` (`6562c1a`)
- [x] T3.2 — Typed Supabase client and publishable key rename (`45e0d31`)
- [x] T3.3 — Onboarding flow: company profile persistence and AuthGuard gate (`78e316f`)
- [x] Auth UI fix: connection diagnosis, styled auth pages, error sanitization (`d928e62`)
- [x] HA-3 — Test subscription row inserted (trialing, 14-day trial)
- [x] T3.4 — Projects CRUD: list, create, archive, detail with zero-row detection (`76319a0`)
- [x] T3.5 — Report creation via `create_report()` RPC, draft editor, report list (`2b17746`)
- [x] T3.6 — Multi-layer autosave: Supabase debounced + IndexedDB recovery (`1845323`)
- [x] T3.7 — Photo pipeline: iterative JPEG compression, upload, delete with consistency (`6d14ff1`)
- [x] T3.8 — Vitest suite: 27 tests across 7 files — all passing (`dab50cf`)
- [x] T3.9 — Added ReportPreviewPage (`53755c4`)
- [x] T3.10 — TASKS.md Day 3 status update

## Day 4 — PDF
- [ ] Client-side PDF with `@react-pdf/renderer`
- [ ] Report history (list and tap to view/share)
- [ ] Web Share API integration; download fallback
- [ ] Cross-browser PDF testing

## Day 5 — Billing
- [ ] Stripe products, prices, and 14-day trial configuration
- [ ] `create-checkout-session` Edge Function (explicit trial config)
- [ ] `stripe-webhook` Edge Function (idempotent, via `stripe_webhook_events`)
- [ ] `create-portal-session` Edge Function
- [ ] Subscription access gates

## Day 6 — Polish and Security
- [ ] Full QA pass
- [ ] RLS security review
- [ ] Error handling and empty states
- [ ] Static pages (privacy, terms, etc.)
- [ ] Add `public/_redirects` and `public/_headers` (CSP) for Cloudflare Pages
- [ ] Production deployment to Cloudflare Pages: create dedicated SiteBrief Pages project, connect SiteBrief GitHub repo, verify `*.pages.dev` build, add custom domain `sitebrief.scope-guard.com`

## Day 7 — Launch
- [ ] Final full acceptance test pass
- [ ] Billing switch to live mode
- [ ] Production environment variables confirmed
- [ ] Public launch

---

## HUMAN DEPENDENCIES

| # | Action Required | Owner | Status |
|---|----------------|-------|--------|
| H1 | Create or verify Stripe account | Human | ⬜ Not started |
| H2 | Complete Stripe business verification (required before live payments) | Human | ⬜ Not started |
| H3 | Create Supabase project and note project URL + anon key | Human | ✅ Complete — `sitebrief` project created; `sitebrief-test` validated |
| H4 | Production domain confirmed: `sitebrief.scope-guard.com` | Human | ✅ Confirmed |
| H5 | Create monthly ($9.99) and annual ($79.99) Stripe prices with 14-day trials | Human | ⬜ Not started |
| H6 | Configure Stripe Customer Portal (allowed cancellation, plan switching) | Human | ⬜ Not started |
| H7 | After first `*.pages.dev` deploy: add webhook endpoint `https://sitebrief.scope-guard.com/functions/v1/stripe-webhook` in Stripe dashboard; copy signing secret to Edge Function secrets | Human | ⬜ Not started |
| H8 | Set Supabase Edge Function secrets: `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`, `STRIPE_MONTHLY_PRICE_ID`, `STRIPE_ANNUAL_PRICE_ID` | Human | ⬜ Not started |
| H9 | Publish privacy policy, terms of service, refund policy, and support contact page | Human | ⬜ Not started |
| H10 | Create dedicated SiteBrief Cloudflare Pages project; connect SiteBrief GitHub repo; add env vars `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`; then add custom domain `sitebrief.scope-guard.com` | Human | ⬜ Not started |
| HA-AUTH-1 | Configure custom SMTP provider in Supabase (Auth → SMTP Settings) | Human | ⬜ Not started |
| HA-AUTH-2 | Verify sender domain/address with SMTP provider | Human | ⬜ Not started |
| HA-AUTH-3 | Customize confirmation email template | Human | ⬜ Not started |
| HA-AUTH-4 | Customize password-reset email template | Human | ⬜ Not started |
| HA-AUTH-5 | Set Site URL to `https://sitebrief.scope-guard.com` in Supabase Auth settings | Human | ⬜ Not started |
| HA-AUTH-6 | Configure allowed redirect URLs per ARCHITECTURE.md §9 | Human | ⬜ Not started |
