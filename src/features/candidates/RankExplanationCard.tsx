import { Minus, Plus, RefreshCw, Sparkles, Trophy } from 'lucide-react'
import { useState } from 'react'
import { errorMessage } from '../../api/client'
import { useRankExplanation, useRegenerateRankExplanation } from '../../api/hooks'
import { Button, Card, CardBody, CardHeader, Skeleton, Spinner } from '../../components/ui'
import { MODEL_LABEL } from '../../lib/constants'
import { formatRelative, formatScore } from '../../lib/format'

/** The LLM may already prefix bullets with "+" / "-" — we render our own icons. */
function cleanBullet(text: string): string {
  return text.replace(/^\s*[+\-–—•]\s*/, '')
}

export function RankExplanationCard({
  candidateId,
  rank,
  total,
}: {
  candidateId: string
  rank: number | null
  total: number
}) {
  const [requested, setRequested] = useState(false)
  const explanation = useRankExplanation(candidateId, requested)
  const regenerate = useRegenerateRankExplanation(candidateId)
  const title = rank !== null ? `Why ranked #${rank}?` : 'Why this ranking?'
  const loading = (requested && explanation.isPending) || regenerate.isPending

  return (
    <Card className="overflow-hidden">
      <CardHeader
        title={title}
        description={rank !== null ? `Out of ${total} analyzed candidates for this job` : undefined}
        icon={<Trophy className="h-4 w-4" />}
        actions={
          explanation.data && !regenerate.isPending ? (
            <Button
              size="sm"
              variant="ghost"
              onClick={() => regenerate.mutate()}
              icon={<RefreshCw className="h-3.5 w-3.5" />}
            >
              Regenerate
            </Button>
          ) : undefined
        }
      />
      <CardBody>
        {!requested ? (
          <div className="flex flex-col items-start gap-3 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-sm text-slate-600">
              Get a plain-English explanation of what puts this candidate at this position — what helped, what held them back, and
              how they compare with the top candidate.
            </p>
            <Button variant="soft" className="shrink-0" onClick={() => setRequested(true)} icon={<Sparkles className="h-4 w-4" />}>
              Explain this ranking
            </Button>
          </div>
        ) : loading ? (
          <div role="status" aria-live="polite" className="space-y-3">
            <p className="flex items-center gap-2 text-sm font-medium text-indigo-700">
              <Spinner /> Asking {MODEL_LABEL}…
            </p>
            <Skeleton className="h-3 w-3/4" />
            <Skeleton className="h-3 w-2/3" />
            <Skeleton className="h-3 w-1/2" />
          </div>
        ) : explanation.isError ? (
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between" role="alert">
            <p className="text-sm text-rose-700">Couldn’t generate the explanation: {errorMessage(explanation.error)}</p>
            <Button size="sm" variant="secondary" onClick={() => void explanation.refetch()}>
              Try again
            </Button>
          </div>
        ) : explanation.data ? (
          <div className="space-y-4">
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <div>
                <h4 className="text-xs font-semibold tracking-wide text-emerald-700 uppercase">What helped</h4>
                <ul className="mt-2 space-y-1.5">
                  {explanation.data.positives.length === 0 && <li className="text-sm text-slate-400">Nothing notable</li>}
                  {explanation.data.positives.map((item) => (
                    <li key={item} className="flex gap-2 text-sm text-slate-700">
                      <Plus className="mt-0.5 h-4 w-4 shrink-0 rounded-full bg-emerald-100 p-0.5 text-emerald-700" aria-label="Positive" />
                      <span>{cleanBullet(item)}</span>
                    </li>
                  ))}
                </ul>
              </div>
              <div>
                <h4 className="text-xs font-semibold tracking-wide text-rose-700 uppercase">What held them back</h4>
                <ul className="mt-2 space-y-1.5">
                  {explanation.data.negatives.length === 0 && <li className="text-sm text-slate-400">Nothing notable</li>}
                  {explanation.data.negatives.map((item) => (
                    <li key={item} className="flex gap-2 text-sm text-slate-700">
                      <Minus className="mt-0.5 h-4 w-4 shrink-0 rounded-full bg-rose-100 p-0.5 text-rose-700" aria-label="Negative" />
                      <span>{cleanBullet(item)}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
            {explanation.data.comparison && (
              <div className="rounded-lg border border-indigo-100 bg-indigo-50/50 px-4 py-3">
                <p className="text-xs font-semibold tracking-wide text-indigo-700 uppercase">
                  {explanation.data.rank === 1 ? 'Compared with #2' : 'Compared with #1'}
                </p>
                <p className="mt-1 text-sm leading-relaxed text-slate-700">{explanation.data.comparison}</p>
              </div>
            )}
            <p className="text-sm leading-relaxed text-slate-700">{explanation.data.narrative}</p>
            <p className="text-xs text-slate-400">
              Generated {formatRelative(explanation.data.generated_at)} by {MODEL_LABEL}
              {explanation.data.cached ? ' · cached' : ''} · rank #{explanation.data.rank} of {explanation.data.total} at{' '}
              {formatScore(explanation.data.match_score)}
            </p>
          </div>
        ) : null}
      </CardBody>
    </Card>
  )
}
