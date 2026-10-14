import { Calculator, Info } from 'lucide-react'
import type { Evaluation } from '../../api/types'
import { Card, CardBody, CardHeader, Tooltip } from '../../components/ui'
import { cn } from '../../lib/cn'
import { CATEGORY_COLORS, CATEGORY_META, CATEGORY_ORDER, TIER_META } from '../../lib/constants'
import { formatPercent, formatPoints, formatScore } from '../../lib/format'

export function ScoreBreakdown({ evaluation }: { evaluation: Evaluation }) {
  const byKey = new Map(evaluation.category_scores.map((category) => [category.key, category]))
  const categories = CATEGORY_ORDER.flatMap((key) => {
    const category = byKey.get(key)
    return category ? [category] : []
  })
  const applicable = categories.filter((category) => category.applicable)
  const sumPoints = applicable.reduce((sum, category) => sum + category.points, 0)
  const tier = TIER_META[evaluation.match_tier]
  const usesFallback = applicable.length === 0

  return (
    <Card>
      <CardHeader
        title="Score breakdown"
        description="Computed deterministically by the app — the AI only judges whether each requirement is met."
        icon={<Calculator className="h-4 w-4" />}
      />
      <CardBody className="space-y-5">
        {/* Stacked contribution bar */}
        <div>
          <div className="flex h-4 w-full overflow-hidden rounded-full bg-slate-100" role="img" aria-label="Score contribution by category">
            {applicable.map((category) =>
              category.points > 0 ? (
                <div
                  key={category.key}
                  className={cn('h-full', CATEGORY_COLORS[category.key].bar)}
                  style={{ width: `${category.points}%` }}
                  title={`${category.label}: ${formatPoints(category.points)} pts`}
                />
              ) : null,
            )}
          </div>
          <div className="mt-1.5 flex justify-between text-[11px] text-slate-400 tabular-nums">
            <span>0</span>
            <span>50</span>
            <span>70</span>
            <span>85</span>
            <span>100</span>
          </div>
        </div>

        <ul className="space-y-4">
          {categories.map((category) => {
            const label = category.label || CATEGORY_META[category.key].label
            if (!category.applicable) {
              return (
                <li key={category.key} className="flex items-start justify-between gap-4 opacity-70">
                  <div className="flex min-w-0 items-start gap-2.5">
                    <span className="mt-1.5 h-2.5 w-2.5 shrink-0 rounded-sm bg-slate-300" aria-hidden />
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-slate-500">{label}</p>
                      <p className="text-xs text-slate-400">Not applicable — weight redistributed</p>
                    </div>
                  </div>
                  <span className="shrink-0 text-xs text-slate-400 tabular-nums">weight {category.weight} → 0%</span>
                </li>
              )
            }
            const pct = Math.round(category.score * 100)
            return (
              <li key={category.key}>
                <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-0.5">
                  <div className="flex min-w-0 items-center gap-2.5">
                    <span className={cn('h-2.5 w-2.5 shrink-0 rounded-sm', CATEGORY_COLORS[category.key].dot)} aria-hidden />
                    <span className="text-sm font-medium text-slate-800">{label}</span>
                    <Tooltip
                      content={`Configured weight ${category.weight} → ${formatPercent(category.effective_weight, 1)} effective after redistribution`}
                    >
                      <span tabIndex={0} className="text-xs text-slate-400 tabular-nums">
                        {formatPercent(category.effective_weight, 1)} weight
                      </span>
                    </Tooltip>
                  </div>
                  <span className="text-sm text-slate-500 tabular-nums">
                    <span className="font-semibold text-slate-900">{formatPoints(category.points)}</span> /{' '}
                    {formatPoints(category.effective_weight)} pts
                  </span>
                </div>
                <div className="mt-1.5 flex items-center gap-3 pl-5">
                  <div className="h-2 flex-1 overflow-hidden rounded-full bg-slate-100">
                    <div
                      className={cn('h-full rounded-full transition-[width] duration-500', CATEGORY_COLORS[category.key].bar)}
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                  <span className="w-10 text-right text-xs font-medium text-slate-600 tabular-nums">{pct}%</span>
                </div>
                {category.detail && <p className="mt-1 pl-5 text-xs text-slate-500">{category.detail}</p>}
              </li>
            )
          })}
        </ul>

        <div className="rounded-lg border border-slate-200 bg-slate-50 px-4 py-3">
          <p className="text-xs font-medium tracking-wide text-slate-500 uppercase">Formula</p>
          <p className="mt-1 font-mono text-[13px] leading-relaxed text-slate-700">
            Score = Σ category score × effective weight
          </p>
          {usesFallback ? (
            <p className="mt-2 flex gap-1.5 text-xs text-slate-600">
              <Info className="mt-0.5 h-3.5 w-3.5 shrink-0" aria-hidden />
              No scoring category applies to this job, so the AI’s holistic fit score ({formatPercent(evaluation.overall_fit_score)}) is
              used as the match score.
            </p>
          ) : (
            <p className="mt-1 font-mono text-[13px] leading-relaxed break-words text-slate-700">
              ={' '}
              {applicable.map((category, index) => (
                <span key={category.key}>
                  {index > 0 && ' + '}
                  <span className="whitespace-nowrap">
                    {category.score.toFixed(2)}×{formatPoints(category.effective_weight)}
                  </span>
                </span>
              ))}{' '}
              = <span className={cn('font-semibold', tier.text)}>{formatPoints(sumPoints)}</span>
              <span className="text-slate-400"> → {formatScore(evaluation.match_score, 1)} ({tier.label})</span>
            </p>
          )}
          <p className="mt-2 text-xs text-slate-500">
            Requirement levels: met = 1.0 · partial = 0.5 · missing = 0. AI holistic fit (informational):{' '}
            {formatPercent(evaluation.overall_fit_score)}.
          </p>
        </div>
      </CardBody>
    </Card>
  )
}
