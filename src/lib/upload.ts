import { api } from './api'
import type {
  ApiResponse,
  MediaConfirmResponse,
  MediaType,
  PresignRequest,
  PresignResponse,
} from '../types'

/**
 * Three-step upload: presign → direct PUT to S3/MinIO → confirm.
 *
 * The PUT must use the *exact* mimeType sent in /presign — S3 validates the
 * Content-Type header against the signed value and rejects mismatches.
 */
export async function uploadFile(file: File, mediaType: MediaType): Promise<MediaConfirmResponse> {
  const presignBody: PresignRequest = {
    fileName: file.name,
    mimeType: file.type,
    mediaType,
    fileSize: file.size,
  }
  const presign = await api<ApiResponse<PresignResponse>>('/media/presign', {
    method: 'POST',
    body: JSON.stringify(presignBody),
  })

  const putRes = await fetch(presign.data.uploadUrl, {
    method: 'PUT',
    headers: { 'Content-Type': file.type },
    body: file,
  })
  if (!putRes.ok) {
    throw new Error(`Upload failed (${putRes.status})`)
  }

  const confirm = await api<ApiResponse<MediaConfirmResponse>>('/media/confirm', {
    method: 'POST',
    body: JSON.stringify({ key: presign.data.key }),
  })
  return confirm.data
}
