import { supabase } from './supabase'

/**
 * Delete order: Storage object first, then metadata row.
 * Handles partial failure as a recoverable operation.
 */
export async function deletePhoto(photoId: string, storagePath: string): Promise<void> {
  // 1. Delete from Storage first
  const { error: storageError } = await supabase.storage
    .from('report-photos')
    .remove([storagePath])
  if (storageError) throw storageError

  // 2. Delete metadata row — verify one row was affected
  const { error: metaError } = await supabase
    .from('report_photos')
    .delete()
    .eq('id', photoId)
    .select()
    .single()

  if (metaError) {
    throw new Error(
      'Storage file deleted but metadata row deletion failed. ' +
      'The row may be orphaned. Please refresh and retry.'
    )
  }
}
