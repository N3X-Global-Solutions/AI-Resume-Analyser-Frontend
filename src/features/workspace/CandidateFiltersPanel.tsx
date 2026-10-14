import { Check, X } from 'lucide-react'
import { useState } from 'react'
import type { EducationLevel, Job } from '../../api/types'
import { Button, Field, Input, SegmentedControl, Select, TagInput } from '../../components/ui'
import { useDebouncedCallback } from '../../hooks/useDebouncedCallback'
import { cn } from '../../lib/cn'
import { EDUCATION_LABELS, EDUCATION_ORDER } from '../../lib/constants'
import type { CandidateFilters } from './candidateFilters'

const SCORE_PRESETS = [
  { value: '0', label: 'Any' },
  { value: '50', label: '50+' },
  { value: '70', label: '70+' },
  { value: '85', label: '85+' },
] as const

type ScorePreset = (typeof SCORE_PRESETS)[number]['value']

const EXPERIENCE_PRESETS = [1, 2, 3, 5, 7, 10]

function LocationInput({ value, onChange }: { value: string; onChange: (value: string) => void }) {
  const [draft, setDraft] = useState(value)
  const debounced = useDebouncedCallback(onChange, 400)
  return (
    <Input
      id="filter-location"
      type="search"
      value={draft}
      onChange={(event) => {
        setDraft(event.target.value)
        debounced(event.target.value)
      }}
      placeholder="e.g. Bengaluru"
    />
  )
}

export function CandidateFiltersPanel({
  job,
  filters,
  onChange,
  onClear,
  resetKey,
}: {
  job: Job
  filters: CandidateFilters
  onChange: (patch: Partial<CandidateFilters>) => void
  onClear: () => void
  /** Changes whenever filters are cleared, to reset uncontrolled drafts. */
  resetKey: number
}) {
  const jobSkills = Array.from(
    new Map([...job.required_skills, ...job.preferred_skills].map((skill) => [skill.toLowerCase(), skill])).values(),
  )
  const selectedLower = new Set(filters.skills.map((skill) => skill.toLowerCase()))
  const jobSkillLower = new Set(jobSkills.map((skill) => skill.toLowerCase()))
  const extraSkills = filters.skills.filter((skill) => !jobSkillLower.has(skill.toLowerCase()))

  const scorePreset: ScorePreset =
    filters.min_score === null || filters.min_score <= 0
      ? '0'
      : (SCORE_PRESETS.find((preset) => Number(preset.value) === filters.min_score)?.value ?? '0')

  const experienceOptions = Array.from(
    new Set([...EXPERIENCE_PRESETS, ...(job.min_experience_years > 0 ? [job.min_experience_years] : [])]),
  ).sort((a, b) => a - b)

  function toggleSkill(skill: string) {
    const lower = skill.toLowerCase()
    onChange({
      skills: selectedLower.has(lower) ? filters.skills.filter((s) => s.toLowerCase() !== lower) : [...filters.skills, skill],
    })
  }

  return (
    <div className="space-y-5 rounded-xl border border-slate-200 bg-white p-4 sm:p-5">
      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 xl:grid-cols-4">
        <Field label="Minimum score">
          <SegmentedControl<ScorePreset>
            ariaLabel="Minimum score"
            block
            options={SCORE_PRESETS}
            value={scorePreset}
            onChange={(value) => onChange({ min_score: value === '0' ? null : Number(value) })}
          />
        </Field>
        <Field label="Minimum experience" htmlFor="filter-experience">
          <Select
            id="filter-experience"
            value={filters.min_experience === null ? '' : String(filters.min_experience)}
            onChange={(event) => onChange({ min_experience: event.target.value === '' ? null : Number(event.target.value) })}
          >
            <option value="">Any experience</option>
            {experienceOptions.map((years) => (
              <option key={years} value={years}>
                {years}+ years{years === job.min_experience_years ? ' (job minimum)' : ''}
              </option>
            ))}
          </Select>
        </Field>
        <Field label="Education (at least)" htmlFor="filter-education">
          <Select
            id="filter-education"
            value={filters.education_level ?? ''}
            onChange={(event) =>
              onChange({ education_level: event.target.value === '' ? null : (event.target.value as EducationLevel) })
            }
          >
            <option value="">Any education</option>
            {EDUCATION_ORDER.filter((level) => level !== 'none').map((level) => (
              <option key={level} value={level}>
                {EDUCATION_LABELS[level]}
              </option>
            ))}
          </Select>
        </Field>
        <Field label="Location contains" htmlFor="filter-location">
          <LocationInput key={`loc-${resetKey}`} value={filters.location} onChange={(location) => onChange({ location })} />
        </Field>
      </div>

      <Field
        label="Must have all of these skills"
        hint="Matches the candidate's extracted skills (case-insensitive)."
        aside={filters.skills.length > 0 ? `${filters.skills.length} selected` : undefined}
      >
        <div className="space-y-2.5">
          {jobSkills.length > 0 && (
            <div className="flex flex-wrap gap-1.5" role="group" aria-label="Skills from this job">
              {jobSkills.map((skill) => {
                const active = selectedLower.has(skill.toLowerCase())
                const required = job.required_skills.some((s) => s.toLowerCase() === skill.toLowerCase())
                return (
                  <button
                    key={skill}
                    type="button"
                    aria-pressed={active}
                    onClick={() => toggleSkill(skill)}
                    className={cn(
                      'inline-flex items-center gap-1 rounded-md px-2 py-1 text-xs font-medium ring-1 transition-colors ring-inset',
                      'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500',
                      active
                        ? 'bg-indigo-600 text-white ring-indigo-600'
                        : required
                          ? 'bg-white text-slate-700 ring-slate-300 hover:bg-indigo-50 hover:text-indigo-700'
                          : 'bg-slate-50 text-slate-500 ring-slate-200 hover:bg-slate-100',
                    )}
                    title={required ? 'Required skill' : 'Preferred skill'}
                  >
                    {active && <Check className="h-3 w-3" />}
                    {skill}
                  </button>
                )
              })}
            </div>
          )}
          <TagInput
            size="sm"
            tone="slate"
            value={extraSkills}
            onChange={(next) =>
              onChange({ skills: [...filters.skills.filter((s) => jobSkillLower.has(s.toLowerCase())), ...next] })
            }
            placeholder="Other skill… press Enter"
            ariaLabel="Add another skill filter"
          />
        </div>
      </Field>

      <div className="flex justify-end border-t border-slate-100 pt-4">
        <Button size="sm" variant="ghost" onClick={onClear} icon={<X className="h-3.5 w-3.5" />}>
          Clear all filters
        </Button>
      </div>
    </div>
  )
}
