-- Migration: 20260926100000_company_logos_bucket.sql
-- Creates the company-logos storage bucket and RLS policies.
-- SANDBOX ONLY (toitahshmkxazxqqopzg). Do NOT apply to production.
--
-- The bucket is private (not public). Signed URLs are used for display.
-- Ownership-scoped: each user can only read/write their own logo path.
-- Path convention: {user_id}/logo.jpg
--
-- company_profiles.logo_storage_path already exists in the schema (nullable).
-- No column migration is needed.

-- Create private bucket if not already present.
-- Use INSERT ... ON CONFLICT DO NOTHING for idempotency.
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'company-logos',
  'company-logos',
  false,            -- private: signed URLs required
  524288,           -- 512 KB max file size
  ARRAY['image/jpeg', 'image/png', 'image/webp']
)
ON CONFLICT (id) DO NOTHING;

-- ── RLS policies ──────────────────────────────────────────────────────────────

-- Users can SELECT (download) their own logo files.
CREATE POLICY "company_logos_select_own"
ON storage.objects FOR SELECT
TO authenticated
USING (
  bucket_id = 'company-logos'
  AND (storage.foldername(name))[1] = auth.uid()::text
);

-- Users can INSERT their own logo files.
CREATE POLICY "company_logos_insert_own"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'company-logos'
  AND (storage.foldername(name))[1] = auth.uid()::text
);

-- Users can UPDATE their own logo files (upsert).
CREATE POLICY "company_logos_update_own"
ON storage.objects FOR UPDATE
TO authenticated
USING (
  bucket_id = 'company-logos'
  AND (storage.foldername(name))[1] = auth.uid()::text
)
WITH CHECK (
  bucket_id = 'company-logos'
  AND (storage.foldername(name))[1] = auth.uid()::text
);

-- Users can DELETE their own logo files.
CREATE POLICY "company_logos_delete_own"
ON storage.objects FOR DELETE
TO authenticated
USING (
  bucket_id = 'company-logos'
  AND (storage.foldername(name))[1] = auth.uid()::text
);
