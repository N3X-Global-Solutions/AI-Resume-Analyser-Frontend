import { CheckCircle2, CircleDashed, XCircle } from 'lucide-react'
import type { MatchLevel } from '../api/types'
import { cn } from '../lib/cn'
import { MATCH_LEVEL_META } from '../lib/constants'

/** ✓ met (emerald) · ◐ partial (amber) · ✗ missing (rose) */
export function MatchLevelIcon({ level, className }: { level: MatchLevel; className?: string }) {
  const meta = MATCH_LEVEL_META[level]
  const Icon = level === 'met' ? CheckCircle2 : level === 'partial' ? CircleDashed : XCircle
  return <Icon className={cn('h-4 w-4 shrink-0', meta.text, className)} aria-label={meta.label} role="img" />
}
