import { useEffect, useId, useRef, useState, type KeyboardEvent, type ReactNode } from 'react'
import { cn } from '../../lib/cn'
import { buttonClasses, type ButtonSize, type ButtonVariant } from './styles'

export interface MenuItem {
  key: string
  label: ReactNode
  description?: ReactNode
  icon?: ReactNode
  onSelect: () => void
  tone?: 'default' | 'danger'
  disabled?: boolean
}

export interface MenuSection {
  key: string
  title?: string
  items: MenuItem[]
}

export interface DropdownMenuProps {
  /** Contents of the trigger button. */
  label: ReactNode
  ariaLabel?: string
  sections: MenuSection[]
  align?: 'left' | 'right'
  variant?: ButtonVariant
  size?: ButtonSize
  iconOnly?: boolean
  menuClassName?: string
  disabled?: boolean
}

/** Accessible menu button: Enter / Space / ↓ opens, ↑ ↓ move, Esc closes. */
export function DropdownMenu({
  label,
  ariaLabel,
  sections,
  align = 'right',
  variant = 'secondary',
  size = 'md',
  iconOnly = false,
  menuClassName,
  disabled = false,
}: DropdownMenuProps) {
  const [open, setOpen] = useState(false)
  const containerRef = useRef<HTMLDivElement>(null)
  const triggerRef = useRef<HTMLButtonElement>(null)
  const menuRef = useRef<HTMLDivElement>(null)
  const menuId = useId()

  useEffect(() => {
    if (!open) return
    function onPointerDown(event: PointerEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) setOpen(false)
    }
    document.addEventListener('pointerdown', onPointerDown)
    const firstItem = menuRef.current?.querySelector<HTMLButtonElement>('[role="menuitem"]:not([disabled])')
    firstItem?.focus()
    return () => document.removeEventListener('pointerdown', onPointerDown)
  }, [open])

  function focusItem(delta: number) {
    const items = Array.from(menuRef.current?.querySelectorAll<HTMLButtonElement>('[role="menuitem"]:not([disabled])') ?? [])
    if (items.length === 0) return
    const index = items.indexOf(document.activeElement as HTMLButtonElement)
    const next = items[(index + delta + items.length) % items.length]
    next?.focus()
  }

  function onMenuKeyDown(event: KeyboardEvent<HTMLDivElement>) {
    if (event.key === 'ArrowDown') {
      event.preventDefault()
      focusItem(1)
    } else if (event.key === 'ArrowUp') {
      event.preventDefault()
      focusItem(-1)
    } else if (event.key === 'Escape') {
      event.preventDefault()
      setOpen(false)
      triggerRef.current?.focus()
    } else if (event.key === 'Tab') {
      setOpen(false)
    }
  }

  function onTriggerKeyDown(event: KeyboardEvent<HTMLButtonElement>) {
    if (event.key === 'ArrowDown') {
      event.preventDefault()
      setOpen(true)
    }
  }

  return (
    <div ref={containerRef} className="relative inline-block text-left">
      <button
        ref={triggerRef}
        type="button"
        aria-haspopup="menu"
        aria-expanded={open}
        aria-controls={open ? menuId : undefined}
        aria-label={ariaLabel}
        disabled={disabled}
        onClick={() => setOpen((value) => !value)}
        onKeyDown={onTriggerKeyDown}
        className={buttonClasses({ variant, size, iconOnly })}
      >
        {label}
      </button>
      {open && (
        <div
          ref={menuRef}
          id={menuId}
          role="menu"
          onKeyDown={onMenuKeyDown}
          className={cn(
            'absolute z-40 mt-1.5 w-64 origin-top rounded-xl border border-slate-200 bg-white p-1 shadow-lg ring-1 ring-slate-900/5',
            align === 'right' ? 'right-0' : 'left-0',
            menuClassName,
          )}
        >
          {sections.map((section, sectionIndex) => (
            <div key={section.key} className={cn(sectionIndex > 0 && 'mt-1 border-t border-slate-100 pt-1')}>
              {section.title && (
                <div className="px-2.5 pt-1.5 pb-1 text-[11px] font-semibold tracking-wide text-slate-400 uppercase">
                  {section.title}
                </div>
              )}
              {section.items.map((item) => (
                <button
                  key={item.key}
                  type="button"
                  role="menuitem"
                  disabled={item.disabled}
                  onClick={() => {
                    setOpen(false)
                    item.onSelect()
                  }}
                  className={cn(
                    'flex w-full items-start gap-2.5 rounded-lg px-2.5 py-2 text-left text-sm transition-colors',
                    'focus:outline-none focus-visible:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-50',
                    item.tone === 'danger' ? 'text-rose-600 hover:bg-rose-50' : 'text-slate-700 hover:bg-slate-100',
                  )}
                >
                  {item.icon && <span className="mt-0.5 shrink-0 [&>svg]:h-4 [&>svg]:w-4">{item.icon}</span>}
                  <span className="min-w-0">
                    <span className="block font-medium">{item.label}</span>
                    {item.description && <span className="block text-xs text-slate-500">{item.description}</span>}
                  </span>
                </button>
              ))}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
