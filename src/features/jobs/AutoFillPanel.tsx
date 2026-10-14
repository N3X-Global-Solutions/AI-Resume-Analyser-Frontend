import { AlertTriangle, ChevronDown, Sparkles, Wand2 } from 'lucide-react'
import { useState } from 'react'
import { errorMessage } from '../../api/client'
import { useExtractRequirements } from '../../api/hooks'
import type { JobDraft } from '../../api/types'
import { Button, Skeleton, Spinner, Textarea } from '../../components/ui'
import { cn } from '../../lib/cn'
import { MODEL_LABEL } from '../../lib/constants'

const MIN_CHARS = 20

export function AutoFillPanel({
  onApply,
  defaultOpen,
}: {
  onApply: (draft: JobDraft, pastedText: string) => void
  defaultOpen: boolean
}) {
  const [open, setOpen] = useState(defaultOpen)
  const [text, setText] = useState('')
  const [appliedOnce, setAppliedOnce] = useState(false)
  const extract = useExtractRequirements()
  const length = text.trim().length

  function run() {
    if (length < MIN_CHARS || extract.isPending) return
    extract.mutate(
      { description: text.trim() },
      {
        onSuccess: (draft) => {
          onApply(draft, text)
          setAppliedOnce(true)
          setOpen(false)
        },
      },
    )
  }

  return (
    <section
      className="overflow-hidden rounded-xl border border-indigo-200 bg-linear-to-br from-indigo-50/80 via-white to-violet-50/40 shadow-xs"
      aria-labelledby="autofill-title"
    >
      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        aria-expanded={open}
        aria-controls="autofill-body"
        className="flex w-full items-center gap-3 px-5 py-4 text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:ring-inset"
      >
        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-indigo-600 text-white shadow-sm shadow-indigo-600/30">
          <Sparkles className="h-4 w-4" />
        </span>
        <span className="min-w-0 flex-1">
          <span id="autofill-title" className="block text-sm font-semibold text-slate-900">
            Auto-fill with AI
          </span>
          <span className="block text-sm text-slate-500">
            {appliedOnce
              ? 'Form pre-filled from your job description — review and adjust below. Paste another to merge more.'
              : `Paste a job description and ${MODEL_LABEL} extracts the title, skills, experience and education for you.`}
          </span>
        </span>
        <ChevronDown className={cn('h-4 w-4 shrink-0 text-slate-400 transition-transform', open && 'rotate-180')} aria-hidden />
      </button>

      {open && (
        <div id="autofill-body" className="space-y-3 px-5 pb-5">
          {extract.isPending ? (
            <div className="rounded-lg border border-indigo-100 bg-white/80 p-4" role="status" aria-live="polite">
              <div className="flex items-center gap-2 text-sm font-medium text-indigo-700">
                <Spinner className="h-4 w-4" />
                {MODEL_LABEL} is reading the job description…
              </div>
              <div className="mt-4 space-y-2.5">
                <Skeleton className="h-3 w-2/5" />
                <div className="flex gap-2">
                  <Skeleton className="h-5 w-16 rounded-md" />
                  <Skeleton className="h-5 w-20 rounded-md" />
                  <Skeleton className="h-5 w-14 rounded-md" />
                  <Skeleton className="h-5 w-24 rounded-md" />
                </div>
                <Skeleton className="h-3 w-3/5" />
              </div>
            </div>
          ) : (
            <Textarea
              value={text}
              onChange={(event) => setText(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === 'Enter' && (event.metaKey || event.ctrlKey)) {
                  event.preventDefault()
                  run()
                }
              }}
              rows={7}
              placeholder={
                'Paste the full job description here…\n\nExample: “We are hiring a Senior Backend Engineer (Bengaluru, hybrid). 5+ years building Python/FastAPI services, PostgreSQL, AWS. Docker & Kubernetes a plus. B.Tech in Computer Science preferred…”'
              }
              aria-label="Job description to extract requirements from"
              className="bg-white"
            />
          )}

          {extract.isError && !extract.isPending && (
            <div className="flex items-start gap-2 rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700" role="alert">
              <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
              <span>
                Couldn’t extract requirements: {errorMessage(extract.error)}. You can retry or fill in the form manually.
              </span>
            </div>
          )}

          <div className="flex flex-wrap items-center justify-between gap-3">
            <span className={cn('text-xs', length > 0 && length < MIN_CHARS ? 'text-amber-600' : 'text-slate-400')}>
              {length < MIN_CHARS
                ? `At least ${MIN_CHARS} characters (${length}/${MIN_CHARS})`
                : `${length.toLocaleString()} characters · ⌘/Ctrl + Enter to extract`}
            </span>
            <Button
              variant="primary"
              onClick={run}
              loading={extract.isPending}
              disabled={length < MIN_CHARS}
              icon={<Wand2 className="h-4 w-4" />}
            >
              {extract.isPending ? 'Extracting…' : 'Extract requirements'}
            </Button>
          </div>
        </div>
      )}
    </section>
  )
}
