import type { ReactNode } from 'react'
import { cn } from '../../lib/cn'

export interface FieldProps {
  label: ReactNode
  htmlFor?: string
  hint?: ReactNode
  error?: string | null
  required?: boolean
  className?: string
  /** Rendered to the right of the label (e.g. a counter or link). */
  aside?: ReactNode
  children: ReactNode
}

export function Field({ label, htmlFor, hint, error, required, className, aside, children }: FieldProps) {
  return (
    <div className={cn('space-y-1.5', className)}>
      <div className="flex items-baseline justify-between gap-2">
        <label htmlFor={htmlFor} className="text-sm font-medium text-slate-700">
          {label}
          {required && (
            <span className="ml-0.5 text-rose-500" aria-hidden>
              *
            </span>
          )}
        </label>
        {aside && <div className="text-xs text-slate-500">{aside}</div>}
      </div>
      {children}
      {error ? (
        <p className="text-xs font-medium text-rose-600" role="alert">
          {error}
        </p>
      ) : hint ? (
        <p className="text-xs text-slate-500">{hint}</p>
      ) : null}
    </div>
  )
}
