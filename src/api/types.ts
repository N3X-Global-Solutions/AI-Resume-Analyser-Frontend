/**
 * API types — mirrors docs/API_CONTRACT.md §1 and §3 exactly.
 * JSON field names are part of the contract: never rename them here.
 */

// ---------------------------------------------------------------------------
// §1 Enums
// ---------------------------------------------------------------------------

export type WorkMode = 'remote' | 'hybrid' | 'onsite'
export type JobStatus = 'active' | 'closed'
/** Ordered low → high. */
export type EducationLevel = 'none' | 'high_school' | 'diploma' | 'bachelor' | 'master' | 'phd'
export type ProcessingStatus = 'queued' | 'processing' | 'completed' | 'failed'
export type CandidateStatus = 'new' | 'shortlisted' | 'maybe' | 'rejected'
export type MatchTier = 'strong' | 'good' | 'partial' | 'low'
export type MatchLevel = 'met' | 'partial' | 'missing'
export type CategoryKey =
  | 'required_skills'
  | 'experience'
  | 'relevant_experience'
  | 'education'
  | 'preferred_skills'
  | 'other'

// ---------------------------------------------------------------------------
// §3 Schemas
// ---------------------------------------------------------------------------

export interface ScoringWeights {
  required_skills: number
  experience: number
  relevant_experience: number
  education: number
  preferred_skills: number
  other: number
}

export interface JobCreate {
  /** required, 1..200 chars */
  title: string
  department?: string | null
  location?: string | null
  work_mode?: WorkMode | null
  salary_min?: number | null
  salary_max?: number | null
  /** e.g. "INR", "USD" */
  salary_currency?: string | null
  /** free-text role description */
  description?: string | null
  /** default [] */
  required_skills?: string[]
  /** default [] */
  preferred_skills?: string[]
  /** default 0 */
  min_experience_years?: number
  max_experience_years?: number | null
  /** default [] e.g. ["Backend development","API development"] */
  relevant_experience_areas?: string[]
  /** default "none" */
  education_level?: EducationLevel
  /** default [] preferred fields of study, e.g. ["Computer Science"] */
  education_fields?: string[]
  /** default false (false = preferred) */
  education_required?: boolean
  /** free text, e.g. "Has built production APIs; startup experience preferred" */
  custom_requirements?: string | null
  /** default weights 40/25/15/10/5/5 */
  scoring_weights?: ScoringWeights
}

export type JobUpdate = Partial<JobCreate> & { status?: JobStatus }

export interface TierCounts {
  strong: number
  good: number
  partial: number
  low: number
}

export interface StatusCounts {
  new: number
  shortlisted: number
  maybe: number
  rejected: number
}

export interface JobStats {
  total_resumes: number
  queued: number
  processing: number
  completed: number
  failed: number
  tier_counts: TierCounts
  status_counts: StatusCounts
  average_score: number | null
  top_score: number | null
}

/** Every JobCreate field present (nullable ones may be null). */
export interface Job extends Required<JobCreate> {
  id: string
  status: JobStatus
  needs_reanalysis: boolean
  created_at: string
  updated_at: string
  stats: JobStats
}

export interface JobSummary {
  id: string
  title: string
  department: string | null
  location: string | null
  work_mode: WorkMode | null
  status: JobStatus
  min_experience_years: number
  required_skills: string[]
  needs_reanalysis: boolean
  created_at: string
  updated_at: string
  stats: JobStats
}

/** AI-assisted job creation: LLM turns a pasted job description into structured fields. title may be "" if not found. */
export type JobDraft = Omit<JobCreate, 'scoring_weights'>

export interface ResumeOut {
  id: string
  job_id: string
  original_filename: string
  content_type: string
  file_size: number
  processing_status: ProcessingStatus
  error_message: string | null
  attempts: number
  candidate_id: string | null
  created_at: string
  processing_started_at: string | null
  processed_at: string | null
}

export interface UploadResult {
  accepted: ResumeOut[]
  rejected: { filename: string; reason: string }[]
  /** same sha256 already in this job */
  duplicates: { filename: string; existing_resume_id: string }[]
}

export interface Progress {
  job_id: string
  total: number
  queued: number
  processing: number
  completed: number
  failed: number
  /** (completed + failed) / total * 100, 0 when total = 0, 1 decimal */
  percent: number
  /** queued + processing > 0 */
  is_processing: boolean
}

export interface WorkExperience {
  title: string | null
  company: string | null
  location: string | null
  /** "YYYY-MM" | "YYYY" | "Present" | null */
  start_date: string | null
  /** "YYYY-MM" | "YYYY" | "Present" | null */
  end_date: string | null
  duration_years: number | null
  highlights: string[]
}

export interface Education {
  degree: string | null
  field: string | null
  institution: string | null
  start_year: number | null
  end_year: number | null
  level: EducationLevel | null
  grade: string | null
}

export interface Project {
  name: string
  description: string | null
  technologies: string[]
}

export interface CandidateProfile {
  name: string | null
  email: string | null
  phone: string | null
  location: string | null
  /** current / most recent title */
  headline: string | null
  /** candidate's own summary from resume, if any */
  summary: string | null
  total_experience_years: number | null
  skills: string[]
  work_experience: WorkExperience[]
  education: Education[]
  projects: Project[]
  certifications: string[]
  languages: string[]
  links: string[]
}

export interface RequirementMatch {
  requirement: string
  level: MatchLevel
  evidence: string | null
}

export interface CategoryScore {
  key: CategoryKey
  label: string
  /** configured weight */
  weight: number
  /** after redistribution (applicable ones sum to 100); 0 if not applicable */
  effective_weight: number
  /** 0..1 */
  score: number
  /** score * effective_weight, 1 decimal */
  points: number
  applicable: boolean
  /** e.g. "4 of 5 required skills met" */
  detail: string
}

export interface Evaluation {
  /** 0..100, 1 decimal */
  match_score: number
  match_tier: MatchTier
  /** always all 6, in the order of CategoryKey */
  category_scores: CategoryScore[]
  required_skills: RequirementMatch[]
  preferred_skills: RequirementMatch[]
  /** one per relevant area */
  relevant_experience: RequirementMatch[]
  relevant_experience_years: number | null
  education: RequirementMatch | null
  custom_requirements: RequirementMatch[]
  experience: {
    required_min: number
    required_max: number | null
    candidate_years: number | null
    meets: boolean
  }
  /** 2–4 sentence AI summary */
  summary: string
  /** 2–5 bullets */
  strengths: string[]
  /** 0–5 bullets (missing / weak requirements) */
  gaps: string[]
  relevant_highlights: {
    title: string | null
    company: string | null
    period: string | null
    highlights: string[]
  }[]
  /** LLM holistic 0..100 (informational / fallback only) */
  overall_fit_score: number
  model_id: string
  analyzed_at: string
}

export interface AgentStep {
  step:
    | 'read_resume'
    | 'extract_candidate'
    | 'get_job_requirements'
    | 'match_candidate'
    | 'calculate_score'
    | 'generate_summary'
  status: 'ok' | 'error' | 'skipped'
  duration_ms: number
  /** e.g. "Extracted 3,412 chars from PDF (2 pages)", "LLM tokens in=2100 out=640" */
  detail: string | null
}

export interface CandidateListItem {
  id: string
  job_id: string
  resume_id: string
  rank: number | null
  name: string | null
  email: string | null
  phone: string | null
  location: string | null
  headline: string | null
  total_experience_years: number | null
  highest_education_level: EducationLevel | null
  match_score: number
  match_tier: MatchTier
  status: CandidateStatus
  skills: string[]
  /** count of required skills with level "met" */
  matched_required: number
  total_required: number
  /** required skills with level "missing" */
  missing_required: string[]
  summary: string
  original_filename: string
  created_at: string
  updated_at: string
}

export interface CandidateDetail extends CandidateListItem {
  /** completed candidates in job (denominator for rank) */
  total_candidates: number
  job_title: string
  notes: string | null
  resume_content_type: string
  /** extracted resume text */
  raw_text: string
  profile: CandidateProfile
  evaluation: Evaluation
  agent_trace: AgentStep[]
}

export interface CandidateListResponse {
  items: CandidateListItem[]
  /** total matching the filters */
  total: number
  page: number
  page_size: number
  /** job-wide (unfiltered) */
  facets: { tier_counts: TierCounts; status_counts: StatusCounts }
}

export interface CandidateUpdate {
  status?: CandidateStatus
  notes?: string | null
}

export interface BulkStatusRequest {
  status: CandidateStatus
  /** either ids … */
  candidate_ids?: string[]
  /** … or a filter (exactly one of the two must be given, else 422) */
  filter?: {
    /** inclusive */
    min_score?: number
    /** exclusive */
    max_score?: number
    tiers?: MatchTier[]
    current_statuses?: CandidateStatus[]
  }
}

export interface BulkStatusResult {
  updated: number
}

export interface RankExplanation {
  candidate_id: string
  rank: number
  total: number
  match_score: number
  /** "+ Meets all 5 mandatory skills" */
  positives: string[]
  /** "- No Kubernetes experience" */
  negatives: string[]
  /** vs #1 (or vs #2 if this candidate is #1); null if only one candidate */
  comparison: string | null
  /** short paragraph */
  narrative: string
  generated_at: string
  cached: boolean
}

/** limit default 20, max 50 */
export interface AISearchRequest {
  query: string
  limit?: number
}

export interface AISearchResponse {
  query: string
  /** relevance: integer 0..100 */
  items: { candidate: CandidateListItem; relevance: number; reason: string }[]
  /** Completed candidates the AI actually considered (non-failed, capped server-side). */
  searched: number
  /** Completed candidates in the job. */
  total: number
}

export interface ShortlistItem extends CandidateListItem {
  job_title: string
}

export interface Dashboard {
  active_jobs: number
  total_jobs: number
  total_resumes: number
  processed_resumes: number
  processing_resumes: number
  failed_resumes: number
  shortlisted: number
  /** across all jobs */
  tier_counts: TierCounts
  /** up to 10, newest first */
  recent_jobs: JobSummary[]
}

// ---------------------------------------------------------------------------
// Auth (admins only)
// ---------------------------------------------------------------------------

export interface LoginRequest {
  email: string
  password: string
}

export interface AdminOut {
  id: string
  email: string
  last_login_at: string | null
}

export interface LoginResponse {
  access_token: string
  token_type: 'bearer'
  expires_in: number
  admin: AdminOut
}

export interface Health {
  status: 'ok'
  database: 'ok' | 'error'
  model_id: string
  region: string
  worker_running: boolean
}

// ---------------------------------------------------------------------------
// Request / response shapes from §4 that have no named schema in the contract
// ---------------------------------------------------------------------------

/** Body of `POST /jobs/extract-requirements` (min 20 chars). */
export interface ExtractRequirementsRequest {
  description: string
}

/** Response of `POST /jobs/{id}/reanalyze` and `POST /jobs/{id}/resumes/retry-failed`. */
export interface QueuedResult {
  queued: number
}

export type CandidateSort = 'score' | 'experience' | 'name' | 'recent'
export type SortOrder = 'desc' | 'asc'

/** Query params of `GET /jobs/{id}/candidates` (and `/export`, which ignores paging). */
export interface CandidateListParams {
  min_score?: number
  max_score?: number
  /** serialized as a comma list */
  tier?: MatchTier[]
  min_experience?: number
  /** serialized as a comma list; candidate must have ALL */
  skills?: string[]
  /** substring, case-insensitive */
  location?: string
  /** candidate highest level ≥ this */
  education_level?: EducationLevel
  /** serialized as a comma list */
  status?: CandidateStatus[]
  /** space-separated terms, ALL must match */
  search?: string
  sort?: CandidateSort
  order?: SortOrder
  page?: number
  /** default 50, max 200 */
  page_size?: number
}

// Convenience aliases for nested contract shapes (derived, so they can never drift).
export type UploadRejected = UploadResult['rejected'][number]
export type UploadDuplicate = UploadResult['duplicates'][number]
export type ExperienceCheck = Evaluation['experience']
export type RelevantHighlight = Evaluation['relevant_highlights'][number]
export type BulkStatusFilter = NonNullable<BulkStatusRequest['filter']>
export type AISearchItem = AISearchResponse['items'][number]
export type AgentStepName = AgentStep['step']
export type AgentStepStatus = AgentStep['status']
export type CandidateFacets = CandidateListResponse['facets']
