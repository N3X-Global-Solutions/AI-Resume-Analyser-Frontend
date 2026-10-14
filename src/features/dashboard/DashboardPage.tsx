import {
  AlertTriangle,
  ArrowRight,
  Briefcase,
  CheckCircle2,
  FileStack,
  Plus,
  Sparkles,
  Star,
  Upload,
  Users,
} from 'lucide-react'
import { Link } from 'react-router-dom'
import { useDashboard } from '../../api/hooks'
import type { JobSummary, TierCounts } from '../../api/types'
import { JobMeta } from '../../components/JobMeta'
import { PageHeader } from '../../components/PageHeader'
import { TierBar } from '../../components/TierBar'
import {
  Badge,
  ButtonLink,
  Card,
  CardBody,
  CardHeader,
  ErrorState,
  ProgressBar,
  Skeleton,
  Spinner,
  StatCard,
} from '../../components/ui'
import { useDocumentTitle } from '../../hooks/useDocumentTitle'
import { cn } from '../../lib/cn'
import { TIER_META, TIER_ORDER } from '../../lib/constants'
import { formatNumber, formatPercent, formatRelative, formatScore, pluralize, ratio } from '../../lib/format'
import { jobProgress } from '../../lib/jobs'

export function DashboardPage() {
  useDocumentTitle('Dashboard')
  const dashboard = useDashboard()

  return (
    <>
      <PageHeader
        title="Dashboard"
        description="Your hiring pipeline at a glance — from hundreds of resumes to a ranked, explained shortlist."
        actions={
          <ButtonLink to="/jobs/new" variant="primary" icon={<Plus className="h-4 w-4" />}>
            New Job
          </ButtonLink>
        }
      />
      {dashboard.isPending ? (
        <DashboardSkeleton />
      ) : dashboard.isError ? (
        <ErrorState
          title="Couldn't load the dashboard"
          error={dashboard.error}
          onRetry={() => void dashboard.refetch()}
          retrying={dashboard.isFetching}
        />
      ) : dashboard.data.total_jobs === 0 ? (
        <Onboarding />
      ) : (
        <div className="space-y-6">
          <div className={cn('grid grid-cols-1 gap-4 sm:grid-cols-2', dashboard.data.failed_resumes > 0 ? 'xl:grid-cols-4' : 'xl:grid-cols-3')}>
            <StatCard
              label="Active jobs"
              value={formatNumber(dashboard.data.active_jobs)}
              icon={<Briefcase />}
              hint={`${pluralize(dashboard.data.total_jobs, 'job')} in total`}
            />
            <StatCard
              label="Resumes processed"
              value={
                <span>
                  {formatNumber(dashboard.data.processed_resumes)}
                  <span className="ml-1 text-base font-normal text-slate-400">/ {formatNumber(dashboard.data.total_resumes)}</span>
                </span>
              }
              icon={<FileStack />}
              hint={
                dashboard.data.processing_resumes > 0 ? (
                  <span className="inline-flex items-center gap-1.5 text-indigo-600">
                    <Spinner className="h-3 w-3" />+{formatNumber(dashboard.data.processing_resumes)} processing now
                  </span>
                ) : (
                  'All uploads analyzed'
                )
              }
            />
            <StatCard
              label="Shortlisted"
              value={formatNumber(dashboard.data.shortlisted)}
              icon={<Star />}
              hint={
                <Link to="/shortlist" className="font-medium text-indigo-600 hover:text-indigo-700">
                  View shortlist →
                </Link>
              }
            />
            {dashboard.data.failed_resumes > 0 && (
              <StatCard
                label="Failed"
                value={formatNumber(dashboard.data.failed_resumes)}
                icon={<AlertTriangle />}
                tone="danger"
                hint="Retry them from a job's Upload tab"
              />
            )}
          </div>

          <TierOverview counts={dashboard.data.tier_counts} />

          <section aria-labelledby="recent-jobs">
            <div className="mb-3 flex items-center justify-between">
              <h2 id="recent-jobs" className="text-base font-semibold text-slate-900">
                Recent jobs
              </h2>
              <Link to="/jobs" className="text-sm font-medium text-indigo-600 hover:text-indigo-700">
                All jobs →
              </Link>
            </div>
            <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
              {dashboard.data.recent_jobs.map((job) => (
                <RecentJobCard key={job.id} job={job} />
              ))}
            </div>
          </section>
        </div>
      )}
    </>
  )
}

function TierOverview({ counts }: { counts: TierCounts }) {
  const total = counts.strong + counts.good + counts.partial + counts.low
  return (
    <Card>
      <CardHeader
        title="Candidate quality across all jobs"
        description={total > 0 ? `${pluralize(total, 'analyzed candidate')} by match tier` : 'No analyzed candidates yet'}
      />
      <CardBody className="space-y-4">
        <TierBar counts={counts} size="lg" showLegend={false} />
        <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
          {TIER_ORDER.map((tier) => {
            const meta = TIER_META[tier]
            return (
              <div key={tier} className={cn('rounded-lg border p-3', meta.border, meta.soft)}>
                <div className="flex items-center gap-2 text-xs font-medium text-slate-600">
                  <span className={cn('h-2 w-2 rounded-full', meta.dot)} aria-hidden />
                  {meta.label}
                </div>
                <div className="mt-1 flex items-baseline gap-2">
                  <span className="text-xl font-semibold text-slate-900 tabular-nums">{formatNumber(counts[tier])}</span>
                  <span className="text-xs text-slate-500">{formatPercent(ratio(counts[tier], total))}</span>
                </div>
                <div className="mt-0.5 text-[11px] text-slate-500">Score {meta.range}</div>
              </div>
            )
          })}
        </div>
      </CardBody>
    </Card>
  )
}

function RecentJobCard({ job }: { job: JobSummary }) {
  const progress = jobProgress(job.stats)
  return (
    <Card className="flex flex-col transition-shadow hover:shadow-md">
      <div className="flex-1 space-y-4 p-5">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <Link
              to={`/jobs/${job.id}`}
              className="block truncate text-base font-semibold text-slate-900 hover:text-indigo-700 focus-visible:outline-none focus-visible:underline"
            >
              {job.title}
            </Link>
            <JobMeta department={job.department} location={job.location} workMode={job.work_mode} className="mt-1" />
          </div>
          <div className="flex shrink-0 flex-col items-end gap-1">
            {job.status === 'closed' && <Badge>Closed</Badge>}
            {job.needs_reanalysis && <Badge tone="amber">Needs re-analysis</Badge>}
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-slate-600">
          <span className="inline-flex items-center gap-1.5">
            <Users className="h-4 w-4 text-slate-400" aria-hidden />
            {pluralize(job.stats.total_resumes, 'resume')}
          </span>
          <span className="inline-flex items-center gap-1.5">
            <Star className="h-4 w-4 text-slate-400" aria-hidden />
            {formatNumber(job.stats.status_counts.shortlisted)} shortlisted
          </span>
          {job.stats.top_score !== null && (
            <span className="inline-flex items-center gap-1.5">
              <CheckCircle2 className="h-4 w-4 text-slate-400" aria-hidden />
              Top {formatScore(job.stats.top_score)}
            </span>
          )}
        </div>

        {progress.isProcessing && (
          <div className="space-y-1.5">
            <div className="flex items-center justify-between text-xs">
              <span className="inline-flex items-center gap-1.5 font-medium text-indigo-600">
                <Spinner className="h-3 w-3" /> Processing {formatPercent(progress.percent)}
              </span>
              <span className="text-slate-500 tabular-nums">
                {formatNumber(progress.done)} / {formatNumber(job.stats.total_resumes)}
              </span>
            </div>
            <ProgressBar value={progress.percent} size="sm" animated />
          </div>
        )}

        {job.stats.total_resumes > 0 ? (
          <TierBar counts={job.stats.tier_counts} size="sm" />
        ) : (
          <p className="text-sm text-slate-400">No resumes uploaded yet.</p>
        )}
      </div>
      <div className="flex items-center justify-between gap-3 border-t border-slate-100 px-5 py-3">
        <span className="text-xs text-slate-400">Created {formatRelative(job.created_at)}</span>
        {job.stats.total_resumes > 0 ? (
          <ButtonLink to={`/jobs/${job.id}?tab=candidates`} size="sm" variant="soft">
            View candidates <ArrowRight className="h-3.5 w-3.5" />
          </ButtonLink>
        ) : (
          <ButtonLink to={`/jobs/${job.id}?tab=upload`} size="sm" variant="soft" icon={<Upload className="h-3.5 w-3.5" />}>
            Upload resumes
          </ButtonLink>
        )}
      </div>
    </Card>
  )
}

function Onboarding() {
  const steps = [
    { icon: Briefcase, title: 'Create a job', text: 'Add requirements — or paste a job description and let GLM-5 fill them in.' },
    { icon: Upload, title: 'Upload resumes', text: 'Drop 100+ PDFs, DOCX files or a ZIP. The AI agent analyzes each one.' },
    { icon: Sparkles, title: 'Review the ranking', text: 'Every score is broken down transparently, with evidence for each requirement.' },
  ]
  return (
    <Card className="overflow-hidden">
      <div className="bg-linear-to-br from-indigo-50 via-white to-white px-6 py-12 text-center sm:px-12">
        <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-indigo-600 text-white shadow-lg shadow-indigo-600/20">
          <Sparkles className="h-6 w-6" />
        </div>
        <h2 className="mt-5 text-xl font-semibold tracking-tight text-slate-900">Go from 500 resumes to your top 20 in minutes</h2>
        <p className="mx-auto mt-2 max-w-xl text-sm text-slate-500">
          Create a job, upload resumes in bulk, and see exactly why each candidate was ranked where they are.
        </p>
        <ButtonLink to="/jobs/new" variant="primary" size="lg" className="mt-6" icon={<Plus className="h-5 w-5" />}>
          Create your first job
        </ButtonLink>
      </div>
      <div className="grid grid-cols-1 divide-y divide-slate-100 border-t border-slate-100 md:grid-cols-3 md:divide-x md:divide-y-0">
        {steps.map(({ icon: Icon, title, text }, index) => (
          <div key={title} className="flex gap-3 p-5">
            <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-slate-100 text-slate-600">
              <Icon className="h-4 w-4" />
            </span>
            <div>
              <div className="text-sm font-semibold text-slate-900">
                {index + 1}. {title}
              </div>
              <p className="mt-0.5 text-sm text-slate-500">{text}</p>
            </div>
          </div>
        ))}
      </div>
    </Card>
  )
}

function DashboardSkeleton() {
  return (
    <div className="space-y-6" aria-busy="true" aria-label="Loading dashboard">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {[0, 1, 2].map((key) => (
          <Skeleton key={key} className="h-[110px] rounded-xl" />
        ))}
      </div>
      <Skeleton className="h-48 rounded-xl" />
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        {[0, 1, 2, 3].map((key) => (
          <Skeleton key={key} className="h-56 rounded-xl" />
        ))}
      </div>
    </div>
  )
}
