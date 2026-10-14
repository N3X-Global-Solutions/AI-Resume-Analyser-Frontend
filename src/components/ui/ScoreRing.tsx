import type { MatchTier } from '../../api/types'
import { cn } from '../../lib/cn'
import { scoreTier, TIER_META } from '../../lib/constants'
import { formatScoreValue } from '../../lib/format'

export interface ScoreRingProps {
  score: number
  tier?: MatchTier
  size?: number
  strokeWidth?: number
  className?: string
  /** Show the "%" sign and a caption under the number (large rings, which also show one decimal). */
  caption?: string
}

export function ScoreRing({ score, tier, size = 44, strokeWidth, className, caption }: ScoreRingProps) {
  const resolvedTier = tier ?? scoreTier(score)
  const meta = TIER_META[resolvedTier]
  const stroke = strokeWidth ?? Math.max(3, Math.round(size / 11))
  const radius = (size - stroke) / 2
  const circumference = 2 * Math.PI * radius
  const clamped = Math.min(100, Math.max(0, score))
  const offset = circumference * (1 - clamped / 100)
  const large = size >= 96
  // Floored (never rounded up across a tier threshold); large rings show one decimal, e.g. "84.8".
  const display = formatScoreValue(clamped, large ? 1 : 0)

  return (
    <div
      className={cn('relative inline-flex shrink-0 items-center justify-center', className)}
      style={{ width: size, height: size }}
      role="img"
      aria-label={`Match score ${display} percent, ${meta.label}`}
    >
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className="-rotate-90">
        <circle cx={size / 2} cy={size / 2} r={radius} fill="none" stroke="#e2e8f0" strokeWidth={stroke} />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke={meta.stroke}
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          className="transition-[stroke-dashoffset] duration-700 ease-out"
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center leading-none">
        <span
          className={cn('font-semibold text-slate-900 tabular-nums', large ? 'text-3xl' : size >= 56 ? 'text-base' : 'text-xs')}
        >
          {display}
          {large && <span className="text-lg font-medium text-slate-400">%</span>}
        </span>
        {caption && large && <span className="mt-1 text-[11px] font-medium text-slate-500">{caption}</span>}
      </div>
    </div>
  )
}
