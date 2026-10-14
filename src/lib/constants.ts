import type {
  AgentStepName,
  CandidateStatus,
  CategoryKey,
  EducationLevel,
  MatchLevel,
  MatchTier,
  ProcessingStatus,
  ScoringWeights,
  WorkMode,
} from '../api/types'

export const APP_NAME = 'ResumeFilter AI'
export const MODEL_LABEL = 'GLM-5'

/** Upload limits from the contract (§4): 10 MB per resume (also per file inside a ZIP), 100 MB per ZIP. */
export const MAX_FILE_SIZE_BYTES = 10 * 1024 * 1024
export const MAX_ZIP_SIZE_BYTES = 100 * 1024 * 1024
export const ACCEPTED_EXTENSIONS = ['pdf', 'docx', 'zip'] as const
/** A batch is at most this many files AND at most this many bytes (a single larger file goes alone). */
export const UPLOAD_BATCH_SIZE = 20
export const UPLOAD_BATCH_MAX_BYTES = 100 * 1024 * 1024
export const CANDIDATE_PAGE_SIZE = 50

// ---------------------------------------------------------------------------
// Match tiers — thresholds by match_score: strong ≥ 85, good ≥ 70, partial ≥ 50, low < 50.
// ---------------------------------------------------------------------------

export const TIER_THRESHOLDS = { strong: 85, good: 70, partial: 50 } as const

export const TIER_ORDER: readonly MatchTier[] = ['strong', 'good', 'partial', 'low']

interface TierStyle {
  label: string
  short: string
  range: string
  /** inclusive lower bound */
  min: number
  /** exclusive upper bound (undefined = 100) */
  max?: number
  badge: string
  dot: string
  bar: string
  text: string
  soft: string
  border: string
  /** SVG stroke colour */
  stroke: string
}

export const TIER_META: Record<MatchTier, TierStyle> = {
  strong: {
    label: 'Strong Match',
    short: 'Strong',
    range: '≥ 85%',
    min: 85,
    badge: 'bg-emerald-50 text-emerald-700 ring-emerald-600/20',
    dot: 'bg-emerald-500',
    bar: 'bg-emerald-500',
    text: 'text-emerald-600',
    soft: 'bg-emerald-50',
    border: 'border-emerald-200',
    stroke: '#10b981',
  },
  good: {
    label: 'Good Match',
    short: 'Good',
    range: '70–84%',
    min: 70,
    max: 85,
    badge: 'bg-sky-50 text-sky-700 ring-sky-600/20',
    dot: 'bg-sky-500',
    bar: 'bg-sky-500',
    text: 'text-sky-600',
    soft: 'bg-sky-50',
    border: 'border-sky-200',
    stroke: '#0ea5e9',
  },
  partial: {
    label: 'Partial Match',
    short: 'Partial',
    range: '50–69%',
    min: 50,
    max: 70,
    badge: 'bg-amber-50 text-amber-800 ring-amber-600/25',
    dot: 'bg-amber-400',
    bar: 'bg-amber-400',
    text: 'text-amber-600',
    soft: 'bg-amber-50',
    border: 'border-amber-200',
    stroke: '#f59e0b',
  },
  low: {
    label: 'Low Match',
    short: 'Low',
    range: '< 50%',
    min: 0,
    max: 50,
    badge: 'bg-rose-50 text-rose-700 ring-rose-600/20',
    dot: 'bg-rose-500',
    bar: 'bg-rose-500',
    text: 'text-rose-600',
    soft: 'bg-rose-50',
    border: 'border-rose-200',
    stroke: '#f43f5e',
  },
}

export function scoreTier(score: number): MatchTier {
  if (score >= TIER_THRESHOLDS.strong) return 'strong'
  if (score >= TIER_THRESHOLDS.good) return 'good'
  if (score >= TIER_THRESHOLDS.partial) return 'partial'
  return 'low'
}

// ---------------------------------------------------------------------------
// Candidate status
// ---------------------------------------------------------------------------

export const STATUS_ORDER: readonly CandidateStatus[] = ['new', 'shortlisted', 'maybe', 'rejected']

interface StatusStyle {
  label: string
  action: string
  badge: string
  dot: string
  /** active state of quick-action buttons */
  active: string
  hover: string
}

export const STATUS_META: Record<CandidateStatus, StatusStyle> = {
  new: {
    label: 'New',
    action: 'Reset to New',
    badge: 'bg-slate-100 text-slate-700 ring-slate-500/20',
    dot: 'bg-slate-400',
    active: 'bg-slate-700 text-white ring-slate-700',
    hover: 'hover:bg-slate-100 hover:text-slate-800',
  },
  shortlisted: {
    label: 'Shortlisted',
    action: 'Shortlist',
    badge: 'bg-emerald-50 text-emerald-700 ring-emerald-600/20',
    dot: 'bg-emerald-500',
    active: 'bg-emerald-600 text-white ring-emerald-600',
    hover: 'hover:bg-emerald-50 hover:text-emerald-700',
  },
  maybe: {
    label: 'Maybe',
    action: 'Maybe',
    badge: 'bg-amber-50 text-amber-800 ring-amber-600/25',
    dot: 'bg-amber-400',
    active: 'bg-amber-500 text-white ring-amber-500',
    hover: 'hover:bg-amber-50 hover:text-amber-800',
  },
  rejected: {
    label: 'Rejected',
    action: 'Reject',
    badge: 'bg-rose-50 text-rose-700 ring-rose-600/20',
    dot: 'bg-rose-500',
    active: 'bg-rose-600 text-white ring-rose-600',
    hover: 'hover:bg-rose-50 hover:text-rose-700',
  },
}

// ---------------------------------------------------------------------------
// Processing status (resumes)
// ---------------------------------------------------------------------------

export const PROCESSING_META: Record<ProcessingStatus, { label: string; badge: string; dot: string }> = {
  queued: { label: 'Queued', badge: 'bg-slate-100 text-slate-600 ring-slate-500/20', dot: 'bg-slate-400' },
  processing: { label: 'Processing', badge: 'bg-indigo-50 text-indigo-700 ring-indigo-600/20', dot: 'bg-indigo-500' },
  completed: { label: 'Analyzed', badge: 'bg-emerald-50 text-emerald-700 ring-emerald-600/20', dot: 'bg-emerald-500' },
  failed: { label: 'Failed', badge: 'bg-rose-50 text-rose-700 ring-rose-600/20', dot: 'bg-rose-500' },
}

// ---------------------------------------------------------------------------
// Requirement match levels
// ---------------------------------------------------------------------------

export const MATCH_LEVEL_META: Record<MatchLevel, { label: string; text: string; bg: string; value: number }> = {
  met: { label: 'Met', text: 'text-emerald-600', bg: 'bg-emerald-50', value: 1 },
  partial: { label: 'Partial', text: 'text-amber-500', bg: 'bg-amber-50', value: 0.5 },
  missing: { label: 'Missing', text: 'text-rose-500', bg: 'bg-rose-50', value: 0 },
}

// ---------------------------------------------------------------------------
// Education & work mode
// ---------------------------------------------------------------------------

export const EDUCATION_ORDER: readonly EducationLevel[] = ['none', 'high_school', 'diploma', 'bachelor', 'master', 'phd']

export const EDUCATION_LABELS: Record<EducationLevel, string> = {
  none: 'No requirement',
  high_school: 'High school',
  diploma: 'Diploma',
  bachelor: "Bachelor's degree",
  master: "Master's degree",
  phd: 'PhD / Doctorate',
}

/** Shorter labels for chips / table cells. */
export const EDUCATION_SHORT: Record<EducationLevel, string> = {
  none: '—',
  high_school: 'High school',
  diploma: 'Diploma',
  bachelor: "Bachelor's",
  master: "Master's",
  phd: 'PhD',
}

export const WORK_MODE_ORDER: readonly WorkMode[] = ['onsite', 'hybrid', 'remote']

export const WORK_MODE_LABELS: Record<WorkMode, string> = {
  remote: 'Remote',
  hybrid: 'Hybrid',
  onsite: 'On-site',
}

export const CURRENCIES = ['INR', 'USD', 'EUR', 'GBP'] as const

// ---------------------------------------------------------------------------
// Scoring categories (order matches CategoryKey in the contract)
// ---------------------------------------------------------------------------

export const CATEGORY_ORDER: readonly CategoryKey[] = [
  'required_skills',
  'experience',
  'relevant_experience',
  'education',
  'preferred_skills',
  'other',
]

export const CATEGORY_META: Record<CategoryKey, { label: string; description: string }> = {
  required_skills: { label: 'Required skills', description: 'Share of must-have skills the candidate has evidence for' },
  experience: { label: 'Experience', description: 'Total years of experience vs the minimum' },
  relevant_experience: {
    label: 'Relevant experience',
    description: 'Experience in the relevant areas and relevant years vs the minimum',
  },
  education: { label: 'Education', description: 'Degree level and field of study' },
  preferred_skills: { label: 'Preferred skills', description: 'Nice-to-have skills' },
  other: { label: 'Custom requirements', description: 'Your free-text requirements, split into checks by the AI' },
}

export const DEFAULT_WEIGHTS: ScoringWeights = {
  required_skills: 40,
  experience: 25,
  relevant_experience: 15,
  education: 10,
  preferred_skills: 5,
  other: 5,
}

// ---------------------------------------------------------------------------
// Agent trace
// ---------------------------------------------------------------------------

export const AGENT_STEP_META: Record<AgentStepName, { label: string; description: string }> = {
  read_resume: { label: 'Read resume', description: 'Extract text from the PDF / DOCX file' },
  extract_candidate: { label: 'Extract candidate profile', description: 'GLM-5 turns resume text into a structured profile' },
  get_job_requirements: { label: 'Load job requirements', description: 'Fetch the requirements and scoring weights' },
  match_candidate: { label: 'Match against requirements', description: 'GLM-5 judges each requirement with evidence' },
  calculate_score: { label: 'Calculate score', description: 'Deterministic weighted score — no LLM involved' },
  generate_summary: { label: 'Generate summary', description: 'Persist summary, strengths and gaps' },
}

export const AGENT_STEP_ORDER: readonly AgentStepName[] = [
  'read_resume',
  'extract_candidate',
  'get_job_requirements',
  'match_candidate',
  'calculate_score',
  'generate_summary',
]

/** One colour per scoring category (weights editor + score breakdown). */
export const CATEGORY_COLORS: Record<CategoryKey, { bar: string; dot: string }> = {
  required_skills: { bar: 'bg-indigo-500', dot: 'bg-indigo-500' },
  experience: { bar: 'bg-violet-500', dot: 'bg-violet-500' },
  relevant_experience: { bar: 'bg-sky-500', dot: 'bg-sky-500' },
  education: { bar: 'bg-teal-500', dot: 'bg-teal-500' },
  preferred_skills: { bar: 'bg-amber-400', dot: 'bg-amber-400' },
  other: { bar: 'bg-pink-400', dot: 'bg-pink-400' },
}
