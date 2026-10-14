import { AlertTriangle, RefreshCw } from 'lucide-react'
import { errorMessage } from '../../api/client'
import { cn } from '../../lib/cn'
import { Button } from './Button'

export interface ErrorStateProps {
  title?: string
  error: unknown
  onRetry?: () => void
  retrying?: boolean
  className?: string
  compact?: boolean
}

export function ErrorState({ title = 'Something went wrong', error, onRetry, retrying, className, compact }: ErrorStateProps) {
  return (
    <div
      role="alert"
      className={cn(
        'flex flex-col items-center justify-center rounded-xl border border-rose-200 bg-rose-50/50 text-center',
        compact ? 'px-4 py-6' : 'px-6 py-12',
        className,
      )}
    >
      <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-full bg-rose-100 text-rose-600">
        <AlertTriangle className="h-5 w-5" />
      </div>
      <h3 className="text-sm font-semibold text-slate-900">{title}</h3>
      <p className="mt-1 max-w-md text-sm text-slate-600">{errorMessage(error)}</p>
      {onRetry && (
        <Button className="mt-4" size="sm" onClick={onRetry} loading={retrying} icon={<RefreshCw className="h-4 w-4" />}>
          Try again
        </Button>
      )}
    </div>
  )
}
