import { Bot, CheckCircle2, ChevronDown, MinusCircle, XCircle } from 'lucide-react'
import { useState } from 'react'
import type { AgentStep } from '../../api/types'
import { Card } from '../../components/ui'
import { cn } from '../../lib/cn'
import { AGENT_STEP_META, MODEL_LABEL } from '../../lib/constants'
import { formatDateTime, formatDuration } from '../../lib/format'

const STATUS_ICON = {
  ok: { icon: CheckCircle2, className: 'text-emerald-600', label: 'Completed' },
  error: { icon: XCircle, className: 'text-rose-600', label: 'Error' },
  skipped: { icon: MinusCircle, className: 'text-slate-400', label: 'Skipped' },
} as const

export function AgentTrace({ steps, modelId, analyzedAt }: { steps: AgentStep[]; modelId: string; analyzedAt: string }) {
  const [open, setOpen] = useState(false)
  const totalMs = steps.reduce((sum, step) => sum + step.duration_ms, 0)

  return (
    <Card className="overflow-hidden">
      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        aria-expanded={open}
        aria-controls="agent-trace"
        className="flex w-full items-center gap-3 px-5 py-4 text-left hover:bg-slate-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:ring-inset"
      >
        <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-slate-100 text-slate-600">
          <Bot className="h-4 w-4" />
        </span>
        <span className="min-w-0 flex-1">
          <span className="block text-sm font-semibold text-slate-900">How the AI agent analyzed this resume</span>
          <span className="block text-sm text-slate-500">
            {steps.length} steps · {formatDuration(totalMs)} · {modelId || MODEL_LABEL}
          </span>
        </span>
        <ChevronDown className={cn('h-4 w-4 shrink-0 text-slate-400 transition-transform', open && 'rotate-180')} aria-hidden />
      </button>
      {open && (
        <div id="agent-trace" className="border-t border-slate-100 px-5 py-4">
          {steps.length === 0 ? (
            <p className="text-sm text-slate-400">No trace recorded.</p>
          ) : (
            <ol className="relative space-y-4">
              {steps.map((step, index) => {
                const meta = AGENT_STEP_META[step.step]
                const status = STATUS_ICON[step.status]
                const Icon = status.icon
                return (
                  <li key={`${step.step}-${index}`} className="relative flex gap-3">
                    {index < steps.length - 1 && (
                      <span className="absolute top-6 bottom-[-1rem] left-[9px] w-px bg-slate-200" aria-hidden />
                    )}
                    <Icon className={cn('relative mt-0.5 h-5 w-5 shrink-0 bg-white', status.className)} aria-label={status.label} />
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-baseline justify-between gap-x-3">
                        <p className="text-sm font-medium text-slate-900">
                          <span className="mr-1.5 text-slate-400 tabular-nums">{index + 1}.</span>
                          {meta?.label ?? step.step}
                          <code className="ml-2 rounded bg-slate-100 px-1 py-0.5 font-mono text-[11px] text-slate-500">{step.step}</code>
                        </p>
                        <span className="text-xs text-slate-500 tabular-nums">{formatDuration(step.duration_ms)}</span>
                      </div>
                      <p className="text-xs text-slate-500">{meta?.description}</p>
                      {step.detail && (
                        <p
                          className={cn(
                            'mt-1 rounded-md px-2 py-1 font-mono text-xs break-words',
                            step.status === 'error' ? 'bg-rose-50 text-rose-700' : 'bg-slate-50 text-slate-600',
                          )}
                        >
                          {step.detail}
                        </p>
                      )}
                    </div>
                  </li>
                )
              })}
            </ol>
          )}
          <p className="mt-4 border-t border-slate-100 pt-3 text-xs text-slate-500">
            Analyzed {formatDateTime(analyzedAt)} with <span className="font-medium">{modelId}</span> on Amazon Bedrock. Resume text is
            treated as untrusted data and protected attributes are never used in the evaluation.
          </p>
        </div>
      )}
    </Card>
  )
}
