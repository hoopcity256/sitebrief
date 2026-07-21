-- =============================================================================
-- SiteBrief — Initial Schema Migration
-- File: supabase/migrations/001_initial.sql
-- Source of truth: ARCHITECTURE.md §2–§5
--
-- DO NOT run ad hoc or without review.
-- Apply only after:
--   1. Supabase project exists (H3 complete)
--   2. This file has been reviewed and approved in a separate SQL review
--   3. The human owner has linked the Supabase CLI to the project
--   4. A Supabase backup has been taken as a rollback baseline
--
-- The implementation agent does not execute this migration.
-- The architect does not execute this migration.
-- Only the human owner applies it to production.
-- =============================================================================

BEGIN;

-- =============================================================================
-- EXTENSIONS
-- =============================================================================

CREATE EXTENSION IF NOT EXISTS "pgcrypto";


-- =============================================================================
-- TABLES
-- Created in dependency order. Composite UNIQUE constraints on projects and
-- reports are required so child tables can reference (id, user_id) pairs via
-- composite foreign keys — enforcing parent ownership at the database level.
-- =============================================================================

-- ---------------------------------------------------------------------------
-- profiles
-- RLS uses auth.uid() = id (no user_id column on this table).
-- ---------------------------------------------------------------------------
CREATE TABLE public.profiles (
  id          UUID        NOT NULL,
  display_name TEXT,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT now(),

  CONSTRAINT profiles_pkey PRIMARY KEY (id),
  CONSTRAINT profiles_id_fkey FOREIGN KEY (id)
    REFERENCES auth.users(id) ON DELETE CASCADE
);

-- ---------------------------------------------------------------------------
-- company_profiles
-- logo_storage_path is a stable Supabase Storage object key — NEVER a signed
-- or expiring URL. Signed URLs are generated on demand for display only.
-- ---------------------------------------------------------------------------
CREATE TABLE public.company_profiles (
  id                  UUID        NOT NULL DEFAULT gen_random_uuid(),
  user_id             UUID        NOT NULL,
  company_name        TEXT        NOT NULL,
  phone               TEXT,
  email               TEXT,
  brand_color         TEXT,
  logo_storage_path   TEXT,
  onboarding_complete BOOLEAN     NOT NULL DEFAULT false,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at          TIMESTAMPTZ NOT NULL DEFAULT now(),

  CONSTRAINT company_profiles_pkey    PRIMARY KEY (id),
  CONSTRAINT company_profiles_user_id_key UNIQUE (user_id),
  CONSTRAINT company_profiles_user_id_fkey FOREIGN KEY (user_id)
    REFERENCES auth.users(id) ON DELETE CASCADE
);

-- ---------------------------------------------------------------------------
-- projects
-- UNIQUE(id, user_id) is required so that child tables (project_report_counters,
-- reports) can declare composite foreign keys enforcing parent ownership.
-- ---------------------------------------------------------------------------
CREATE TABLE public.projects (
  id             UUID        NOT NULL DEFAULT gen_random_uuid(),
  user_id        UUID        NOT NULL,
  name           TEXT        NOT NULL,
  customer_name  TEXT        NOT NULL,
  address        TEXT        NOT NULL,
  customer_email TEXT,
  customer_phone TEXT,
  is_archived    BOOLEAN     NOT NULL DEFAULT false,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at     TIMESTAMPTZ NOT NULL DEFAULT now(),

  CONSTRAINT projects_pkey         PRIMARY KEY (id),
  CONSTRAINT projects_id_user_id_key UNIQUE (id, user_id),
  CONSTRAINT projects_user_id_fkey FOREIGN KEY (user_id)
    REFERENCES auth.users(id) ON DELETE CASCADE
);

CREATE INDEX projects_user_id_created_at_idx
  ON public.projects (user_id, created_at DESC);

-- ---------------------------------------------------------------------------
-- project_report_counters
-- Internal counter table — no browser access. Accessed exclusively through
-- create_report() SECURITY DEFINER function.
-- Composite FK enforces that the (project_id, user_id) pair exists in
-- projects, preventing counter rows that point to another user's project.
-- ---------------------------------------------------------------------------
CREATE TABLE public.project_report_counters (
  project_id         UUID    NOT NULL,
  user_id            UUID    NOT NULL,
  last_report_number INTEGER NOT NULL DEFAULT 0,

  CONSTRAINT project_report_counters_pkey PRIMARY KEY (project_id),
  CONSTRAINT project_report_counters_project_user_fkey
    FOREIGN KEY (project_id, user_id) REFERENCES public.projects(id, user_id)
    ON DELETE CASCADE
);

-- ---------------------------------------------------------------------------
-- reports
-- generated_pdf_storage_path is a stable Storage object key — NEVER a signed
-- URL. Signed URLs are generated on demand for sharing/download only.
-- UNIQUE(id, user_id) is required for composite FK from report_photos.
-- UNIQUE(project_id, report_number) is the final atomicity guard.
-- report_number is immutable after creation (enforced by trigger below).
-- Direct browser INSERT is prohibited via RLS.
-- ---------------------------------------------------------------------------
CREATE TABLE public.reports (
  id                       UUID        NOT NULL DEFAULT gen_random_uuid(),
  user_id                  UUID        NOT NULL,
  project_id               UUID        NOT NULL,
  report_number            INTEGER     NOT NULL,
  is_draft                 BOOLEAN     NOT NULL DEFAULT true,
  work_completed           TEXT,
  problems                 TEXT,
  next_steps               TEXT,
  generated_pdf_storage_path TEXT,
  generated_at             TIMESTAMPTZ,
  created_at               TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at               TIMESTAMPTZ NOT NULL DEFAULT now(),

  CONSTRAINT reports_pkey              PRIMARY KEY (id),
  CONSTRAINT reports_id_user_id_key    UNIQUE (id, user_id),
  CONSTRAINT reports_project_number_key UNIQUE (project_id, report_number),
  CONSTRAINT reports_user_id_fkey      FOREIGN KEY (user_id)
    REFERENCES auth.users(id) ON DELETE CASCADE,
  CONSTRAINT reports_project_user_fkey
    FOREIGN KEY (project_id, user_id) REFERENCES public.projects(id, user_id)
    ON DELETE CASCADE
);

CREATE INDEX reports_project_id_created_at_idx
  ON public.reports (project_id, created_at DESC);

-- ---------------------------------------------------------------------------
-- report_photos
-- storage_path is a relative Supabase Storage object key.
-- UNIQUE(report_id, display_order) enforces ordering uniqueness.
-- Composite FK enforces that the (report_id, user_id) pair exists in reports.
-- ---------------------------------------------------------------------------
CREATE TABLE public.report_photos (
  id            UUID        NOT NULL DEFAULT gen_random_uuid(),
  user_id       UUID        NOT NULL,
  report_id     UUID        NOT NULL,
  storage_path  TEXT        NOT NULL,
  display_order INTEGER     NOT NULL,
  caption       TEXT,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT now(),

  CONSTRAINT report_photos_pkey               PRIMARY KEY (id),
  CONSTRAINT report_photos_order_key          UNIQUE (report_id, display_order),
  CONSTRAINT report_photos_user_id_fkey       FOREIGN KEY (user_id)
    REFERENCES auth.users(id) ON DELETE CASCADE,
  CONSTRAINT report_photos_report_user_fkey
    FOREIGN KEY (report_id, user_id) REFERENCES public.reports(id, user_id)
    ON DELETE CASCADE
);

CREATE INDEX report_photos_report_id_order_idx
  ON public.report_photos (report_id, display_order);

-- ---------------------------------------------------------------------------
-- subscriptions
-- Written exclusively by Edge Functions via service-role client.
-- stripe_customer_id and stripe_subscription_id are UNIQUE to prevent
-- duplicate customer/subscription mappings.
-- stripe_event_created_at guards against out-of-order webhook delivery.
-- Browser users receive SELECT on their own row only.
-- ---------------------------------------------------------------------------
CREATE TABLE public.subscriptions (
  id                      UUID        NOT NULL DEFAULT gen_random_uuid(),
  user_id                 UUID        NOT NULL,
  stripe_customer_id      TEXT,
  stripe_subscription_id  TEXT,
  status                  TEXT        NOT NULL,
  trial_end               TIMESTAMPTZ,
  current_period_end      TIMESTAMPTZ NOT NULL,
  cancel_at_period_end    BOOLEAN     NOT NULL DEFAULT false,
  stripe_event_created_at TIMESTAMPTZ,
  created_at              TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at              TIMESTAMPTZ NOT NULL DEFAULT now(),

  CONSTRAINT subscriptions_pkey                    PRIMARY KEY (id),
  CONSTRAINT subscriptions_user_id_key             UNIQUE (user_id),
  CONSTRAINT subscriptions_stripe_customer_id_key  UNIQUE (stripe_customer_id),
  CONSTRAINT subscriptions_stripe_sub_id_key       UNIQUE (stripe_subscription_id),
  CONSTRAINT subscriptions_status_check            CHECK (
    status IN ('trialing', 'active', 'past_due', 'canceled', 'unpaid')
  ),
  CONSTRAINT subscriptions_user_id_fkey            FOREIGN KEY (user_id)
    REFERENCES auth.users(id) ON DELETE CASCADE
);

-- ---------------------------------------------------------------------------
-- stripe_webhook_events
-- Idempotency log. processed_at is nullable — it is only set on success.
-- A row with processing_error IS NOT NULL and processed_at IS NULL is
-- eligible for retry. A duplicate event may be skipped only when
-- processed_at IS NOT NULL (fully processed).
-- No browser access.
-- ---------------------------------------------------------------------------
CREATE TABLE public.stripe_webhook_events (
  stripe_event_id      TEXT        NOT NULL,
  event_type           TEXT        NOT NULL,
  stripe_created_at    TIMESTAMPTZ NOT NULL,
  processing_started_at TIMESTAMPTZ,
  processed_at         TIMESTAMPTZ,
  processing_error     TEXT,
  attempt_count        INTEGER     NOT NULL DEFAULT 0,

  CONSTRAINT stripe_webhook_events_pkey PRIMARY KEY (stripe_event_id)
);


-- =============================================================================
-- ENABLE ROW LEVEL SECURITY
-- =============================================================================

ALTER TABLE public.profiles              ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.company_profiles      ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.projects              ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.project_report_counters ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.reports               ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.report_photos         ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.subscriptions         ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.stripe_webhook_events ENABLE ROW LEVEL SECURITY;


-- =============================================================================
-- EXPLICIT PRIVILEGE REVOCATIONS
-- Narrow access beyond the absence of RLS policies for sensitive tables.
-- =============================================================================

-- Revoke all direct authenticated access to counter and webhook tables.
REVOKE ALL ON public.project_report_counters FROM authenticated;
REVOKE ALL ON public.stripe_webhook_events   FROM authenticated;
REVOKE ALL ON public.stripe_webhook_events   FROM anon;

-- Revoke INSERT on reports from authenticated (must use create_report()).
-- UPDATE is still allowed (governed by RLS policy below).
REVOKE INSERT ON public.reports FROM authenticated;
REVOKE INSERT ON public.reports FROM anon;


-- =============================================================================
-- RLS POLICIES
-- Explicit named SELECT / INSERT / UPDATE / DELETE policies per table.
-- All INSERT and UPDATE policies include an explicit WITH CHECK condition.
-- Generic FOR ALL policies are prohibited.
-- =============================================================================

-- ---------------------------------------------------------------------------
-- profiles (RLS uses auth.uid() = id, not user_id)
-- ---------------------------------------------------------------------------
CREATE POLICY "profiles_select_own"
  ON public.profiles FOR SELECT
  USING (auth.uid() = id);

CREATE POLICY "profiles_insert_own"
  ON public.profiles FOR INSERT
  WITH CHECK (auth.uid() = id);

CREATE POLICY "profiles_update_own"
  ON public.profiles FOR UPDATE
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

-- DELETE is handled by CASCADE from auth.users; no direct browser delete.

-- ---------------------------------------------------------------------------
-- company_profiles
-- ---------------------------------------------------------------------------
CREATE POLICY "company_profiles_select_own"
  ON public.company_profiles FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "company_profiles_insert_own"
  ON public.company_profiles FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "company_profiles_update_own"
  ON public.company_profiles FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- ---------------------------------------------------------------------------
-- projects
-- ---------------------------------------------------------------------------
CREATE POLICY "projects_select_own"
  ON public.projects FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "projects_insert_own"
  ON public.projects FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "projects_update_own"
  ON public.projects FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- DELETE not permitted in MVP (use is_archived = true instead).

-- ---------------------------------------------------------------------------
-- project_report_counters — no browser policies (access via function only)
-- Direct authenticated access revoked above.
-- ---------------------------------------------------------------------------

-- ---------------------------------------------------------------------------
-- reports
-- SELECT is always permitted to the owner regardless of subscription state
-- (expired users retain read access to their own reports).
-- INSERT is prohibited for browser clients (must use create_report()).
-- UPDATE requires active access; report_number immutability enforced by trigger.
-- ---------------------------------------------------------------------------
CREATE POLICY "reports_select_own"
  ON public.reports FOR SELECT
  USING (auth.uid() = user_id);

-- No INSERT policy: direct INSERT revoked above and no permissive policy exists.

CREATE POLICY "reports_update_own_active"
  ON public.reports FOR UPDATE
  USING (auth.uid() = user_id AND public.has_active_access())
  WITH CHECK (auth.uid() = user_id AND public.has_active_access());

-- DELETE not permitted in MVP.

-- ---------------------------------------------------------------------------
-- report_photos
-- SELECT always permitted (expired owners retain photo read access).
-- INSERT/UPDATE/DELETE require active access.
-- ---------------------------------------------------------------------------
CREATE POLICY "report_photos_select_own"
  ON public.report_photos FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "report_photos_insert_own_active"
  ON public.report_photos FOR INSERT
  WITH CHECK (auth.uid() = user_id AND public.has_active_access());

CREATE POLICY "report_photos_update_own_active"
  ON public.report_photos FOR UPDATE
  USING (auth.uid() = user_id AND public.has_active_access())
  WITH CHECK (auth.uid() = user_id AND public.has_active_access());

CREATE POLICY "report_photos_delete_own_active"
  ON public.report_photos FOR DELETE
  USING (auth.uid() = user_id AND public.has_active_access());

-- ---------------------------------------------------------------------------
-- subscriptions — SELECT only for browser clients
-- INSERT/UPDATE/DELETE are only permitted via service-role (Edge Functions).
-- ---------------------------------------------------------------------------
CREATE POLICY "subscriptions_select_own"
  ON public.subscriptions FOR SELECT
  USING (auth.uid() = user_id);

-- No INSERT/UPDATE/DELETE policies for authenticated or anon roles.
-- Edge Functions use the service-role key which bypasses RLS entirely.

-- ---------------------------------------------------------------------------
-- stripe_webhook_events — no browser policies
-- ---------------------------------------------------------------------------


-- =============================================================================
-- PRIVILEGED FUNCTIONS
-- =============================================================================

-- ---------------------------------------------------------------------------
-- has_active_access()
-- Returns true when the authenticated user has an active or trialing
-- subscription that has not yet expired.
-- SECURITY INVOKER (runs as the calling user; auth.uid() is safe to use).
-- SET search_path = '' forces schema-qualified names throughout.
-- cancel_at_period_end = true with status='active' remains entitled until
-- current_period_end passes.
-- ---------------------------------------------------------------------------
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
        (s.status = 'trialing' AND s.trial_end   > now())
        OR
        (s.status = 'active'   AND s.current_period_end > now())
      )
  )
$$;

REVOKE ALL    ON FUNCTION public.has_active_access() FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.has_active_access() FROM anon;
GRANT  EXECUTE ON FUNCTION public.has_active_access() TO authenticated;

-- ---------------------------------------------------------------------------
-- create_report(p_project_id UUID)
-- Atomic report creation function. Must be called instead of direct INSERT.
-- SECURITY DEFINER required so the function can INSERT into reports and
-- UPSERT into project_report_counters despite those tables having restricted
-- or no browser INSERT privileges.
-- SET search_path = '' forces all references to be schema-qualified.
-- auth.uid() is the sole source of user identity — no caller-supplied user ID.
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.create_report(p_project_id UUID)
RETURNS TABLE (report_id UUID, report_number INTEGER)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_user_id   UUID;
  v_number    INTEGER;
  v_report_id UUID;
BEGIN
  -- 1. Require an authenticated caller.
  v_user_id := auth.uid();
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'create_report: caller is not authenticated';
  END IF;

  -- 2. Require an active or trialing subscription.
  IF NOT public.has_active_access() THEN
    RAISE EXCEPTION 'create_report: active subscription required';
  END IF;

  -- 3. Verify the caller owns the requested project.
  IF NOT EXISTS (
    SELECT 1
    FROM public.projects AS p
    WHERE p.id = p_project_id
      AND p.user_id = v_user_id
  ) THEN
    RAISE EXCEPTION 'create_report: project not found or not owned by caller';
  END IF;

  -- 4. Atomically allocate the next report number for this project.
  --    ON CONFLICT increments the existing counter; first call inserts 1.
  INSERT INTO public.project_report_counters (project_id, user_id, last_report_number)
  VALUES (p_project_id, v_user_id, 1)
  ON CONFLICT (project_id) DO UPDATE
    SET last_report_number =
          public.project_report_counters.last_report_number + 1
  RETURNING public.project_report_counters.last_report_number
  INTO v_number;

  -- 5. Insert the draft report with the allocated number.
  INSERT INTO public.reports (
    user_id,
    project_id,
    report_number,
    is_draft
  ) VALUES (
    v_user_id,
    p_project_id,
    v_number,
    true
  )
  RETURNING public.reports.id
  INTO v_report_id;

  -- 6. Return the new report ID and report number.
  RETURN QUERY SELECT v_report_id, v_number;
END;
$$;

REVOKE ALL     ON FUNCTION public.create_report(UUID) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.create_report(UUID) FROM anon;
GRANT  EXECUTE ON FUNCTION public.create_report(UUID) TO authenticated;

-- ---------------------------------------------------------------------------
-- prevent_report_number_change() — trigger function
-- Enforces immutability of report_number after creation.
-- Any UPDATE that attempts to change report_number is rejected at the
-- database level, regardless of the caller's privileges.
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.prevent_report_number_change()
RETURNS trigger
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = ''
AS $$
BEGIN
  IF NEW.report_number IS DISTINCT FROM OLD.report_number THEN
    RAISE EXCEPTION
      'prevent_report_number_change: report_number is immutable (report id: %)',
      OLD.id;
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_reports_immutable_number
  BEFORE UPDATE ON public.reports
  FOR EACH ROW
  EXECUTE FUNCTION public.prevent_report_number_change();


-- =============================================================================
-- SUPABASE STORAGE
-- Private bucket. All paths follow the model:
--   users/{userId}/logos/{filename}
--   users/{userId}/reports/{reportId}/photos/{filename}
--   users/{userId}/reports/{reportId}/pdfs/{filename}
--
-- logo_storage_path and generated_pdf_storage_path in Postgres store the
-- stable object key only — NEVER a signed or expiring URL.
-- Signed URLs are generated on demand and never persisted.
-- =============================================================================

INSERT INTO storage.buckets (id, name, public)
VALUES ('user-content', 'user-content', false)
ON CONFLICT (id) DO NOTHING;

-- ---------------------------------------------------------------------------
-- Storage RLS policies on storage.objects
-- ---------------------------------------------------------------------------

-- Logo read — owner can read their own logo files.
CREATE POLICY "storage_logos_select_own"
  ON storage.objects FOR SELECT
  USING (
    bucket_id = 'user-content'
    AND auth.uid() IS NOT NULL
    AND (storage.foldername(name))[1] = 'users'
    AND (storage.foldername(name))[2] = auth.uid()::text
    AND (storage.foldername(name))[3] = 'logos'
  );

-- Logo write — owner can upload/replace their own logo.
CREATE POLICY "storage_logos_insert_own"
  ON storage.objects FOR INSERT
  WITH CHECK (
    bucket_id = 'user-content'
    AND auth.uid() IS NOT NULL
    AND (storage.foldername(name))[1] = 'users'
    AND (storage.foldername(name))[2] = auth.uid()::text
    AND (storage.foldername(name))[3] = 'logos'
  );

CREATE POLICY "storage_logos_update_own"
  ON storage.objects FOR UPDATE
  USING (
    bucket_id = 'user-content'
    AND auth.uid() IS NOT NULL
    AND (storage.foldername(name))[1] = 'users'
    AND (storage.foldername(name))[2] = auth.uid()::text
    AND (storage.foldername(name))[3] = 'logos'
  )
  WITH CHECK (
    bucket_id = 'user-content'
    AND auth.uid() IS NOT NULL
    AND (storage.foldername(name))[1] = 'users'
    AND (storage.foldername(name))[2] = auth.uid()::text
    AND (storage.foldername(name))[3] = 'logos'
  );

-- Report photos read — owner always retains read access (expired users too).
CREATE POLICY "storage_photos_select_own"
  ON storage.objects FOR SELECT
  USING (
    bucket_id = 'user-content'
    AND auth.uid() IS NOT NULL
    AND (storage.foldername(name))[1] = 'users'
    AND (storage.foldername(name))[2] = auth.uid()::text
    AND (storage.foldername(name))[3] = 'reports'
    AND (storage.foldername(name))[5] = 'photos'
  );

-- Report photos write — requires active access.
CREATE POLICY "storage_photos_insert_own_active"
  ON storage.objects FOR INSERT
  WITH CHECK (
    bucket_id = 'user-content'
    AND auth.uid() IS NOT NULL
    AND (storage.foldername(name))[1] = 'users'
    AND (storage.foldername(name))[2] = auth.uid()::text
    AND (storage.foldername(name))[3] = 'reports'
    AND (storage.foldername(name))[5] = 'photos'
    AND public.has_active_access()
  );

CREATE POLICY "storage_photos_update_own_active"
  ON storage.objects FOR UPDATE
  USING (
    bucket_id = 'user-content'
    AND auth.uid() IS NOT NULL
    AND (storage.foldername(name))[1] = 'users'
    AND (storage.foldername(name))[2] = auth.uid()::text
    AND (storage.foldername(name))[3] = 'reports'
    AND (storage.foldername(name))[5] = 'photos'
    AND public.has_active_access()
  )
  WITH CHECK (
    bucket_id = 'user-content'
    AND auth.uid() IS NOT NULL
    AND (storage.foldername(name))[1] = 'users'
    AND (storage.foldername(name))[2] = auth.uid()::text
    AND (storage.foldername(name))[3] = 'reports'
    AND (storage.foldername(name))[5] = 'photos'
    AND public.has_active_access()
  );

CREATE POLICY "storage_photos_delete_own_active"
  ON storage.objects FOR DELETE
  USING (
    bucket_id = 'user-content'
    AND auth.uid() IS NOT NULL
    AND (storage.foldername(name))[1] = 'users'
    AND (storage.foldername(name))[2] = auth.uid()::text
    AND (storage.foldername(name))[3] = 'reports'
    AND (storage.foldername(name))[5] = 'photos'
    AND public.has_active_access()
  );

-- Report PDFs read — owner always retains read access (expired users too).
CREATE POLICY "storage_pdfs_select_own"
  ON storage.objects FOR SELECT
  USING (
    bucket_id = 'user-content'
    AND auth.uid() IS NOT NULL
    AND (storage.foldername(name))[1] = 'users'
    AND (storage.foldername(name))[2] = auth.uid()::text
    AND (storage.foldername(name))[3] = 'reports'
    AND (storage.foldername(name))[5] = 'pdfs'
  );

-- Report PDFs write — requires active access.
CREATE POLICY "storage_pdfs_insert_own_active"
  ON storage.objects FOR INSERT
  WITH CHECK (
    bucket_id = 'user-content'
    AND auth.uid() IS NOT NULL
    AND (storage.foldername(name))[1] = 'users'
    AND (storage.foldername(name))[2] = auth.uid()::text
    AND (storage.foldername(name))[3] = 'reports'
    AND (storage.foldername(name))[5] = 'pdfs'
    AND public.has_active_access()
  );

COMMIT;

-- =============================================================================
-- STATUS: DRAFTED — NOT APPLIED
-- This file has been committed to the repository for review.
-- It must not be applied until a separate SQL review has approved it
-- and the human owner has authorized execution.
-- =============================================================================
