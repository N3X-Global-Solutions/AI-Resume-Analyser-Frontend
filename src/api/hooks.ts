import {
  keepPreviousData,
  useMutation,
  useMutationState,
  useQuery,
  useQueryClient,
  type QueryClient,
} from '@tanstack/react-query'
import { authApi, candidatesApi, dashboardApi, healthApi, jobsApi, resumesApi, shortlistApi } from './endpoints'
import { queryKeys } from './queryKeys'
import type {
  AISearchRequest,
  BulkStatusRequest,
  CandidateDetail,
  CandidateListParams,
  CandidateListResponse,
  CandidateUpdate,
  ExtractRequirementsRequest,
  Job,
  JobCreate,
  JobStatus,
  JobUpdate,
  LoginRequest,
  ShortlistItem,
} from './types'

// ---------------------------------------------------------------------------
// Invalidation helpers
// ---------------------------------------------------------------------------

/** Everything aggregated across jobs. */
export function invalidateGlobal(qc: QueryClient) {
  void qc.invalidateQueries({ queryKey: queryKeys.dashboard })
  void qc.invalidateQueries({ queryKey: queryKeys.jobsRoot })
  void qc.invalidateQueries({ queryKey: queryKeys.shortlistRoot })
}

/** A job and everything under it (progress, resumes, candidate lists) + global aggregates. */
export function invalidateJobTree(qc: QueryClient, jobId: string) {
  void qc.invalidateQueries({ queryKey: queryKeys.job(jobId) })
  invalidateGlobal(qc)
}

// ---------------------------------------------------------------------------
// Queries
// ---------------------------------------------------------------------------

/** The signed-in admin. Fails with a 401 ApiError when there is no valid session. */
export function useMe() {
  return useQuery({
    queryKey: queryKeys.me,
    queryFn: ({ signal }) => authApi.me(signal),
    staleTime: Infinity,
    retry: false,
  })
}

export function useLogin() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (body: LoginRequest) => authApi.login(body),
    meta: { errorTitle: false },
    onSuccess: (data) => {
      // Drop anything cached by a previous session before showing the app.
      qc.clear()
      qc.setQueryData(queryKeys.me, data.admin)
    },
  })
}

export function useLogout() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: () => authApi.logout(),
    meta: { errorTitle: 'Sign out failed' },
    onSuccess: () => qc.clear(),
  })
}

export function useHealth() {
  return useQuery({
    queryKey: queryKeys.health,
    queryFn: ({ signal }) => healthApi.get(signal),
    refetchInterval: 30_000,
    retry: false,
  })
}

export function useDashboard() {
  return useQuery({
    queryKey: queryKeys.dashboard,
    queryFn: ({ signal }) => dashboardApi.get(signal),
    // processing_resumes counts queued + processing resumes across all jobs.
    refetchInterval: (query) => ((query.state.data?.processing_resumes ?? 0) > 0 ? 4000 : false),
  })
}

export function useJobs(status: JobStatus | 'all') {
  return useQuery({
    queryKey: queryKeys.jobs(status),
    queryFn: ({ signal }) => jobsApi.list(status === 'all' ? undefined : status, signal),
    // Keep per-job progress fresh while any listed job still has queued / processing resumes.
    refetchInterval: (query) =>
      query.state.data?.some((job) => job.stats.queued + job.stats.processing > 0) ? 4000 : false,
  })
}

export function useJob(jobId: string | undefined) {
  return useQuery({
    queryKey: queryKeys.jobDetail(jobId ?? ''),
    queryFn: ({ signal }) => jobsApi.get(jobId ?? '', signal),
    enabled: Boolean(jobId),
  })
}

/** Polls every 2 s while the job still has queued / processing resumes. */
export function useProgress(jobId: string | undefined) {
  return useQuery({
    queryKey: queryKeys.progress(jobId ?? ''),
    queryFn: ({ signal }) => jobsApi.progress(jobId ?? '', signal),
    enabled: Boolean(jobId),
    staleTime: 0,
    refetchInterval: (query) => (query.state.data?.is_processing ? 2000 : false),
    refetchIntervalInBackground: false,
  })
}

export function useResumes(jobId: string) {
  return useQuery({
    queryKey: queryKeys.resumes(jobId),
    queryFn: ({ signal }) => resumesApi.list(jobId, undefined, signal),
    placeholderData: keepPreviousData,
  })
}

export function useCandidates(jobId: string, params: CandidateListParams, enabled = true) {
  return useQuery({
    queryKey: queryKeys.candidates(jobId, params),
    queryFn: ({ signal }) => candidatesApi.list(jobId, params, signal),
    placeholderData: keepPreviousData,
    enabled,
  })
}

/** Exact number of candidates matching a filter (uses the list endpoint with page_size=1). */
export function useCandidateCount(jobId: string, params: CandidateListParams, enabled: boolean) {
  const countParams: CandidateListParams = { ...params, page: 1, page_size: 1 }
  return useQuery({
    queryKey: queryKeys.candidateCount(jobId, countParams),
    queryFn: ({ signal }) => candidatesApi.list(jobId, countParams, signal),
    select: (data) => data.total,
    enabled,
    staleTime: 0,
  })
}

/** The single candidate at a given job-wide rank (used for prev / next navigation). */
export function useCandidateAtRank(jobId: string | undefined, rank: number | null) {
  const params: CandidateListParams = { sort: 'score', order: 'desc', page: rank ?? 1, page_size: 1 }
  return useQuery({
    queryKey: queryKeys.candidates(jobId ?? '', params),
    queryFn: ({ signal }) => candidatesApi.list(jobId ?? '', params, signal),
    select: (data) => {
      const item = data.items[0]
      return item && item.rank === rank ? item : null
    },
    enabled: Boolean(jobId) && rank !== null && rank >= 1,
    staleTime: 60_000,
  })
}

export function useCandidate(candidateId: string | undefined) {
  return useQuery({
    queryKey: queryKeys.candidate(candidateId ?? ''),
    queryFn: ({ signal }) => candidatesApi.get(candidateId ?? '', signal),
    enabled: Boolean(candidateId),
  })
}

/** LLM call — only runs once `enabled` (the user asked for it), then stays cached. */
export function useRankExplanation(candidateId: string, enabled: boolean) {
  return useQuery({
    queryKey: queryKeys.rankExplanation(candidateId),
    queryFn: ({ signal }) => candidatesApi.rankExplanation(candidateId, false, signal),
    enabled,
    staleTime: Infinity,
    retry: false,
  })
}

export function useShortlist(jobId: string | null) {
  return useQuery({
    queryKey: queryKeys.shortlist(jobId),
    queryFn: ({ signal }) => shortlistApi.list(jobId ?? undefined, signal),
    placeholderData: keepPreviousData,
  })
}

// ---------------------------------------------------------------------------
// Job mutations
// ---------------------------------------------------------------------------

export function useCreateJob() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (body: JobCreate) => jobsApi.create(body),
    meta: { errorTitle: 'Could not create the job' },
    onSuccess: (job) => {
      qc.setQueryData(queryKeys.jobDetail(job.id), job)
      invalidateGlobal(qc)
    },
  })
}

export function useUpdateJob(jobId: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (body: JobUpdate) => jobsApi.update(jobId, body),
    meta: { errorTitle: 'Could not update the job' },
    onSuccess: (job) => {
      qc.setQueryData(queryKeys.jobDetail(job.id), job)
      // Weight changes re-score synchronously → candidate scores / ranks may have changed.
      void qc.invalidateQueries({
        queryKey: queryKeys.job(job.id),
        predicate: (query) => query.queryKey[2] !== 'detail',
      })
      void qc.invalidateQueries({ queryKey: queryKeys.candidateRoot })
      invalidateGlobal(qc)
    },
  })
}

/** Close / reopen from list views (job id passed per call). */
export function useSetJobStatus() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ jobId, status }: { jobId: string; status: JobStatus }) => jobsApi.update(jobId, { status }),
    meta: { errorTitle: 'Could not change the job status' },
    onSuccess: (job) => {
      qc.setQueryData<Job>(queryKeys.jobDetail(job.id), job)
      invalidateGlobal(qc)
    },
  })
}

export function useDeleteJob() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (jobId: string) => jobsApi.remove(jobId),
    meta: { errorTitle: 'Could not delete the job' },
    onSuccess: (_data, jobId) => {
      qc.removeQueries({ queryKey: queryKeys.job(jobId) })
      invalidateGlobal(qc)
    },
  })
}

export function useExtractRequirements() {
  return useMutation({
    mutationFn: (body: ExtractRequirementsRequest) => jobsApi.extractRequirements(body),
    meta: { errorTitle: false },
  })
}

export function useReanalyze(jobId: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: () => jobsApi.reanalyze(jobId),
    meta: { errorTitle: 'Could not start re-analysis' },
    onSuccess: () => {
      invalidateJobTree(qc, jobId)
      void qc.invalidateQueries({ queryKey: queryKeys.candidateRoot })
    },
  })
}

// ---------------------------------------------------------------------------
// Resume mutations
// ---------------------------------------------------------------------------

export function useRetryResume(jobId: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (resumeId: string) => resumesApi.retry(resumeId),
    meta: { errorTitle: 'Retry failed' },
    onSuccess: () => invalidateJobTree(qc, jobId),
  })
}

export function useRetryFailed(jobId: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: () => resumesApi.retryFailed(jobId),
    meta: { errorTitle: 'Could not retry failed resumes' },
    onSuccess: () => invalidateJobTree(qc, jobId),
  })
}

export function useDeleteResume(jobId: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (resumeId: string) => resumesApi.remove(resumeId),
    meta: { errorTitle: 'Could not delete the resume' },
    onSuccess: () => {
      invalidateJobTree(qc, jobId)
      void qc.invalidateQueries({ queryKey: queryKeys.candidateRoot })
    },
  })
}

// ---------------------------------------------------------------------------
// Candidate mutations
// ---------------------------------------------------------------------------

export interface UpdateCandidateVars {
  candidateId: string
  jobId: string
  update: CandidateUpdate
}

export const UPDATE_CANDIDATE_KEY = ['candidate', 'update'] as const

export function useUpdateCandidate() {
  const qc = useQueryClient()
  return useMutation({
    mutationKey: UPDATE_CANDIDATE_KEY,
    mutationFn: ({ candidateId, update }: UpdateCandidateVars) => candidatesApi.update(candidateId, update),
    meta: { errorTitle: 'Could not update the candidate' },
    onMutate: async ({ candidateId, jobId, update }) => {
      const status = update.status
      if (!status) return
      // Optimistically reflect the new status in cached lists and detail.
      await qc.cancelQueries({ queryKey: queryKeys.candidatesRoot(jobId) })
      qc.setQueriesData<CandidateListResponse>({ queryKey: queryKeys.candidatesRoot(jobId) }, (old) =>
        old && Array.isArray(old.items)
          ? { ...old, items: old.items.map((item) => (item.id === candidateId ? { ...item, status } : item)) }
          : old,
      )
      qc.setQueryData<CandidateDetail>(queryKeys.candidate(candidateId), (old) => (old ? { ...old, status } : old))
      qc.setQueriesData<ShortlistItem[]>({ queryKey: queryKeys.shortlistRoot }, (old) =>
        Array.isArray(old) ? old.map((item) => (item.id === candidateId ? { ...item, status } : item)) : old,
      )
    },
    onSuccess: (candidate) => {
      qc.setQueryData(queryKeys.candidate(candidate.id), candidate)
    },
    onSettled: (_data, _error, { jobId, update }) => {
      if (update.status === undefined) return // notes only: nothing else changes
      void qc.invalidateQueries({ queryKey: queryKeys.candidatesRoot(jobId) })
      void qc.invalidateQueries({ queryKey: queryKeys.jobDetail(jobId) })
      invalidateGlobal(qc)
    },
  })
}

/** Ids of candidates with a status / notes update in flight. */
export function usePendingCandidateIds(): Set<string> {
  const variables = useMutationState({
    filters: { mutationKey: UPDATE_CANDIDATE_KEY, status: 'pending' },
    select: (mutation) => mutation.state.variables as UpdateCandidateVars | undefined,
  })
  return new Set(variables.flatMap((v) => (v ? [v.candidateId] : [])))
}

export function useBulkStatus(jobId: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (body: BulkStatusRequest) => candidatesApi.bulkStatus(jobId, body),
    meta: { errorTitle: 'Bulk update failed' },
    onSuccess: () => {
      invalidateJobTree(qc, jobId)
      void qc.invalidateQueries({ queryKey: queryKeys.candidateRoot })
    },
  })
}

export function useAISearch(jobId: string) {
  return useMutation({
    mutationFn: (body: AISearchRequest) => candidatesApi.aiSearch(jobId, body),
    meta: { errorTitle: false },
  })
}

export function useRegenerateRankExplanation(candidateId: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: () => candidatesApi.rankExplanation(candidateId, true),
    meta: { errorTitle: 'Could not regenerate the explanation' },
    onSuccess: (explanation) => {
      qc.setQueryData(queryKeys.rankExplanation(candidateId), explanation)
    },
  })
}
