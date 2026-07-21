-- =============================================================================
-- SiteBrief — Initial Schema Migration (corrective revision)
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
-- The implementation agent and architect do not execute this migration.
-- Only the human owner applies it to production.
--
-- STATUS: DRAFTED — NOT APPLIED
-- =============================================================================

BEGIN;

-- =============================================================================
-- EXTENSIONS
-- =============================================================================

CREATE EXTENSION IF NOT EXISTS "pgcrypto";


-- =============================================================================
-- TABLES
-- Created in dependency order.
--
-- COMPOSITE UNIQUE on projects(id, user_id) and reports(id, user_id) are
-- required so that child tables can declare composite foreign keys referencing
-- both the row and its owner — enforcing parent ownership at the database
-- level without relying solely on RLS.
-- =============================================================================

-- ---------------------------------------------------------------------------
-- profiles
-- RLS uses auth.uid() = id.  This table has no user_id column.
-- ---------------------------------------------------------------------------
CREATE TABLE public.profiles (
  id           UUID        NOT NULL,
  display_name TEXT,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at   TIMESTAMPTZ NOT NULL DEFAULT now(),

  CONSTRAINT profiles_pkey    PRIMARY KEY (id),
  CONSTRAINT profiles_id_fkey FOREIGN KEY (id)
    REFERENCES auth.users(id) ON DELETE CASCADE
);

-- ---------------------------------------------------------------------------
-- company_profiles
-- logo_storage_path stores a stable Storage object key — NEVER a signed URL.
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

  CONSTRAINT company_profiles_pkey         PRIMARY KEY (id),
  CONSTRAINT company_profiles_user_id_key  UNIQUE (user_id),
  CONSTRAINT company_profiles_user_id_fkey FOREIGN KEY (user_id)
    REFERENCES auth.users(id) ON DELETE CASCADE
);

-- ---------------------------------------------------------------------------
-- projects
-- UNIQUE(id, user_id) is required for composite FK references from
-- project_report_counters and reports.
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

  CONSTRAINT projects_pkey           PRIMARY KEY (id),
  CONSTRAINT projects_id_user_id_key UNIQUE (id, user_id),
  CONSTRAINT projects_user_id_fkey   FOREIGN KEY (user_id)
    REFERENCES auth.users(id) ON DELETE CASCADE
);

CREATE INDEX projects_user_id_created_at_idx
  ON public.projects (user_id, created_at DESC);

-- ---------------------------------------------------------------------------
-- project_report_counters
-- No browser access.  Accessed exclusively through create_report().
-- Composite FK enforces that (project_id, user_id) exists in projects,
-- preventing a counter row from pointing to another user's project.
-- ---------------------------------------------------------------------------
CREATE TABLE public.project_report_counters (
  project_id         UUID    NOT NULL,
  user_id            UUID    NOT NULL,
  last_report_number INTEGER NOT NULL DEFAULT 0,

  CONSTRAINT project_report_counters_pkey         PRIMARY KEY (project_id),
  CONSTRAINT project_report_counters_number_check CHECK (last_report_number >= 0),
  CONSTRAINT project_report_counters_project_user_fkey
    FOREIGN KEY (project_id, user_id)
    REFERENCES public.projects(id, user_id) ON DELETE CASCADE
);

-- ---------------------------------------------------------------------------
-- reports
-- generated_pdf_storage_path stores a stable Storage object key — NEVER a
-- signed URL.  Signed URLs are generated on demand for sharing only.
-- UNIQUE(id, user_id) supports composite FK from report_photos.
-- UNIQUE(project_id, report_number) is the final atomicity guard.
-- report_number > 0 prevents zero or negative numbers from the counter.
-- report_number immutability is enforced by the trigger below.
-- Direct browser INSERT is prohibited via explicit REVOKE and absent policy.
-- ---------------------------------------------------------------------------
CREATE TABLE public.reports (
  id                         UUID        NOT NULL DEFAULT gen_random_uuid(),
  user_id                    UUID        NOT NULL,
  project_id                 UUID        NOT NULL,
  report_number              INTEGER     NOT NULL,
  is_draft                   BOOLEAN     NOT NULL DEFAULT true,
  work_completed             TEXT,
  problems                   TEXT,
  next_steps                 TEXT,
  generated_pdf_storage_path TEXT,
  generated_at               TIMESTAMPTZ,
  created_at                 TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at                 TIMESTAMPTZ NOT NULL DEFAULT now(),

  CONSTRAINT reports_pkey               PRIMARY KEY (id),
  CONSTRAINT reports_id_user_id_key     UNIQUE (id, user_id),
  CONSTRAINT reports_project_number_key UNIQUE (project_id, report_number),
  CONSTRAINT reports_report_number_pos  CHECK (report_number > 0),
  CONSTRAINT reports_user_id_fkey       FOREIGN KEY (user_id)
    REFERENCES auth.users(id) ON DELETE CASCADE,
  CONSTRAINT reports_project_user_fkey
    FOREIGN KEY (project_id, user_id)
    REFERENCES public.projects(id, user_id) ON DELETE CASCADE
);

CREATE INDEX reports_project_id_created_at_idx
  ON public.reports (project_id, created_at DESC);

-- ---------------------------------------------------------------------------
-- report_photos
-- storage_path is a relative Storage object key.  UNIQUE on storage_path
-- prevents the same file being registered twice.
-- UNIQUE(report_id, display_order) combined with CHECK (display_order BETWEEN
-- 0 AND 9) enforces a hard maximum of 10 photos per report.
-- Composite FK enforces that (report_id, user_id) exists in reports.
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
  CONSTRAINT report_photos_storage_path_key   UNIQUE (storage_path),
  CONSTRAINT report_photos_display_order_check
    CHECK (display_order BETWEEN 0 AND 9),
  CONSTRAINT report_photos_user_id_fkey       FOREIGN KEY (user_id)
    REFERENCES auth.users(id) ON DELETE CASCADE,
  CONSTRAINT report_photos_report_user_fkey
    FOREIGN KEY (report_id, user_id)
    REFERENCES public.reports(id, user_id) ON DELETE CASCADE
);

CREATE INDEX report_photos_report_id_order_idx
  ON public.report_photos (report_id, display_order);

-- ---------------------------------------------------------------------------
-- subscriptions
-- Written exclusively by Edge Functions via the service-role client.
-- stripe_event_created_at guards against out-of-order webhook delivery.
-- The status CHECK permits every Stripe subscription status.
-- Only 'trialing' and 'active' grant application access (see has_active_access).
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

  CONSTRAINT subscriptions_pkey                   PRIMARY KEY (id),
  CONSTRAINT subscriptions_user_id_key            UNIQUE (user_id),
  CONSTRAINT subscriptions_stripe_customer_id_key UNIQUE (stripe_customer_id),
  CONSTRAINT subscriptions_stripe_sub_id_key      UNIQUE (stripe_subscription_id),
  CONSTRAINT subscriptions_status_check           CHECK (
    status IN (
      'incomplete', 'incomplete_expired', 'trialing', 'active',
      'past_due', 'canceled', 'unpaid', 'paused'
    )
  ),
  CONSTRAINT subscriptions_user_id_fkey           FOREIGN KEY (user_id)
    REFERENCES auth.users(id) ON DELETE CASCADE
);

-- ---------------------------------------------------------------------------
-- stripe_webhook_events
-- Idempotency log for incoming webhook deliveries.
-- processed_at has NO DEFAULT — it is set only on successful processing.
-- A row where processed_at IS NULL is eligible for retry regardless of whether
-- processing_error IS NOT NULL.
-- A duplicate event may be skipped ONLY when processed_at IS NOT NULL.
-- No browser access.
-- ---------------------------------------------------------------------------
CREATE TABLE public.stripe_webhook_events (
  stripe_event_id       TEXT        NOT NULL,
  event_type            TEXT        NOT NULL,
  stripe_created_at     TIMESTAMPTZ NOT NULL,
  processing_started_at TIMESTAMPTZ,
  processed_at          TIMESTAMPTZ,
  processing_error      TEXT,
  attempt_count         INTEGER     NOT NULL DEFAULT 0,

  CONSTRAINT stripe_webhook_events_pkey PRIMARY KEY (stripe_event_id)
);


-- =============================================================================
-- ENABLE ROW LEVEL SECURITY
-- Must be enabled before any policies are declared.
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
-- EXPLICIT TABLE PRIVILEGES
-- Revoke all from anon and authenticated first, then grant exactly the minimum
-- required for browser operation.  RLS must also permit an operation; both
-- privilege and policy must pass.
-- =============================================================================

REVOKE ALL ON public.profiles                FROM anon, authenticated;
REVOKE ALL ON public.company_profiles        FROM anon, authenticated;
REVOKE ALL ON public.projects                FROM anon, authenticated;
REVOKE ALL ON public.project_report_counters FROM anon, authenticated;
REVOKE ALL ON public.reports                 FROM anon, authenticated;
REVOKE ALL ON public.report_photos           FROM anon, authenticated;
REVOKE ALL ON public.subscriptions           FROM anon, authenticated;
REVOKE ALL ON public.stripe_webhook_events   FROM anon, authenticated;

-- Browser privileges (authenticated role only)
GRANT SELECT, INSERT, UPDATE             ON public.profiles           TO authenticated;
GRANT SELECT, INSERT, UPDATE             ON public.company_profiles   TO authenticated;
GRANT SELECT, INSERT, UPDATE             ON public.projects           TO authenticated;
-- project_report_counters: no browser access
GRANT SELECT, UPDATE                     ON public.reports            TO authenticated;
-- No direct INSERT or DELETE on reports for authenticated
GRANT SELECT, INSERT, UPDATE, DELETE     ON public.report_photos      TO authenticated;
GRANT SELECT                             ON public.subscriptions      TO authenticated;
-- stripe_webhook_events: no browser access

-- Server-side privileges (service_role bypasses RLS but needs table-level grants)
GRANT SELECT, INSERT, UPDATE             ON public.subscriptions         TO service_role;
GRANT SELECT, INSERT, UPDATE             ON public.stripe_webhook_events  TO service_role;


-- =============================================================================
-- has_active_access()
-- Defined here — after the subscriptions table exists and after explicit
-- privileges are set, but BEFORE any RLS policy references it.
--
-- Returns true when the caller has a valid trialing or active subscription.
-- cancel_at_period_end = true with status = 'active' remains entitled until
-- current_period_end passes.  paused, past_due, unpaid, canceled, and
-- incomplete statuses return false.
-- No live Stripe API call is made.
-- SECURITY INVOKER: runs as the authenticated user; auth.uid() is safe.
-- SET search_path = '' forces all references to be schema-qualified.
-- =============================================================================

CREATE OR REPLACE FUNCTION public.has_active_access()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY INVOKER
SET search_path = ''
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.subscriptions AS s
    WHERE s.user_id = auth.uid()
      AND (
        (s.status = 'trialing' AND s.trial_end        > now())
        OR
        (s.status = 'active'   AND s.current_period_end > now())
      )
  )
$$;

REVOKE ALL     ON FUNCTION public.has_active_access() FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.has_active_access() FROM anon;
GRANT  EXECUTE ON FUNCTION public.has_active_access() TO authenticated;


-- =============================================================================
-- RLS POLICIES
-- All policies declare TO authenticated explicitly.
-- All INSERT and UPDATE policies include an explicit WITH CHECK condition.
-- No generic FOR ALL USING policies.
-- =============================================================================

-- ---------------------------------------------------------------------------
-- profiles (RLS check: auth.uid() = id, not user_id)
-- ---------------------------------------------------------------------------
CREATE POLICY "profiles_select_own"
  ON public.profiles FOR SELECT TO authenticated
  USING (auth.uid() = id);

CREATE POLICY "profiles_insert_own"
  ON public.profiles FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = id);

CREATE POLICY "profiles_update_own"
  ON public.profiles FOR UPDATE TO authenticated
  USING     (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

-- DELETE handled by CASCADE from auth.users; no direct browser delete.

-- ---------------------------------------------------------------------------
-- company_profiles
-- ---------------------------------------------------------------------------
CREATE POLICY "company_profiles_select_own"
  ON public.company_profiles FOR SELECT TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "company_profiles_insert_own"
  ON public.company_profiles FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "company_profiles_update_own"
  ON public.company_profiles FOR UPDATE TO authenticated
  USING     (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- ---------------------------------------------------------------------------
-- projects
-- ---------------------------------------------------------------------------
CREATE POLICY "projects_select_own"
  ON public.projects FOR SELECT TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "projects_insert_own"
  ON public.projects FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "projects_update_own"
  ON public.projects FOR UPDATE TO authenticated
  USING     (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- DELETE not permitted in MVP (archive via is_archived = true).

-- ---------------------------------------------------------------------------
-- project_report_counters — no browser policies.
-- Access revoked above; table is only reachable through create_report().
-- ---------------------------------------------------------------------------

-- ---------------------------------------------------------------------------
-- reports
-- SELECT is always permitted to the owner regardless of subscription state.
-- Expired users retain read access to their own reports.
-- INSERT privilege was revoked above; no permissive INSERT policy exists.
-- UPDATE requires active access; report identity fields protected by trigger.
-- ---------------------------------------------------------------------------
CREATE POLICY "reports_select_own"
  ON public.reports FOR SELECT TO authenticated
  USING (auth.uid() = user_id);

-- No INSERT policy: INSERT revoked at privilege level; must use create_report().

CREATE POLICY "reports_update_own_active"
  ON public.reports FOR UPDATE TO authenticated
  USING     (auth.uid() = user_id AND public.has_active_access())
  WITH CHECK (auth.uid() = user_id AND public.has_active_access());

-- DELETE not permitted in MVP.

-- ---------------------------------------------------------------------------
-- report_photos
-- SELECT always permitted to owner (expired users retain photo read access).
-- INSERT, UPDATE, DELETE require active access.
-- ---------------------------------------------------------------------------
CREATE POLICY "report_photos_select_own"
  ON public.report_photos FOR SELECT TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "report_photos_insert_own_active"
  ON public.report_photos FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id AND public.has_active_access());

CREATE POLICY "report_photos_update_own_active"
  ON public.report_photos FOR UPDATE TO authenticated
  USING     (auth.uid() = user_id AND public.has_active_access())
  WITH CHECK (auth.uid() = user_id AND public.has_active_access());

CREATE POLICY "report_photos_delete_own_active"
  ON public.report_photos FOR DELETE TO authenticated
  USING (auth.uid() = user_id AND public.has_active_access());

-- ---------------------------------------------------------------------------
-- subscriptions — SELECT only for browser; no INSERT/UPDATE/DELETE policies.
-- Edge Functions use the service-role key which bypasses RLS entirely.
-- ---------------------------------------------------------------------------
CREATE POLICY "subscriptions_select_own"
  ON public.subscriptions FOR SELECT TO authenticated
  USING (auth.uid() = user_id);

-- ---------------------------------------------------------------------------
-- stripe_webhook_events — no browser policies at all.
-- ---------------------------------------------------------------------------


-- =============================================================================
-- create_report(p_project_id UUID)
-- Defined after RLS policies so it can reference them conceptually; the
-- function itself bypasses RLS via SECURITY DEFINER and service-level inserts.
--
-- SECURITY DEFINER: required so the function can INSERT into public.reports
-- and UPSERT into public.project_report_counters despite those tables having
-- INSERT revoked from authenticated.
-- SET search_path = '': forces all references to be schema-qualified.
-- auth.uid() is the sole source of identity — no caller-supplied user ID.
-- =============================================================================

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
    WHERE p.id      = p_project_id
      AND p.user_id = v_user_id
  ) THEN
    RAISE EXCEPTION 'create_report: project not found or not owned by caller';
  END IF;

  -- 4. Atomically allocate the next report number for this project.
  --    First call inserts last_report_number = 1.
  --    Subsequent calls increment the existing counter in one atomic step.
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

  -- 6. Return the new report ID and its allocated number.
  RETURN QUERY SELECT v_report_id, v_number;
END;
$$;

REVOKE ALL     ON FUNCTION public.create_report(UUID) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.create_report(UUID) FROM anon;
GRANT  EXECUTE ON FUNCTION public.create_report(UUID) TO authenticated;


-- =============================================================================
-- IMMUTABLE REPORT IDENTITY TRIGGER
-- Prevents UPDATE from changing any of the four identity columns on reports:
--   id, user_id, project_id, report_number
-- Report content fields (is_draft, work_completed, problems, next_steps,
-- generated_pdf_storage_path, generated_at, updated_at) remain editable for
-- entitled owners per the reports_update_own_active RLS policy.
-- =============================================================================

CREATE OR REPLACE FUNCTION public.prevent_report_identity_change()
RETURNS trigger
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = ''
AS $$
BEGIN
  IF NEW.id IS DISTINCT FROM OLD.id THEN
    RAISE EXCEPTION
      'prevent_report_identity_change: id is immutable (report: %)', OLD.id;
  END IF;
  IF NEW.user_id IS DISTINCT FROM OLD.user_id THEN
    RAISE EXCEPTION
      'prevent_report_identity_change: user_id is immutable (report: %)', OLD.id;
  END IF;
  IF NEW.project_id IS DISTINCT FROM OLD.project_id THEN
    RAISE EXCEPTION
      'prevent_report_identity_change: project_id is immutable (report: %)', OLD.id;
  END IF;
  IF NEW.report_number IS DISTINCT FROM OLD.report_number THEN
    RAISE EXCEPTION
      'prevent_report_identity_change: report_number is immutable (report: %)', OLD.id;
  END IF;
  RETURN NEW;
END;
$$;

-- Trigger functions are invoked by the trigger mechanism, not via EXECUTE
-- privilege checks.  Revoking PUBLIC prevents direct function calls.
REVOKE ALL ON FUNCTION public.prevent_report_identity_change() FROM PUBLIC;

CREATE TRIGGER trg_reports_immutable_identity
  BEFORE UPDATE ON public.reports
  FOR EACH ROW
  EXECUTE FUNCTION public.prevent_report_identity_change();


-- =============================================================================
-- STORAGE BUCKETS
-- Three private buckets with explicit size limits and MIME type allowlists.
-- ON CONFLICT DO UPDATE enforces correct security settings even if a bucket
-- with that ID already exists (e.g., from a previous partial run or manual
-- creation).  ON CONFLICT DO NOTHING is not used for security-relevant config.
--
-- Path model:
--   company-logos:  users/{userId}/logo.jpg
--   report-photos:  users/{userId}/reports/{reportId}/{photoId}.jpg
--   report-pdfs:    users/{userId}/reports/{reportId}/report.pdf
-- =============================================================================

-- A. company-logos — max 2 MB, images only
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'company-logos',
  'company-logos',
  false,
  2097152,   -- 2 MB = 2 * 1024 * 1024
  ARRAY['image/jpeg', 'image/png', 'image/webp']
)
ON CONFLICT (id) DO UPDATE SET
  public             = false,
  file_size_limit    = 2097152,
  allowed_mime_types = ARRAY['image/jpeg', 'image/png', 'image/webp'];

-- B. report-photos — max 400 KB, JPEG only
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'report-photos',
  'report-photos',
  false,
  409600,    -- 400 KB = 400 * 1024
  ARRAY['image/jpeg']
)
ON CONFLICT (id) DO UPDATE SET
  public             = false,
  file_size_limit    = 409600,
  allowed_mime_types = ARRAY['image/jpeg'];

-- C. report-pdfs — max 10 MB, PDF only
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'report-pdfs',
  'report-pdfs',
  false,
  10485760,  -- 10 MB = 10 * 1024 * 1024
  ARRAY['application/pdf']
)
ON CONFLICT (id) DO UPDATE SET
  public             = false,
  file_size_limit    = 10485760,
  allowed_mime_types = ARRAY['application/pdf'];


-- =============================================================================
-- STORAGE RLS POLICIES (on storage.objects)
-- All policies are TO authenticated.
-- logo_storage_path and generated_pdf_storage_path in Postgres store the
-- stable object key — NEVER a signed URL.  Signed URLs are generated on
-- demand for sharing and are never persisted.
-- =============================================================================

-- ---------------------------------------------------------------------------
-- A. company-logos
-- Fixed filename: logo.jpg
-- Path: users/{userId}/logo.jpg
-- foldername returns {users, userId}; filename returns 'logo.jpg'.
-- SELECT, INSERT, UPDATE, DELETE permitted to the logo owner.
-- ---------------------------------------------------------------------------
CREATE POLICY "storage_logos_select_own"
  ON storage.objects FOR SELECT TO authenticated
  USING (
    bucket_id = 'company-logos'
    AND (storage.foldername(name))[1] = 'users'
    AND (storage.foldername(name))[2] = auth.uid()::text
    AND storage.filename(name) = 'logo.jpg'
  );

CREATE POLICY "storage_logos_insert_own"
  ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'company-logos'
    AND (storage.foldername(name))[1] = 'users'
    AND (storage.foldername(name))[2] = auth.uid()::text
    AND storage.filename(name) = 'logo.jpg'
  );

CREATE POLICY "storage_logos_update_own"
  ON storage.objects FOR UPDATE TO authenticated
  USING (
    bucket_id = 'company-logos'
    AND (storage.foldername(name))[1] = 'users'
    AND (storage.foldername(name))[2] = auth.uid()::text
    AND storage.filename(name) = 'logo.jpg'
  )
  WITH CHECK (
    bucket_id = 'company-logos'
    AND (storage.foldername(name))[1] = 'users'
    AND (storage.foldername(name))[2] = auth.uid()::text
    AND storage.filename(name) = 'logo.jpg'
  );

CREATE POLICY "storage_logos_delete_own"
  ON storage.objects FOR DELETE TO authenticated
  USING (
    bucket_id = 'company-logos'
    AND (storage.foldername(name))[1] = 'users'
    AND (storage.foldername(name))[2] = auth.uid()::text
    AND storage.filename(name) = 'logo.jpg'
  );

-- ---------------------------------------------------------------------------
-- B. report-photos
-- Path: users/{userId}/reports/{reportId}/{photoId}.jpg
-- foldername returns {users, userId, reports, reportId}.
-- Pre-registration pattern: a report_photos metadata row with storage_path
-- equal to the object name must exist BEFORE the file upload succeeds.
-- This prevents uploads of files with no corresponding metadata.
-- SELECT always permitted to owner (expired users retain read access).
-- INSERT, UPDATE, DELETE require active access.
-- ---------------------------------------------------------------------------
CREATE POLICY "storage_photos_select_own"
  ON storage.objects FOR SELECT TO authenticated
  USING (
    bucket_id = 'report-photos'
    AND (storage.foldername(name))[1] = 'users'
    AND (storage.foldername(name))[2] = auth.uid()::text
    AND (storage.foldername(name))[3] = 'reports'
  );

CREATE POLICY "storage_photos_insert_own_active"
  ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'report-photos'
    AND (storage.foldername(name))[1] = 'users'
    AND (storage.foldername(name))[2] = auth.uid()::text
    AND (storage.foldername(name))[3] = 'reports'
    AND public.has_active_access()
    AND EXISTS (
      SELECT 1
      FROM public.report_photos AS rp
      WHERE rp.storage_path = name
        AND rp.user_id       = auth.uid()
    )
  );

CREATE POLICY "storage_photos_update_own_active"
  ON storage.objects FOR UPDATE TO authenticated
  USING (
    bucket_id = 'report-photos'
    AND (storage.foldername(name))[1] = 'users'
    AND (storage.foldername(name))[2] = auth.uid()::text
    AND (storage.foldername(name))[3] = 'reports'
    AND public.has_active_access()
  )
  WITH CHECK (
    bucket_id = 'report-photos'
    AND (storage.foldername(name))[1] = 'users'
    AND (storage.foldername(name))[2] = auth.uid()::text
    AND (storage.foldername(name))[3] = 'reports'
    AND public.has_active_access()
  );

CREATE POLICY "storage_photos_delete_own_active"
  ON storage.objects FOR DELETE TO authenticated
  USING (
    bucket_id = 'report-photos'
    AND (storage.foldername(name))[1] = 'users'
    AND (storage.foldername(name))[2] = auth.uid()::text
    AND (storage.foldername(name))[3] = 'reports'
    AND public.has_active_access()
  );

-- ---------------------------------------------------------------------------
-- C. report-pdfs
-- Path: users/{userId}/reports/{reportId}/report.pdf
-- foldername returns {users, userId, reports, reportId}.
-- filename must be exactly 'report.pdf'.
-- The reportId at path position [4] must exist in public.reports for auth.uid().
-- This prevents uploading a PDF to an invented or unowned report directory.
-- SELECT always permitted to owner (expired users retain read access).
-- INSERT and UPDATE require active access.
-- UPDATE is included so that PDF regeneration (upsert) works for entitled owners.
-- ---------------------------------------------------------------------------
CREATE POLICY "storage_pdfs_select_own"
  ON storage.objects FOR SELECT TO authenticated
  USING (
    bucket_id = 'report-pdfs'
    AND (storage.foldername(name))[1] = 'users'
    AND (storage.foldername(name))[2] = auth.uid()::text
    AND (storage.foldername(name))[3] = 'reports'
    AND storage.filename(name) = 'report.pdf'
    AND EXISTS (
      SELECT 1
      FROM public.reports AS r
      WHERE r.id      = (storage.foldername(name))[4]::uuid
        AND r.user_id = auth.uid()
    )
  );

CREATE POLICY "storage_pdfs_insert_own_active"
  ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'report-pdfs'
    AND (storage.foldername(name))[1] = 'users'
    AND (storage.foldername(name))[2] = auth.uid()::text
    AND (storage.foldername(name))[3] = 'reports'
    AND storage.filename(name) = 'report.pdf'
    AND public.has_active_access()
    AND EXISTS (
      SELECT 1
      FROM public.reports AS r
      WHERE r.id      = (storage.foldername(name))[4]::uuid
        AND r.user_id = auth.uid()
    )
  );

CREATE POLICY "storage_pdfs_update_own_active"
  ON storage.objects FOR UPDATE TO authenticated
  USING (
    bucket_id = 'report-pdfs'
    AND (storage.foldername(name))[1] = 'users'
    AND (storage.foldername(name))[2] = auth.uid()::text
    AND (storage.foldername(name))[3] = 'reports'
    AND storage.filename(name) = 'report.pdf'
    AND public.has_active_access()
    AND EXISTS (
      SELECT 1
      FROM public.reports AS r
      WHERE r.id      = (storage.foldername(name))[4]::uuid
        AND r.user_id = auth.uid()
    )
  )
  WITH CHECK (
    bucket_id = 'report-pdfs'
    AND (storage.foldername(name))[1] = 'users'
    AND (storage.foldername(name))[2] = auth.uid()::text
    AND (storage.foldername(name))[3] = 'reports'
    AND storage.filename(name) = 'report.pdf'
    AND public.has_active_access()
    AND EXISTS (
      SELECT 1
      FROM public.reports AS r
      WHERE r.id      = (storage.foldername(name))[4]::uuid
        AND r.user_id = auth.uid()
    )
  );

COMMIT;

-- =============================================================================
-- STATUS: DRAFTED — NOT APPLIED
-- This file has been committed to the repository for review.
-- It must not be applied until a separate SQL review has approved the
-- committed file and the human owner has authorized execution.
-- =============================================================================
