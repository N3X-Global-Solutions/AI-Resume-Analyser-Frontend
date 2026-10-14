import type { CategoryKey, EducationLevel, ScoringWeights } from '../api/types'
import { CATEGORY_ORDER } from './constants'

/** The requirement fields that decide which scoring categories apply (contract §2). */
export interface RequirementShape {
  required_skills: readonly string[]
  preferred_skills: readonly string[]
  min_experience_years: number
  relevant_experience_areas: readonly string[]
  education_level: EducationLevel
  education_fields: readonly string[]
  custom_requirements: string | null
}

export interface EffectiveWeight {
  key: CategoryKey
  weight: number
  applicable: boolean
  /** 0..100 after redistribution; 0 when not applicable */
  effective: number
  /** share of the configured total, ignoring applicability (0..100) */
  share: number
  /** why a category is not applicable */
  reason: string | null
}

function applicability(key: CategoryKey, req: RequirementShape): string | null {
  switch (key) {
    case 'required_skills':
      return req.required_skills.length > 0 ? null : 'No required skills set'
    case 'preferred_skills':
      return req.preferred_skills.length > 0 ? null : 'No preferred skills set'
    case 'experience':
      return req.min_experience_years > 0 ? null : 'No minimum experience set'
    case 'relevant_experience':
      return req.relevant_experience_areas.length > 0 || req.min_experience_years > 0
        ? null
        : 'No relevant areas or minimum experience set'
    case 'education':
      return req.education_level !== 'none' || req.education_fields.length > 0 ? null : 'No education requirement set'
    case 'other':
      return req.custom_requirements?.trim() ? null : 'No custom requirements set'
  }
}

/**
 * Mirrors the backend's redistribution: non-applicable categories are dropped and
 * `effective_i = weight_i / Σ applicable weights × 100`.
 */
export function computeEffectiveWeights(weights: ScoringWeights, req: RequirementShape): EffectiveWeight[] {
  const total = CATEGORY_ORDER.reduce((sum, key) => sum + Math.max(0, weights[key]), 0)
  const rows = CATEGORY_ORDER.map((key) => {
    const reason = applicability(key, req)
    const weight = Math.max(0, weights[key])
    return { key, weight, reason, applicable: reason === null }
  })
  const applicableTotal = rows.reduce((sum, row) => sum + (row.applicable ? row.weight : 0), 0)
  return rows.map((row) => ({
    ...row,
    share: total > 0 ? (row.weight / total) * 100 : 0,
    effective: row.applicable && applicableTotal > 0 ? (row.weight / applicableTotal) * 100 : 0,
  }))
}

export function weightsTotal(weights: ScoringWeights): number {
  return CATEGORY_ORDER.reduce((sum, key) => sum + Math.max(0, weights[key]), 0)
}
