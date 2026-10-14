import { Globe } from 'lucide-react'
import type { ResumeSource } from '../api/types'
import { Badge } from './ui'

/** "Job portal" marker for resumes sent by the intake API; renders nothing for manual uploads (or older backends). */
export function SourceBadge({ source, className }: { source: ResumeSource | undefined; className?: string }) {
  if (source !== 'portal') return null
  return (
    <Badge tone="indigo" className={className} title="Received from the job portal">
      <Globe className="h-3 w-3" aria-hidden />
      Job portal
    </Badge>
  )
}
