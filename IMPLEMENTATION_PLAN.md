# IMPLEMENTATION_PLAN.md — SiteBrief PWA Pivot Plan

**Start date: July 21, 2026**
**Submission target: July 28, 2026**

---

## SCHEDULE

### Day 2 — Foundation
- Architecture pivot documentation complete.
- Create Vite + React + TypeScript project.
- Configure React Router and mobile-first design shell.
- Draft Supabase schema migrations as `supabase/migrations/001_initial.sql` (single source of truth). Do NOT execute SQL automatically.
- Configure Supabase Auth: Site URL `https://sitebrief.scope-guard.com`; allowed redirect URLs per ARCHITECTURE.md §9.
- Implement Supabase Auth (email/password, confirmation, password reset). Magic link is explicitly out of scope.
- Deploy staging URL to Cloudflare Pages (`*.pages.dev`).
- **Exit criteria:** Auth sign-up/sign-in works on mobile Safari and Chrome; staging URL is live.

### Day 3 — Core App
- Onboarding flow (company profile to Supabase).
- Project CRUD (create, list, archive).
- Report editor (create update, text fields).
- Browser photo selection, compression pipeline, Supabase Storage upload.
- IndexedDB draft recovery for editor session.
- **Exit criteria:** Can create a project, add photos, save a report draft on mobile.

### Day 4 — PDF
- Client-side PDF with `@react-pdf/renderer`.
- Report history (list and tap to view/share).
- Web Share API integration; download fallback.
- Cross-browser PDF testing (iOS Safari, Android Chrome, desktop Chrome).
- **Exit criteria:** PDF generates with 10 photos; sharing/download works on iOS and Android.

### Day 5 — Billing
- Stripe products, prices, and 14-day trial configuration (map prices server-side).
- `create-checkout-session` Edge Function (payment_method_collection: 'always').
- `stripe-webhook` Edge Function (idempotent, using `stripe_webhook_events` table).
- `create-portal-session` Edge Function.
- Subscription access gates (TRIAL_OR_PAID vs. EXPIRED).
- **Exit criteria:** Full trial checkout → active → cancellation flow works in Stripe test mode.

### Day 6 — Polish and Security
- Full mobile Safari and Android Chrome QA pass.
- RLS security review (test two-user isolation).
- Error handling and empty states.
- Landing page, privacy policy, terms, support, and refund policy pages.
- Confirm `public/_redirects` (`/* /index.html 200`) and `public/_headers` (CSP) are committed.
- Production deployment to Cloudflare Pages: create dedicated SiteBrief Pages project, connect SiteBrief GitHub repo, verify `*.pages.dev` build, add custom domain `sitebrief.scope-guard.com` in Pages → Custom domains.
- **Exit criteria:** All acceptance tests pass; RLS isolation confirmed; `https://sitebrief.scope-guard.com` is live.

### Day 7 — Launch
- Final full acceptance test pass.
- Billing switch from Stripe test mode to live mode.
- Production environment variables and Edge Function secrets confirmed.
- Public launch.
- Begin advertising experiment.
- **Exit criteria:** Real payment can complete; app is publicly accessible.

---

## MIGRATION DELIVERY RULES
- The migration file (`supabase/migrations/001_initial.sql`) is the single source of truth.
- No ad hoc, unrecorded production SQL is ever to be run directly.
- The architect and implementation agent do not execute migrations. Only the human owner applies migrations to production.

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
