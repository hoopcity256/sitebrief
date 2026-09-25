-- =============================================================================
-- SiteBrief — Project Cover Photos
-- File: supabase/migrations/20260925000000_project_cover_photos.sql
--
-- Additive migration. Safe to apply on top of 20260721000000_initial.sql.
--
-- Changes:
--   1. Add cover_photo_path (nullable TEXT) to public.projects
--   2. CHECK constraint enforces canonical path pattern
--   3. New private storage bucket: project-covers (max 500 KB, JPEG only)
--   4. Storage RLS policies for project-covers
--
-- Path model:
--   project-covers: users/{userId}/projects/{projectId}/cover.jpg  (fixed filename)
--
-- The fixed filename (cover.jpg) allows simple upsert (upload with upsert:true)
-- to replace the cover photo without leaving orphan files.
-- Removing a cover photo: delete the Storage object, then null out the field.
--
-- STATUS: DRAFTED — NOT APPLIED
-- Apply only after owner review and a Supabase backup has been taken.
-- =============================================================================

BEGIN;

-- ---------------------------------------------------------------------------
-- 1. Add cover_photo_path to projects
--    NULL = no cover photo (safe default for all existing rows)
-- ---------------------------------------------------------------------------
ALTER TABLE public.projects
  ADD COLUMN IF NOT EXISTS cover_photo_path TEXT;

-- Enforce canonical path: must be null OR exactly the expected pattern
-- Uses the same approach as company_profiles.logo_storage_path
ALTER TABLE public.projects
  ADD CONSTRAINT projects_cover_photo_path_key CHECK (
    cover_photo_path IS NULL OR
    cover_photo_path = 'users/' || user_id::text || '/projects/' || id::text || '/cover.jpg'
  );

-- ---------------------------------------------------------------------------
-- 2. project-covers storage bucket
--    private (false = requires auth / signed URLs)
--    max 512 KB, JPEG only (client compresses before upload)
-- ---------------------------------------------------------------------------
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'project-covers',
  'project-covers',
  false,
  524288,   -- 512 KB = 512 * 1024
  ARRAY['image/jpeg']
)
ON CONFLICT (id) DO UPDATE SET
  public             = false,
  file_size_limit    = 524288,
  allowed_mime_types = ARRAY['image/jpeg'];

-- ---------------------------------------------------------------------------
-- 3. Storage RLS policies for project-covers
--
-- Path: users/{userId}/projects/{projectId}/cover.jpg
--
-- All operations verify both:
--   a. The path is the canonical cover path for this user+project combo
--   b. The project row exists and belongs to the authenticated user
--
-- SELECT does not require active access (expired users retain read access
-- to their existing project cover photos).
-- INSERT, UPDATE, DELETE require active access (consistent with report-photos).
--
-- The fixed filename (cover.jpg) means INSERT and UPDATE are both needed:
--   INSERT — first-time upload
--   UPDATE — replacement via upsert
-- ---------------------------------------------------------------------------

CREATE POLICY "storage_covers_select_own"
  ON storage.objects FOR SELECT TO authenticated
  USING (
    bucket_id = 'project-covers'
    AND EXISTS (
      SELECT 1
      FROM public.projects AS p
      WHERE p.user_id         = auth.uid()
        AND storage.objects.name = 'users/' || auth.uid()::text
                                 || '/projects/' || p.id::text
                                 || '/cover.jpg'
    )
  );

CREATE POLICY "storage_covers_insert_own_active"
  ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'project-covers'
    AND public.has_active_access()
    AND EXISTS (
      SELECT 1
      FROM public.projects AS p
      WHERE p.user_id         = auth.uid()
        AND storage.objects.name = 'users/' || auth.uid()::text
                                 || '/projects/' || p.id::text
                                 || '/cover.jpg'
    )
  );

CREATE POLICY "storage_covers_update_own_active"
  ON storage.objects FOR UPDATE TO authenticated
  USING (
    bucket_id = 'project-covers'
    AND public.has_active_access()
    AND EXISTS (
      SELECT 1
      FROM public.projects AS p
      WHERE p.user_id         = auth.uid()
        AND storage.objects.name = 'users/' || auth.uid()::text
                                 || '/projects/' || p.id::text
                                 || '/cover.jpg'
    )
  )
  WITH CHECK (
    bucket_id = 'project-covers'
    AND public.has_active_access()
    AND EXISTS (
      SELECT 1
      FROM public.projects AS p
      WHERE p.user_id         = auth.uid()
        AND storage.objects.name = 'users/' || auth.uid()::text
                                 || '/projects/' || p.id::text
                                 || '/cover.jpg'
    )
  );

CREATE POLICY "storage_covers_delete_own_active"
  ON storage.objects FOR DELETE TO authenticated
  USING (
    bucket_id = 'project-covers'
    AND public.has_active_access()
    AND EXISTS (
      SELECT 1
      FROM public.projects AS p
      WHERE p.user_id         = auth.uid()
        AND storage.objects.name = 'users/' || auth.uid()::text
                                 || '/projects/' || p.id::text
                                 || '/cover.jpg'
    )
  );

COMMIT;

-- =============================================================================
-- STATUS: DRAFTED — NOT APPLIED
-- This file has been committed to the repository for review.
-- Must not be applied until a separate SQL review has approved it and
-- the human owner has authorized execution against the Supabase project.
-- Do NOT apply to production without owner authorization.
-- =============================================================================
