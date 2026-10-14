import {
  AlertTriangle,
  ArrowDownWideNarrow,
  ArrowUpNarrowWide,
  Check,
  CircleHelp,
  Download,
  Loader2,
  Search,
  SlidersHorizontal,
  Sparkles,
  Upload,
  Users,
  X,
} from 'lucide-react'
import { useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { toast } from 'sonner'
import { candidatesApi } from '../../api/endpoints'
import { useAISearch, useBulkStatus, useCandidates, usePendingCandidateIds, useUpdateCandidate } from '../../api/hooks'
import type { CandidateListItem, CandidateSort, CandidateStatus, Job, MatchTier, Progress } from '../../api/types'
import { TierChips } from '../../components/TierBar'
import {
  Button,
  ButtonAnchor,
  Card,
  EmptyState,
  ErrorState,
  Input,
  Pagination,
  ProgressBar,
  SegmentedControl,
  Select,
  Skeleton,
  Spinner,
} from '../../components/ui'
import { useDebouncedCallback } from '../../hooks/useDebouncedCallback'
import { useMediaQuery } from '../../hooks/useMediaQuery'
import { cn } from '../../lib/cn'
import { CANDIDATE_PAGE_SIZE, MODEL_LABEL, STATUS_META, STATUS_ORDER } from '../../lib/constants'
import { displayName, formatNumber, formatPercent, pluralize } from '../../lib/format'
import { AISearchResults } from './AISearchResults'
import { CandidateFiltersPanel } from './CandidateFiltersPanel'
import {
  clearCandidateFilters,
  filtersToQuery,
  hasAnyFilter,
  panelFilterCount,
  parseCandidateFilters,
  writeCandidateFilters,
  type CandidateFilters,
} from './candidateFilters'
import { CandidateTable } from './CandidateTable'
import { SmartActionsMenu } from './SmartActions'

const EMPTY_SET: ReadonlySet<string> = new Set()

const SORT_OPTIONS: { value: CandidateSort; label: string }[] = [
  { value: 'score', label: 'Match score' },
  { value: 'experience', label: 'Experience' },
  { value: 'name', label: 'Name' },
  { value: 'recent', label: 'Recently added' },
]

type SearchMode = 'keyword' | 'ai'
type StatusFilter = CandidateStatus | 'all'

function KeywordSearch({ value, onChange }: { value: string; onChange: (value: string) => void }) {
  const [draft, setDraft] = useState(value)
  const debounced = useDebouncedCallback(onChange, 350)
  return (
    <Input
      type="search"
      value={draft}
      onChange={(event) => {
        setDraft(event.target.value)
        debounced(event.target.value)
      }}
      onKeyDown={(event) => {
        if (event.key === 'Enter') onChange(draft)
      }}
      placeholder="Search name, email, skills, resume text…"
      aria-label="Keyword search"
      leading={<Search className="h-4 w-4" />}
      className="min-w-0 flex-1"
    />
  )
}

export function CandidatesTab({
  job,
  progress,
  onGoToUpload,
}: {
  job: Job
  progress: Progress | undefined
  onGoToUpload: () => void
}) {
  const [searchParams, setSearchParams] = useSearchParams()
  const filters = parseCandidateFilters(searchParams)
  const query = filtersToQuery(filters)
  const hasResumes = job.stats.total_resumes > 0
  const list = useCandidates(job.id, query, hasResumes)
  const updateCandidate = useUpdateCandidate()
  const bulk = useBulkStatus(job.id)
  const pendingIds = usePendingCandidateIds()
  const isDesktop = useMediaQuery('(min-width: 1024px)')

  const [filtersOpen, setFiltersOpen] = useState<boolean | null>(null)
  const [resetKey, setResetKey] = useState(0)
  const [mode, setMode] = useState<SearchMode>('keyword')
  const [aiDraft, setAiDraft] = useState('')
  const [aiQuery, setAiQuery] = useState<string | null>(null)
  const aiSearch = useAISearch(job.id)

  const scope = JSON.stringify({ job: job.id, ...query })
  const [selection, setSelection] = useState<{ scope: string; ids: ReadonlySet<string> }>({ scope, ids: EMPTY_SET })
  const selected = selection.scope === scope ? selection.ids : EMPTY_SET

  const panelCount = panelFilterCount(filters)
  const panelOpen = filtersOpen ?? (isDesktop || panelCount > 0)
  const facets = list.data?.facets
  const analyzedTotal = facets
    ? facets.tier_counts.strong + facets.tier_counts.good + facets.tier_counts.partial + facets.tier_counts.low
    : 0

  function patchFilters(patch: Partial<CandidateFilters>) {
    setSearchParams((current) => writeCandidateFilters(current, patch), { replace: true, preventScrollReset: true })
  }

  function clearAll() {
    setSearchParams((current) => clearCandidateFilters(current), { replace: true, preventScrollReset: true })
    setResetKey((key) => key + 1)
  }

  function toggleTier(tier: MatchTier) {
    patchFilters({ tier: filters.tier.includes(tier) ? filters.tier.filter((t) => t !== tier) : [...filters.tier, tier] })
  }

  function setSelected(ids: ReadonlySet<string>) {
    setSelection({ scope, ids })
  }

  function toggleOne(id: string) {
    const next = new Set(selected)
    if (next.has(id)) next.delete(id)
    else next.add(id)
    setSelected(next)
  }

  function toggleAll(checked: boolean) {
    const items = list.data?.items ?? []
    const next = new Set(selected)
    for (const item of items) {
      if (checked) next.add(item.id)
      else next.delete(item.id)
    }
    setSelected(next)
  }

  function changeStatus(candidate: CandidateListItem, status: CandidateStatus) {
    const previous = candidate.status
    const name = displayName(candidate.name)
    updateCandidate.mutate(
      { candidateId: candidate.id, jobId: job.id, update: { status } },
      {
        onSuccess: () =>
          toast.success(status === 'new' ? `${name} reset to New` : `${name} → ${STATUS_META[status].label}`, {
            action: {
              label: 'Undo',
              onClick: () => updateCandidate.mutate({ candidateId: candidate.id, jobId: job.id, update: { status: previous } }),
            },
          }),
      },
    )
  }

  function bulkUpdate(status: CandidateStatus) {
    const ids = [...selected]
    bulk.mutate(
      { status, candidate_ids: ids },
      {
        onSuccess: (result) => {
          toast.success(`${pluralize(result.updated, 'candidate')} marked ${STATUS_META[status].label}`)
          setSelected(EMPTY_SET)
        },
      },
    )
  }

  function runAiSearch() {
    const q = aiDraft.trim()
    if (q.length < 3) {
      toast.info('Describe the candidate you are looking for (a few words at least)')
      return
    }
    setAiQuery(q)
    aiSearch.mutate({ query: q, limit: 20 })
  }

  function exitAi() {
    setMode('keyword')
    setAiQuery(null)
    aiSearch.reset()
  }

  // ---- No resumes at all -------------------------------------------------
  if (!hasResumes) {
    return (
      <Card>
        <EmptyState
          icon={<Users />}
          title="No candidates yet"
          description="Upload resumes for this job — the AI agent extracts each profile, checks it against your requirements and ranks everyone."
          action={
            <Button variant="primary" onClick={onGoToUpload} icon={<Upload className="h-4 w-4" />}>
              Upload resumes
            </Button>
          }
        />
      </Card>
    )
  }

  const statusValue: StatusFilter = filters.status ?? 'all'
  const statusCounts = facets?.status_counts
  const showAi = mode === 'ai' && aiQuery !== null

  return (
    <div className="space-y-4">
      {/* Tier distribution + live processing indicator */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        {facets ? (
          <TierChips counts={facets.tier_counts} selected={filters.tier} onToggle={toggleTier} />
        ) : (
          <div className="flex gap-2">
            {[0, 1, 2, 3].map((key) => (
              <Skeleton key={key} className="h-8 w-24 rounded-lg" />
            ))}
          </div>
        )}
        {progress?.is_processing && (
          <div className="flex shrink-0 items-center gap-2 text-sm whitespace-nowrap text-indigo-700" role="status" aria-live="polite">
            <Spinner className="h-4 w-4" />
            <span className="font-medium">Analyzing… {formatPercent(progress.percent)}</span>
            <ProgressBar value={progress.percent} size="sm" className="w-24" animated />
          </div>
        )}
      </div>

      {/* Toolbar */}
      <div className="flex flex-col gap-2 lg:flex-row lg:items-center">
        <div className="flex min-w-0 flex-1 flex-col gap-2 sm:flex-row sm:items-center">
          <SegmentedControl<SearchMode>
            className="self-start sm:self-auto"
            ariaLabel="Search mode"
            value={mode}
            onChange={(next) => (next === 'keyword' ? exitAi() : setMode('ai'))}
            options={[
              { value: 'keyword', label: 'Keyword', icon: <Search className="h-3.5 w-3.5" /> },
              { value: 'ai', label: 'AI search', icon: <Sparkles className="h-3.5 w-3.5" /> },
            ]}
          />
          {mode === 'keyword' ? (
            <KeywordSearch key={`search-${resetKey}`} value={filters.search} onChange={(search) => patchFilters({ search })} />
          ) : (
            <form
              className="flex min-w-0 flex-1 gap-2"
              onSubmit={(event) => {
                event.preventDefault()
                runAiSearch()
              }}
            >
              <Input
                value={aiDraft}
                onChange={(event) => setAiDraft(event.target.value)}
                placeholder="e.g. strong backend engineers with cloud infra experience"
                aria-label="Describe the candidates you are looking for"
                leading={<Sparkles className="h-4 w-4 text-violet-500" />}
                className="min-w-0 flex-1"
                autoFocus
              />
              <Button type="submit" variant="primary" loading={aiSearch.isPending} className="shrink-0">
                Search
              </Button>
            </form>
          )}
        </div>

        {mode === 'keyword' && (
          <div className="flex flex-wrap items-center gap-2">
            <Select
              aria-label="Sort by"
              value={filters.sort}
              onChange={(event) => {
                const sort = event.target.value as CandidateSort
                patchFilters({ sort, order: sort === 'name' ? 'asc' : 'desc' })
              }}
              className="w-48"
            >
              {SORT_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  Sort: {option.label}
                </option>
              ))}
            </Select>
            <Button
              iconOnly
              variant="secondary"
              onClick={() => patchFilters({ order: filters.order === 'desc' ? 'asc' : 'desc' })}
              aria-label={filters.order === 'desc' ? 'Sorted descending — switch to ascending' : 'Sorted ascending — switch to descending'}
              title={filters.order === 'desc' ? 'Descending' : 'Ascending'}
            >
              {filters.order === 'desc' ? <ArrowDownWideNarrow className="h-4 w-4" /> : <ArrowUpNarrowWide className="h-4 w-4" />}
            </Button>
            <Button
              variant={panelOpen ? 'soft' : 'secondary'}
              onClick={() => setFiltersOpen(!panelOpen)}
              aria-expanded={panelOpen}
              aria-controls="candidate-filters"
              icon={<SlidersHorizontal className="h-4 w-4" />}
            >
              Filters
              {panelCount > 0 && (
                <span className="rounded-full bg-indigo-600 px-1.5 text-xs font-semibold text-white tabular-nums">{panelCount}</span>
              )}
            </Button>
            <SmartActionsMenu jobId={job.id} facets={facets} disabled={analyzedTotal === 0} />
            <ButtonAnchor
              href={candidatesApi.exportUrl(job.id, query)}
              download
              variant="secondary"
              icon={<Download className="h-4 w-4" />}
              aria-disabled={analyzedTotal === 0 || undefined}
              title="Export the current filtered list as CSV"
            >
              <span className="hidden sm:inline">Export CSV</span>
            </ButtonAnchor>
          </div>
        )}
      </div>

      {mode === 'keyword' && panelOpen && (
        <div id="candidate-filters">
          <CandidateFiltersPanel job={job} filters={filters} onChange={patchFilters} onClear={clearAll} resetKey={resetKey} />
        </div>
      )}

      {showAi ? (
        <AISearchResults
          query={aiQuery}
          data={aiSearch.data}
          isPending={aiSearch.isPending}
          error={aiSearch.error}
          onRetry={() => aiSearch.mutate({ query: aiQuery, limit: 20 })}
          onBack={exitAi}
        />
      ) : mode === 'ai' ? (
        <Card>
          <EmptyState
            icon={<Sparkles />}
            title="Search candidates in plain English"
            description={`Describe who you're looking for — ${MODEL_LABEL} re-ranks the analyzed candidates by relevance and explains each match in one line.`}
            action={
              <div className="flex flex-wrap justify-center gap-2">
                {[
                  'Strong backend engineers with cloud infra experience',
                  'Has led a team and shipped production APIs',
                  'Fintech or payments background',
                ].map((example) => (
                  <button
                    key={example}
                    type="button"
                    onClick={() => setAiDraft(example)}
                    className="rounded-full border border-violet-200 bg-violet-50 px-3 py-1 text-xs font-medium text-violet-700 hover:bg-violet-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-500"
                  >
                    {example}
                  </button>
                ))}
              </div>
            }
          />
        </Card>
      ) : (
        <Card className="overflow-hidden">
          <div className="flex flex-col gap-3 border-b border-slate-200 px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
            <SegmentedControl<StatusFilter>
              ariaLabel="Filter by status"
              size="sm"
              value={statusValue}
              onChange={(value) => patchFilters({ status: value === 'all' ? null : value })}
              options={[
                {
                  value: 'all',
                  label: 'All',
                  count: statusCounts ? STATUS_ORDER.reduce((sum, s) => sum + statusCounts[s], 0) : undefined,
                },
                ...STATUS_ORDER.map((status) => ({
                  value: status,
                  label: STATUS_META[status].label,
                  count: statusCounts?.[status],
                })),
              ]}
            />
            <div className="flex items-center gap-3 text-sm text-slate-500">
              {list.isFetching && !list.isPending && <Loader2 className="h-4 w-4 animate-spin text-slate-400" aria-label="Refreshing" />}
              {list.data && (
                <span className="tabular-nums">
                  {pluralize(list.data.total, 'candidate')}
                  {hasAnyFilter(filters) ? ' match' : ''}
                </span>
              )}
              {hasAnyFilter(filters) && (
                <button type="button" onClick={clearAll} className="font-medium text-indigo-600 hover:text-indigo-700">
                  Clear filters
                </button>
              )}
            </div>
          </div>

          {list.isPending ? (
            <TableSkeleton />
          ) : list.isError ? (
            <div className="p-5">
              <ErrorState
                compact
                title="Couldn't load candidates"
                error={list.error}
                onRetry={() => void list.refetch()}
                retrying={list.isFetching}
              />
            </div>
          ) : analyzedTotal === 0 ? (
            progress?.is_processing ? (
              <EmptyState
                icon={<Loader2 className="animate-spin" />}
                title={`Analyzing ${pluralize(progress.total, 'resume')}…`}
                description="Candidates appear here as soon as each resume is scored — this list refreshes automatically."
                action={<ProgressBar value={progress.percent} className="w-64" animated label="Analysis progress" />}
              />
            ) : (progress?.failed ?? 0) > 0 ? (
              <EmptyState
                icon={<AlertTriangle />}
                title="No resumes could be analyzed"
                description="All uploads failed. Check the error messages and retry them from the Upload tab."
                action={
                  <Button variant="primary" onClick={onGoToUpload}>
                    Go to Upload
                  </Button>
                }
              />
            ) : (
              <EmptyState
                icon={<Users />}
                title="No analyzed candidates yet"
                description="Once resumes are processed they’ll be ranked here."
                action={
                  <Button variant="secondary" onClick={onGoToUpload} icon={<Upload className="h-4 w-4" />}>
                    Upload resumes
                  </Button>
                }
              />
            )
          ) : list.data.items.length === 0 ? (
            <EmptyState
              compact
              icon={<Search />}
              title="No candidates match these filters"
              description="Try lowering the minimum score, removing a skill, or clearing the filters."
              action={
                <>
                  <Button variant="secondary" onClick={clearAll}>
                    Clear filters
                  </Button>
                  {filters.page > 1 && (
                    <Button variant="ghost" onClick={() => patchFilters({ page: 1 })}>
                      Back to page 1
                    </Button>
                  )}
                </>
              }
            />
          ) : (
            <>
              <CandidateTable
                items={list.data.items}
                selected={selected}
                onToggle={toggleOne}
                onToggleAll={toggleAll}
                onStatusChange={changeStatus}
                pendingIds={pendingIds}
                stale={list.isPlaceholderData}
              />
              <div className="border-t border-slate-200 px-4 py-3">
                <Pagination
                  page={filters.page}
                  pageSize={CANDIDATE_PAGE_SIZE}
                  total={list.data.total}
                  onChange={(page) => {
                    patchFilters({ page })
                    window.scrollTo({ top: 0, behavior: 'smooth' })
                  }}
                />
              </div>
            </>
          )}
        </Card>
      )}

      {selected.size > 0 && !showAi && (
        <BulkActionBar
          count={selected.size}
          loading={bulk.isPending}
          pendingStatus={bulk.isPending ? (bulk.variables?.status ?? null) : null}
          onAction={bulkUpdate}
          onClear={() => setSelected(EMPTY_SET)}
        />
      )}
    </div>
  )
}

function BulkActionBar({
  count,
  loading,
  pendingStatus,
  onAction,
  onClear,
}: {
  count: number
  loading: boolean
  pendingStatus: CandidateStatus | null
  onAction: (status: CandidateStatus) => void
  onClear: () => void
}) {
  const actions: { status: CandidateStatus; label: string; icon: typeof Check; className: string }[] = [
    { status: 'shortlisted', label: `Shortlist (${count})`, icon: Check, className: 'bg-emerald-500 hover:bg-emerald-400 text-white' },
    { status: 'maybe', label: 'Maybe', icon: CircleHelp, className: 'bg-white/10 hover:bg-white/20 text-white' },
    { status: 'rejected', label: 'Reject', icon: X, className: 'bg-white/10 hover:bg-rose-500 text-white' },
  ]
  return (
    <div className="pointer-events-none fixed inset-x-0 bottom-4 z-40 flex justify-center px-4 lg:pl-64">
      <div
        className="pointer-events-auto flex max-w-full flex-wrap items-center gap-2 rounded-xl bg-slate-900 px-3 py-2 text-sm text-white shadow-2xl ring-1 ring-slate-900/10"
        role="toolbar"
        aria-label="Bulk actions for selected candidates"
      >
        <span className="px-1 font-medium tabular-nums">{formatNumber(count)} selected</span>
        <span className="h-5 w-px bg-white/20" aria-hidden />
        {actions.map(({ status, label, icon: Icon, className }) => (
          <button
            key={status}
            type="button"
            disabled={loading}
            onClick={() => onAction(status)}
            className={cn(
              'inline-flex h-8 items-center gap-1.5 rounded-lg px-3 font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/60 disabled:opacity-60',
              className,
            )}
          >
            {pendingStatus === status ? <Spinner className="h-3.5 w-3.5" /> : <Icon className="h-3.5 w-3.5" />}
            {label}
          </button>
        ))}
        <button
          type="button"
          onClick={onClear}
          className="inline-flex h-8 items-center gap-1 rounded-lg px-2 text-slate-300 hover:bg-white/10 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/60"
        >
          Clear
        </button>
      </div>
    </div>
  )
}

function TableSkeleton() {
  return (
    <div className="divide-y divide-slate-100" aria-busy="true" aria-label="Loading candidates">
      {Array.from({ length: 6 }, (_, index) => (
        <div key={index} className="flex items-center gap-4 px-4 py-4">
          <Skeleton className="h-4 w-4" />
          <Skeleton className="h-4 w-8" />
          <div className="flex-1 space-y-2">
            <Skeleton className="h-4 w-1/4" />
            <Skeleton className="h-3 w-1/3" />
          </div>
          <Skeleton className="h-10 w-10 rounded-full" />
          <Skeleton className="hidden h-4 w-16 md:block" />
          <Skeleton className="hidden h-4 w-24 md:block" />
          <Skeleton className="h-7 w-24" />
        </div>
      ))}
    </div>
  )
}

