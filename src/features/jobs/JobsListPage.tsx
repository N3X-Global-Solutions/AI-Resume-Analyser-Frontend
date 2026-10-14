import { Archive, ArchiveRestore, Briefcase, MoreHorizontal, Pencil, Plus, Search, Star, Trash2, Users } from 'lucide-react'
import { useState } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { toast } from 'sonner'
import { useDeleteJob, useJobs, useSetJobStatus } from '../../api/hooks'
import type { JobStatus, JobSummary } from '../../api/types'
import { JobMeta } from '../../components/JobMeta'
import { PageHeader } from '../../components/PageHeader'
import { TierBar } from '../../components/TierBar'
import {
  Badge,
  ButtonLink,
  Card,
  ConfirmDialog,
  DropdownMenu,
  EmptyState,
  ErrorState,
  Input,
  SegmentedControl,
  Skeleton,
  Spinner,
} from '../../components/ui'
import { useDocumentTitle } from '../../hooks/useDocumentTitle'
import { formatDate, formatNumber, formatPercent, pluralize } from '../../lib/format'
import { jobProgress } from '../../lib/jobs'

type Filter = JobStatus | 'all'

const FILTERS = [
  { value: 'active', label: 'Active' },
  { value: 'closed', label: 'Closed' },
  { value: 'all', label: 'All' },
] as const satisfies readonly { value: Filter; label: string }[]

function parseFilter(value: string | null): Filter {
  return value === 'closed' || value === 'all' ? value : 'active'
}

export function JobsListPage() {
  useDocumentTitle('Jobs')
  const [searchParams, setSearchParams] = useSearchParams()
  const filter = parseFilter(searchParams.get('status'))
  const jobs = useJobs(filter)
  const [query, setQuery] = useState('')
  const [toDelete, setToDelete] = useState<JobSummary | null>(null)
  const deleteJob = useDeleteJob()

  const normalized = query.trim().toLowerCase()
  const visible = (jobs.data ?? []).filter(
    (job) =>
      !normalized ||
      [job.title, job.department, job.location].some((value) => value?.toLowerCase().includes(normalized)),
  )

  return (
    <>
      <PageHeader
        title="Jobs"
        description="Each job has its own requirements, resumes and ranking."
        actions={
          <ButtonLink to="/jobs/new" variant="primary" icon={<Plus className="h-4 w-4" />}>
            New Job
          </ButtonLink>
        }
      />

      <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <SegmentedControl
          ariaLabel="Filter jobs by status"
          options={FILTERS}
          value={filter}
          onChange={(value) => setSearchParams(value === 'active' ? {} : { status: value }, { replace: true })}
        />
        <Input
          type="search"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Search jobs…"
          aria-label="Search jobs"
          leading={<Search className="h-4 w-4" />}
          className="sm:w-72"
        />
      </div>

      {jobs.isPending ? (
        <Card className="divide-y divide-slate-100" aria-busy="true">
          {[0, 1, 2, 3].map((key) => (
            <div key={key} className="flex items-center gap-4 p-5">
              <div className="flex-1 space-y-2">
                <Skeleton className="h-4 w-1/3" />
                <Skeleton className="h-3 w-1/2" />
              </div>
              <Skeleton className="hidden h-3 w-40 md:block" />
              <Skeleton className="h-8 w-20" />
            </div>
          ))}
        </Card>
      ) : jobs.isError ? (
        <ErrorState title="Couldn't load jobs" error={jobs.error} onRetry={() => void jobs.refetch()} retrying={jobs.isFetching} />
      ) : jobs.data.length === 0 ? (
        <Card>
          <EmptyState
            icon={<Briefcase />}
            title={filter === 'closed' ? 'No closed jobs' : filter === 'active' ? 'No active jobs' : 'No jobs yet'}
            description={
              filter === 'closed'
                ? 'Jobs you close will show up here. You can reopen them at any time.'
                : 'Create a job with its requirements, then upload resumes to get a ranked shortlist.'
            }
            action={
              <>
                <ButtonLink to="/jobs/new" variant="primary" icon={<Plus className="h-4 w-4" />}>
                  Create a job
                </ButtonLink>
                {filter !== 'all' && (
                  <ButtonLink to="/jobs?status=all" variant="secondary">
                    Show all jobs
                  </ButtonLink>
                )}
              </>
            }
          />
        </Card>
      ) : visible.length === 0 ? (
        <Card>
          <EmptyState compact icon={<Search />} title="No jobs match your search" description={`Nothing matches “${query}”.`} />
        </Card>
      ) : (
        <Card className="divide-y divide-slate-100">
          {visible.map((job) => (
            <JobRow key={job.id} job={job} onDelete={() => setToDelete(job)} />
          ))}
        </Card>
      )}

      <ConfirmDialog
        open={toDelete !== null}
        onClose={() => setToDelete(null)}
        tone="danger"
        title="Delete this job?"
        confirmLabel="Delete job"
        loading={deleteJob.isPending}
        onConfirm={() => {
          if (!toDelete) return
          const title = toDelete.title
          deleteJob.mutate(toDelete.id, {
            onSuccess: () => {
              toast.success('Job deleted', { description: title })
              setToDelete(null)
            },
          })
        }}
        description={
          toDelete && (
            <>
              <span className="font-medium text-slate-700">{toDelete.title}</span> and its{' '}
              {pluralize(toDelete.stats.total_resumes, 'resume')}, candidates and stored files will be permanently deleted.
              This can’t be undone.
            </>
          )
        }
      />
    </>
  )
}

function JobRow({ job, onDelete }: { job: JobSummary; onDelete: () => void }) {
  const navigate = useNavigate()
  const setStatus = useSetJobStatus()
  const progress = jobProgress(job.stats)
  const closing = job.status === 'active'

  return (
    <div className="flex flex-col gap-4 p-5 lg:grid lg:grid-cols-[minmax(0,1.6fr)_minmax(0,1.3fr)_auto] lg:items-center lg:gap-6">
      <div className="min-w-0">
        <div className="flex flex-wrap items-center gap-2">
          <Link
            to={`/jobs/${job.id}`}
            className="truncate text-[15px] font-semibold text-slate-900 hover:text-indigo-700 focus-visible:outline-none focus-visible:underline"
          >
            {job.title}
          </Link>
          {job.status === 'closed' && <Badge>Closed</Badge>}
          {job.needs_reanalysis && <Badge tone="amber">Needs re-analysis</Badge>}
        </div>
        <JobMeta department={job.department} location={job.location} workMode={job.work_mode} className="mt-1" />
        <div className="mt-1 text-xs text-slate-400">Created {formatDate(job.created_at)}</div>
      </div>

      <div className="space-y-2">
        <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-slate-600">
          <span className="inline-flex items-center gap-1.5">
            <Users className="h-4 w-4 text-slate-400" aria-hidden />
            {pluralize(job.stats.total_resumes, 'resume')}
          </span>
          <span className="inline-flex items-center gap-1.5">
            <Star className="h-4 w-4 text-slate-400" aria-hidden />
            {formatNumber(job.stats.status_counts.shortlisted)} shortlisted
          </span>
          {progress.isProcessing && (
            <span className="inline-flex items-center gap-1.5 text-xs font-medium text-indigo-600">
              <Spinner className="h-3 w-3" /> {formatPercent(progress.percent)}
            </span>
          )}
        </div>
        {job.stats.total_resumes > 0 && <TierBar counts={job.stats.tier_counts} size="xs" />}
      </div>

      <div className="flex items-center gap-2 lg:justify-end">
        <ButtonLink to={`/jobs/${job.id}`} size="sm" variant="secondary">
          Open
        </ButtonLink>
        <DropdownMenu
          ariaLabel={`More actions for ${job.title}`}
          label={<MoreHorizontal className="h-4 w-4" />}
          iconOnly
          size="sm"
          variant="ghost"
          sections={[
            {
              key: 'main',
              items: [
                {
                  key: 'edit',
                  label: 'Edit job',
                  icon: <Pencil />,
                  onSelect: () => navigate(`/jobs/${job.id}/edit`),
                },
                {
                  key: 'status',
                  label: closing ? 'Close job' : 'Reopen job',
                  description: closing ? 'Hide from active jobs; data is kept' : 'Move back to active jobs',
                  icon: closing ? <Archive /> : <ArchiveRestore />,
                  disabled: setStatus.isPending,
                  onSelect: () =>
                    setStatus.mutate(
                      { jobId: job.id, status: closing ? 'closed' : 'active' },
                      { onSuccess: () => toast.success(closing ? 'Job closed' : 'Job reopened', { description: job.title }) },
                    ),
                },
              ],
            },
            {
              key: 'danger',
              items: [{ key: 'delete', label: 'Delete job', icon: <Trash2 />, tone: 'danger', onSelect: onDelete }],
            },
          ]}
        />
      </div>
    </div>
  )
}
