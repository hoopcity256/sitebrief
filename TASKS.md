# TASKS.md — SiteBrief PWA Living Task Tracker

Format: `[x]` done · `[/]` in progress · `[ ]` not started · `[!]` blocked

---

## Day 2 — Foundation
- [x] Pivot architecture documentation to PWA/Supabase/Stripe
- [x] Create Vite + React + TypeScript project
- [x] Configure React Router and mobile-first design shell
- [x] Draft Supabase schema migrations `001_initial.sql` (do not run)
- [ ] Configure Supabase allowed redirect URLs
- [ ] Implement Supabase Auth (email/password, confirmation, reset)
- [ ] Deploy staging URL to Cloudflare Pages

## Day 3 — Core App
- [ ] Onboarding flow (company profile to Supabase)
- [ ] Project CRUD (create, list, archive)
- [ ] Report editor (text fields)
- [ ] Browser photo selection, compression pipeline, Supabase Storage upload
- [ ] IndexedDB draft recovery

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
| H3 | Create Supabase project and note project URL + anon key | Human | ⬜ Not started |
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
