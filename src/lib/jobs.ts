import type { JobStats } from '../api/types'

export interface JobProgressInfo {
  isProcessing: boolean
  /** 0..100 */
  percent: number
  done: number
  pending: number
}

export function jobProgress(stats: JobStats): JobProgressInfo {
  const pending = stats.queued + stats.processing
  const done = stats.completed + stats.failed
  return {
    isProcessing: pending > 0,
    percent: stats.total_resumes > 0 ? (done / stats.total_resumes) * 100 : 0,
    done,
    pending,
  }
}

export function analyzedCount(stats: JobStats): number {
  return stats.tier_counts.strong + stats.tier_counts.good + stats.tier_counts.partial + stats.tier_counts.low
}
