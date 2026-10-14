import { Plus, X } from 'lucide-react'
import { useState, type ClipboardEvent, type KeyboardEvent } from 'react'
import { cn } from '../../lib/cn'

export interface TagInputProps {
  id?: string
  value: string[]
  onChange: (value: string[]) => void
  placeholder?: string
  /** Quick-add suggestions shown under the field (only the ones not yet added). */
  suggestions?: readonly string[]
  maxTags?: number
  invalid?: boolean
  ariaLabel?: string
  tone?: 'indigo' | 'slate'
  size?: 'sm' | 'md'
  className?: string
}

function splitTags(raw: string): string[] {
  return raw
    .split(/[,\n;]/)
    .map((part) => part.trim())
    .filter(Boolean)
}

/** Type + Enter / comma to add, Backspace on empty input removes the last chip, paste a comma list. */
export function TagInput({
  id,
  value,
  onChange,
  placeholder = 'Type and press Enter',
  suggestions,
  maxTags,
  invalid,
  ariaLabel,
  tone = 'indigo',
  size = 'md',
  className,
}: TagInputProps) {
  const [draft, setDraft] = useState('')

  function add(raw: string) {
    const incoming = splitTags(raw)
    if (incoming.length === 0) return
    const seen = new Set(value.map((tag) => tag.toLowerCase()))
    const next = [...value]
    for (const tag of incoming) {
      const key = tag.toLowerCase()
      if (seen.has(key)) continue
      if (maxTags !== undefined && next.length >= maxTags) break
      seen.add(key)
      next.push(tag.slice(0, 80))
    }
    if (next.length !== value.length) onChange(next)
  }

  function remove(index: number) {
    onChange(value.filter((_, i) => i !== index))
  }

  function onKeyDown(event: KeyboardEvent<HTMLInputElement>) {
    if (event.key === 'Enter' || event.key === ',' || event.key === 'Tab') {
      if (!draft.trim()) return
      event.preventDefault()
      add(draft)
      setDraft('')
    } else if (event.key === 'Backspace' && !draft && value.length > 0) {
      remove(value.length - 1)
    }
  }

  function onPaste(event: ClipboardEvent<HTMLInputElement>) {
    const text = event.clipboardData.getData('text')
    if (/[,\n;]/.test(text)) {
      event.preventDefault()
      add(draft + text)
      setDraft('')
    }
  }

  const lowerValue = new Set(value.map((tag) => tag.toLowerCase()))
  const openSuggestions = (suggestions ?? []).filter((s) => !lowerValue.has(s.toLowerCase()))
  const chip =
    tone === 'indigo'
      ? 'bg-indigo-50 text-indigo-700 ring-indigo-600/20'
      : 'bg-slate-100 text-slate-700 ring-slate-500/20'

  return (
    <div className={className}>
      <div
        className={cn(
          'flex min-h-9 w-full flex-wrap items-center gap-1.5 rounded-lg bg-white px-2 py-1.5 shadow-sm ring-1 ring-inset',
          'focus-within:ring-2 focus-within:ring-indigo-500',
          invalid ? 'ring-rose-400' : 'ring-slate-300',
          size === 'sm' && 'min-h-8 py-1',
        )}
      >
        {value.map((tag, index) => (
          <span
            key={`${tag}-${index}`}
            className={cn('inline-flex items-center gap-1 rounded-md py-0.5 pr-1 pl-2 text-xs font-medium ring-1 ring-inset', chip)}
          >
            {tag}
            <button
              type="button"
              onClick={() => remove(index)}
              className="rounded p-0.5 opacity-60 hover:bg-black/5 hover:opacity-100 focus-visible:opacity-100 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-current"
              aria-label={`Remove ${tag}`}
            >
              <X className="h-3 w-3" />
            </button>
          </span>
        ))}
        <input
          id={id}
          value={draft}
          onChange={(event) => setDraft(event.target.value)}
          onKeyDown={onKeyDown}
          onPaste={onPaste}
          onBlur={() => {
            if (draft.trim()) {
              add(draft)
              setDraft('')
            }
          }}
          placeholder={value.length === 0 ? placeholder : 'Add more…'}
          aria-label={ariaLabel}
          className="min-w-[8rem] flex-1 border-0 bg-transparent px-1 py-0.5 text-sm text-slate-900 placeholder:text-slate-400 focus:ring-0 focus:outline-none"
        />
      </div>
      {openSuggestions.length > 0 && (
        <div className="mt-2 flex flex-wrap items-center gap-1.5">
          <span className="text-xs text-slate-400">Suggestions:</span>
          {openSuggestions.slice(0, 12).map((suggestion) => (
            <button
              key={suggestion}
              type="button"
              onClick={() => add(suggestion)}
              className="inline-flex items-center gap-1 rounded-md border border-dashed border-slate-300 px-2 py-0.5 text-xs text-slate-600 hover:border-indigo-400 hover:text-indigo-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500"
            >
              <Plus className="h-3 w-3" />
              {suggestion}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
