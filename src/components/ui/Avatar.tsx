import { cn } from '../../lib/cn'
import { initials } from '../../lib/format'

const PALETTE = [
  'bg-indigo-100 text-indigo-700',
  'bg-violet-100 text-violet-700',
  'bg-sky-100 text-sky-700',
  'bg-teal-100 text-teal-700',
  'bg-fuchsia-100 text-fuchsia-700',
  'bg-orange-100 text-orange-700',
]

function hash(text: string): number {
  let h = 0
  for (let i = 0; i < text.length; i += 1) h = (h * 31 + text.charCodeAt(i)) | 0
  return Math.abs(h)
}

export function Avatar({ name, size = 'md', className }: { name: string | null; size?: 'sm' | 'md' | 'lg'; className?: string }) {
  const color = PALETTE[hash(name ?? '?') % PALETTE.length]
  return (
    <span
      className={cn(
        'inline-flex shrink-0 items-center justify-center rounded-full font-semibold',
        size === 'sm' && 'h-7 w-7 text-[11px]',
        size === 'md' && 'h-9 w-9 text-xs',
        size === 'lg' && 'h-14 w-14 text-lg',
        color,
        className,
      )}
      aria-hidden
    >
      {initials(name)}
    </span>
  )
}
