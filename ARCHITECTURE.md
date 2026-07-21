# ARCHITECTURE.md — SiteBrief Technical Architecture

**Status: Approved for implementation (PWA Pivot + Safety Addendum)**
**Last updated: July 21, 2026**

---

## 1. TARGET STACK

- **Frontend:** React + Vite + TypeScript (strict mode)
- **Routing:** React Router
- **Design:** Mobile-first responsive (360 px and up). Minimal accessible component system — no large design framework.
- **PWA:** Manifest and service-worker shell caching (no offline sync).
- **Backend:** Supabase Auth, Postgres, Storage, Edge Functions. Row Level Security on all user-owned tables and storage.
- **Billing:** Stripe Checkout, Billing, Customer Portal. Signed Stripe webhooks.
- **Hosting:** Cloudflare Pages (preferred).
- **PDF:** Client-side with `@react-pdf/renderer`. Generate as Blob. Web Share API with download fallback.

---

## 2. DATA MODEL & RLS

Every user-owned row must include `user_id` and enforce ownership via RLS.

### Schema

- **profiles:** `id` (UUID, FK to auth.users), `display_name`, `created_at`
- **company_profiles:** `id`, `user_id` (FK, unique), `company_name`, `logo_url`, `phone`, `email`, `brand_color`, `onboarding_complete`, `created_at`, `updated_at`
- **projects:** `id`, `user_id`, `name`, `customer_name`, `address`, `customer_email`, `customer_phone`, `is_archived` (default false), `created_at`, `updated_at`
- **project_report_counters:** `project_id` (UUID PRIMARY KEY REFERENCES projects(id) ON DELETE CASCADE), `last_report_number` (INTEGER NOT NULL DEFAULT 0)
- **reports:** `id`, `user_id`, `project_id`, `report_number` (Integer), `is_draft`, `work_completed`, `problems`, `next_steps`, `generated_pdf_url`, `generated_at`, `created_at`, `updated_at`. `UNIQUE(project_id, report_number)`
- **report_photos:** `id`, `user_id`, `report_id`, `storage_path` (relative Supabase Storage path), `display_order`, `caption`, `created_at`
- **subscriptions:** `id`, `user_id` (unique), `stripe_customer_id`, `stripe_subscription_id`, `status` (enum: trialing | active | past_due | canceled | unpaid), `current_period_end`, `cancel_at_period_end`, `trial_end`, `created_at`, `updated_at`
- **stripe_webhook_events:** `id` (TEXT PRIMARY KEY, Stripe event ID), `type` (TEXT NOT NULL), `processed_at` (TIMESTAMPTZ NOT NULL DEFAULT now())

### Report Number Allocation (Per-Project)
Do NOT use `SELECT MAX(report_number) + 1` or bare Postgres sequences. Allocate report numbers via an atomic `INSERT ... ON CONFLICT DO UPDATE`:
```sql
INSERT INTO project_report_counters (project_id, last_report_number)
VALUES ($project_id, 1)
ON CONFLICT (project_id) DO UPDATE
  SET last_report_number = project_report_counters.last_report_number + 1
RETURNING last_report_number
```
This logic MUST be wrapped in a `SECURITY DEFINER` Postgres function that:
- Verifies `auth.uid()` owns the project before allocating.
- Sets a fixed `search_path` (e.g., `SET search_path = public`).
- Validates all inputs and restricts execution to authenticated roles.
- Allocates the number and creates the report row in one transaction.

### RLS Policies
- All SELECT, INSERT, UPDATE, DELETE on every table restricted to `auth.uid() = user_id`.
- Storage bucket policies: user can read/write only paths prefixed with their `user_id/`.
- `subscriptions` table: only Edge Functions (service role) may write; user may read their own row.

---

## 3. SUBSCRIPTION ACCESS MODEL

**Application access states (simplified):**
- `LOADING` — checking Supabase session and subscriptions row
- `TRIAL_OR_PAID` — status is 'trialing' or 'active'; full create/generate access
- `EXPIRED` — status is 'past_due', 'canceled', 'unpaid', or no row; read-only
- `BILLING_UNAVAILABLE` — Supabase query failed; show cached state or block

**Billing Outage Safety:**
- A Stripe or billing service outage must NEVER delete or invalidate existing records in the `subscriptions` table.
- Access is determined by the last server-verified state (`status` + `current_period_end`), not live API calls.
- If the subscriptions query fails at session start, state is `BILLING_UNAVAILABLE`. Show a retryable status message rather than defaulting to `EXPIRED`.
- Existing reports remain readable in all states (including `BILLING_UNAVAILABLE`).
- New report creation requires stored status `trialing` or `active` AND current time is before `current_period_end`.

---

## 4. STRIPE EDGE FUNCTIONS (Server-side)

1. **`create-checkout-session`**
   - Requires authenticated Supabase user (validate JWT).
   - Must explicitly set: `mode: 'subscription'`, `subscription_data: { trial_period_days: 14 }`, and `payment_method_collection: 'always'` (required before trial begins).
   - Accepts only 'monthly' or 'annual' as price selection. Maps these server-side to `STRIPE_MONTHLY_PRICE_ID` and `STRIPE_ANNUAL_PRICE_ID`. Never accept arbitrary price IDs from the browser.
   - Creates or reuses Stripe Customer (lookup `stripe_customer_id` from subscriptions). Returns URL.

2. **`stripe-webhook`**
   - Public endpoint. Verifies Stripe-Signature header.
   - **Idempotency:** Attempt to INSERT event ID into `stripe_webhook_events`. If INSERT fails (duplicate), return HTTP 200 immediately. If succeeds, process event and update subscriptions.
   - Handle out-of-order events using `updated_at` timestamps to avoid downgrading newer states.
   - Store `stripe_subscription_id` and `stripe_customer_id` only from verified API data.
   - Always return HTTP 200 for safely ignored or duplicate events.

3. **`create-portal-session`**
   - Requires authenticated Supabase user. Looks up `stripe_customer_id`.
   - Returns short-lived Stripe Customer Portal URL.

---

## 5. SUPABASE KEY BOUNDARIES

- The browser bundle may contain ONLY the Supabase anon/publishable key (`VITE_SUPABASE_ANON_KEY`).
- The Supabase service-role key bypasses all RLS. It must exist ONLY in Supabase Edge Function secrets.
- The service-role key must NEVER appear in: `VITE_` env vars, `src/` files, `.env.local`, error responses, or server logs.
- Edge Functions that require elevated access must import the service-role key from `Deno.env.get()` exclusively.

---

## 6. PHOTO PIPELINE

- **Input:** Mobile browser file input (`<input type="file" accept="image/*" capture="environment">`).
- **Processing:** Client-side compression before upload.
- **Targets:** Long-edge 1200 px. Preferred: ≤ 200 KB. Accepted hard maximum: 400 KB.
- **Retry Logic:** Iteratively reduce JPEG quality (step down by 0.05) and dimensions (step down long-edge by 100px).
- **Failure:** If the file still cannot reach ≤ 400 KB after retries, reject the photo and show: "This photo could not be compressed to an acceptable size. Please select a different image."
- **Orientation:** The pipeline must produce correct visual orientation after processing. `expo-image-manipulator` (or equivalent web library) auto-corrects EXIF. Original EXIF metadata is NOT preserved.

---

## 7. PDF PIPELINE

- **Generator:** Client-side with `@react-pdf/renderer`.
- **Output:** Generate as Blob — never base64-encode the completed PDF.
- **Distribution:** Web Share API when `navigator.canShare({ files })` is true. Download fallback when unavailable.

---

## 8. SERVICE WORKER CACHE EXCLUSIONS

The PWA service worker may cache:
✅ Versioned JS bundles, CSS, icons, manifest, static app shell HTML.

The service worker must NOT cache:
❌ Supabase API responses (`*.supabase.co`)
❌ Authentication callbacks or session tokens
❌ Stripe redirects or Stripe API responses
❌ Supabase Storage signed URLs or photo blobs
❌ User photographs or uploaded files
❌ Generated reports or PDFs
❌ Any authenticated HTML response

*Note: IndexedDB handles local draft recovery.*

---

## 9. AUTH REDIRECT SAFETY

Configure the following allowed redirect URLs in the Supabase dashboard:
- `http://localhost:5173/**` (local development)
- `https://*.pages.dev/**` (Cloudflare preview deployments — document if wildcard subdomains are unsupported)
- `https://<production-domain>/**` (production)
- Stripe success and cancellation return URLs (e.g., `/billing/success`, `/billing/cancel`).

Stripe `success_url` and `cancel_url` must be server-controlled. The browser must NOT supply an arbitrary redirect destination.

---

## 10. CLOUDFLARE PAGES SPA ROUTING

Configure SPA fallback for Cloudflare Pages:
- Add a file at `public/_redirects` containing: `/* /index.html 200`
- Do NOT add a top-level `404.html` unless a complete custom redirect table replaces the fallback behavior.
- Add a `public/_headers` file for security headers (Content-Security-Policy, X-Frame-Options, etc.).

---

## 11. OFFLINE POSITION

- Application requires connectivity for auth, data, billing.
- Local draft recovery uses IndexedDB for the current editor session. No bidirectional offline sync engine.
- Retain draft until retry succeeds.
