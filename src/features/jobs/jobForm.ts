import type { EducationLevel, Job, JobCreate, JobDraft, JobUpdate, ScoringWeights, WorkMode } from '../../api/types'
import { CATEGORY_ORDER, DEFAULT_WEIGHTS, EDUCATION_ORDER } from '../../lib/constants'
import { weightsTotal } from '../../lib/scoring'

/** Form state: numeric inputs are kept as strings so fields can be empty while typing. */
export interface JobFormValues {
  title: string
  department: string
  location: string
  work_mode: WorkMode | ''
  salary_min: string
  salary_max: string
  salary_currency: string
  description: string
  required_skills: string[]
  preferred_skills: string[]
  min_experience_years: string
  max_experience_years: string
  relevant_experience_areas: string[]
  education_level: EducationLevel
  education_fields: string[]
  education_required: boolean
  custom_requirements: string
  scoring_weights: ScoringWeights
}

export type JobFormErrors = Partial<Record<keyof JobFormValues, string>>

/** Fields whose change makes existing evaluations stale (job.needs_reanalysis). Title / description are NOT among them. */
export const REQUIREMENT_KEYS = [
  'required_skills',
  'preferred_skills',
  'min_experience_years',
  'max_experience_years',
  'relevant_experience_areas',
  'education_level',
  'education_fields',
  'education_required',
  'custom_requirements',
] as const satisfies readonly (keyof JobCreate)[]

export function emptyJobForm(): JobFormValues {
  return {
    title: '',
    department: '',
    location: '',
    work_mode: '',
    salary_min: '',
    salary_max: '',
    salary_currency: 'INR',
    description: '',
    required_skills: [],
    preferred_skills: [],
    min_experience_years: '0',
    max_experience_years: '',
    relevant_experience_areas: [],
    education_level: 'none',
    education_fields: [],
    education_required: false,
    custom_requirements: '',
    scoring_weights: { ...DEFAULT_WEIGHTS },
  }
}

const numberToField = (value: number | null | undefined) => (value === null || value === undefined ? '' : String(value))

export function jobToForm(job: Job): JobFormValues {
  return {
    title: job.title,
    department: job.department ?? '',
    location: job.location ?? '',
    work_mode: job.work_mode ?? '',
    salary_min: numberToField(job.salary_min),
    salary_max: numberToField(job.salary_max),
    salary_currency: job.salary_currency ?? 'INR',
    description: job.description ?? '',
    required_skills: [...job.required_skills],
    preferred_skills: [...job.preferred_skills],
    min_experience_years: numberToField(job.min_experience_years),
    max_experience_years: numberToField(job.max_experience_years),
    relevant_experience_areas: [...job.relevant_experience_areas],
    education_level: job.education_level,
    education_fields: [...job.education_fields],
    education_required: job.education_required,
    custom_requirements: job.custom_requirements ?? '',
    scoring_weights: { ...DEFAULT_WEIGHTS, ...job.scoring_weights },
  }
}

function parseNumber(value: string): number | null {
  const trimmed = value.trim()
  if (!trimmed) return null
  const parsed = Number(trimmed)
  return Number.isFinite(parsed) ? parsed : Number.NaN
}

const blankToNull = (value: string) => (value.trim() ? value.trim() : null)

export function validateJobForm(values: JobFormValues): JobFormErrors {
  const errors: JobFormErrors = {}
  const title = values.title.trim()
  if (!title) errors.title = 'A job title is required'
  else if (title.length > 200) errors.title = 'Keep the title under 200 characters'

  const salaryMin = parseNumber(values.salary_min)
  const salaryMax = parseNumber(values.salary_max)
  if (salaryMin !== null && (Number.isNaN(salaryMin) || salaryMin < 0)) errors.salary_min = 'Enter a positive number'
  if (salaryMax !== null && (Number.isNaN(salaryMax) || salaryMax < 0)) errors.salary_max = 'Enter a positive number'
  if (!errors.salary_min && !errors.salary_max && salaryMin !== null && salaryMax !== null && salaryMax < salaryMin) {
    errors.salary_max = 'Maximum must be at least the minimum'
  }

  const minExp = parseNumber(values.min_experience_years)
  const maxExp = parseNumber(values.max_experience_years)
  if (minExp !== null && (Number.isNaN(minExp) || minExp < 0 || minExp > 60)) {
    errors.min_experience_years = 'Enter a number of years between 0 and 60'
  }
  if (maxExp !== null && (Number.isNaN(maxExp) || maxExp < 0 || maxExp > 60)) {
    errors.max_experience_years = 'Enter a number of years between 0 and 60'
  } else if (maxExp !== null && minExp !== null && !Number.isNaN(minExp) && maxExp < minExp) {
    errors.max_experience_years = 'Maximum must be at least the minimum'
  }

  const weights = values.scoring_weights
  if (CATEGORY_ORDER.some((key) => !Number.isFinite(weights[key]) || weights[key] < 0)) {
    errors.scoring_weights = 'Weights must be zero or positive numbers'
  } else if (weightsTotal(weights) <= 0) {
    errors.scoring_weights = 'At least one weight must be greater than zero'
  }
  return errors
}

export function formToJobCreate(values: JobFormValues): JobCreate {
  const salaryMin = parseNumber(values.salary_min)
  const salaryMax = parseNumber(values.salary_max)
  const hasSalary = salaryMin !== null || salaryMax !== null
  return {
    title: values.title.trim(),
    department: blankToNull(values.department),
    location: blankToNull(values.location),
    work_mode: values.work_mode === '' ? null : values.work_mode,
    salary_min: salaryMin,
    salary_max: salaryMax,
    salary_currency: hasSalary ? values.salary_currency || null : null,
    description: blankToNull(values.description),
    required_skills: values.required_skills,
    preferred_skills: values.preferred_skills,
    min_experience_years: parseNumber(values.min_experience_years) ?? 0,
    max_experience_years: parseNumber(values.max_experience_years),
    relevant_experience_areas: values.relevant_experience_areas,
    education_level: values.education_level,
    education_fields: values.education_fields,
    education_required: values.education_required,
    custom_requirements: blankToNull(values.custom_requirements),
    scoring_weights: values.scoring_weights,
  }
}

/** Only the fields that changed (PUT is partial) — avoids flagging re-analysis for untouched fields. */
export function diffJobPayload(before: JobCreate, after: JobCreate): JobUpdate {
  const diff: Record<string, unknown> = {}
  for (const key of Object.keys(after) as (keyof JobCreate)[]) {
    if (JSON.stringify(before[key] ?? null) !== JSON.stringify(after[key] ?? null)) diff[key] = after[key]
  }
  return diff as JobUpdate
}

function unionCaseInsensitive(current: readonly string[], incoming: readonly string[] | undefined): string[] {
  const seen = new Set(current.map((item) => item.toLowerCase()))
  const result = [...current]
  for (const item of incoming ?? []) {
    const trimmed = item.trim()
    if (!trimmed || seen.has(trimmed.toLowerCase())) continue
    seen.add(trimmed.toLowerCase())
    result.push(trimmed)
  }
  return result
}

/**
 * Merges an AI draft into the form: non-empty scalar values from the draft win,
 * list fields are unioned (nothing the recruiter typed is lost).
 * Returns the new values and the list of section names that changed.
 */
export function mergeDraft(
  values: JobFormValues,
  draft: JobDraft,
  pastedText: string,
): { values: JobFormValues; filled: string[] } {
  const next: JobFormValues = { ...values }
  const filled = new Set<string>()

  const setText = (key: 'title' | 'department' | 'location' | 'custom_requirements', label: string, value: string | null | undefined) => {
    if (value && value.trim() && value.trim() !== next[key]) {
      next[key] = value.trim()
      filled.add(label)
    }
  }
  setText('title', 'title', draft.title)
  setText('department', 'department', draft.department)
  setText('location', 'location', draft.location)
  setText('custom_requirements', 'custom requirements', draft.custom_requirements)

  if (draft.work_mode) {
    next.work_mode = draft.work_mode
    filled.add('work mode')
  }
  if (draft.salary_min !== null && draft.salary_min !== undefined) {
    next.salary_min = String(draft.salary_min)
    filled.add('salary')
  }
  if (draft.salary_max !== null && draft.salary_max !== undefined) {
    next.salary_max = String(draft.salary_max)
    filled.add('salary')
  }
  if (draft.salary_currency) next.salary_currency = draft.salary_currency.toUpperCase()

  if (draft.description && draft.description.trim()) {
    next.description = draft.description.trim()
    filled.add('description')
  } else if (!next.description.trim()) {
    next.description = pastedText.trim()
    filled.add('description')
  }

  const lists = [
    ['required_skills', 'required skills'],
    ['preferred_skills', 'preferred skills'],
    ['relevant_experience_areas', 'experience areas'],
    ['education_fields', 'fields of study'],
  ] as const
  for (const [key, label] of lists) {
    const merged = unionCaseInsensitive(next[key], draft[key])
    if (merged.length !== next[key].length) filled.add(label)
    next[key] = merged
  }

  if (draft.min_experience_years !== undefined && draft.min_experience_years > 0) {
    next.min_experience_years = String(draft.min_experience_years)
    filled.add('experience')
  }
  if (draft.max_experience_years !== null && draft.max_experience_years !== undefined) {
    next.max_experience_years = String(draft.max_experience_years)
    filled.add('experience')
  }
  if (draft.education_level && EDUCATION_ORDER.includes(draft.education_level) && draft.education_level !== 'none') {
    next.education_level = draft.education_level
    next.education_required = draft.education_required ?? next.education_required
    filled.add('education')
  }

  return { values: next, filled: [...filled] }
}
