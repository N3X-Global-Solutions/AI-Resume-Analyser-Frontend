import { Info, RotateCcw } from 'lucide-react'
import type { CategoryKey, ScoringWeights } from '../../api/types'
import { Button } from '../../components/ui'
import { cn } from '../../lib/cn'
import { CATEGORY_COLORS, CATEGORY_META, DEFAULT_WEIGHTS } from '../../lib/constants'
import { formatPercent } from '../../lib/format'
import { computeEffectiveWeights, weightsTotal, type RequirementShape } from '../../lib/scoring'

export interface WeightsEditorProps {
  weights: ScoringWeights
  onChange: (weights: ScoringWeights) => void
  requirements: RequirementShape
  error?: string
}

export function WeightsEditor({ weights, onChange, requirements, error }: WeightsEditorProps) {
  const rows = computeEffectiveWeights(weights, requirements)
  const total = weightsTotal(weights)
  const isDefault = (Object.keys(DEFAULT_WEIGHTS) as CategoryKey[]).every((key) => DEFAULT_WEIGHTS[key] === weights[key])
  const anyNotApplicable = rows.some((row) => !row.applicable && row.weight > 0)

  function setWeight(key: CategoryKey, raw: number) {
    const value = Number.isFinite(raw) ? Math.min(100, Math.max(0, Math.round(raw))) : 0
    onChange({ ...weights, [key]: value })
  }

  return (
    <div className="space-y-5">
      {/* Effective distribution preview */}
      <div>
        <div className="mb-2 flex items-center justify-between text-xs text-slate-500">
          <span>Effective weight distribution for this job</span>
          <span className="tabular-nums">Configured total: {total}</span>
        </div>
        <div className="flex h-3 w-full overflow-hidden rounded-full bg-slate-100" role="img" aria-label="Effective weight distribution">
          {rows.map((row) =>
            row.effective > 0 ? (
              <div
                key={row.key}
                className={cn('h-full transition-[width] duration-300', CATEGORY_COLORS[row.key].bar)}
                style={{ width: `${row.effective}%` }}
                title={`${CATEGORY_META[row.key].label}: ${formatPercent(row.effective, 1)}`}
              />
            ) : null,
          )}
        </div>
      </div>

      <div className="divide-y divide-slate-100 rounded-lg border border-slate-200">
        {rows.map((row) => {
          const meta = CATEGORY_META[row.key]
          const inputId = `weight-${row.key}`
          return (
            <div
              key={row.key}
              className={cn(
                'grid grid-cols-1 gap-3 px-4 py-3 sm:grid-cols-[minmax(0,13rem)_minmax(0,1fr)_auto] sm:items-center sm:gap-5',
                !row.applicable && 'bg-slate-50/70',
              )}
            >
              <div className="min-w-0">
                <label htmlFor={inputId} className="flex items-center gap-2 text-sm font-medium text-slate-800">
                  <span className={cn('h-2.5 w-2.5 rounded-sm', CATEGORY_COLORS[row.key].dot, !row.applicable && 'opacity-40')} aria-hidden />
                  {meta.label}
                </label>
                <p className="mt-0.5 text-xs text-slate-500">{row.applicable ? meta.description : `${row.reason} — weight redistributed`}</p>
              </div>
              <div className="flex items-center gap-3">
                <input
                  type="range"
                  min={0}
                  max={100}
                  step={1}
                  value={weights[row.key]}
                  onChange={(event) => setWeight(row.key, Number(event.target.value))}
                  className="h-2 w-full"
                  aria-label={`${meta.label} weight`}
                />
                <input
                  id={inputId}
                  type="number"
                  min={0}
                  max={100}
                  inputMode="numeric"
                  value={weights[row.key]}
                  onChange={(event) => setWeight(row.key, Number(event.target.value))}
                  className="h-8 w-16 rounded-md border-0 px-2 text-right text-sm tabular-nums shadow-sm ring-1 ring-slate-300 ring-inset focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                />
              </div>
              <div className="flex items-baseline justify-end gap-1 sm:w-24">
                {row.applicable ? (
                  <>
                    <span className="text-base font-semibold text-slate-900 tabular-nums">{formatPercent(row.effective, 1)}</span>
                    <span className="text-xs text-slate-400">effective</span>
                  </>
                ) : (
                  <span className="text-xs font-medium text-slate-400">Not applicable</span>
                )}
              </div>
            </div>
          )
        })}
      </div>

      {error && (
        <p className="text-sm font-medium text-rose-600" role="alert">
          {error}
        </p>
      )}

      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <p className="flex max-w-2xl gap-2 text-xs leading-relaxed text-slate-500">
          <Info className="mt-0.5 h-3.5 w-3.5 shrink-0 text-slate-400" aria-hidden />
          <span>
            Weights are relative — they don’t need to add up to 100. Categories that don’t apply to this job
            {anyNotApplicable ? ' (greyed out above)' : ''} are dropped automatically and their weight is redistributed
            proportionally. Score = Σ category score × effective weight. Changing only the weights re-scores every candidate
            instantly, without re-running the AI.
          </span>
        </p>
        <Button
          size="sm"
          variant="ghost"
          onClick={() => onChange({ ...DEFAULT_WEIGHTS })}
          disabled={isDefault}
          icon={<RotateCcw className="h-3.5 w-3.5" />}
        >
          Reset to default
        </Button>
      </div>
    </div>
  )
}
