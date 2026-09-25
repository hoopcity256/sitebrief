import { supabase } from './supabase'
import { compressImage } from './imageCompression'

// ── Cover photo path helper ─────────────────────────────────────────────────

/**
 * Canonical storage path for a project cover photo.
 * Matches the CHECK constraint in the migration and the Storage RLS policies.
 * Fixed filename (cover.jpg) enables upsert-replace without orphan files.
 */
export function coverPhotoPath(userId: string, projectId: string): string {
  return `users/${userId}/projects/${projectId}/cover.jpg`
}

// ── Upload or replace cover photo ───────────────────────────────────────────

/**
 * Compresses, uploads, and registers a project cover photo.
 * Uses upsert: true to safely replace an existing cover without leaving orphans.
 * After upload, updates projects.cover_photo_path.
 * Returns the stable storage path (not a URL — caller generates signed URL on demand).
 */
export async function uploadCoverPhoto(
  file: File,
  userId: string,
  projectId: string
): Promise<string> {
  const path = coverPhotoPath(userId, projectId)

  // 1. Compress — larger target than report thumbnails; cover photos can be 500 KB
  const { blob } = await compressImage(file, {
    maxLongEdge: 1200,
    targetBytes: 400_000,
    hardCeilingBytes: 512_000,
  })

  // 2. Upload to Storage — upsert replaces existing cover without orphans
  const { error: storageError } = await supabase.storage
    .from('project-covers')
    .upload(path, blob, { contentType: 'image/jpeg', upsert: true })

  if (storageError) throw storageError

  // 3. Update the projects row with the stable storage path
  const { error: dbError } = await supabase
    .from('projects')
    .update({ cover_photo_path: path })
    .eq('id', projectId)
    .eq('user_id', userId)

  if (dbError) {
    // Storage upload succeeded but DB update failed — best-effort cleanup
    await supabase.storage.from('project-covers').remove([path]).catch(() => {})
    throw dbError
  }

  return path
}

// ── Remove cover photo ──────────────────────────────────────────────────────

/**
 * Removes the project cover photo from Storage and nulls out the DB field.
 * No-op (does not throw) if the project already has no cover photo.
 */
export async function removeCoverPhoto(
  userId: string,
  projectId: string
): Promise<void> {
  const path = coverPhotoPath(userId, projectId)

  // 1. Remove from Storage (best-effort: ignore if file doesn't exist)
  await supabase.storage.from('project-covers').remove([path]).catch(() => {})

  // 2. Null out DB field
  const { error } = await supabase
    .from('projects')
    .update({ cover_photo_path: null })
    .eq('id', projectId)
    .eq('user_id', userId)

  if (error) throw error
}

// ── Generate signed URL ─────────────────────────────────────────────────────

/**
 * Generates a 1-hour signed URL for a cover photo storage path.
 * Returns null if the path is null/empty or the signed URL cannot be generated.
 * Callers should treat null as "no cover available".
 */
export async function getCoverPhotoUrl(storagePath: string | null): Promise<string | null> {
  if (!storagePath) return null
  try {
    const { data, error } = await supabase.storage
      .from('project-covers')
      .createSignedUrl(storagePath, 3600)
    if (error || !data?.signedUrl) return null
    return data.signedUrl
  } catch {
    return null
  }
}
