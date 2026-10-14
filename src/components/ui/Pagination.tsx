import { ChevronLeft, ChevronRight } from 'lucide-react'
import { cn } from '../../lib/cn'
import { formatNumber } from '../../lib/format'

function pageWindow(page: number, pages: number): (number | 'gap')[] {
  if (pages <= 7) return Array.from({ length: pages }, (_, i) => i + 1)
  const result: (number | 'gap')[] = [1]
  const start = Math.max(2, page - 1)
  const end = Math.min(pages - 1, page + 1)
  if (start > 2) result.push('gap')
  for (let p = start; p <= end; p += 1) result.push(p)
  if (end < pages - 1) result.push('gap')
  result.push(pages)
  return result
}

export function Pagination({
  page,
  pageSize,
  total,
  onChange,
  className,
}: {
  page: number
  pageSize: number
  total: number
  onChange: (page: number) => void
  className?: string
}) {
  const pages = Math.max(1, Math.ceil(total / pageSize))
  const from = total === 0 ? 0 : (page - 1) * pageSize + 1
  const to = Math.min(total, page * pageSize)
  const button =
    'inline-flex h-8 min-w-8 items-center justify-center rounded-md px-2 text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 disabled:pointer-events-none disabled:opacity-40'

  return (
    <nav className={cn('flex flex-col items-center justify-between gap-3 sm:flex-row', className)} aria-label="Pagination">
      <p className="text-sm text-slate-500 tabular-nums">
        Showing <span className="font-medium text-slate-700">{formatNumber(from)}</span>–
        <span className="font-medium text-slate-700">{formatNumber(to)}</span> of{' '}
        <span className="font-medium text-slate-700">{formatNumber(total)}</span>
      </p>
      {pages > 1 && (
        <div className="flex items-center gap-1">
          <button
            type="button"
            className={cn(button, 'text-slate-600 hover:bg-slate-100')}
            onClick={() => onChange(page - 1)}
            disabled={page <= 1}
            aria-label="Previous page"
          >
            <ChevronLeft className="h-4 w-4" />
          </button>
          {pageWindow(page, pages).map((item, index) =>
            item === 'gap' ? (
              <span key={`gap-${index}`} className="px-1 text-slate-400" aria-hidden>
                …
              </span>
            ) : (
              <button
                key={item}
                type="button"
                onClick={() => onChange(item)}
                aria-current={item === page ? 'page' : undefined}
                className={cn(
                  button,
                  'tabular-nums',
                  item === page ? 'bg-indigo-600 text-white' : 'text-slate-600 hover:bg-slate-100',
                )}
              >
                {item}
              </button>
            ),
          )}
          <button
            type="button"
            className={cn(button, 'text-slate-600 hover:bg-slate-100')}
            onClick={() => onChange(page + 1)}
            disabled={page >= pages}
            aria-label="Next page"
          >
            <ChevronRight className="h-4 w-4" />
          </button>
        </div>
      )}
    </nav>
  )
}
