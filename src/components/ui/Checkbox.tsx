import type { InputHTMLAttributes } from 'react'
import { cn } from '../../lib/cn'

export interface CheckboxProps extends Omit<InputHTMLAttributes<HTMLInputElement>, 'type'> {
  indeterminate?: boolean
  label?: string
}

export function Checkbox({ indeterminate = false, label, className, ...rest }: CheckboxProps) {
  const input = (
    <input
      type="checkbox"
      ref={(el) => {
        if (el) el.indeterminate = indeterminate
      }}
      className={cn(
        'h-4 w-4 shrink-0 cursor-pointer rounded border-slate-300 text-indigo-600 accent-indigo-600',
        'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-500',
        'disabled:cursor-not-allowed disabled:opacity-50',
        !label && className,
      )}
      {...rest}
    />
  )
  if (!label) return input
  return (
    <label className={cn('inline-flex cursor-pointer items-center gap-2 text-sm text-slate-700', className)}>
      {input}
      <span>{label}</span>
    </label>
  )
}
