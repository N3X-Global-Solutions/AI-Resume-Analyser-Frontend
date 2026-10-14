import { cn } from '../../lib/cn'

export interface ProgressBarProps {
  /** 0..100 */
  value: number
  className?: string
  barClassName?: string
  size?: 'xs' | 'sm' | 'md' | 'lg'
  label?: string
  animated?: boolean
}

const HEIGHTS = { xs: 'h-1', sm: 'h-1.5', md: 'h-2.5', lg: 'h-3.5' } as const

export function ProgressBar({ value, className, barClassName, size = 'md', label, animated = false }: ProgressBarProps) {
  const clamped = Math.min(100, Math.max(0, value))
  return (
    <div
      role="progressbar"
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuenow={Math.round(clamped)}
      aria-label={label}
      className={cn('w-full overflow-hidden rounded-full bg-slate-100', HEIGHTS[size], className)}
    >
      <div
        className={cn(
          'h-full rounded-full transition-[width] duration-500 ease-out',
          barClassName ?? 'bg-indigo-600',
          animated && 'progress-stripes',
        )}
        style={{ width: `${clamped}%` }}
      />
    </div>
  )
}

export interface Segment {
  key: string
  value: number
  className: string
  label: string
}

/** Stacked bar of segments (values are absolute counts; widths are relative to `total`). */
export function SegmentedBar({
  segments,
  total,
  size = 'md',
  className,
  label,
}: {
  segments: Segment[]
  total?: number
  size?: 'xs' | 'sm' | 'md' | 'lg'
  className?: string
  label?: string
}) {
  const sum = total ?? segments.reduce((acc, segment) => acc + segment.value, 0)
  return (
    <div
      className={cn('flex w-full overflow-hidden rounded-full bg-slate-100', HEIGHTS[size], className)}
      role="img"
      aria-label={label ?? segments.map((segment) => `${segment.label}: ${segment.value}`).join(', ')}
    >
      {sum > 0 &&
        segments.map((segment) =>
          segment.value > 0 ? (
            <div
              key={segment.key}
              className={cn('h-full transition-[width] duration-500 ease-out first:rounded-l-full last:rounded-r-full', segment.className)}
              style={{ width: `${(segment.value / sum) * 100}%` }}
              title={`${segment.label}: ${segment.value}`}
            />
          ) : null,
        )}
    </div>
  )
}
