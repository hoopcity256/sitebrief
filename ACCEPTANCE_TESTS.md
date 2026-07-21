# ACCEPTANCE_TESTS.md — SiteBrief Launch Acceptance Criteria

All items in this document must pass before public launch. Mark each item `[x]` when confirmed.

---

## A. Onboarding (browser)
- [ ] A1. New user can sign up via Supabase Auth.
- [ ] A2. Company profile creation collects required fields and saves to Supabase.
- [ ] A3. User is redirected to projects list upon completion.

## B. Projects
- [ ] B1. Projects can be created, listed, and archived.
- [ ] B2. RLS Isolation: User A cannot read or modify User B's projects.

## C. Report editor
- [ ] C1. User can create an update and fill text fields.
- [ ] C2. Photos can be selected, captioned, and reordered.
- [ ] C3. IndexedDB draft recovery restores unsaved progress upon accidental reload.

## D. Photo pipeline
- [ ] D1. `<input type="file" capture="environment">` invokes camera on mobile.
- [ ] D2. Client-side compression respects 1200px long-edge target.
- [ ] D3. Iterative compression correctly targets <= 200 KB.
- [ ] D4. Photo is rejected with readable error if it cannot be compressed under 400 KB.
- [ ] D5. Limit of 10 photos is enforced.

## E. PDF generation
- [ ] E1. PDF generates with up to 10 photos using `@react-pdf/renderer`.
- [ ] E2. Output is a Blob, with no base64 retention of the final document.
- [ ] E3. Generation completes within acceptable timing thresholds.

## F. Sharing and download
- [ ] F1. Web Share API is invoked if `navigator.canShare` is true.
- [ ] F2. Standard file download is provided as a fallback.
- [ ] F3. Existing PDFs remain accessible for expired users.

## G. Subscription (Stripe)
- [ ] G1. Trial checkout works via Stripe.
- [ ] G2. Annual checkout works.
- [ ] G3. Trial expiration automatically triggers EXPIRED state.
- [ ] G4. Stripe Customer Portal allows cancellation and plan switching.
- [ ] G5. EXPIRED users are restricted to read-only access (cannot create new reports).

## H. Security
- [ ] H1. RLS enforces absolute isolation between two different user accounts.
- [ ] H2. Stripe webhook signature rejection works for invalid payloads.
- [ ] H3. Duplicate webhook idempotency is handled correctly.
- [ ] H4. Secret keys are NOT present in the browser bundle (verified via source inspection).

## I. Performance
- [ ] I1. Layout remains usable at 360px viewport width.
- [ ] I2. UI scrolls at 60 fps.
- [ ] I3. PDF generation and photo compression are performant on mobile devices.

## J. Cross-browser
- [ ] J1. Functions correctly on iPhone Safari.
- [ ] J2. Functions correctly on Android Chrome.
- [ ] J3. Functions correctly on Desktop Chrome/Firefox.
- [ ] J4. Back/forward browser navigation behaves predictably.

## K. Connectivity
- [ ] K1. Lost-connection during edit retains draft in IndexedDB.
- [ ] K2. Clear error messaging shown when network requests fail.

## L. Architecture Safety Addendum Validations
- [ ] L1. Service worker does not cache Supabase API calls, Stripe redirects, or storage URLs.
- [ ] L2. An unauthenticated deep-link to `/projects/:id` redirects to `/login` and returns to the original URL after sign-in.
- [ ] L3. Direct browser navigation to `/projects/:id` (without navigating from home) loads the correct screen.
- [ ] L4. If the subscriptions table query fails, the access state is `BILLING_UNAVAILABLE`, not `EXPIRED`, and existing reports remain readable.
- [ ] L5. A user with status='active' and current_period_end in the future can create a report without a live Stripe API call.
