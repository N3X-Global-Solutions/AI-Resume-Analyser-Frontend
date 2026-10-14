import { forwardRef, type InputHTMLAttributes, type ReactNode, type SelectHTMLAttributes, type TextareaHTMLAttributes } from 'react'
import { ChevronDown } from 'lucide-react'
import { cn } from '../../lib/cn'
import { inputBase, inputInvalid } from './styles'

export interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  invalid?: boolean
  /** Element rendered inside the field on the left (e.g. a search icon). */
  leading?: ReactNode
  /** Element rendered inside the field on the right (e.g. a unit or clear button). */
  trailing?: ReactNode
  inputSize?: 'sm' | 'md'
}

export const Input = forwardRef<HTMLInputElement, InputProps>(function Input(
  { invalid, leading, trailing, className, inputSize = 'md', ...rest },
  ref,
) {
  const height = inputSize === 'sm' ? 'h-8' : 'h-9'
  if (!leading && !trailing) {
    return (
      <input
        ref={ref}
        aria-invalid={invalid || undefined}
        className={cn(inputBase, height, 'px-3', invalid && inputInvalid, className)}
        {...rest}
      />
    )
  }
  return (
    <div className={cn('relative', className)}>
      {leading && (
        <span className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3 text-slate-400">{leading}</span>
      )}
      <input
        ref={ref}
        aria-invalid={invalid || undefined}
        className={cn(inputBase, height, leading ? 'pl-9' : 'pl-3', trailing ? 'pr-10' : 'pr-3', invalid && inputInvalid)}
        {...rest}
      />
      {trailing && <span className="absolute inset-y-0 right-0 flex items-center pr-2 text-slate-400">{trailing}</span>}
    </div>
  )
})

export interface TextareaProps extends TextareaHTMLAttributes<HTMLTextAreaElement> {
  invalid?: boolean
}

export const Textarea = forwardRef<HTMLTextAreaElement, TextareaProps>(function Textarea(
  { invalid, className, rows = 4, ...rest },
  ref,
) {
  return (
    <textarea
      ref={ref}
      rows={rows}
      aria-invalid={invalid || undefined}
      className={cn(inputBase, 'px-3 py-2 leading-relaxed', invalid && inputInvalid, className)}
      {...rest}
    />
  )
})

export interface SelectProps extends SelectHTMLAttributes<HTMLSelectElement> {
  invalid?: boolean
  selectSize?: 'sm' | 'md'
}

export const Select = forwardRef<HTMLSelectElement, SelectProps>(function Select(
  { invalid, className, selectSize = 'md', children, ...rest },
  ref,
) {
  return (
    <div className={cn('relative', className)}>
      <select
        ref={ref}
        aria-invalid={invalid || undefined}
        className={cn(
          inputBase,
          selectSize === 'sm' ? 'h-8' : 'h-9',
          'appearance-none py-0 pr-9 pl-3',
          invalid && inputInvalid,
        )}
        {...rest}
      >
        {children}
      </select>
      <ChevronDown className="pointer-events-none absolute top-1/2 right-2.5 h-4 w-4 -translate-y-1/2 text-slate-400" aria-hidden />
    </div>
  )
})
