import { ChevronRight, Mail, MapPin } from 'lucide-react'
import { Link, useNavigate } from 'react-router-dom'
import type { CandidateListItem, CandidateStatus } from '../../api/types'
import { StatusQuickActions } from '../../components/StatusActions'
import { Checkbox, ScoreRing, Tooltip } from '../../components/ui'
import { cn } from '../../lib/cn'
import { TIER_META } from '../../lib/constants'
import { displayName, formatYears } from '../../lib/format'

export interface CandidateTableProps {
  items: CandidateListItem[]
  selected: ReadonlySet<string>
  onToggle: (id: string) => void
  onToggleAll: (checked: boolean) => void
  onStatusChange: (candidate: CandidateListItem, status: CandidateStatus) => void
  pendingIds: ReadonlySet<string>
  /** Dim the table while a new page / filter is loading. */
  stale?: boolean
}

function RequiredSkillsCell({ candidate }: { candidate: CandidateListItem }) {
  const { matched_required: matched, total_required: total, missing_required: missing } = candidate
  if (total === 0) return <span className="text-sm text-slate-400">—</span>
  const ratio = matched / total
  const shown = missing.slice(0, 2)
  const rest = missing.length - shown.length
  return (
    <div className="min-w-0 space-y-1.5">
      <div className="flex items-center gap-2">
        <span className="text-sm font-semibold text-slate-800 tabular-nums">
          {matched}/{total}
        </span>
        <div className="h-1.5 w-12 overflow-hidden rounded-full bg-slate-100" aria-hidden>
          <div
            className={cn('h-full rounded-full', ratio >= 0.8 ? 'bg-emerald-500' : ratio >= 0.5 ? 'bg-amber-400' : 'bg-rose-500')}
            style={{ width: `${ratio * 100}%` }}
          />
        </div>
      </div>
      {missing.length > 0 && (
        <div className="flex flex-wrap gap-1">
          {shown.map((skill) => (
            <span
              key={skill}
              className="inline-flex max-w-[9rem] truncate rounded bg-rose-50 px-1.5 py-0.5 text-[11px] font-medium text-rose-700 line-through decoration-rose-300"
              title={`Missing: ${skill}`}
            >
              {skill}
            </span>
          ))}
          {rest > 0 && (
            <Tooltip content={`Also missing: ${missing.slice(2).join(', ')}`}>
              <span tabIndex={0} className="rounded bg-slate-100 px-1.5 py-0.5 text-[11px] font-medium text-slate-600">
                +{rest}
              </span>
            </Tooltip>
          )}
        </div>
      )}
    </div>
  )
}

function ScoreCell({ candidate }: { candidate: CandidateListItem }) {
  const meta = TIER_META[candidate.match_tier]
  return (
    <div className="flex items-center gap-2.5">
      <ScoreRing score={candidate.match_score} tier={candidate.match_tier} size={40} />
      <span className={cn('text-xs font-semibold', meta.text)}>{meta.short}</span>
    </div>
  )
}

export function CandidateTable({
  items,
  selected,
  onToggle,
  onToggleAll,
  onStatusChange,
  pendingIds,
  stale = false,
}: CandidateTableProps) {
  const navigate = useNavigate()
  const allSelected = items.length > 0 && items.every((item) => selected.has(item.id))
  const someSelected = items.some((item) => selected.has(item.id))

  return (
    <div className={cn('transition-opacity', stale && 'opacity-60')}>
      {/* Desktop / tablet table */}
      <div className="hidden overflow-x-auto md:block">
        <table className="w-full min-w-[820px] text-left text-sm">
          <thead>
            <tr className="border-b border-slate-200 bg-slate-50/80 text-xs font-medium tracking-wide text-slate-500 uppercase">
              <th scope="col" className="w-10 py-2.5 pr-2 pl-4">
                <Checkbox
                  checked={allSelected}
                  indeterminate={!allSelected && someSelected}
                  onChange={(event) => onToggleAll(event.target.checked)}
                  aria-label="Select all candidates on this page"
                />
              </th>
              <th scope="col" className="w-14 px-2 py-2.5">
                Rank
              </th>
              <th scope="col" className="px-2 py-2.5">
                Candidate
              </th>
              <th scope="col" className="w-32 px-2 py-2.5">
                Score
              </th>
              <th scope="col" className="w-24 px-2 py-2.5">
                Experience
              </th>
              <th scope="col" className="w-48 px-2 py-2.5">
                Required skills
              </th>
              <th scope="col" className="w-32 px-2 py-2.5">
                Status
              </th>
              <th scope="col" className="w-10 py-2.5 pr-4 pl-2">
                <span className="sr-only">Open</span>
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {items.map((candidate) => {
              const isSelected = selected.has(candidate.id)
              const name = displayName(candidate.name)
              return (
                <tr
                  key={candidate.id}
                  onClick={() => navigate(`/candidates/${candidate.id}`)}
                  className={cn('group cursor-pointer transition-colors', isSelected ? 'bg-indigo-50/60' : 'hover:bg-slate-50')}
                >
                  <td className="py-3 pr-2 pl-4" onClick={(event) => event.stopPropagation()}>
                    <Checkbox checked={isSelected} onChange={() => onToggle(candidate.id)} aria-label={`Select ${name}`} />
                  </td>
                  <td className="px-2 py-3 text-sm font-semibold text-slate-500 tabular-nums">
                    {candidate.rank !== null ? `#${candidate.rank}` : '—'}
                  </td>
                  <td className="max-w-0 px-2 py-3">
                    <Link
                      to={`/candidates/${candidate.id}`}
                      onClick={(event) => event.stopPropagation()}
                      className="block truncate font-semibold text-slate-900 group-hover:text-indigo-700 focus-visible:outline-none focus-visible:underline"
                    >
                      {name}
                    </Link>
                    {candidate.headline && <p className="truncate text-sm text-slate-600">{candidate.headline}</p>}
                    <p className="flex min-w-0 items-center gap-3 truncate text-xs text-slate-400">
                      {candidate.location && (
                        <span className="inline-flex min-w-0 items-center gap-1 truncate">
                          <MapPin className="h-3 w-3 shrink-0" aria-hidden />
                          {candidate.location}
                        </span>
                      )}
                      {candidate.email && (
                        <span className="inline-flex min-w-0 items-center gap-1 truncate">
                          <Mail className="h-3 w-3 shrink-0" aria-hidden />
                          {candidate.email}
                        </span>
                      )}
                    </p>
                  </td>
                  <td className="px-2 py-3">
                    <ScoreCell candidate={candidate} />
                  </td>
                  <td className="px-2 py-3 text-sm whitespace-nowrap text-slate-700 tabular-nums">
                    {formatYears(candidate.total_experience_years)}
                  </td>
                  <td className="px-2 py-3">
                    <RequiredSkillsCell candidate={candidate} />
                  </td>
                  <td className="px-2 py-3" onClick={(event) => event.stopPropagation()}>
                    <StatusQuickActions
                      status={candidate.status}
                      candidateName={name}
                      disabled={pendingIds.has(candidate.id)}
                      onChange={(status) => onStatusChange(candidate, status)}
                    />
                  </td>
                  <td className="py-3 pr-4 pl-2 text-slate-300 group-hover:text-indigo-500">
                    <ChevronRight className="h-4 w-4" aria-hidden />
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>

      {/* Phone cards */}
      <ul className="divide-y divide-slate-100 md:hidden">
        {items.map((candidate) => {
          const isSelected = selected.has(candidate.id)
          const name = displayName(candidate.name)
          return (
            <li key={candidate.id} className={cn('flex gap-3 px-4 py-4', isSelected && 'bg-indigo-50/60')}>
              <div className="pt-1">
                <Checkbox checked={isSelected} onChange={() => onToggle(candidate.id)} aria-label={`Select ${name}`} />
              </div>
              <div className="min-w-0 flex-1 space-y-2.5">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <Link to={`/candidates/${candidate.id}`} className="block truncate font-semibold text-slate-900">
                      <span className="mr-1.5 text-slate-400 tabular-nums">#{candidate.rank ?? '—'}</span>
                      {name}
                    </Link>
                    {candidate.headline && <p className="truncate text-sm text-slate-600">{candidate.headline}</p>}
                    <p className="truncate text-xs text-slate-400">
                      {[candidate.location, formatYears(candidate.total_experience_years)].filter(Boolean).join(' · ')}
                    </p>
                  </div>
                  <ScoreCell candidate={candidate} />
                </div>
                <div className="flex items-end justify-between gap-3">
                  <RequiredSkillsCell candidate={candidate} />
                  <StatusQuickActions
                    status={candidate.status}
                    candidateName={name}
                    disabled={pendingIds.has(candidate.id)}
                    onChange={(status) => onStatusChange(candidate, status)}
                  />
                </div>
              </div>
            </li>
          )
        })}
      </ul>
    </div>
  )
}
