import type { ReactNode } from 'react'
import { cn } from '../../lib/cn'

export interface StatCardProps {
  label: string
  value: ReactNode
  icon?: ReactNode
  hint?: ReactNode
  tone?: 'default' | 'danger'
  className?: string
}

export function StatCard({ label, value, icon, hint, tone = 'default', className }: StatCardProps) {
  return (
    <div
      className={cn(
        'rounded-xl border bg-white p-4 shadow-xs',
        tone === 'danger' ? 'border-rose-200' : 'border-slate-200',
        className,
      )}
    >
      <div className="flex items-center justify-between gap-2">
        <span className="text-sm font-medium text-slate-500">{label}</span>
        {icon && (
          <span
            className={cn(
              'flex h-8 w-8 items-center justify-center rounded-lg [&>svg]:h-4 [&>svg]:w-4',
              tone === 'danger' ? 'bg-rose-50 text-rose-600' : 'bg-indigo-50 text-indigo-600',
            )}
          >
            {icon}
          </span>
        )}
      </div>
      <div className="mt-2 text-2xl font-semibold tracking-tight text-slate-900 tabular-nums">{value}</div>
      {hint && <div className="mt-1 text-xs text-slate-500">{hint}</div>}
    </div>
  )
}
