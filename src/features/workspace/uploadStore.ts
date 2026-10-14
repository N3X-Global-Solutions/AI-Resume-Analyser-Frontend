import type { QueryClient } from '@tanstack/react-query'
import { useCallback, useSyncExternalStore } from 'react'
import { toast } from 'sonner'
import { errorMessage } from '../../api/client'
import { resumesApi } from '../../api/endpoints'
import { invalidateJobTree } from '../../api/hooks'
import { queryKeys } from '../../api/queryKeys'
import type { ResumeOut, UploadDuplicate } from '../../api/types'
import {
  ACCEPTED_EXTENSIONS,
  MAX_FILE_SIZE_BYTES,
  MAX_ZIP_SIZE_BYTES,
  UPLOAD_BATCH_MAX_BYTES,
  UPLOAD_BATCH_SIZE,
} from '../../lib/constants'
import { fileExtension, formatFileSize, pluralize } from '../../lib/format'

/**
 * Upload sessions live outside React so a long upload (100+ files in batches of ≤ 20 files / ~100 MB)
 * survives tab switches and navigation inside the app.
 */

export interface UploadRejection {
  filename: string
  reason: string
  source: 'client' | 'server'
}

export interface UploadSession {
  phase: 'uploading' | 'done'
  /** Files picked by the user (including client-side rejected ones). */
  selected: number
  /** Valid files that are being sent to the server. */
  toSend: number
  /** Files already sent (successfully or not). */
  sent: number
  accepted: ResumeOut[]
  duplicates: UploadDuplicate[]
  rejected: UploadRejection[]
  startedAt: number
  finishedAt: number | null
}

const sessions = new Map<string, UploadSession>()
const listeners = new Set<() => void>()

function emit() {
  for (const listener of listeners) listener()
}

function subscribe(listener: () => void) {
  listeners.add(listener)
  return () => {
    listeners.delete(listener)
  }
}

function update(jobId: string, patch: (session: UploadSession) => UploadSession) {
  const current = sessions.get(jobId)
  if (!current) return
  sessions.set(jobId, patch(current))
  emit()
}

export function clearUploadSession(jobId: string) {
  const current = sessions.get(jobId)
  if (current?.phase === 'uploading') return
  sessions.delete(jobId)
  emit()
}

export function useUploadSession(jobId: string): UploadSession | null {
  const getSnapshot = useCallback(() => sessions.get(jobId) ?? null, [jobId])
  return useSyncExternalStore(subscribe, getSnapshot, getSnapshot)
}

export function validateFiles(files: readonly File[]): { valid: File[]; rejected: UploadRejection[] } {
  const valid: File[] = []
  const rejected: UploadRejection[] = []
  const allowed = new Set<string>(ACCEPTED_EXTENSIONS)
  for (const file of files) {
    const ext = fileExtension(file.name)
    const isZip = ext === 'zip'
    const maxBytes = isZip ? MAX_ZIP_SIZE_BYTES : MAX_FILE_SIZE_BYTES
    if (!allowed.has(ext)) {
      rejected.push({ filename: file.name, reason: `Unsupported file type${ext ? ` (.${ext})` : ''} — use PDF, DOCX or ZIP`, source: 'client' })
    } else if (file.size > maxBytes) {
      rejected.push({
        filename: file.name,
        reason: `File is ${formatFileSize(file.size)} — the limit is ${formatFileSize(maxBytes)}${isZip ? ' per ZIP' : ''}`,
        source: 'client',
      })
    } else if (file.size === 0) {
      rejected.push({ filename: file.name, reason: 'File is empty', source: 'client' })
    } else {
      valid.push(file)
    }
  }
  return { valid, rejected }
}

/** Splits files into batches of at most `maxCount` files and `maxBytes` total; a file larger than `maxBytes` goes alone. */
function batchFiles(files: readonly File[], maxCount: number, maxBytes: number): File[][] {
  const batches: File[][] = []
  let current: File[] = []
  let currentBytes = 0
  for (const file of files) {
    if (current.length > 0 && (current.length >= maxCount || currentBytes + file.size > maxBytes)) {
      batches.push(current)
      current = []
      currentBytes = 0
    }
    current.push(file)
    currentBytes += file.size
  }
  if (current.length > 0) batches.push(current)
  return batches
}

export function isUploading(jobId: string): boolean {
  return sessions.get(jobId)?.phase === 'uploading'
}

export async function startUpload(jobId: string, files: readonly File[], qc: QueryClient): Promise<void> {
  if (isUploading(jobId)) {
    toast.info('An upload is already running for this job', { description: 'Wait for it to finish, then add more files.' })
    return
  }
  const { valid, rejected } = validateFiles(files)
  sessions.set(jobId, {
    phase: 'uploading',
    selected: files.length,
    toSend: valid.length,
    sent: 0,
    accepted: [],
    duplicates: [],
    rejected,
    startedAt: Date.now(),
    finishedAt: null,
  })
  emit()

  for (const batch of batchFiles(valid, UPLOAD_BATCH_SIZE, UPLOAD_BATCH_MAX_BYTES)) {
    try {
      const result = await resumesApi.upload(jobId, batch)
      update(jobId, (s) => ({
        ...s,
        sent: s.sent + batch.length,
        accepted: [...s.accepted, ...result.accepted],
        duplicates: [...s.duplicates, ...result.duplicates],
        rejected: [...s.rejected, ...result.rejected.map((r) => ({ ...r, source: 'server' as const }))],
      }))
    } catch (error) {
      const reason = `Upload failed: ${errorMessage(error)}`
      update(jobId, (s) => ({
        ...s,
        sent: s.sent + batch.length,
        rejected: [...s.rejected, ...batch.map((file) => ({ filename: file.name, reason, source: 'server' as const }))],
      }))
    }
    // Let the processing panel start polling as soon as the first batch lands.
    void qc.invalidateQueries({ queryKey: queryKeys.progress(jobId) })
    void qc.invalidateQueries({ queryKey: queryKeys.resumes(jobId) })
  }

  update(jobId, (s) => ({ ...s, phase: 'done', finishedAt: Date.now() }))
  invalidateJobTree(qc, jobId)

  const final = sessions.get(jobId)
  if (!final) return
  const parts = [`${pluralize(final.accepted.length, 'resume')} queued for analysis`]
  if (final.duplicates.length > 0) parts.push(`${final.duplicates.length} duplicate${final.duplicates.length === 1 ? '' : 's'} skipped`)
  if (final.rejected.length > 0) parts.push(`${final.rejected.length} rejected`)
  if (final.accepted.length > 0) toast.success('Upload complete', { description: parts.join(' · ') })
  else toast.error('No resumes were accepted', { description: parts.slice(1).join(' · ') || 'Check the file types and sizes.' })
}
