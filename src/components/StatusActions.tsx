import { Check, CircleHelp, RotateCcw, X } from 'lucide-react'
import type { CandidateStatus } from '../api/types'
import { cn } from '../lib/cn'
import { STATUS_META } from '../lib/constants'
import { Tooltip } from './ui'

const QUICK: { status: CandidateStatus; icon: typeof Check }[] = [
  { status: 'shortlisted', icon: Check },
  { status: 'maybe', icon: CircleHelp },
  { status: 'rejected', icon: X },
]

/** Compact icon toggles (shortlist / maybe / reject). Clicking the active one resets to New. */
export function StatusQuickActions({
  status,
  onChange,
  disabled,
  candidateName,
  className,
}: {
  status: CandidateStatus
  onChange: (status: CandidateStatus) => void
  disabled?: boolean
  candidateName: string
  className?: string
}) {
  return (
    <div
      className={cn('inline-flex items-center gap-0.5 rounded-lg bg-slate-50 p-0.5 ring-1 ring-slate-200 ring-inset', className)}
      role="group"
      aria-label={`Status for ${candidateName}`}
    >
      {QUICK.map(({ status: target, icon: Icon }) => {
        const active = status === target
        const meta = STATUS_META[target]
        const label = active ? `${meta.label} — click to reset to New` : meta.action
        return (
          <Tooltip key={target} content={label}>
            <button
              type="button"
              disabled={disabled}
              aria-pressed={active}
              aria-label={`${label}: ${candidateName}`}
              onClick={(event) => {
                event.stopPropagation()
                onChange(active ? 'new' : target)
              }}
              className={cn(
                'inline-flex h-7 w-7 items-center justify-center rounded-md transition-colors',
                'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 disabled:opacity-50',
                active ? meta.active : cn('text-slate-400', meta.hover),
              )}
            >
              <Icon className="h-4 w-4" />
            </button>
          </Tooltip>
        )
      })}
    </div>
  )
}

const FULL: { status: CandidateStatus; icon: typeof Check }[] = [
  { status: 'shortlisted', icon: Check },
  { status: 'maybe', icon: CircleHelp },
  { status: 'rejected', icon: X },
  { status: 'new', icon: RotateCcw },
]

/** Labelled status buttons for the candidate detail page. */
export function StatusButtons({
  status,
  onChange,
  pendingStatus,
  className,
}: {
  status: CandidateStatus
  onChange: (status: CandidateStatus) => void
  pendingStatus?: CandidateStatus | null
  className?: string
}) {
  return (
    <div className={cn('flex flex-wrap gap-2', className)} role="group" aria-label="Candidate decision">
      {FULL.map(({ status: target, icon: Icon }) => {
        const active = status === target
        const meta = STATUS_META[target]
        if (target === 'new' && status === 'new') return null
        return (
          <button
            key={target}
            type="button"
            aria-pressed={active}
            disabled={Boolean(pendingStatus)}
            onClick={() => onChange(target)}
            className={cn(
              'inline-flex h-9 items-center gap-2 rounded-lg px-3.5 text-sm font-medium transition-colors',
              'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:ring-offset-1 disabled:opacity-60',
              active
                ? cn(meta.active, 'shadow-sm')
                : target === 'new'
                  ? 'text-slate-600 hover:bg-slate-100'
                  : cn('bg-white text-slate-700 shadow-sm ring-1 ring-slate-300 ring-inset', meta.hover),
            )}
          >
            <Icon className={cn('h-4 w-4', pendingStatus === target && 'animate-pulse')} />
            {active ? meta.label : meta.action}
          </button>
        )
      })}
    </div>
  )
}
