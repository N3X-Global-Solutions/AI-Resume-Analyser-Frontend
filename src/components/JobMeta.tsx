import { Briefcase, Building2, MapPin } from 'lucide-react'
import type { WorkMode } from '../api/types'
import { cn } from '../lib/cn'
import { WORK_MODE_LABELS } from '../lib/constants'

export function JobMeta({
  department,
  location,
  workMode,
  className,
}: {
  department: string | null
  location: string | null
  workMode: WorkMode | null
  className?: string
}) {
  const parts = [
    department ? { key: 'department', icon: Building2, text: department } : null,
    location ? { key: 'location', icon: MapPin, text: location } : null,
    workMode ? { key: 'mode', icon: Briefcase, text: WORK_MODE_LABELS[workMode] } : null,
  ].filter((part): part is NonNullable<typeof part> => part !== null)

  if (parts.length === 0) return null
  return (
    <div className={cn('flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-slate-500', className)}>
      {parts.map(({ key, icon: Icon, text }) => (
        <span key={key} className="inline-flex items-center gap-1.5">
          <Icon className="h-3.5 w-3.5 text-slate-400" aria-hidden />
          {text}
        </span>
      ))}
    </div>
  )
}
