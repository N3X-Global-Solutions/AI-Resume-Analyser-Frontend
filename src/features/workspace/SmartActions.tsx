import { CircleHelp, RotateCcw, Star, ThumbsDown, Wand2 } from 'lucide-react'
import { useState, type ReactNode } from 'react'
import { toast } from 'sonner'
import { useBulkStatus, useCandidateCount } from '../../api/hooks'
import type { BulkStatusRequest, CandidateFacets, CandidateStatus, MatchTier } from '../../api/types'
import { Checkbox, ConfirmDialog, DropdownMenu, Spinner, StatusBadge } from '../../components/ui'
import { STATUS_META, STATUS_ORDER, TIER_META } from '../../lib/constants'
import { formatNumber, pluralize } from '../../lib/format'

interface SmartAction {
  key: string
  label: string
  description: string
  icon: ReactNode
  status: CandidateStatus
  /** Tier boundaries match the score thresholds exactly (85 / 70 / 50). */
  tiers?: MatchTier[]
  /** Statuses affected when "keep my decisions" is off. */
  fromStatuses?: CandidateStatus[]
  tone: 'success' | 'primary' | 'danger'
  allowKeepDecisions: boolean
}

const ACTIONS: SmartAction[] = [
  {
    key: 'shortlist-strong',
    label: 'Shortlist all Strong matches',
    description: `${TIER_META.strong.label} · score ≥ 85%`,
    icon: <Star />,
    status: 'shortlisted',
    tiers: ['strong'],
    tone: 'success',
    allowKeepDecisions: true,
  },
  {
    key: 'maybe-good',
    label: 'Mark Good matches as Maybe',
    description: `${TIER_META.good.label} · score 70–84%`,
    icon: <CircleHelp />,
    status: 'maybe',
    tiers: ['good'],
    tone: 'primary',
    allowKeepDecisions: true,
  },
  {
    key: 'reject-low',
    label: 'Reject all below 50%',
    description: `${TIER_META.low.label} candidates`,
    icon: <ThumbsDown />,
    status: 'rejected',
    tiers: ['low'],
    tone: 'danger',
    allowKeepDecisions: true,
  },
  {
    key: 'reject-below-70',
    label: 'Reject all below 70%',
    description: 'Partial + Low matches',
    icon: <ThumbsDown />,
    status: 'rejected',
    tiers: ['partial', 'low'],
    tone: 'danger',
    allowKeepDecisions: true,
  },
  {
    key: 'reset',
    label: 'Reset every decision to New',
    description: 'Undo all shortlist / maybe / reject decisions',
    icon: <RotateCcw />,
    status: 'new',
    fromStatuses: ['shortlisted', 'maybe', 'rejected'],
    tone: 'danger',
    allowKeepDecisions: false,
  },
]

function SmartActionDialog({
  jobId,
  action,
  facets,
  onClose,
}: {
  jobId: string
  action: SmartAction
  facets: CandidateFacets | undefined
  onClose: () => void
}) {
  const [keepDecisions, setKeepDecisions] = useState(true)
  const bulk = useBulkStatus(jobId)
  // The backend only updates rows whose status actually changes, so never count (or target) candidates
  // already in the target status — the same list is sent as `current_statuses` so count and update match.
  const currentStatuses: CandidateStatus[] =
    action.allowKeepDecisions && keepDecisions
      ? ['new']
      : (action.fromStatuses ?? STATUS_ORDER.filter((status) => status !== action.status))

  const count = useCandidateCount(jobId, { tier: action.tiers, status: currentStatuses }, true)
  // Without a tier filter the job-wide status facets give the exact count if the count request fails.
  const fallback =
    facets && !action.tiers ? currentStatuses.reduce((sum, status) => sum + facets.status_counts[status], 0) : null
  const affected = count.data ?? fallback

  function confirm() {
    const body: BulkStatusRequest = {
      status: action.status,
      filter: {
        ...(action.tiers ? { tiers: action.tiers } : {}),
        current_statuses: currentStatuses,
      },
    }
    bulk.mutate(body, {
      onSuccess: (result) => {
        toast.success(`${pluralize(result.updated, 'candidate')} marked ${STATUS_META[action.status].label}`)
        onClose()
      },
    })
  }

  return (
    <ConfirmDialog
      open
      onClose={onClose}
      onConfirm={confirm}
      loading={bulk.isPending}
      tone={action.tone}
      title={action.label}
      confirmDisabled={affected === 0 || count.isPending}
      confirmLabel={
        affected === null || affected === undefined
          ? 'Apply'
          : `Update ${pluralize(affected, 'candidate')}`
      }
      description={action.description}
    >
      <div className="space-y-4">
        <div className="rounded-lg border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-700" aria-live="polite">
          {count.isPending ? (
            <span className="inline-flex items-center gap-2 text-slate-500">
              <Spinner /> Counting matching candidates…
            </span>
          ) : affected === 0 ? (
            <span>No candidates match — nothing to change.</span>
          ) : (
            <span className="flex flex-wrap items-center gap-1.5">
              <strong className="font-semibold text-slate-900 tabular-nums">
                {affected === null || affected === undefined ? 'Some' : formatNumber(affected)}
              </strong>
              {affected === 1 ? 'candidate' : 'candidates'} will be set to <StatusBadge status={action.status} />
            </span>
          )}
        </div>
        {action.allowKeepDecisions && (
          <Checkbox
            checked={keepDecisions}
            onChange={(event) => setKeepDecisions(event.target.checked)}
            label="Only change candidates still marked New (keep decisions I’ve already made)"
          />
        )}
        <p className="text-xs text-slate-500">Applies to all analyzed candidates in this job, not just the current page or filters.</p>
      </div>
    </ConfirmDialog>
  )
}

export function SmartActionsMenu({
  jobId,
  facets,
  disabled,
}: {
  jobId: string
  facets: CandidateFacets | undefined
  disabled?: boolean
}) {
  const [active, setActive] = useState<SmartAction | null>(null)
  return (
    <>
      <DropdownMenu
        disabled={disabled}
        label={
          <>
            <Wand2 className="h-4 w-4" /> <span className="hidden sm:inline">Smart actions</span>
          </>
        }
        ariaLabel="Smart bulk actions"
        menuClassName="w-72"
        sections={[
          {
            key: 'bulk',
            title: 'Bulk decisions by score',
            items: ACTIONS.filter((a) => a.key !== 'reset').map((action) => ({
              key: action.key,
              label: action.label,
              description: action.description,
              icon: action.icon,
              tone: action.tone === 'danger' ? 'danger' : 'default',
              onSelect: () => setActive(action),
            })),
          },
          {
            key: 'reset',
            items: ACTIONS.filter((a) => a.key === 'reset').map((action) => ({
              key: action.key,
              label: action.label,
              description: action.description,
              icon: action.icon,
              onSelect: () => setActive(action),
            })),
          },
        ]}
      />
      {active && <SmartActionDialog key={active.key} jobId={jobId} action={active} facets={facets} onClose={() => setActive(null)} />}
    </>
  )
}
