import { Briefcase, ClipboardList, Info, Pencil, Scale } from 'lucide-react'
import type { ReactNode } from 'react'
import type { Job } from '../../api/types'
import { MatchLevelIcon } from '../../components/MatchLevelIcon'
import { Badge, ButtonLink, Card, CardBody, CardHeader } from '../../components/ui'
import { cn } from '../../lib/cn'
import { CATEGORY_COLORS, CATEGORY_META, EDUCATION_LABELS, WORK_MODE_LABELS } from '../../lib/constants'
import { formatPercent, formatSalary, formatYears } from '../../lib/format'
import { computeEffectiveWeights } from '../../lib/scoring'

function Chips({ items, tone = 'indigo', empty }: { items: string[]; tone?: 'indigo' | 'neutral'; empty: string }) {
  if (items.length === 0) return <p className="text-sm text-slate-400">{empty}</p>
  return (
    <div className="flex flex-wrap gap-1.5">
      {items.map((item) => (
        <Badge key={item} tone={tone} size="md">
          {item}
        </Badge>
      ))}
    </div>
  )
}

function Row({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="grid grid-cols-1 gap-1.5 py-3 sm:grid-cols-[12rem_minmax(0,1fr)] sm:gap-4">
      <dt className="text-sm font-medium text-slate-500">{label}</dt>
      <dd className="min-w-0 text-sm text-slate-800">{children}</dd>
    </div>
  )
}

export function RequirementsTab({ job }: { job: Job }) {
  const rows = computeEffectiveWeights(job.scoring_weights, job)
  const salary = formatSalary(job.salary_min, job.salary_max, job.salary_currency)
  const experience =
    job.min_experience_years > 0
      ? job.max_experience_years !== null
        ? `${formatYears(job.min_experience_years)} – ${formatYears(job.max_experience_years)}`
        : `${formatYears(job.min_experience_years)}+`
      : job.max_experience_years !== null
        ? `Up to ${formatYears(job.max_experience_years)}`
        : 'No minimum'

  return (
    <div className="grid grid-cols-1 gap-6 xl:grid-cols-[minmax(0,1fr)_26rem]">
      <div className="space-y-6">
        <Card>
          <CardHeader
            title="What this job requires"
            description="Every resume is evaluated against these requirements, with evidence."
            icon={<ClipboardList className="h-4 w-4" />}
            actions={
              <ButtonLink to={`/jobs/${job.id}/edit`} size="sm" variant="secondary" icon={<Pencil className="h-3.5 w-3.5" />}>
                Edit
              </ButtonLink>
            }
          />
          <CardBody className="py-1">
            <dl className="divide-y divide-slate-100">
              <Row label="Required skills">
                <Chips items={job.required_skills} empty="None set" />
              </Row>
              <Row label="Preferred skills">
                <Chips items={job.preferred_skills} tone="neutral" empty="None set" />
              </Row>
              <Row label="Experience">{experience}</Row>
              <Row label="Relevant experience areas">
                <Chips items={job.relevant_experience_areas} tone="neutral" empty="None set" />
              </Row>
              <Row label="Education">
                {job.education_level === 'none' && job.education_fields.length === 0 ? (
                  <span className="text-slate-400">No requirement</span>
                ) : (
                  <div className="space-y-1.5">
                    <div className="flex flex-wrap items-center gap-2">
                      <span>{EDUCATION_LABELS[job.education_level]}</span>
                      <Badge tone={job.education_required ? 'rose' : 'neutral'}>
                        {job.education_required ? 'Required' : 'Preferred'}
                      </Badge>
                    </div>
                    {job.education_fields.length > 0 && (
                      <p className="text-slate-500">Fields: {job.education_fields.join(', ')}</p>
                    )}
                  </div>
                )}
              </Row>
              <Row label="Custom requirements">
                {job.custom_requirements?.trim() ? (
                  <p className="whitespace-pre-wrap">{job.custom_requirements}</p>
                ) : (
                  <span className="text-slate-400">None set</span>
                )}
              </Row>
            </dl>
          </CardBody>
        </Card>

        <Card>
          <CardHeader title="Job details" icon={<Briefcase className="h-4 w-4" />} />
          <CardBody className="py-1">
            <dl className="divide-y divide-slate-100">
              <Row label="Department">{job.department ?? <span className="text-slate-400">—</span>}</Row>
              <Row label="Location">{job.location ?? <span className="text-slate-400">—</span>}</Row>
              <Row label="Work mode">{job.work_mode ? WORK_MODE_LABELS[job.work_mode] : <span className="text-slate-400">—</span>}</Row>
              <Row label="Salary">{salary ?? <span className="text-slate-400">—</span>}</Row>
              <Row label="Description">
                {job.description?.trim() ? (
                  <p className="leading-relaxed whitespace-pre-wrap text-slate-700">{job.description}</p>
                ) : (
                  <span className="text-slate-400">—</span>
                )}
              </Row>
            </dl>
          </CardBody>
        </Card>
      </div>

      <Card className="h-fit">
        <CardHeader
          title="Scoring weights"
          description="Score = Σ category score × effective weight"
          icon={<Scale className="h-4 w-4" />}
        />
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-100 text-left text-xs font-medium text-slate-500">
                <th className="px-5 py-2 font-medium">Category</th>
                <th className="px-3 py-2 text-right font-medium">Weight</th>
                <th className="px-5 py-2 text-right font-medium">Effective</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {rows.map((row) => (
                <tr key={row.key} className={cn(!row.applicable && 'text-slate-400')}>
                  <td className="px-5 py-2.5">
                    <div className="flex items-center gap-2">
                      <span
                        className={cn('h-2.5 w-2.5 shrink-0 rounded-sm', CATEGORY_COLORS[row.key].dot, !row.applicable && 'opacity-30')}
                        aria-hidden
                      />
                      <span className={cn('font-medium', row.applicable ? 'text-slate-800' : 'text-slate-400')}>
                        {CATEGORY_META[row.key].label}
                      </span>
                    </div>
                    {!row.applicable && <div className="mt-0.5 pl-4.5 text-xs">{row.reason} — redistributed</div>}
                  </td>
                  <td className="px-3 py-2.5 text-right tabular-nums">{row.weight}</td>
                  <td className="px-5 py-2.5 text-right font-semibold tabular-nums">
                    {row.applicable ? formatPercent(row.effective, 1) : 'n/a'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="flex gap-2 border-t border-slate-100 px-5 py-3 text-xs leading-relaxed text-slate-500">
          <Info className="mt-0.5 h-3.5 w-3.5 shrink-0" aria-hidden />
          <span>
            Categories that don’t apply to this job are dropped and their weight is redistributed proportionally, so effective
            weights always add up to 100%. The AI only judges whether each requirement is met (met / partial / missing) — the
            app computes the score.
          </span>
        </div>
        <div className="flex flex-wrap gap-3 border-t border-slate-100 px-5 py-3 text-xs text-slate-500">
          <span className="inline-flex items-center gap-1">
            <MatchLevelIcon level="met" className="h-3.5 w-3.5" /> Met = 1.0
          </span>
          <span className="inline-flex items-center gap-1">
            <MatchLevelIcon level="partial" className="h-3.5 w-3.5" /> Partial = 0.5
          </span>
          <span className="inline-flex items-center gap-1">
            <MatchLevelIcon level="missing" className="h-3.5 w-3.5" /> Missing = 0
          </span>
        </div>
      </Card>
    </div>
  )
}
