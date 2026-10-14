import { cn } from '../lib/cn'

/** Small "ranked bars" logo mark. */
export function LogoMark({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 32 32" className={cn('h-8 w-8', className)} aria-hidden>
      <rect width="32" height="32" rx="8" fill="#4f46e5" />
      <rect x="7" y="9" width="18" height="3" rx="1.5" fill="#fff" />
      <rect x="10" y="14.5" width="12" height="3" rx="1.5" fill="#fff" opacity=".85" />
      <rect x="13" y="20" width="6" height="3" rx="1.5" fill="#a5b4fc" />
    </svg>
  )
}
