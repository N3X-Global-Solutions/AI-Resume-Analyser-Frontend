import type { HTMLAttributes } from 'react'
import { cn } from '../../lib/cn'
import { badgeTones, type BadgeTone } from './styles'

export interface BadgeProps extends HTMLAttributes<HTMLSpanElement> {
  tone?: BadgeTone
  size?: 'sm' | 'md'
  /** Custom colour classes (overrides tone). */
  colorClassName?: string
  dotClassName?: string
}

export function Badge({ tone = 'neutral', size = 'sm', colorClassName, dotClassName, className, children, ...rest }: BadgeProps) {
  return (
    <span
      className={cn(
        'inline-flex shrink-0 items-center gap-1.5 rounded-md font-medium whitespace-nowrap ring-1 ring-inset',
        size === 'sm' ? 'px-1.5 py-0.5 text-xs' : 'px-2 py-1 text-sm',
        colorClassName ?? badgeTones[tone],
        className,
      )}
      {...rest}
    >
      {dotClassName && <span className={cn('h-1.5 w-1.5 rounded-full', dotClassName)} aria-hidden />}
      {children}
    </span>
  )
}
