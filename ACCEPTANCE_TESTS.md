# ACCEPTANCE_TESTS.md — SiteBrief Launch Acceptance Criteria

All items in this document must pass before public launch. Mark each item `[x]` when confirmed.

---

## 1. SECURITY & RLS ISOLATION
- [ ] T-SEC-1: User A cannot create a report under User B's project (direct Supabase API call is rejected).
- [ ] T-SEC-2: User A cannot attach photos to User B's report.
- [ ] T-SEC-3: User A cannot read User B's records, reports, or Storage files.
- [ ] T-SEC-4: An expired user cannot create or modify reports through direct Supabase API calls (bypassing React route guards).
- [ ] T-SEC-5: An expired user can still SELECT and download their own existing reports and PDFs.
- [ ] T-SEC-6: Concurrent report creation for the same project returns unique, sequential report numbers.
- [ ] T-SEC-7: A direct UPDATE to `report_number` on an existing report is rejected by the database trigger.
- [ ] T-SEC-8: Direct browser INSERT on `reports` table is rejected (must go through `create_report()`).

## 2. STRIPE & BILLING
- [ ] T-STRIPE-1: Duplicate Stripe events process exactly once (second delivery returns 200 without reprocessing).
- [ ] T-STRIPE-2: Out-of-order Stripe events do not regress a newer subscription state.
- [ ] T-STRIPE-3: A webhook with a forged or missing Stripe-Signature is rejected with 400.
- [ ] T-STRIPE-4: Signed URLs are never written to the `reports` or `company_profiles` tables.
- [ ] T-STRIPE-5: The Supabase service-role key and Stripe secret key are absent from the production browser bundle.
- [ ] T-STRIPE-6: A billing outage (failed subscriptions query) does not mislabel an entitled user as expired or erase stored subscription state.

## 3. STORAGE
- [ ] T-STOR-1: Storage write policies enforce ownership (user cannot write to another user's path).
- [ ] T-STOR-2: Storage write for photos and PDFs is rejected if `has_active_access()` returns false.
- [ ] T-STOR-3: Existing Storage files remain readable after subscription expiration.

## 4. AUTH & EMAIL
- [ ] T-AUTH-1: Confirmation email is delivered through custom SMTP (not Supabase demo provider) before launch.
- [ ] T-AUTH-2: Password-reset email is delivered through custom SMTP.
- [ ] T-AUTH-3: Magic link sign-in is not exposed in the UI or available through the Supabase client.

## 5. CORE UI & PIPELINES
- [ ] C1: Projects can be created, listed, and archived.
- [ ] C2: Report editor functions correctly (text fields, photos, captions).
- [ ] C3: IndexedDB draft recovery restores unsaved progress upon accidental reload.
- [ ] D1: `<input type="file" capture="environment">` invokes camera on mobile.
- [ ] D2: Client-side compression respects 1200px long-edge target and iteratively targets <= 200 KB.
- [ ] D3: Photo is rejected with readable error if it cannot be compressed under 400 KB. Limit 10 photos.
- [ ] E1: PDF generates with `@react-pdf/renderer` as a Blob without base64 retention.
- [ ] F1: Web Share API works if supported, otherwise provides a standard download.
- [ ] J1: Layout remains usable at 360px viewport width (cross-browser tested).

## 6. ARCHITECTURE SAFETY ADDENDUM VALIDATIONS
- [ ] L1: Service worker does not cache Supabase API calls, Stripe redirects, or storage URLs.
- [ ] L2: An unauthenticated deep-link to `/projects/:id` redirects to `/login` and returns to original URL after sign-in.
- [ ] L3: Direct browser navigation to `/projects/:id` (without navigating from home) loads the correct screen.
