import { useQueryClient } from '@tanstack/react-query'
import {
  ArrowRight,
  CheckCircle2,
  ChevronDown,
  Clock,
  Copy,
  ExternalLink,
  FileArchive,
  FileText,
  Loader2,
  RotateCcw,
  Trash2,
  UploadCloud,
  X,
  XCircle,
} from 'lucide-react'
import { useEffect, useRef, useState, type DragEvent, type ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { toast } from 'sonner'
import { useDeleteResume, useResumes, useRetryFailed, useRetryResume } from '../../api/hooks'
import type { Job, ProcessingStatus, Progress, ResumeOut } from '../../api/types'
import {
  Button,
  Card,
  CardHeader,
  ConfirmDialog,
  EmptyState,
  ErrorState,
  ProcessingBadge,
  ProgressBar,
  SegmentedBar,
  SegmentedControl,
  Skeleton,
  Tooltip,
} from '../../components/ui'
import { cn } from '../../lib/cn'
import { MAX_FILE_SIZE_BYTES, MAX_ZIP_SIZE_BYTES, MODEL_LABEL } from '../../lib/constants'
import { fileExtension, formatFileSize, formatNumber, formatPercent, formatRelative, pluralize } from '../../lib/format'
import { clearUploadSession, startUpload, useUploadSession, type UploadSession } from './uploadStore'

export function UploadTab({
  job,
  progress,
  onViewRanking,
  onUploadStart,
}: {
  job: Job
  progress: Progress | undefined
  onViewRanking: () => void
  onUploadStart?: () => void
}) {
  return (
    <div className="space-y-6">
      <Dropzone jobId={job.id} onUploadStart={onUploadStart} />
      <UploadSummary jobId={job.id} />
      {progress && progress.total > 0 && <ProcessingPanel jobId={job.id} progress={progress} onViewRanking={onViewRanking} />}
      <ResumeList jobId={job.id} progress={progress} />
    </div>
  )
}

// ---------------------------------------------------------------------------
// Drag & drop zone
// ---------------------------------------------------------------------------

function Dropzone({ jobId, onUploadStart }: { jobId: string; onUploadStart?: () => void }) {
  const qc = useQueryClient()
  const session = useUploadSession(jobId)
  const inputRef = useRef<HTMLInputElement>(null)
  const [dragging, setDragging] = useState(false)
  const dragDepth = useRef(0)
  const uploading = session?.phase === 'uploading'

  useEffect(() => {
    if (!uploading) return
    function onBeforeUnload(event: BeforeUnloadEvent) {
      event.preventDefault()
    }
    window.addEventListener('beforeunload', onBeforeUnload)
    return () => window.removeEventListener('beforeunload', onBeforeUnload)
  }, [uploading])

  function handleFiles(list: FileList | null) {
    const files = list ? Array.from(list) : []
    if (files.length === 0) return
    onUploadStart?.()
    void startUpload(jobId, files, qc)
  }

  function onDrop(event: DragEvent<HTMLDivElement>) {
    event.preventDefault()
    dragDepth.current = 0
    setDragging(false)
    if (uploading) return
    handleFiles(event.dataTransfer.files)
  }

  return (
    <div
      onDragEnter={(event) => {
        event.preventDefault()
        dragDepth.current += 1
        if (!uploading) setDragging(true)
      }}
      onDragOver={(event) => {
        event.preventDefault()
        event.dataTransfer.dropEffect = uploading ? 'none' : 'copy'
      }}
      onDragLeave={() => {
        dragDepth.current = Math.max(0, dragDepth.current - 1)
        if (dragDepth.current === 0) setDragging(false)
      }}
      onDrop={onDrop}
      className={cn(
        'relative rounded-2xl border-2 border-dashed bg-white px-6 py-10 text-center transition-colors sm:py-14',
        dragging ? 'border-indigo-500 bg-indigo-50/60' : 'border-slate-300',
        !uploading && 'hover:border-indigo-400',
      )}
    >
      <input
        ref={inputRef}
        type="file"
        multiple
        accept=".pdf,.docx,.zip,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document,application/zip"
        className="sr-only"
        tabIndex={-1}
        aria-hidden
        onChange={(event) => {
          handleFiles(event.target.files)
          event.target.value = ''
        }}
      />
      {uploading && session ? (
        <UploadingState session={session} />
      ) : (
        <>
          <div
            className={cn(
              'mx-auto flex h-14 w-14 items-center justify-center rounded-2xl transition-colors',
              dragging ? 'bg-indigo-600 text-white' : 'bg-indigo-50 text-indigo-600',
            )}
          >
            <UploadCloud className="h-7 w-7" />
          </div>
          <h2 className="mt-4 text-lg font-semibold text-slate-900">
            {dragging ? 'Drop to upload' : 'Drag & drop resumes — PDF, DOCX or ZIP'}
          </h2>
          <p className="mt-1 text-sm text-slate-500">
            Upload 100+ at once · up to {formatFileSize(MAX_FILE_SIZE_BYTES)} per file, ZIP up to {formatFileSize(MAX_ZIP_SIZE_BYTES)}{' '}
            (expanded automatically)
          </p>
          <Button variant="primary" className="mt-5" onClick={() => inputRef.current?.click()} icon={<FileText className="h-4 w-4" />}>
            Browse files
          </Button>
          <p className="mt-4 text-xs text-slate-400">
            Each resume is read, profiled and matched by {MODEL_LABEL}; the score itself is computed transparently by the app.
          </p>
        </>
      )}
    </div>
  )
}

function UploadingState({ session }: { session: UploadSession }) {
  const percent = session.toSend > 0 ? (session.sent / session.toSend) * 100 : 100
  return (
    <div className="mx-auto max-w-lg" role="status" aria-live="polite">
      <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-indigo-50 text-indigo-600">
        <Loader2 className="h-7 w-7 animate-spin" />
      </div>
      <h2 className="mt-4 text-lg font-semibold text-slate-900 tabular-nums">
        Uploading {formatNumber(session.sent)}/{formatNumber(session.toSend)}
      </h2>
      <p className="mt-1 text-sm text-slate-500">Sending files in batches — analysis starts while the rest upload.</p>
      <ProgressBar value={percent} size="lg" className="mt-5" animated label="Upload progress" />
      <div className="mt-2 flex justify-between text-xs text-slate-500 tabular-nums">
        <span>{formatNumber(session.accepted.length)} accepted</span>
        <span>{formatPercent(percent)}</span>
      </div>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Upload summary
// ---------------------------------------------------------------------------

function UploadSummary({ jobId }: { jobId: string }) {
  const session = useUploadSession(jobId)
  const [expanded, setExpanded] = useState(false)
  if (!session || session.phase !== 'done') return null
  const problems = session.duplicates.length + session.rejected.length

  return (
    <Card>
      <div className="flex flex-col gap-4 px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h3 className="text-sm font-semibold text-slate-900">Upload summary</h3>
          <p className="text-sm text-slate-500">{pluralize(session.selected, 'file')} selected</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <SummaryPill icon={<CheckCircle2 className="h-4 w-4 text-emerald-600" />} label="accepted" value={session.accepted.length} />
          <SummaryPill icon={<Copy className="h-4 w-4 text-amber-500" />} label="duplicates" value={session.duplicates.length} />
          <SummaryPill icon={<XCircle className="h-4 w-4 text-rose-500" />} label="rejected" value={session.rejected.length} />
          {problems > 0 && (
            <Button size="sm" variant="ghost" onClick={() => setExpanded((value) => !value)} aria-expanded={expanded}>
              Details <ChevronDown className={cn('h-4 w-4 transition-transform', expanded && 'rotate-180')} />
            </Button>
          )}
          <Button size="sm" variant="ghost" iconOnly aria-label="Dismiss upload summary" onClick={() => clearUploadSession(jobId)}>
            <X className="h-4 w-4" />
          </Button>
        </div>
      </div>
      {expanded && problems > 0 && (
        <div className="max-h-72 overflow-y-auto border-t border-slate-100 px-5 py-3">
          <ul className="space-y-1.5 text-sm">
            {session.duplicates.map((dup) => (
              <li key={`dup-${dup.filename}-${dup.existing_resume_id}`} className="flex items-start gap-2">
                <Copy className="mt-0.5 h-4 w-4 shrink-0 text-amber-500" aria-hidden />
                <span className="min-w-0">
                  <span className="font-medium break-all text-slate-800">{dup.filename}</span>
                  <span className="text-slate-500"> — already uploaded to this job (identical file)</span>
                </span>
              </li>
            ))}
            {session.rejected.map((rej, index) => (
              <li key={`rej-${rej.filename}-${index}`} className="flex items-start gap-2">
                <XCircle className="mt-0.5 h-4 w-4 shrink-0 text-rose-500" aria-hidden />
                <span className="min-w-0">
                  <span className="font-medium break-all text-slate-800">{rej.filename}</span>
                  <span className="text-slate-500"> — {rej.reason}</span>
                </span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </Card>
  )
}

function SummaryPill({ icon, label, value }: { icon: ReactNode; label: string; value: number }) {
  return (
    <span className="inline-flex items-center gap-1.5 rounded-lg bg-slate-50 px-2.5 py-1 text-sm text-slate-600 ring-1 ring-slate-200 ring-inset">
      {icon}
      <span className="font-semibold text-slate-900 tabular-nums">{formatNumber(value)}</span> {label}
    </span>
  )
}

// ---------------------------------------------------------------------------
// Live processing panel
// ---------------------------------------------------------------------------

function ProcessingPanel({
  jobId,
  progress,
  onViewRanking,
}: {
  jobId: string
  progress: Progress
  onViewRanking: () => void
}) {
  const retryFailed = useRetryFailed(jobId)
  const done = !progress.is_processing

  return (
    <Card>
      <div className="space-y-4 px-5 py-5">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h3 className="flex items-center gap-2 text-sm font-semibold text-slate-900">
              {done ? (
                <CheckCircle2 className="h-4 w-4 text-emerald-600" />
              ) : (
                <Loader2 className="h-4 w-4 animate-spin text-indigo-600" />
              )}
              {done ? 'Analysis complete' : `The AI agent is analyzing resumes…`}
            </h3>
            <p className="mt-0.5 text-sm text-slate-500">
              {done
                ? `${pluralize(progress.completed, 'candidate')} scored and ranked.`
                : 'Candidates appear in the ranking as soon as each resume is scored. You can leave this page.'}
            </p>
          </div>
          <div className="flex items-baseline gap-1">
            <span className="text-3xl font-semibold tracking-tight text-slate-900 tabular-nums">{formatPercent(progress.percent)}</span>
          </div>
        </div>

        <SegmentedBar
          size="lg"
          total={progress.total}
          label={`${progress.completed} analyzed, ${progress.processing} processing, ${progress.queued} queued, ${progress.failed} failed`}
          segments={[
            { key: 'completed', value: progress.completed, className: 'bg-emerald-500', label: 'Analyzed' },
            { key: 'failed', value: progress.failed, className: 'bg-rose-500', label: 'Failed' },
            { key: 'processing', value: progress.processing, className: 'bg-indigo-500 progress-stripes', label: 'Processing' },
          ]}
        />

        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-slate-600" aria-live="polite">
            <span className="inline-flex items-center gap-1.5">
              <CheckCircle2 className="h-4 w-4 text-emerald-600" aria-hidden />
              <strong className="font-semibold text-slate-900 tabular-nums">{formatNumber(progress.completed)}</strong> analyzed
            </span>
            <span className="inline-flex items-center gap-1.5">
              <Loader2 className={cn('h-4 w-4 text-indigo-500', progress.processing > 0 && 'animate-spin')} aria-hidden />
              <strong className="font-semibold text-slate-900 tabular-nums">{formatNumber(progress.processing)}</strong> processing
            </span>
            <span className="inline-flex items-center gap-1.5">
              <Clock className="h-4 w-4 text-slate-400" aria-hidden />
              <strong className="font-semibold text-slate-900 tabular-nums">{formatNumber(progress.queued)}</strong> queued
            </span>
            <span className="inline-flex items-center gap-1.5">
              <XCircle className="h-4 w-4 text-rose-500" aria-hidden />
              <strong className="font-semibold text-slate-900 tabular-nums">{formatNumber(progress.failed)}</strong> failed
            </span>
          </div>
          <div className="flex flex-wrap gap-2">
            {progress.failed > 0 && (
              <Button
                size="sm"
                variant="secondary"
                loading={retryFailed.isPending}
                icon={<RotateCcw className="h-3.5 w-3.5" />}
                onClick={() =>
                  retryFailed.mutate(undefined, {
                    onSuccess: (result) => toast.success(`Retrying ${pluralize(result.queued, 'failed resume')}`),
                  })
                }
              >
                Retry all failed
              </Button>
            )}
            {done && progress.completed > 0 && (
              <Button size="sm" variant="primary" onClick={onViewRanking}>
                View ranking <ArrowRight className="h-3.5 w-3.5" />
              </Button>
            )}
          </div>
        </div>
      </div>
    </Card>
  )
}

// ---------------------------------------------------------------------------
// Resume list
// ---------------------------------------------------------------------------

type ResumeFilter = ProcessingStatus | 'all'
const PAGE = 50

function ResumeList({ jobId, progress }: { jobId: string; progress: Progress | undefined }) {
  const resumes = useResumes(jobId)
  const retry = useRetryResume(jobId)
  const remove = useDeleteResume(jobId)
  const [filter, setFilter] = useState<ResumeFilter>('all')
  const [limit, setLimit] = useState(PAGE)
  const [toDelete, setToDelete] = useState<ResumeOut | null>(null)

  const all = resumes.data ?? []
  const counts = {
    all: all.length,
    queued: progress?.queued ?? all.filter((r) => r.processing_status === 'queued').length,
    processing: progress?.processing ?? all.filter((r) => r.processing_status === 'processing').length,
    completed: progress?.completed ?? all.filter((r) => r.processing_status === 'completed').length,
    failed: progress?.failed ?? all.filter((r) => r.processing_status === 'failed').length,
  }
  const visible = filter === 'all' ? all : all.filter((r) => r.processing_status === filter)

  if (resumes.isPending) {
    return (
      <Card>
        <CardHeader title="Resumes" />
        <div className="space-y-3 p-5">
          {[0, 1, 2, 3].map((key) => (
            <Skeleton key={key} className="h-10 w-full" />
          ))}
        </div>
      </Card>
    )
  }
  if (resumes.isError) {
    return <ErrorState title="Couldn't load resumes" error={resumes.error} onRetry={() => void resumes.refetch()} compact />
  }
  if (all.length === 0) {
    return (
      <Card>
        <EmptyState
          compact
          icon={<FileText />}
          title="No resumes uploaded yet"
          description="Drop files above to get started. You'll see each resume's processing status here."
        />
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader
        title="Resumes"
        description={`${pluralize(all.length, 'file')} uploaded to this job`}
        actions={
          <SegmentedControl<ResumeFilter>
            size="sm"
            ariaLabel="Filter resumes by status"
            value={filter}
            onChange={(value) => {
              setFilter(value)
              setLimit(PAGE)
            }}
            options={[
              { value: 'all', label: 'All', count: counts.all },
              { value: 'queued', label: 'Queued', count: counts.queued },
              { value: 'processing', label: 'Processing', count: counts.processing },
              { value: 'completed', label: 'Analyzed', count: counts.completed },
              { value: 'failed', label: 'Failed', count: counts.failed },
            ]}
          />
        }
      />
      {visible.length === 0 ? (
        <EmptyState compact title="Nothing here" description="No resumes with this status." />
      ) : (
        <ul className="divide-y divide-slate-100">
          {visible.slice(0, limit).map((resume) => (
            <ResumeRow
              key={resume.id}
              resume={resume}
              retrying={retry.isPending && retry.variables === resume.id}
              onRetry={() =>
                retry.mutate(resume.id, { onSuccess: () => toast.success('Resume re-queued', { description: resume.original_filename }) })
              }
              onDelete={() => setToDelete(resume)}
            />
          ))}
        </ul>
      )}
      {visible.length > limit && (
        <div className="border-t border-slate-100 px-5 py-3 text-center">
          <Button size="sm" variant="ghost" onClick={() => setLimit((value) => value + PAGE)}>
            Show {Math.min(PAGE, visible.length - limit)} more of {formatNumber(visible.length - limit)} remaining
          </Button>
        </div>
      )}

      <ConfirmDialog
        open={toDelete !== null}
        onClose={() => setToDelete(null)}
        tone="danger"
        title="Delete this resume?"
        confirmLabel="Delete resume"
        loading={remove.isPending}
        description={
          toDelete && (
            <>
              <span className="font-medium break-all text-slate-700">{toDelete.original_filename}</span> and its candidate evaluation
              will be permanently removed from this job.
            </>
          )
        }
        onConfirm={() => {
          if (!toDelete) return
          const name = toDelete.original_filename
          remove.mutate(toDelete.id, {
            onSuccess: () => {
              toast.success('Resume deleted', { description: name })
              setToDelete(null)
            },
          })
        }}
      />
    </Card>
  )
}

function ResumeRow({
  resume,
  retrying,
  onRetry,
  onDelete,
}: {
  resume: ResumeOut
  retrying: boolean
  onRetry: () => void
  onDelete: () => void
}) {
  const ext = fileExtension(resume.original_filename)
  const Icon = ext === 'zip' ? FileArchive : FileText
  return (
    <li className="flex flex-col gap-2 px-5 py-3 sm:flex-row sm:items-center sm:gap-4">
      <div className="flex min-w-0 flex-1 items-start gap-3">
        <span
          className={cn(
            'mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg',
            ext === 'pdf' ? 'bg-rose-50 text-rose-600' : 'bg-sky-50 text-sky-600',
          )}
        >
          <Icon className="h-4 w-4" />
        </span>
        <div className="min-w-0">
          <p className="truncate text-sm font-medium text-slate-800" title={resume.original_filename}>
            {resume.original_filename}
          </p>
          <p className="text-xs text-slate-500">
            {formatFileSize(resume.file_size)} · uploaded {formatRelative(resume.created_at)}
            {resume.attempts > 1 && ` · ${resume.attempts} attempts`}
          </p>
          {resume.processing_status === 'failed' && resume.error_message && (
            <p className="mt-1 text-xs text-rose-600">{resume.error_message}</p>
          )}
        </div>
      </div>
      <div className="flex shrink-0 items-center gap-2 pl-11 sm:pl-0">
        <ProcessingBadge status={resume.processing_status} />
        {resume.processing_status === 'completed' && resume.candidate_id && (
          <Link
            to={`/candidates/${resume.candidate_id}`}
            className="inline-flex items-center gap-1 rounded-md px-2 py-1 text-xs font-medium text-indigo-600 hover:bg-indigo-50"
          >
            View candidate <ExternalLink className="h-3 w-3" />
          </Link>
        )}
        {resume.processing_status === 'failed' && (
          <Button size="xs" variant="secondary" onClick={onRetry} loading={retrying} icon={<RotateCcw className="h-3 w-3" />}>
            Retry
          </Button>
        )}
        <Tooltip content="Delete resume">
          <Button size="xs" variant="ghost" iconOnly onClick={onDelete} aria-label={`Delete ${resume.original_filename}`}>
            <Trash2 className="h-3.5 w-3.5" />
          </Button>
        </Tooltip>
      </div>
    </li>
  )
}
