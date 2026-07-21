# ARCHITECTURE.md — SiteBrief Technical Architecture

**Status: Approved for implementation (Final DB/Auth/Billing Correction)**
**Last updated: July 21, 2026**

**Canonical production origin:** `https://sitebrief.scope-guard.com`

> SiteBrief is deployed as a **dedicated Cloudflare Pages project** pointed at its own GitHub repository.
> It must not modify or deploy over the existing scope-guard.com site.

---

## 1. TARGET STACK

- **Frontend:** React + Vite + TypeScript (strict mode)
- **Routing:** React Router
- **Backend:** Supabase Auth, Postgres, Storage, Edge Functions. Row Level Security on all user-owned tables and storage.
- **Billing:** Stripe Checkout, Billing, Customer Portal. Signed Stripe webhooks.
- **Hosting:** Cloudflare Pages (preferred).
- **PDF:** Client-side with `@react-pdf/renderer`. Generate as Blob. Web Share API with download fallback.

---

## 2. DATABASE SCHEMA

The following exact objects are specified for the initial migration (`supabase/migrations/001_initial.sql`).

### 1. profiles
- `id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE`
- `display_name TEXT`
- `created_at`, `updated_at` timestamps
- **RLS uses `auth.uid() = id`, NOT `user_id`** — this table has no `user_id` column.

### 2. company_profiles
- `id UUID PRIMARY KEY DEFAULT gen_random_uuid()`
- `user_id UUID UNIQUE NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE`
- `company_name TEXT NOT NULL`, `phone TEXT`, `email TEXT`, `brand_color TEXT`
- `logo_storage_path TEXT` — stable Supabase Storage path, NEVER a signed or expiring URL
- `onboarding_complete BOOLEAN NOT NULL DEFAULT false`
- `created_at`, `updated_at` timestamps

### 3. projects
- `id UUID PRIMARY KEY DEFAULT gen_random_uuid()`
- `user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE`
- `name TEXT NOT NULL`, `customer_name TEXT NOT NULL`, `address TEXT NOT NULL`, `customer_email TEXT`, `customer_phone TEXT`
- `is_archived BOOLEAN NOT NULL DEFAULT false`
- `created_at`, `updated_at` timestamps
- `UNIQUE(id, user_id)` — required for composite foreign key references from child tables

### 4. project_report_counters
- `project_id UUID NOT NULL`
- `user_id UUID NOT NULL`
- `last_report_number INTEGER NOT NULL DEFAULT 0`
- `PRIMARY KEY(project_id)`
- `FOREIGN KEY (project_id, user_id) REFERENCES projects(id, user_id)`
- No direct browser access (no RLS policies; access only through privileged functions)

### 5. reports
- `id UUID PRIMARY KEY DEFAULT gen_random_uuid()`
- `user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE`
- `project_id UUID NOT NULL`
- `report_number INTEGER NOT NULL`
- `is_draft BOOLEAN NOT NULL DEFAULT true`
- `work_completed TEXT`, `problems TEXT`, `next_steps TEXT`
- `generated_pdf_storage_path TEXT` — stable Supabase Storage path, NEVER a signed or expiring URL
- `generated_at TIMESTAMPTZ`
- `created_at`, `updated_at` timestamps
- `UNIQUE(id, user_id)`
- `UNIQUE(project_id, report_number)` — final atomicity guard
- `FOREIGN KEY (project_id, user_id) REFERENCES projects(id, user_id)`
- `report_number` is immutable after creation (enforced with trigger)

### 6. report_photos
- `id UUID PRIMARY KEY DEFAULT gen_random_uuid()`
- `user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE`
- `report_id UUID NOT NULL`
- `storage_path TEXT NOT NULL` — relative Supabase Storage path
- `display_order INTEGER NOT NULL`
- `caption TEXT`
- `created_at`, `updated_at` timestamps
- `FOREIGN KEY (report_id, user_id) REFERENCES reports(id, user_id)`
- `UNIQUE(report_id, display_order)` — ordering constraint

### 7. subscriptions
- `id UUID PRIMARY KEY DEFAULT gen_random_uuid()`
- `user_id UUID UNIQUE NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE`
- `stripe_customer_id TEXT UNIQUE` — uniqueness prevents duplicate customer mapping
- `stripe_subscription_id TEXT UNIQUE` — uniqueness prevents duplicate subscription rows
- `status TEXT NOT NULL CHECK (status IN ('trialing','active','past_due','canceled','unpaid'))`
- `trial_end TIMESTAMPTZ`
- `current_period_end TIMESTAMPTZ NOT NULL`
- `cancel_at_period_end BOOLEAN NOT NULL DEFAULT false`
- `stripe_event_created_at TIMESTAMPTZ` — used for out-of-order event protection
- `created_at TIMESTAMPTZ NOT NULL DEFAULT now()`
- `updated_at TIMESTAMPTZ NOT NULL DEFAULT now()`

### 8. stripe_webhook_events
- `stripe_event_id TEXT PRIMARY KEY` — Stripe event ID (evt_xxx)
- `event_type TEXT NOT NULL`
- `stripe_created_at TIMESTAMPTZ NOT NULL` — from event.created
- `processed_at TIMESTAMPTZ NOT NULL DEFAULT now()`
- `processing_error TEXT`

---

## 3. ROW LEVEL SECURITY

Explicit named policies per operation per table are required. Generic `FOR ALL USING` policies are prohibited.

### profiles
- **SELECT:** `auth.uid() = id`
- **INSERT:** `auth.uid() = id` (called once on sign-up)
- **UPDATE:** `auth.uid() = id`
- **DELETE:** not permitted directly (CASCADE from auth.users)

### company_profiles
- **SELECT:** `auth.uid() = user_id`
- **INSERT:** `auth.uid() = user_id`
- **UPDATE:** `auth.uid() = user_id`
- **DELETE:** not permitted directly

### projects
- **SELECT:** `auth.uid() = user_id`
- **INSERT:** `auth.uid() = user_id`
- **UPDATE:** `auth.uid() = user_id`
- **DELETE:** not permitted directly in MVP (archive instead)

### project_report_counters
- No direct browser policies. Access only through `create_report()` privileged function.

### reports
- **SELECT:** `auth.uid() = user_id` — always permitted regardless of subscription state.
- **INSERT:** PROHIBITED for browser clients. All inserts go through `create_report()`.
- **UPDATE:** `auth.uid() = user_id AND public.has_active_access()`
- **DELETE:** not permitted directly in MVP

### report_photos
- **SELECT:** `auth.uid() = user_id`
- **INSERT:** `auth.uid() = user_id AND public.has_active_access()`
- **UPDATE:** `auth.uid() = user_id AND public.has_active_access()`
- **DELETE:** `auth.uid() = user_id AND public.has_active_access()`

### subscriptions
- **SELECT:** `auth.uid() = user_id` — read own row only
- **INSERT, UPDATE, DELETE:** PROHIBITED for browser clients (Edge Functions use service-role)

### stripe_webhook_events
- No browser policies at all.

---

## 4. PRIVILEGED FUNCTIONS

### Subscription Access Function
```sql
CREATE OR REPLACE FUNCTION public.has_active_access()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY INVOKER
SET search_path = ''
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.subscriptions s
    WHERE s.user_id = auth.uid()
      AND (
        (s.status = 'trialing' AND s.trial_end > now())
        OR
        (s.status = 'active' AND s.current_period_end > now())
      )
  )
$$;

REVOKE ALL ON FUNCTION public.has_active_access() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.has_active_access() TO authenticated;
```

### Atomic Report Creation Function
```sql
CREATE OR REPLACE FUNCTION public.create_report(p_project_id UUID)
RETURNS TABLE (report_id UUID, report_number INTEGER)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_user_id UUID;
  v_number  INTEGER;
  v_report_id UUID;
BEGIN
  -- 1. Require authenticated user
  v_user_id := auth.uid();
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  -- 2. Verify has_active_access()
  IF NOT public.has_active_access() THEN
    RAISE EXCEPTION 'Active subscription required';
  END IF;

  -- 3. Verify caller owns the project
  IF NOT EXISTS (
    SELECT 1 FROM public.projects p
    WHERE p.id = p_project_id AND p.user_id = v_user_id
  ) THEN
    RAISE EXCEPTION 'Project not found or not owned by caller';
  END IF;

  -- 4. Atomically allocate report number
  INSERT INTO public.project_report_counters (project_id, user_id, last_report_number)
  VALUES (p_project_id, v_user_id, 1)
  ON CONFLICT (project_id) DO UPDATE
    SET last_report_number = public.project_report_counters.last_report_number + 1
  RETURNING last_report_number INTO v_number;

  -- 5. Insert draft report
  INSERT INTO public.reports (
    user_id, project_id, report_number, is_draft
  ) VALUES (
    v_user_id, p_project_id, v_number, true
  )
  RETURNING id INTO v_report_id;

  -- 6. Return
  RETURN QUERY SELECT v_report_id, v_number;
END;
$$;

REVOKE ALL ON FUNCTION public.create_report(UUID) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.create_report(UUID) TO authenticated;
```

### Immutable Report Number Trigger
```sql
CREATE OR REPLACE FUNCTION public.prevent_report_number_change()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = ''
AS $$
BEGIN
  IF NEW.report_number IS DISTINCT FROM OLD.report_number THEN
    RAISE EXCEPTION 'report_number is immutable';
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_reports_immutable_number
  BEFORE UPDATE ON public.reports
  FOR EACH ROW EXECUTE FUNCTION public.prevent_report_number_change();
```

---

## 5. SUPABASE STORAGE

**Bucket structure:** Single private bucket named `user-content`.
**Path model:**
- `users/{userId}/logos/{filename}`
- `users/{userId}/reports/{reportId}/photos/{filename}`
- `users/{userId}/reports/{reportId}/pdfs/{filename}`

### Storage RLS Policies (on `storage.objects`)

- **Logo read (SELECT):** `(storage.foldername(name))[1] = 'users' AND (storage.foldername(name))[2] = auth.uid()::text AND (storage.foldername(name))[3] = 'logos'`
- **Logo write (INSERT/UPDATE):** Path check PLUS `auth.uid() IS NOT NULL`
- **Report photo read (SELECT):** Path prefix matches `users/{auth.uid()}/reports/`
- **Report photo write (INSERT/UPDATE/DELETE):** Path prefix matches `users/{auth.uid()}/reports/` AND `public.has_active_access()`
- **Report PDF read (SELECT):** Path prefix matches `users/{auth.uid()}/reports/`
- **Report PDF write (INSERT):** Path prefix matches `users/{auth.uid()}/reports/` AND `public.has_active_access()`

*Note:* Signed URLs are generated on demand for sharing, NEVER persisted in Postgres. `logo_storage_path` and `generated_pdf_storage_path` store the stable object key. File type and size validation is done in the browser; Storage policies are the authoritative security control.

---

## 6. STRIPE INTEGRATION

### Webhooks Processing Sequence
1. Receive POST to `stripe-webhook` Edge Function.
2. Read raw request body (required for signature verification).
3. Verify `Stripe-Signature` header against raw body using `STRIPE_WEBHOOK_SECRET`. Reject with 400 if invalid.
4. Parse `event.id`, `event.type`, `event.created`.
5. Attempt INSERT into `stripe_webhook_events`. If duplicate, return 200 immediately.
6. For subscription events:
   a. Retrieve canonical subscription object directly from Stripe API.
   b. Compare `event.created` against `subscriptions.stripe_event_created_at`.
   c. Upsert `subscriptions` row via service-role client (only if `event.created > stripe_event_created_at`).
   d. Record success or update `processing_error`.
7. Return 200 for all safely handled cases.
8. NEVER erase a valid stored subscription record due to an outage.

### Trial Configuration
- Stripe Prices contain only recurring amounts: Monthly $9.99, Annual $79.99.
- Checkout Session Edge Function must explicitly set:
  - `mode: 'subscription'`
  - `subscription_data.trial_period_days: 14`
  - `payment_method_collection: 'always'`
- Price IDs come from server-side env vars (`STRIPE_MONTHLY_PRICE_ID`, `STRIPE_ANNUAL_PRICE_ID`). Browser submits only `'monthly'` or `'annual'`.
- Return URLs are hard-coded server-side (browser cannot supply them):
  - `success_url: https://sitebrief.scope-guard.com/billing/success`
  - `cancel_url:  https://sitebrief.scope-guard.com/billing/cancel`

---

## 7. AUTHENTICATION SCOPE

**Approved Scope:** Email/password sign-up, email confirmation, login, logout, forgot-password, password update.
**Not in Scope:** Magic link / passwordless authentication.

**Public launch requires a custom SMTP provider in Supabase.** The demo provider is not authorized for launch.

---

## 8. MIGRATION DELIVERY RULES

- The migration file (`supabase/migrations/001_initial.sql`) is the single source of truth.
- No ad hoc, unrecorded production SQL is ever to be run directly.
- Execution occurs only after:
  1. The migration is reviewed and committed to the repository.
  2. The Supabase project exists.
  3. The human owner has linked the local CLI to the project.
  4. A rollback approach is documented.
- The architect and implementation agent **do not execute migrations**. Only the human owner applies migrations to production.

---

## 9. AUTH REDIRECT SAFETY

Configure the following in the Supabase dashboard under **Authentication → URL Configuration**:

**Site URL:** `https://sitebrief.scope-guard.com`

**Allowed Redirect URLs:**
```
https://sitebrief.scope-guard.com/**
https://sitebrief.scope-guard.com/login
https://sitebrief.scope-guard.com/update-password
https://sitebrief.scope-guard.com/billing/success
https://sitebrief.scope-guard.com/billing/cancel
http://localhost:5173/**
```
*Note: Stripe return URLs are constructed server-side.*

---

## 10. CLOUDFLARE PAGES — DEPLOYMENT AND SPA ROUTING

**Production URL:** `https://sitebrief.scope-guard.com`

### Vite and Router Configuration
- `vite.config.ts` base remains `"/"`.
- React Router uses no `basename`.
- PWA manifest `start_url` is `"/"` and `scope` is `"/"`.

### SPA Routing
- `public/_redirects` must contain: `/* /index.html 200`
- Direct browser navigation to root paths must serve the app shell.
- No top-level `404.html`.
- `public/_headers` provides security headers.

### Edge Function CORS
Authenticated and billing Edge Functions must restrict `Access-Control-Allow-Origin` to:
`https://sitebrief.scope-guard.com` (and `http://localhost:5173` for dev). Do NOT use `*`.
