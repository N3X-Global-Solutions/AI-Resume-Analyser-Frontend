import { ArrowLeft, ChevronRight, SearchX, Sparkles } from 'lucide-react'
import { Link } from 'react-router-dom'
import type { AISearchResponse } from '../../api/types'
import { Button, EmptyState, ErrorState, ScoreBadge, Skeleton, Spinner, StatusBadge } from '../../components/ui'
import { cn } from '../../lib/cn'
import { MODEL_LABEL, TIER_META } from '../../lib/constants'
import { displayName, formatNumber, formatPercent, formatYears, pluralize } from '../../lib/format'

/** "Searched 150 of 312 candidates" when the AI only considered part of the job, else "Searched all 40 candidates". */
function searchedNote({ searched, total }: AISearchResponse): string | null {
  if (!total) return null
  if (searched < total) return `Searched ${formatNumber(searched)} of ${pluralize(total, 'candidate')}`
  return total === 1 ? 'Searched 1 candidate' : `Searched all ${pluralize(total, 'candidate')}`
}

export function AISearchResults({
  query,
  data,
  isPending,
  error,
  onRetry,
  onBack,
}: {
  query: string
  data: AISearchResponse | undefined
  isPending: boolean
  error: unknown
  onRetry: () => void
  onBack: () => void
}) {
  const note = data && !isPending && !error ? searchedNote(data) : null
  return (
    <div className="overflow-hidden rounded-xl border border-violet-200 bg-white shadow-xs">
      <div className="flex flex-col gap-3 border-b border-violet-100 bg-linear-to-r from-violet-50 to-indigo-50/60 px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="min-w-0">
          <div className="flex items-center gap-2 text-xs font-semibold tracking-wide text-violet-700 uppercase">
            <Sparkles className="h-3.5 w-3.5" /> AI search results · ranked by {MODEL_LABEL} relevance
          </div>
          <p className="mt-1 truncate text-sm text-slate-700">
            “<span className="font-medium text-slate-900">{query}</span>”
          </p>
          {note && <p className="mt-0.5 text-xs text-slate-500">{note}</p>}
        </div>
        <Button size="sm" variant="secondary" onClick={onBack} icon={<ArrowLeft className="h-3.5 w-3.5" />}>
          Back to ranking
        </Button>
      </div>

      {isPending ? (
        <div className="space-y-0 divide-y divide-slate-100" role="status" aria-live="polite">
          <div className="flex items-center gap-2 px-5 py-3 text-sm font-medium text-violet-700">
            <Spinner /> {MODEL_LABEL} is reading your candidates and judging relevance…
          </div>
          {[0, 1, 2, 3].map((key) => (
            <div key={key} className="flex items-center gap-4 px-5 py-4">
              <Skeleton className="h-10 w-14" />
              <div className="flex-1 space-y-2">
                <Skeleton className="h-4 w-1/3" />
                <Skeleton className="h-3 w-2/3" />
              </div>
            </div>
          ))}
        </div>
      ) : error ? (
        <div className="p-5">
          <ErrorState compact title="AI search failed" error={error} onRetry={onRetry} />
        </div>
      ) : !data || data.items.length === 0 ? (
        <EmptyState
          compact
          icon={<SearchX />}
          title="No relevant candidates found"
          description="Try describing the profile differently, or go back to the ranking and use filters."
        />
      ) : (
        <ol className="divide-y divide-slate-100">
          {data.items.map(({ candidate, relevance, reason }) => {
            const pct = Math.min(100, Math.max(0, relevance))
            return (
              <li key={candidate.id}>
                <Link
                  to={`/candidates/${candidate.id}`}
                  className="group flex items-start gap-4 px-5 py-4 transition-colors hover:bg-slate-50 focus-visible:bg-slate-50 focus-visible:outline-none"
                >
                  <div className="w-16 shrink-0 text-center">
                    <div className="text-lg font-semibold text-violet-700 tabular-nums">{formatPercent(pct)}</div>
                    <div className="mx-auto mt-1 h-1.5 w-12 overflow-hidden rounded-full bg-violet-100">
                      <div className="h-full rounded-full bg-violet-500" style={{ width: `${pct}%` }} />
                    </div>
                    <div className="mt-1 text-[10px] font-medium tracking-wide text-slate-400 uppercase">relevance</div>
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-semibold text-slate-900 group-hover:text-indigo-700">{displayName(candidate.name)}</span>
                      {candidate.rank !== null && <span className="text-xs text-slate-400 tabular-nums">Rank #{candidate.rank}</span>}
                      <StatusBadge status={candidate.status} />
                    </div>
                    <p className="truncate text-sm text-slate-600">
                      {[candidate.headline, formatYears(candidate.total_experience_years), candidate.location].filter(Boolean).join(' · ')}
                    </p>
                    <p className="mt-1.5 flex gap-1.5 text-sm text-slate-700">
                      <Sparkles className="mt-0.5 h-3.5 w-3.5 shrink-0 text-violet-500" aria-hidden />
                      <span>{reason}</span>
                    </p>
                  </div>
                  <div className="flex shrink-0 items-center gap-2">
                    <div className="text-right">
                      <ScoreBadge score={candidate.match_score} tier={candidate.match_tier} />
                      <div className={cn('mt-1 text-[11px] font-medium', TIER_META[candidate.match_tier].text)}>
                        {TIER_META[candidate.match_tier].short}
                      </div>
                    </div>
                    <ChevronRight className="h-4 w-4 text-slate-300 group-hover:text-indigo-500" aria-hidden />
                  </div>
                </Link>
              </li>
            )
          })}
        </ol>
      )}
    </div>
  )
}
