import { ChevronRight, CircleHelp, Download, RotateCcw, Star, X } from 'lucide-react'
import { Link, useSearchParams } from 'react-router-dom'
import { toast } from 'sonner'
import { shortlistApi } from '../../api/endpoints'
import { useJobs, usePendingCandidateIds, useShortlist, useUpdateCandidate } from '../../api/hooks'
import type { CandidateStatus, ShortlistItem } from '../../api/types'
import { PageHeader } from '../../components/PageHeader'
import {
  ButtonAnchor,
  ButtonLink,
  Card,
  EmptyState,
  ErrorState,
  ScoreBadge,
  Select,
  Skeleton,
  Spinner,
  TierBadge,
  Tooltip,
} from '../../components/ui'
import { useDocumentTitle } from '../../hooks/useDocumentTitle'
import { cn } from '../../lib/cn'
import { STATUS_META } from '../../lib/constants'
import { displayName, formatYears, pluralize } from '../../lib/format'

const ACTIONS: { status: CandidateStatus; label: string; icon: typeof X }[] = [
  { status: 'maybe', label: 'Move to Maybe', icon: CircleHelp },
  { status: 'rejected', label: 'Reject', icon: X },
  { status: 'new', label: 'Reset to New', icon: RotateCcw },
]

function RowActions({ item, disabled, onChange }: { item: ShortlistItem; disabled: boolean; onChange: (status: CandidateStatus) => void }) {
  return (
    <div className="flex items-center gap-1">
      {ACTIONS.map(({ status, label, icon: Icon }) => (
        <Tooltip key={status} content={label}>
          <button
            type="button"
            disabled={disabled}
            onClick={() => onChange(status)}
            aria-label={`${label}: ${displayName(item.name)}`}
            className={cn(
              'inline-flex h-8 w-8 items-center justify-center rounded-md text-slate-400 transition-colors disabled:opacity-50',
              'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500',
              STATUS_META[status].hover,
            )}
          >
            <Icon className="h-4 w-4" />
          </button>
        </Tooltip>
      ))}
    </div>
  )
}

export function ShortlistPage() {
  useDocumentTitle('Shortlist')
  const [searchParams, setSearchParams] = useSearchParams()
  const jobId = searchParams.get('job_id') || null
  const jobs = useJobs('all')
  const shortlist = useShortlist(jobId)
  const update = useUpdateCandidate()
  const pendingIds = usePendingCandidateIds()
  const items = shortlist.data ?? []

  function changeStatus(item: ShortlistItem, status: CandidateStatus) {
    const name = displayName(item.name)
    update.mutate(
      { candidateId: item.id, jobId: item.job_id, update: { status } },
      {
        onSuccess: () =>
          toast.success(`${name} → ${STATUS_META[status].label}`, {
            description: 'Removed from the shortlist',
            action: {
              label: 'Undo',
              onClick: () => update.mutate({ candidateId: item.id, jobId: item.job_id, update: { status: 'shortlisted' } }),
            },
          }),
      },
    )
  }

  return (
    <>
      <PageHeader
        title="Shortlist"
        description="Everyone you’ve shortlisted, best match first."
        actions={
          <ButtonAnchor
            href={shortlistApi.exportUrl(jobId ?? undefined)}
            download
            variant="secondary"
            icon={<Download className="h-4 w-4" />}
            aria-disabled={items.length === 0 || undefined}
          >
            Export CSV
          </ButtonAnchor>
        }
      />

      <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <Select
          aria-label="Filter by job"
          value={jobId ?? ''}
          onChange={(event) => setSearchParams(event.target.value ? { job_id: event.target.value } : {}, { replace: true })}
          className="sm:w-80"
        >
          <option value="">All jobs</option>
          {(jobs.data ?? []).map((job) => (
            <option key={job.id} value={job.id}>
              {job.title}
              {job.status === 'closed' ? ' (closed)' : ''}
            </option>
          ))}
        </Select>
        {shortlist.data && (
          <p className="flex items-center gap-2 text-sm text-slate-500">
            {shortlist.isFetching && <Spinner className="h-3.5 w-3.5" />}
            {pluralize(items.length, 'shortlisted candidate')}
          </p>
        )}
      </div>

      {shortlist.isPending ? (
        <Card className="divide-y divide-slate-100" aria-busy="true">
          {[0, 1, 2, 3, 4].map((key) => (
            <div key={key} className="flex items-center gap-4 px-5 py-4">
              <div className="flex-1 space-y-2">
                <Skeleton className="h-4 w-1/4" />
                <Skeleton className="h-3 w-1/3" />
              </div>
              <Skeleton className="h-7 w-14" />
              <Skeleton className="h-7 w-24" />
            </div>
          ))}
        </Card>
      ) : shortlist.isError ? (
        <ErrorState
          title="Couldn't load the shortlist"
          error={shortlist.error}
          onRetry={() => void shortlist.refetch()}
          retrying={shortlist.isFetching}
        />
      ) : items.length === 0 ? (
        <Card>
          <EmptyState
            icon={<Star />}
            title={jobId ? 'Nobody shortlisted for this job yet' : 'Your shortlist is empty'}
            description="Shortlist candidates from a job’s ranking — one by one, in bulk, or with “Shortlist all Strong matches”."
            action={
              <ButtonLink to={jobId ? `/jobs/${jobId}?tab=candidates` : '/jobs'} variant="primary">
                {jobId ? 'Open the ranking' : 'Go to jobs'}
              </ButtonLink>
            }
          />
        </Card>
      ) : (
        <Card className="overflow-hidden">
          {/* Table (tablet / desktop) */}
          <div className="hidden overflow-x-auto md:block">
            <table className="w-full min-w-[760px] text-left text-sm">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50/80 text-xs font-medium tracking-wide text-slate-500 uppercase">
                  <th scope="col" className="py-2.5 pr-2 pl-5">
                    Candidate
                  </th>
                  <th scope="col" className="px-2 py-2.5">
                    Job
                  </th>
                  <th scope="col" className="px-2 py-2.5">
                    Score
                  </th>
                  <th scope="col" className="px-2 py-2.5">
                    Experience
                  </th>
                  <th scope="col" className="px-2 py-2.5">
                    Required
                  </th>
                  <th scope="col" className="px-2 py-2.5">
                    <span className="sr-only">Actions</span>
                  </th>
                  <th scope="col" className="py-2.5 pr-5 pl-2">
                    <span className="sr-only">Open</span>
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {items.map((item) => (
                  <tr key={item.id} className="hover:bg-slate-50">
                    <td className="max-w-0 py-3 pr-2 pl-5">
                      <Link to={`/candidates/${item.id}`} className="block truncate font-semibold text-slate-900 hover:text-indigo-700">
                        {displayName(item.name)}
                      </Link>
                      <p className="truncate text-sm text-slate-500">{[item.headline, item.location].filter(Boolean).join(' · ')}</p>
                    </td>
                    <td className="max-w-[14rem] px-2 py-3">
                      <Link to={`/jobs/${item.job_id}?tab=candidates`} className="block truncate text-slate-700 hover:text-indigo-700">
                        {item.job_title}
                      </Link>
                      {item.rank !== null && <p className="text-xs text-slate-400">Rank #{item.rank}</p>}
                    </td>
                    <td className="px-2 py-3">
                      <div className="flex items-center gap-2">
                        <ScoreBadge score={item.match_score} tier={item.match_tier} />
                        <TierBadge tier={item.match_tier} short />
                      </div>
                    </td>
                    <td className="px-2 py-3 whitespace-nowrap text-slate-700 tabular-nums">{formatYears(item.total_experience_years)}</td>
                    <td className="px-2 py-3 text-slate-700 tabular-nums">
                      {item.total_required > 0 ? `${item.matched_required}/${item.total_required}` : '—'}
                    </td>
                    <td className="px-2 py-3">
                      <RowActions item={item} disabled={pendingIds.has(item.id)} onChange={(status) => changeStatus(item, status)} />
                    </td>
                    <td className="py-3 pr-5 pl-2">
                      <Link
                        to={`/candidates/${item.id}`}
                        className="inline-flex h-8 w-8 items-center justify-center rounded-md text-slate-400 hover:bg-slate-100 hover:text-indigo-600"
                        aria-label={`Open ${displayName(item.name)}`}
                      >
                        <ChevronRight className="h-4 w-4" />
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Cards (phone) */}
          <ul className="divide-y divide-slate-100 md:hidden">
            {items.map((item) => (
              <li key={item.id} className="space-y-2 px-4 py-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <Link to={`/candidates/${item.id}`} className="block truncate font-semibold text-slate-900">
                      {displayName(item.name)}
                    </Link>
                    <p className="truncate text-sm text-slate-500">{item.job_title}</p>
                    <p className="text-xs text-slate-400">
                      {formatYears(item.total_experience_years)}
                      {item.total_required > 0 && ` · ${item.matched_required}/${item.total_required} required`}
                    </p>
                  </div>
                  <ScoreBadge score={item.match_score} tier={item.match_tier} />
                </div>
                <div className="flex items-center justify-between">
                  <TierBadge tier={item.match_tier} />
                  <RowActions item={item} disabled={pendingIds.has(item.id)} onChange={(status) => changeStatus(item, status)} />
                </div>
              </li>
            ))}
          </ul>
        </Card>
      )}
    </>
  )
}
