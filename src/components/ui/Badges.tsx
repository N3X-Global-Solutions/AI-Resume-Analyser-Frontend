import type { CandidateStatus, MatchTier, ProcessingStatus } from '../../api/types'
import { cn } from '../../lib/cn'
import { PROCESSING_META, STATUS_META, TIER_META } from '../../lib/constants'
import { formatScore } from '../../lib/format'
import { Badge } from './Badge'
import { Spinner } from './Spinner'

export function TierBadge({
  tier,
  short = false,
  size = 'sm',
  className,
}: {
  tier: MatchTier
  short?: boolean
  size?: 'sm' | 'md'
  className?: string
}) {
  const meta = TIER_META[tier]
  return (
    <Badge colorClassName={meta.badge} dotClassName={meta.dot} size={size} className={className}>
      {short ? meta.short : meta.label}
    </Badge>
  )
}

export function ScoreBadge({ score, tier, className }: { score: number; tier: MatchTier; className?: string }) {
  const meta = TIER_META[tier]
  return (
    <span
      className={cn(
        'inline-flex h-7 min-w-12 items-center justify-center rounded-md px-2 text-sm font-semibold tabular-nums ring-1 ring-inset',
        meta.badge,
        className,
      )}
      title={`${meta.label} (${meta.range})`}
    >
      {formatScore(score)}
    </span>
  )
}

export function StatusBadge({ status, className }: { status: CandidateStatus; className?: string }) {
  const meta = STATUS_META[status]
  return (
    <Badge colorClassName={meta.badge} dotClassName={meta.dot} className={className}>
      {meta.label}
    </Badge>
  )
}

export function ProcessingBadge({ status, className }: { status: ProcessingStatus; className?: string }) {
  const meta = PROCESSING_META[status]
  return (
    <Badge colorClassName={meta.badge} className={className}>
      {status === 'processing' ? (
        <Spinner className="h-3 w-3" />
      ) : (
        <span className={cn('h-1.5 w-1.5 rounded-full', meta.dot)} aria-hidden />
      )}
      {meta.label}
    </Badge>
  )
}
