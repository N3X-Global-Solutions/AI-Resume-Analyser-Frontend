import type { CandidateListParams, JobStatus } from './types'

/**
 * Central React Query keys.
 * Everything that belongs to one job lives under `['job', jobId, ...]` so a single
 * prefix invalidation refreshes the job, its progress, resumes and candidate lists.
 */
export const queryKeys = {
  me: ['auth', 'me'] as const,
  health: ['health'] as const,
  dashboard: ['dashboard'] as const,

  jobsRoot: ['jobs'] as const,
  jobs: (status: JobStatus | 'all') => ['jobs', status] as const,

  job: (jobId: string) => ['job', jobId] as const,
  jobDetail: (jobId: string) => ['job', jobId, 'detail'] as const,
  progress: (jobId: string) => ['job', jobId, 'progress'] as const,
  resumes: (jobId: string) => ['job', jobId, 'resumes'] as const,
  candidatesRoot: (jobId: string) => ['job', jobId, 'candidates'] as const,
  candidates: (jobId: string, params: CandidateListParams) => ['job', jobId, 'candidates', params] as const,
  candidateCount: (jobId: string, params: CandidateListParams) =>
    ['job', jobId, 'candidates', 'count', params] as const,

  candidateRoot: ['candidate'] as const,
  candidate: (candidateId: string) => ['candidate', candidateId] as const,
  rankExplanation: (candidateId: string) => ['candidate', candidateId, 'rank-explanation'] as const,

  shortlistRoot: ['shortlist'] as const,
  shortlist: (jobId: string | null) => ['shortlist', jobId ?? 'all'] as const,
}
