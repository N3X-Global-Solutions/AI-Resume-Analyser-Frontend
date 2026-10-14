import type {
  CandidateListParams,
  CandidateSort,
  CandidateStatus,
  EducationLevel,
  MatchTier,
  SortOrder,
} from '../../api/types'
import { CANDIDATE_PAGE_SIZE, EDUCATION_ORDER, STATUS_ORDER, TIER_ORDER } from '../../lib/constants'

/** Candidate list filters, kept in the URL with the same names as the API query params. */
export interface CandidateFilters {
  search: string
  min_score: number | null
  tier: MatchTier[]
  min_experience: number | null
  skills: string[]
  location: string
  education_level: EducationLevel | null
  status: CandidateStatus | null
  sort: CandidateSort
  order: SortOrder
  page: number
}

export const FILTER_PARAM_KEYS = [
  'search',
  'min_score',
  'tier',
  'min_experience',
  'skills',
  'location',
  'education_level',
  'status',
  'sort',
  'order',
  'page',
] as const

const SORTS: readonly CandidateSort[] = ['score', 'experience', 'name', 'recent']

function parseNumber(value: string | null): number | null {
  if (value === null || value.trim() === '') return null
  const parsed = Number(value)
  return Number.isFinite(parsed) ? parsed : null
}

function parseList(value: string | null): string[] {
  return (value ?? '')
    .split(',')
    .map((part) => part.trim())
    .filter(Boolean)
}

function isOneOf<T extends string>(options: readonly T[], value: string | null): value is T {
  return value !== null && (options as readonly string[]).includes(value)
}

export function parseCandidateFilters(params: URLSearchParams): CandidateFilters {
  const sort = params.get('sort')
  const order = params.get('order')
  const status = params.get('status')
  const education = params.get('education_level')
  const page = parseNumber(params.get('page'))
  return {
    search: params.get('search') ?? '',
    min_score: parseNumber(params.get('min_score')),
    tier: parseList(params.get('tier')).filter((tier): tier is MatchTier => isOneOf(TIER_ORDER, tier)),
    min_experience: parseNumber(params.get('min_experience')),
    skills: parseList(params.get('skills')),
    location: params.get('location') ?? '',
    education_level: isOneOf(EDUCATION_ORDER, education) && education !== 'none' ? education : null,
    status: isOneOf(STATUS_ORDER, status) ? status : null,
    sort: isOneOf(SORTS, sort) ? sort : 'score',
    order: order === 'asc' ? 'asc' : 'desc',
    page: page !== null && page >= 1 ? Math.floor(page) : 1,
  }
}

/** API query for the list (and, without paging, for the CSV export). */
export function filtersToQuery(filters: CandidateFilters): CandidateListParams {
  const query: CandidateListParams = {
    sort: filters.sort,
    order: filters.order,
    page: filters.page,
    page_size: CANDIDATE_PAGE_SIZE,
  }
  if (filters.search.trim()) query.search = filters.search.trim()
  if (filters.min_score !== null && filters.min_score > 0) query.min_score = filters.min_score
  if (filters.tier.length > 0) query.tier = filters.tier
  if (filters.min_experience !== null && filters.min_experience > 0) query.min_experience = filters.min_experience
  if (filters.skills.length > 0) query.skills = filters.skills
  if (filters.location.trim()) query.location = filters.location.trim()
  if (filters.education_level) query.education_level = filters.education_level
  if (filters.status) query.status = [filters.status]
  return query
}

/** Applies a patch to the URL params. Any change other than `page` resets to page 1. */
export function writeCandidateFilters(current: URLSearchParams, patch: Partial<CandidateFilters>): URLSearchParams {
  const next = new URLSearchParams(current)
  const setOrDelete = (key: string, value: string | null) => {
    if (value === null || value === '') next.delete(key)
    else next.set(key, value)
  }
  for (const [key, value] of Object.entries(patch) as [keyof CandidateFilters, CandidateFilters[keyof CandidateFilters]][]) {
    if (Array.isArray(value)) setOrDelete(key, value.length > 0 ? value.join(',') : null)
    else if (value === null || value === undefined) setOrDelete(key, null)
    else setOrDelete(key, String(value))
  }
  if (!('page' in patch)) next.delete('page')
  if (next.get('page') === '1') next.delete('page')
  if (next.get('sort') === 'score') next.delete('sort')
  if (next.get('order') === 'desc') next.delete('order')
  return next
}

/** Removes all filters (keeps tab / sort / order). */
export function clearCandidateFilters(current: URLSearchParams): URLSearchParams {
  const next = new URLSearchParams(current)
  for (const key of ['search', 'min_score', 'tier', 'min_experience', 'skills', 'location', 'education_level', 'status', 'page']) {
    next.delete(key)
  }
  return next
}

/** Number of active filters shown in the "Filters" panel (search, tiers and status have their own controls). */
export function panelFilterCount(filters: CandidateFilters): number {
  return [
    filters.min_score !== null && filters.min_score > 0,
    filters.min_experience !== null && filters.min_experience > 0,
    filters.skills.length > 0,
    filters.location.trim() !== '',
    filters.education_level !== null,
  ].filter(Boolean).length
}

export function hasAnyFilter(filters: CandidateFilters): boolean {
  return panelFilterCount(filters) > 0 || filters.search.trim() !== '' || filters.tier.length > 0 || filters.status !== null
}
