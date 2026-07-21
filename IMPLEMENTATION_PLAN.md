# IMPLEMENTATION_PLAN.md — SiteBrief PWA Pivot Plan

**Start date: July 21, 2026**
**Submission target: July 28, 2026**

---

## SCHEDULE

### Day 2 — Foundation
- Architecture pivot documentation complete.
- Create Vite + React + TypeScript project.
- Configure React Router and mobile-first design shell.
- Create Supabase project, run schema migrations (including `project_report_counters`), enable RLS.
- Configure Supabase allowed redirect URLs.
- Implement Supabase Auth (email/password and magic link).
- Deploy staging URL to Cloudflare Pages.
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
- Configure Cloudflare Pages SPA Routing (`public/_redirects`) and security headers (`public/_headers`).
- Production deployment to Cloudflare Pages with custom domain.
- **Exit criteria:** All A–K acceptance tests pass; RLS isolation confirmed.

### Day 7 — Launch
- Final full acceptance test pass.
- Billing switch from Stripe test mode to live mode.
- Production environment variables and Edge Function secrets confirmed.
- Public launch.
- Begin advertising experiment.
- **Exit criteria:** Real payment can complete; app is publicly accessible.

---

## HUMAN DEPENDENCIES

| # | Action Required | Owner | Status |
|---|----------------|-------|--------|
| H1 | Create or verify Stripe account | Human | ⬜ Not started |
| H2 | Complete Stripe business verification (required before live payments) | Human | ⬜ Not started |
| H3 | Create Supabase project and note project URL + anon key | Human | ⬜ Not started |
| H4 | Choose and acquire production domain name | Human | ⬜ Not started |
| H5 | Create monthly ($9.99) and annual ($79.99) Stripe prices with 14-day trials | Human | ⬜ Not started |
| H6 | Configure Stripe Customer Portal (allowed cancellation, plan switching) | Human | ⬜ Not started |
| H7 | Configure Stripe webhook endpoint after first deployment (add endpoint URL, copy signing secret) | Human | ⬜ Not started |
| H8 | Add production environment variables and Supabase Edge Function secrets (STRIPE_SECRET_KEY, STRIPE_WEBHOOK_SECRET, STRIPE_MONTHLY_PRICE_ID, STRIPE_ANNUAL_PRICE_ID) | Human | ⬜ Not started |
| H9 | Publish privacy policy, terms of service, refund policy, and support contact page | Human | ⬜ Not started |
| H10 | Create Cloudflare Pages project and connect to Git repository | Human | ⬜ Not started |
