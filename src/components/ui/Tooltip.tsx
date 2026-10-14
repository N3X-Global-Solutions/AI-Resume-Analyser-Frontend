import { useId, type ReactNode } from 'react'
import { cn } from '../../lib/cn'

export interface TooltipProps {
  content: ReactNode
  children: ReactNode
  side?: 'top' | 'bottom'
  className?: string
  /** Width class for the bubble, default auto up to 16rem. */
  bubbleClassName?: string
}

/** CSS-only tooltip shown on hover and keyboard focus of the wrapped element. */
export function Tooltip({ content, children, side = 'top', className, bubbleClassName }: TooltipProps) {
  const id = useId()
  return (
    <span className={cn('group/tooltip relative inline-flex', className)} aria-describedby={id}>
      {children}
      <span
        id={id}
        role="tooltip"
        className={cn(
          'pointer-events-none absolute left-1/2 z-50 w-max max-w-64 -translate-x-1/2 rounded-md bg-slate-900 px-2 py-1 text-xs leading-snug font-normal text-white opacity-0 shadow-lg transition-opacity duration-150',
          'group-hover/tooltip:opacity-100 group-focus-within/tooltip:opacity-100',
          side === 'top' ? 'bottom-full mb-1.5' : 'top-full mt-1.5',
          bubbleClassName,
        )}
      >
        {content}
      </span>
    </span>
  )
}
