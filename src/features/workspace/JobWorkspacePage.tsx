import {
  AlertTriangle,
  Archive,
  ArchiveRestore,
  ArrowLeft,
  ClipboardList,
  MoreHorizontal,
  Pencil,
  RefreshCw,
  Trash2,
  Upload,
  Users,
} from 'lucide-react'
import { useState } from 'react'
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom'
import { toast } from 'sonner'
import { isNotFoundError } from '../../api/client'
import { useDeleteJob, useJob, useProgress, useReanalyze, useSetJobStatus } from '../../api/hooks'
import type { Job, Progress } from '../../api/types'
import { JobMeta } from '../../components/JobMeta'
import {
  Badge,
  Button,
  ButtonLink,
  ConfirmDialog,
  DropdownMenu,
  ErrorState,
  Skeleton,
  Spinner,
  TabPanel,
  Tabs,
} from '../../components/ui'
import { useDocumentTitle } from '../../hooks/useDocumentTitle'
import { formatNumber, formatPercent, formatSalary, formatScore, pluralize } from '../../lib/format'
import { analyzedCount } from '../../lib/jobs'
import { NotFoundPage } from '../../pages/NotFoundPage'
import { CandidatesTab } from './CandidatesTab'
import { RequirementsTab } from './RequirementsTab'
import { UploadTab } from './UploadTab'
import { useProcessingSync } from './useProcessingSync'

type WorkspaceTab = 'candidates' | 'upload' | 'requirements'
const TAB_IDS: readonly WorkspaceTab[] = ['candidates', 'upload', 'requirements']

function isTab(value: string | null): value is WorkspaceTab {
  return value !== null && (TAB_IDS as readonly string[]).includes(value)
}

export function JobWorkspacePage() {
  const { jobId = '' } = useParams()
  const job = useJob(jobId)
  const progress = useProgress(job.data ? jobId : undefined)
  const [searchParams, setSearchParams] = useSearchParams()
  useDocumentTitle(job.data?.title ?? 'Job')

  const tabParam = searchParams.get('tab')
  const tab: WorkspaceTab = isTab(tabParam)
    ? tabParam
    : (job.data?.stats.total_resumes ?? 0) > 0
      ? 'candidates'
      : 'upload'

  function setTab(next: WorkspaceTab, replace = false) {
    setSearchParams(
      (current) => {
        const params = new URLSearchParams(current)
        params.set('tab', next)
        return params
      },
      { preventScrollReset: true, replace },
    )
  }

  useProcessingSync(jobId, progress.data, () => setTab('candidates'))

  if (job.isPending) return <WorkspaceSkeleton />
  if (job.isError) {
    if (isNotFoundError(job.error)) {
      return <NotFoundPage title="Job not found" description="This job doesn't exist or has been deleted." />
    }
    return <ErrorState title="Couldn't load this job" error={job.error} onRetry={() => void job.refetch()} retrying={job.isFetching} />
  }

  const data = job.data
  const analyzed = analyzedCount(data.stats)

  return (
    <>
      <WorkspaceHeader job={data} progress={progress.data} />
      {data.needs_reanalysis && data.stats.total_resumes > 0 && <ReanalyzeBanner job={data} />}

      <Tabs
        className="mt-6"
        idPrefix="workspace"
        ariaLabel="Job workspace"
        value={tab}
        onChange={setTab}
        tabs={[
          {
            id: 'candidates',
            label: 'Candidates',
            icon: <Users className="h-4 w-4" />,
            badge: <span className="rounded-full bg-slate-100 px-1.5 text-xs text-slate-600 tabular-nums">{formatNumber(analyzed)}</span>,
          },
          {
            id: 'upload',
            label: 'Upload',
            icon: <Upload className="h-4 w-4" />,
            badge: progress.data?.is_processing ? (
              <Spinner className="h-3.5 w-3.5 text-indigo-500" />
            ) : (progress.data?.failed ?? 0) > 0 ? (
              <span className="rounded-full bg-rose-100 px-1.5 text-xs text-rose-700 tabular-nums">{progress.data?.failed}</span>
            ) : undefined,
          },
          { id: 'requirements', label: 'Requirements', icon: <ClipboardList className="h-4 w-4" /> },
        ]}
      />

      <TabPanel idPrefix="workspace" id={tab} className="pt-6">
        {tab === 'candidates' && <CandidatesTab job={data} progress={progress.data} onGoToUpload={() => setTab('upload')} />}
        {tab === 'upload' && (
          <UploadTab
            job={data}
            progress={progress.data}
            onViewRanking={() => setTab('candidates')}
            // Pin the tab so it doesn't jump to "candidates" once the job has resumes.
            onUploadStart={() => setTab('upload', true)}
          />
        )}
        {tab === 'requirements' && <RequirementsTab job={data} />}
      </TabPanel>
    </>
  )
}

function WorkspaceHeader({ job, progress }: { job: Job; progress: Progress | undefined }) {
  const navigate = useNavigate()
  const setStatus = useSetJobStatus()
  const deleteJob = useDeleteJob()
  const [confirmDelete, setConfirmDelete] = useState(false)
  const salary = formatSalary(job.salary_min, job.salary_max, job.salary_currency)
  const closing = job.status === 'active'

  const stats = [
    { label: 'Resumes', value: formatNumber(job.stats.total_resumes) },
    { label: 'Analyzed', value: formatNumber(job.stats.completed) },
    { label: 'Avg score', value: formatScore(job.stats.average_score) },
    { label: 'Top score', value: formatScore(job.stats.top_score) },
    { label: 'Shortlisted', value: formatNumber(job.stats.status_counts.shortlisted) },
  ]

  return (
    <header>
      <Link to="/jobs" className="inline-flex items-center gap-1 text-sm font-medium text-slate-500 hover:text-slate-800">
        <ArrowLeft className="h-4 w-4" /> Jobs
      </Link>
      <div className="mt-2 flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="text-2xl font-semibold tracking-tight text-slate-900">{job.title}</h1>
            {job.status === 'closed' && <Badge>Closed</Badge>}
            {progress?.is_processing && (
              <Badge tone="indigo" size="md">
                <Spinner className="h-3.5 w-3.5" /> Analyzing… {formatPercent(progress.percent)}
              </Badge>
            )}
          </div>
          <div className="mt-1.5 flex flex-wrap items-center gap-x-4 gap-y-1">
            <JobMeta department={job.department} location={job.location} workMode={job.work_mode} />
            {salary && <span className="text-sm text-slate-500">{salary}</span>}
          </div>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          <ButtonLink to={`/jobs/${job.id}/edit`} variant="secondary" icon={<Pencil className="h-4 w-4" />}>
            Edit job
          </ButtonLink>
          <DropdownMenu
            ariaLabel="More job actions"
            label={<MoreHorizontal className="h-4 w-4" />}
            iconOnly
            variant="secondary"
            sections={[
              {
                key: 'main',
                items: [
                  {
                    key: 'status',
                    label: closing ? 'Close job' : 'Reopen job',
                    icon: closing ? <Archive /> : <ArchiveRestore />,
                    onSelect: () =>
                      setStatus.mutate(
                        { jobId: job.id, status: closing ? 'closed' : 'active' },
                        { onSuccess: () => toast.success(closing ? 'Job closed' : 'Job reopened') },
                      ),
                  },
                ],
              },
              {
                key: 'danger',
                items: [{ key: 'delete', label: 'Delete job', icon: <Trash2 />, tone: 'danger', onSelect: () => setConfirmDelete(true) }],
              },
            ]}
          />
        </div>
      </div>

      <dl className="mt-5 grid grid-cols-2 gap-px overflow-hidden rounded-xl border border-slate-200 bg-slate-200 sm:grid-cols-5">
        {stats.map((stat) => (
          <div key={stat.label} className="bg-white px-4 py-3 last:col-span-2 sm:last:col-span-1">
            <dt className="text-xs font-medium text-slate-500">{stat.label}</dt>
            <dd className="mt-0.5 text-lg font-semibold text-slate-900 tabular-nums">{stat.value}</dd>
          </div>
        ))}
      </dl>

      <ConfirmDialog
        open={confirmDelete}
        onClose={() => setConfirmDelete(false)}
        tone="danger"
        title="Delete this job?"
        confirmLabel="Delete job"
        loading={deleteJob.isPending}
        description={
          <>
            <span className="font-medium text-slate-700">{job.title}</span> and its {pluralize(job.stats.total_resumes, 'resume')},
            candidates and stored files will be permanently deleted. This can’t be undone.
          </>
        }
        onConfirm={() =>
          deleteJob.mutate(job.id, {
            onSuccess: () => {
              toast.success('Job deleted', { description: job.title })
              navigate('/jobs')
            },
          })
        }
      />
    </header>
  )
}

function ReanalyzeBanner({ job }: { job: Job }) {
  const reanalyze = useReanalyze(job.id)
  return (
    <div
      className="mt-5 flex flex-col gap-3 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 sm:flex-row sm:items-center sm:justify-between"
      role="status"
    >
      <div className="flex items-start gap-3">
        <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-amber-600" aria-hidden />
        <div>
          <p className="text-sm font-semibold text-amber-900">Requirements changed since these candidates were analyzed</p>
          <p className="text-sm text-amber-800">
            Scores and rankings reflect the old requirements. Re-analyze to evaluate all {pluralize(job.stats.total_resumes, 'resume')}{' '}
            against the current ones (extracted profiles are reused, so it’s faster).
          </p>
        </div>
      </div>
      <Button
        variant="warning"
        className="shrink-0"
        loading={reanalyze.isPending}
        icon={<RefreshCw className="h-4 w-4" />}
        onClick={() =>
          reanalyze.mutate(undefined, {
            onSuccess: (result) =>
              toast.success('Re-analysis started', { description: `${pluralize(result.queued, 'resume')} queued for GLM-5` }),
          })
        }
      >
        Re-analyze all candidates
      </Button>
    </div>
  )
}

function WorkspaceSkeleton() {
  return (
    <div aria-busy="true" aria-label="Loading job">
      <Skeleton className="h-4 w-16" />
      <Skeleton className="mt-3 h-8 w-80 max-w-full" />
      <Skeleton className="mt-2 h-4 w-64 max-w-full" />
      <Skeleton className="mt-5 h-16 w-full rounded-xl" />
      <Skeleton className="mt-6 h-10 w-full" />
      <Skeleton className="mt-6 h-96 w-full rounded-xl" />
    </div>
  )
}
