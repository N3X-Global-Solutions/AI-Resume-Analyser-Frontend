import { useRef, type KeyboardEvent, type ReactNode } from 'react'
import { cn } from '../../lib/cn'

export interface TabItem<T extends string> {
  id: T
  label: ReactNode
  icon?: ReactNode
  badge?: ReactNode
}

export interface TabsProps<T extends string> {
  tabs: readonly TabItem<T>[]
  value: T
  onChange: (value: T) => void
  ariaLabel: string
  /** Prefix for tab / panel ids: tab = `${idPrefix}-tab-${id}`, panel = `${idPrefix}-panel-${id}`. */
  idPrefix: string
  className?: string
}

function tabIds(idPrefix: string, id: string) {
  return { tab: `${idPrefix}-tab-${id}`, panel: `${idPrefix}-panel-${id}` }
}

/** Underline tabs with roving focus. Render the active panel yourself with `TabPanel`. */
export function Tabs<T extends string>({ tabs, value, onChange, ariaLabel, idPrefix, className }: TabsProps<T>) {
  const refs = useRef<(HTMLButtonElement | null)[]>([])

  function onKeyDown(event: KeyboardEvent<HTMLButtonElement>, index: number) {
    let next = -1
    if (event.key === 'ArrowRight') next = (index + 1) % tabs.length
    if (event.key === 'ArrowLeft') next = (index - 1 + tabs.length) % tabs.length
    if (event.key === 'Home') next = 0
    if (event.key === 'End') next = tabs.length - 1
    if (next >= 0) {
      event.preventDefault()
      const tab = tabs[next]
      if (tab) {
        onChange(tab.id)
        refs.current[next]?.focus()
      }
    }
  }

  return (
    <div className={cn('border-b border-slate-200', className)}>
      <div role="tablist" aria-label={ariaLabel} className="-mb-px flex gap-1 overflow-x-auto">
        {tabs.map((tab, index) => {
          const selected = tab.id === value
          const ids = tabIds(idPrefix, tab.id)
          return (
            <button
              key={tab.id}
              ref={(el) => {
                refs.current[index] = el
              }}
              id={ids.tab}
              type="button"
              role="tab"
              aria-selected={selected}
              aria-controls={ids.panel}
              tabIndex={selected ? 0 : -1}
              onClick={() => onChange(tab.id)}
              onKeyDown={(event) => onKeyDown(event, index)}
              className={cn(
                'inline-flex items-center gap-2 border-b-2 px-3 py-2.5 text-sm font-medium whitespace-nowrap transition-colors',
                'focus-visible:rounded-t-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500',
                selected
                  ? 'border-indigo-600 text-indigo-700'
                  : 'border-transparent text-slate-500 hover:border-slate-300 hover:text-slate-800',
              )}
            >
              {tab.icon}
              {tab.label}
              {tab.badge}
            </button>
          )
        })}
      </div>
    </div>
  )
}

export function TabPanel({
  idPrefix,
  id,
  className,
  children,
}: {
  idPrefix: string
  id: string
  className?: string
  children: ReactNode
}) {
  const ids = tabIds(idPrefix, id)
  return (
    <div role="tabpanel" id={ids.panel} aria-labelledby={ids.tab} className={className}>
      {children}
    </div>
  )
}
