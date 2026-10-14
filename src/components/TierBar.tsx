import type { MatchTier, TierCounts } from '../api/types'
import { cn } from '../lib/cn'
import { TIER_META, TIER_ORDER } from '../lib/constants'
import { formatNumber } from '../lib/format'
import { SegmentedBar } from './ui'

function totalOf(counts: TierCounts): number {
  return counts.strong + counts.good + counts.partial + counts.low
}

/** Stacked Strong / Good / Partial / Low bar with an optional legend. */
export function TierBar({
  counts,
  size = 'sm',
  showLegend = true,
  className,
}: {
  counts: TierCounts
  size?: 'xs' | 'sm' | 'md' | 'lg'
  showLegend?: boolean
  className?: string
}) {
  const total = totalOf(counts)
  return (
    <div className={cn('space-y-2', className)}>
      <SegmentedBar
        size={size}
        segments={TIER_ORDER.map((tier) => ({
          key: tier,
          value: counts[tier],
          className: TIER_META[tier].bar,
          label: TIER_META[tier].label,
        }))}
        label={
          total > 0
            ? TIER_ORDER.map((tier) => `${TIER_META[tier].short}: ${counts[tier]}`).join(', ')
            : 'No analyzed candidates yet'
        }
      />
      {showLegend && (
        <div className="flex flex-wrap gap-x-3 gap-y-1 text-xs text-slate-500">
          {TIER_ORDER.map((tier) => (
            <span key={tier} className="inline-flex items-center gap-1.5">
              <span className={cn('h-2 w-2 rounded-full', TIER_META[tier].dot)} aria-hidden />
              {TIER_META[tier].short}
              <span className="font-semibold text-slate-700 tabular-nums">{formatNumber(counts[tier])}</span>
            </span>
          ))}
        </div>
      )}
    </div>
  )
}

/** Clickable tier chips ("Strong 18 · Good 31 …") used as a quick filter. */
export function TierChips({
  counts,
  selected,
  onToggle,
  className,
}: {
  counts: TierCounts
  selected: readonly MatchTier[]
  onToggle: (tier: MatchTier) => void
  className?: string
}) {
  return (
    <div className={cn('flex flex-wrap gap-2', className)} role="group" aria-label="Filter by match tier">
      {TIER_ORDER.map((tier) => {
        const meta = TIER_META[tier]
        const active = selected.includes(tier)
        return (
          <button
            key={tier}
            type="button"
            aria-pressed={active}
            onClick={() => onToggle(tier)}
            className={cn(
              'inline-flex items-center gap-2 rounded-lg border px-3 py-1.5 text-sm font-medium transition-all',
              'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:ring-offset-1',
              active
                ? cn(meta.soft, meta.border, 'shadow-sm ring-1 ring-inset', meta.badge)
                : 'border-slate-200 bg-white text-slate-600 hover:border-slate-300 hover:bg-slate-50',
            )}
            title={`${meta.label} (${meta.range})`}
          >
            <span className={cn('h-2 w-2 rounded-full', meta.dot)} aria-hidden />
            {meta.short}
            <span className={cn('tabular-nums', active ? 'font-semibold' : 'text-slate-400')}>{formatNumber(counts[tier])}</span>
          </button>
        )
      })}
    </div>
  )
}
