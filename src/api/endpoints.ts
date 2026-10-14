import { apiUrl, request, type QueryParams } from './client'
import type {
  AdminOut,
  AISearchRequest,
  AISearchResponse,
  BulkStatusRequest,
  BulkStatusResult,
  CandidateDetail,
  CandidateListParams,
  CandidateListResponse,
  CandidateUpdate,
  Dashboard,
  ExtractRequirementsRequest,
  Health,
  Job,
  JobCreate,
  JobDraft,
  JobStatus,
  JobSummary,
  JobUpdate,
  LoginRequest,
  LoginResponse,
  ProcessingStatus,
  Progress,
  QueuedResult,
  RankExplanation,
  ResumeOut,
  ShortlistItem,
  UploadResult,
} from './types'

const enc = encodeURIComponent

function candidateQuery(params: CandidateListParams = {}): QueryParams {
  return { ...params }
}

/** Export ignores paging. */
function exportQuery(params: CandidateListParams = {}): QueryParams {
  const { page: _page, page_size: _pageSize, ...rest } = params
  return { ...rest }
}

export const authApi = {
  login: (body: LoginRequest) => request<LoginResponse>('/auth/login', { method: 'POST', json: body }),
  logout: () => request<void>('/auth/logout', { method: 'POST' }),
  me: (signal?: AbortSignal) => request<AdminOut>('/auth/me', { signal }),
}

export const healthApi = {
  get: (signal?: AbortSignal) => request<Health>('/health', { signal }),
}

export const dashboardApi = {
  get: (signal?: AbortSignal) => request<Dashboard>('/dashboard', { signal }),
}

export const jobsApi = {
  list: (status?: JobStatus, signal?: AbortSignal) =>
    request<JobSummary[]>('/jobs', { query: { status }, signal }),
  get: (jobId: string, signal?: AbortSignal) => request<Job>(`/jobs/${enc(jobId)}`, { signal }),
  create: (body: JobCreate) => request<Job>('/jobs', { method: 'POST', json: body }),
  update: (jobId: string, body: JobUpdate) =>
    request<Job>(`/jobs/${enc(jobId)}`, { method: 'PUT', json: body }),
  remove: (jobId: string) => request<void>(`/jobs/${enc(jobId)}`, { method: 'DELETE' }),
  extractRequirements: (body: ExtractRequirementsRequest) =>
    request<JobDraft>('/jobs/extract-requirements', { method: 'POST', json: body }),
  reanalyze: (jobId: string) =>
    request<QueuedResult>(`/jobs/${enc(jobId)}/reanalyze`, { method: 'POST' }),
  progress: (jobId: string, signal?: AbortSignal) =>
    request<Progress>(`/jobs/${enc(jobId)}/progress`, { signal }),
}

export const resumesApi = {
  list: (jobId: string, status?: ProcessingStatus, signal?: AbortSignal) =>
    request<ResumeOut[]>(`/jobs/${enc(jobId)}/resumes`, { query: { status }, signal }),
  /** `multipart/form-data`, field name `files` (repeated). */
  upload: (jobId: string, files: readonly File[], signal?: AbortSignal) => {
    const formData = new FormData()
    for (const file of files) formData.append('files', file, file.name)
    return request<UploadResult>(`/jobs/${enc(jobId)}/resumes`, { method: 'POST', formData, signal })
  },
  retry: (resumeId: string) => request<ResumeOut>(`/resumes/${enc(resumeId)}/retry`, { method: 'POST' }),
  retryFailed: (jobId: string) =>
    request<QueuedResult>(`/jobs/${enc(jobId)}/resumes/retry-failed`, { method: 'POST' }),
  remove: (resumeId: string) => request<void>(`/resumes/${enc(resumeId)}`, { method: 'DELETE' }),
  fileUrl: (resumeId: string) => apiUrl(`/resumes/${enc(resumeId)}/file`),
}

export const candidatesApi = {
  list: (jobId: string, params?: CandidateListParams, signal?: AbortSignal) =>
    request<CandidateListResponse>(`/jobs/${enc(jobId)}/candidates`, {
      query: candidateQuery(params),
      signal,
    }),
  exportUrl: (jobId: string, params?: CandidateListParams) =>
    apiUrl(`/jobs/${enc(jobId)}/candidates/export`, exportQuery(params)),
  bulkStatus: (jobId: string, body: BulkStatusRequest) =>
    request<BulkStatusResult>(`/jobs/${enc(jobId)}/candidates/bulk-status`, { method: 'POST', json: body }),
  aiSearch: (jobId: string, body: AISearchRequest, signal?: AbortSignal) =>
    request<AISearchResponse>(`/jobs/${enc(jobId)}/candidates/ai-search`, {
      method: 'POST',
      json: body,
      signal,
    }),
  get: (candidateId: string, signal?: AbortSignal) =>
    request<CandidateDetail>(`/candidates/${enc(candidateId)}`, { signal }),
  update: (candidateId: string, body: CandidateUpdate) =>
    request<CandidateDetail>(`/candidates/${enc(candidateId)}`, { method: 'PATCH', json: body }),
  rankExplanation: (candidateId: string, refresh = false, signal?: AbortSignal) =>
    request<RankExplanation>(`/candidates/${enc(candidateId)}/rank-explanation`, {
      query: { refresh: refresh ? 'true' : undefined },
      signal,
    }),
}

export const shortlistApi = {
  list: (jobId?: string, signal?: AbortSignal) =>
    request<ShortlistItem[]>('/shortlist', { query: { job_id: jobId }, signal }),
  exportUrl: (jobId?: string) => apiUrl('/shortlist/export', { job_id: jobId }),
}
