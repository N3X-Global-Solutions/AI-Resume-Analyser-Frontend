import { AlertTriangle, ChevronDown, Globe } from 'lucide-react'
import { useState, type ReactNode } from 'react'
import { API_ORIGIN } from '../../api/client'
import type { Job } from '../../api/types'
import { Badge, Card, CopyButton } from '../../components/ui'
import { cn } from '../../lib/cn'

const CREATE_KEY_COMMAND = 'python -m app.cli create-api-key --name job-portal'

/** What the intake API answers, so whoever wires up the portal knows what to retry. */
const RESPONSES: [code: number, meaning: string][] = [
  [202, 'queued'],
  [200, 'already received'],
  [401, 'bad key'],
  [409, 'job closed'],
  [422, 'invalid file / S3 key'],
  [429, 'rate limited'],
  [502, 'S3 read error, retry'],
]

/** Server-to-server intake: the company's job portal posts each applicant's resume straight into this job. */
export function PortalIntakeCard({ job }: { job: Job }) {
  const [open, setOpen] = useState(false)
  const closed = job.status === 'closed'
  const url = `${API_ORIGIN || window.location.origin}/api/intake/v1/jobs/${job.id}/applications`
  const example = [
    `curl -X POST '${url}' \\`,
    `  -H 'X-API-Key: <your-api-key>' \\`,
    `  -H 'Content-Type: application/json' \\`,
    `  -d '{"s3_key": "applications/2026/10/abc.pdf", "application_id": "APP-1042"}'`,
  ].join('\n')

  return (
    <Card className="overflow-hidden">
      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        aria-expanded={open}
        aria-controls="portal-intake"
        className="flex w-full items-center gap-3 px-5 py-4 text-left hover:bg-slate-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:ring-inset"
      >
        <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-slate-100 text-slate-600">
          <Globe className="h-4 w-4" />
        </span>
        <span className="min-w-0 flex-1">
          <span className="flex flex-wrap items-center gap-2 text-sm font-semibold text-slate-900">
            Job portal integration
            {closed && <Badge tone="amber">Paused</Badge>}
          </span>
          {closed ? (
            <span className="mt-0.5 flex items-start gap-1.5 text-sm text-amber-800">
              <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-amber-600" aria-hidden />
              This job is closed: the portal's submissions are rejected with 409 until you reopen it.
            </span>
          ) : (
            <span className="block text-sm text-slate-500">Your careers site can send each applicant's resume here automatically.</span>
          )}
        </span>
        <ChevronDown className={cn('h-4 w-4 shrink-0 text-slate-400 transition-transform', open && 'rotate-180')} aria-hidden />
      </button>

      {open && (
        <div id="portal-intake" className="space-y-4 border-t border-slate-100 px-5 py-4">
          <IntakeField label="Intake URL" hint="POST, one application per request">
            <CodeBox copyText={url} copyLabel="Intake URL">
              <span className="break-all">{url}</span>
            </CodeBox>
          </IntakeField>

          <IntakeField label="Authentication">
            <p className="text-sm text-slate-600">
              Send the key in the <InlineCode>X-API-Key</InlineCode> header. Keys are created on the server (shown once):
            </p>
            <CodeBox copyText={CREATE_KEY_COMMAND} copyLabel="Command" className="mt-2">
              <span className="break-all">{CREATE_KEY_COMMAND}</span>
            </CodeBox>
          </IntakeField>

          <IntakeField label="Example request" hint="resume already stored in S3; this app copies it">
            <CodeBox copyText={example} copyLabel="Example request">
              <pre className="overflow-x-auto leading-relaxed">{example}</pre>
            </CodeBox>
            <p className="mt-2 text-xs text-slate-500">
              No S3? Send the file itself as <InlineCode>multipart/form-data</InlineCode> with a <InlineCode>file</InlineCode> field (PDF
              or DOCX) and an optional <InlineCode>application_id</InlineCode>.
            </p>
          </IntakeField>

          <ul className="flex flex-wrap gap-x-3 gap-y-1 text-xs text-slate-500" aria-label="Responses">
            {RESPONSES.map(([code, meaning]) => (
              <li key={code} className="whitespace-nowrap">
                <span className="font-mono font-semibold text-slate-700">{code}</span> {meaning}
              </li>
            ))}
          </ul>
        </div>
      )}
    </Card>
  )
}

function IntakeField({ label, hint, children }: { label: string; hint?: string; children: ReactNode }) {
  return (
    <div>
      <p className="mb-1.5 text-xs font-medium text-slate-500">
        <span className="tracking-wide uppercase">{label}</span>
        {hint && <span className="font-normal text-slate-400"> · {hint}</span>}
      </p>
      {children}
    </div>
  )
}

function CodeBox({
  copyText,
  copyLabel,
  className,
  children,
}: {
  copyText: string
  copyLabel: string
  className?: string
  children: ReactNode
}) {
  return (
    <div
      className={cn(
        'flex items-start gap-2 rounded-lg bg-slate-50 py-2 pr-1.5 pl-3 font-mono text-xs text-slate-800 ring-1 ring-slate-200 ring-inset',
        className,
      )}
    >
      <div className="min-w-0 flex-1 py-0.5">{children}</div>
      <CopyButton text={copyText} label={copyLabel} className="shrink-0" />
    </div>
  )
}

function InlineCode({ children }: { children: ReactNode }) {
  return <code className="rounded bg-slate-100 px-1 py-0.5 font-mono text-[12px] text-slate-700">{children}</code>
}
