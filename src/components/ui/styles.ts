import { cn } from '../../lib/cn'

export type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'danger' | 'soft' | 'success' | 'warning'
export type ButtonSize = 'xs' | 'sm' | 'md' | 'lg'

const base =
  'inline-flex items-center justify-center gap-2 rounded-lg font-medium whitespace-nowrap select-none transition-colors ' +
  'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:ring-offset-2 ' +
  'disabled:pointer-events-none disabled:opacity-50 aria-disabled:pointer-events-none aria-disabled:opacity-50'

const variants: Record<ButtonVariant, string> = {
  primary: 'bg-indigo-600 text-white shadow-sm hover:bg-indigo-700 active:bg-indigo-800',
  secondary: 'bg-white text-slate-700 shadow-sm ring-1 ring-inset ring-slate-300 hover:bg-slate-50 hover:text-slate-900',
  ghost: 'text-slate-600 hover:bg-slate-100 hover:text-slate-900',
  danger: 'bg-rose-600 text-white shadow-sm hover:bg-rose-700 active:bg-rose-800',
  soft: 'bg-indigo-50 text-indigo-700 hover:bg-indigo-100',
  success: 'bg-emerald-600 text-white shadow-sm hover:bg-emerald-700 active:bg-emerald-800',
  warning: 'bg-amber-600 text-white shadow-sm hover:bg-amber-700 active:bg-amber-800',
}

const sizes: Record<ButtonSize, string> = {
  xs: 'h-7 px-2 text-xs',
  sm: 'h-8 px-3 text-sm',
  md: 'h-9 px-3.5 text-sm',
  lg: 'h-11 px-5 text-base',
}

const iconSizes: Record<ButtonSize, string> = {
  xs: 'h-7 w-7',
  sm: 'h-8 w-8',
  md: 'h-9 w-9',
  lg: 'h-11 w-11',
}

export interface ButtonStyleOptions {
  variant?: ButtonVariant
  size?: ButtonSize
  iconOnly?: boolean
  block?: boolean
  className?: string
}

export function buttonClasses({
  variant = 'secondary',
  size = 'md',
  iconOnly = false,
  block = false,
  className,
}: ButtonStyleOptions = {}): string {
  return cn(base, variants[variant], iconOnly ? iconSizes[size] : sizes[size], block && 'w-full', className)
}

export const inputBase =
  'block w-full rounded-lg border-0 bg-white text-sm text-slate-900 shadow-sm ring-1 ring-inset ring-slate-300 ' +
  'placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-inset focus:ring-indigo-500 ' +
  'disabled:cursor-not-allowed disabled:bg-slate-50 disabled:text-slate-500'

export const inputInvalid = 'ring-rose-400 focus:ring-rose-500'

export type BadgeTone = 'neutral' | 'indigo' | 'emerald' | 'sky' | 'amber' | 'rose' | 'violet'

export const badgeTones: Record<BadgeTone, string> = {
  neutral: 'bg-slate-100 text-slate-700 ring-slate-500/20',
  indigo: 'bg-indigo-50 text-indigo-700 ring-indigo-600/20',
  emerald: 'bg-emerald-50 text-emerald-700 ring-emerald-600/20',
  sky: 'bg-sky-50 text-sky-700 ring-sky-600/20',
  amber: 'bg-amber-50 text-amber-800 ring-amber-600/25',
  rose: 'bg-rose-50 text-rose-700 ring-rose-600/20',
  violet: 'bg-violet-50 text-violet-700 ring-violet-600/20',
}
