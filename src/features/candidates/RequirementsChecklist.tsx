import { ChevronDown, ListChecks } from 'lucide-react'
import { useState } from 'react'
import type { Evaluation, MatchLevel, RequirementMatch } from '../../api/types'
import { MatchLevelIcon } from '../../components/MatchLevelIcon'
import { Card, CardHeader } from '../../components/ui'
import { cn } from '../../lib/cn'
import { MATCH_LEVEL_META } from '../../lib/constants'
import { formatYears } from '../../lib/format'

function ChecklistItem({ item }: { item: RequirementMatch }) {
  const [open, setOpen] = useState(false)
  const meta = MATCH_LEVEL_META[item.level]
  const hasEvidence = Boolean(item.evidence?.trim())
  return (
    <li className="py-2">
      <button
        type="button"
        onClick={() => hasEvidence && setOpen((value) => !value)}
        aria-expanded={hasEvidence ? open : undefined}
        disabled={!hasEvidence}
        className={cn(
          'flex w-full items-start gap-2.5 rounded-md text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500',
          hasEvidence ? 'cursor-pointer' : 'cursor-default',
        )}
      >
        <MatchLevelIcon level={item.level} className="mt-0.5" />
        <span className="min-w-0 flex-1">
          <span className="flex flex-wrap items-baseline gap-x-2">
            <span className="text-sm font-medium text-slate-800">{item.requirement}</span>
            <span className={cn('text-xs font-medium', meta.text)}>{meta.label}</span>
          </span>
          {hasEvidence && (
            <span className={cn('mt-0.5 block text-xs leading-relaxed text-slate-500', !open && 'line-clamp-1')}>
              {item.evidence}
            </span>
          )}
          {!hasEvidence && item.level === 'missing' && (
            <span className="mt-0.5 block text-xs text-slate-400">No evidence found in the resume</span>
          )}
        </span>
        {hasEvidence && (
          <ChevronDown className={cn('mt-0.5 h-4 w-4 shrink-0 text-slate-300 transition-transform', open && 'rotate-180')} aria-hidden />
        )}
      </button>
    </li>
  )
}

function countLevels(items: RequirementMatch[]): Record<MatchLevel, number> {
  return items.reduce(
    (acc, item) => ({ ...acc, [item.level]: acc[item.level] + 1 }),
    { met: 0, partial: 0, missing: 0 } as Record<MatchLevel, number>,
  )
}

function Group({ title, items }: { title: string; items: RequirementMatch[] }) {
  if (items.length === 0) return null
  const counts = countLevels(items)
  return (
    <section className="px-5 py-3">
      <div className="flex items-center justify-between gap-3">
        <h3 className="text-xs font-semibold tracking-wide text-slate-500 uppercase">{title}</h3>
        <span className="text-xs text-slate-500 tabular-nums">
          <span className="font-semibold text-emerald-600">{counts.met}</span> met
          {counts.partial > 0 && (
            <>
              {' '}
              · <span className="font-semibold text-amber-600">{counts.partial}</span> partial
            </>
          )}
          {counts.missing > 0 && (
            <>
              {' '}
              · <span className="font-semibold text-rose-600">{counts.missing}</span> missing
            </>
          )}
        </span>
      </div>
      <ul className="mt-1 divide-y divide-slate-50">
        {items.map((item, index) => (
          <ChecklistItem key={`${item.requirement}-${index}`} item={item} />
        ))}
      </ul>
    </section>
  )
}

export function RequirementsChecklist({ evaluation }: { evaluation: Evaluation }) {
  const exp = evaluation.experience
  const required =
    exp.required_max !== null ? `${formatYears(exp.required_min)}–${formatYears(exp.required_max)}` : `${formatYears(exp.required_min)}+`
  const showExperience = exp.required_min > 0 || exp.required_max !== null

  return (
    <Card>
      <CardHeader
        title="Requirements checklist"
        description="How the AI judged each requirement, with evidence from the resume. Click an item to read the full evidence."
        icon={<ListChecks className="h-4 w-4" />}
      />
      <div className="divide-y divide-slate-100">
        <Group title="Required skills" items={evaluation.required_skills} />
        <Group title="Preferred skills" items={evaluation.preferred_skills} />

        {(showExperience || evaluation.relevant_experience.length > 0) && (
          <section className="px-5 py-3">
            <h3 className="text-xs font-semibold tracking-wide text-slate-500 uppercase">Experience</h3>
            <ul className="mt-1 divide-y divide-slate-50">
              {showExperience && (
                <li className="flex items-start gap-2.5 py-2">
                  <MatchLevelIcon level={exp.meets ? 'met' : exp.candidate_years ? 'partial' : 'missing'} className="mt-0.5" />
                  <span className="text-sm text-slate-800">
                    <span className="font-semibold tabular-nums">{formatYears(exp.candidate_years)}</span>
                    <span className="text-slate-500"> total vs {required} required</span>
                    {evaluation.relevant_experience_years !== null && (
                      <span className="mt-0.5 block text-xs text-slate-500">
                        Relevant experience: {formatYears(evaluation.relevant_experience_years)}
                      </span>
                    )}
                  </span>
                </li>
              )}
            </ul>
            {evaluation.relevant_experience.length > 0 && (
              <>
                <p className="mt-2 text-xs font-medium text-slate-500">Relevant experience areas</p>
                <ul className="divide-y divide-slate-50">
                  {evaluation.relevant_experience.map((item, index) => (
                    <ChecklistItem key={`${item.requirement}-${index}`} item={item} />
                  ))}
                </ul>
              </>
            )}
          </section>
        )}

        {evaluation.education && (
          <section className="px-5 py-3">
            <h3 className="text-xs font-semibold tracking-wide text-slate-500 uppercase">Education</h3>
            <ul className="mt-1">
              <ChecklistItem item={evaluation.education} />
            </ul>
          </section>
        )}

        <Group title="Custom requirements" items={evaluation.custom_requirements} />
      </div>
    </Card>
  )
}
