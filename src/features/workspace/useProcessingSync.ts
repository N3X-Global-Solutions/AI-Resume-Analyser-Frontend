import { useQueryClient } from '@tanstack/react-query'
import { useEffect, useRef } from 'react'
import { toast } from 'sonner'
import { invalidateGlobal } from '../../api/hooks'
import { queryKeys } from '../../api/queryKeys'
import type { Progress } from '../../api/types'
import { pluralize } from '../../lib/format'

/**
 * Whenever the polled progress changes, refresh everything derived from it
 * (job stats, resume list, candidate ranking, dashboard). Toasts when a run finishes.
 */
export function useProcessingSync(jobId: string, progress: Progress | undefined, onFinished?: () => void) {
  const qc = useQueryClient()
  const previous = useRef<Progress | null>(null)
  const onFinishedRef = useRef(onFinished)

  useEffect(() => {
    onFinishedRef.current = onFinished
  })

  useEffect(() => {
    if (!progress) return
    const prev = previous.current
    previous.current = progress
    if (!prev || prev === progress) return

    void qc.invalidateQueries({
      queryKey: queryKeys.job(jobId),
      predicate: (query) => query.queryKey[2] !== 'progress' && query.queryKey[2] !== undefined,
    })
    invalidateGlobal(qc)

    if (prev.is_processing && !progress.is_processing) {
      void qc.invalidateQueries({ queryKey: queryKeys.candidateRoot })
      const description =
        progress.failed > 0
          ? `${pluralize(progress.completed, 'resume')} analyzed · ${progress.failed} failed`
          : `${pluralize(progress.completed, 'resume')} analyzed and ranked`
      const finished = onFinishedRef.current
      toast.success('Analysis complete', {
        description,
        action: finished ? { label: 'View ranking', onClick: finished } : undefined,
      })
    }
  }, [progress, jobId, qc])
}
