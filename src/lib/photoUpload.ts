import { supabase } from './supabase'
import { compressImage } from './imageCompression'

export interface UploadedPhoto {
  photoId: string
  storagePath: string
  thumbnailBlob: Blob   // for local URL.createObjectURL — caller must revoke
}

export async function uploadPhoto(
  file: File,
  userId: string,
  reportId: string,
  displayOrder: number
): Promise<UploadedPhoto> {
  const photoId = crypto.randomUUID()
  const storagePath = `users/${userId}/reports/${reportId}/${photoId}.jpg`

  // 1. Compress
  const { blob } = await compressImage(file)

  // 2. INSERT metadata row FIRST (Storage policy requires pre-existing row)
  const { error: metaError } = await supabase
    .from('report_photos')
    .insert({
      id: photoId,
      user_id: userId,
      report_id: reportId,
      storage_path: storagePath,
      display_order: displayOrder,
    })
  if (metaError) throw metaError

  // 3. Upload to Storage
  const { error: storageError } = await supabase.storage
    .from('report-photos')
    .upload(storagePath, blob, { contentType: 'image/jpeg', upsert: false })

  if (storageError) {
    // Storage upload failed — attempt metadata cleanup
    const { error: cleanupError } = await supabase
      .from('report_photos')
      .delete()
      .eq('id', photoId)

    if (cleanupError) {
      throw new Error(
        'Photo upload failed and metadata cleanup also failed. ' +
        'An orphaned metadata row may exist. Please retry or contact support.'
      )
    }

    throw storageError
  }

  return { photoId, storagePath, thumbnailBlob: blob }
}
