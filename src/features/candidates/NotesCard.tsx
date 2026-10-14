import { Check, NotebookPen } from 'lucide-react'
import { useState } from 'react'
import { useUpdateCandidate } from '../../api/hooks'
import { Button, Card, CardBody, CardHeader, Spinner, Textarea } from '../../components/ui'

/** Recruiter notes — saved on blur or with the Save button. Mount with `key={candidate.id}`. */
export function NotesCard({ candidateId, jobId, initialNotes }: { candidateId: string; jobId: string; initialNotes: string | null }) {
  const [draft, setDraft] = useState(initialNotes ?? '')
  const [saved, setSaved] = useState(initialNotes ?? '')
  const update = useUpdateCandidate()
  const dirty = draft !== saved

  function save() {
    if (!dirty || update.isPending) return
    const value = draft
    update.mutate(
      { candidateId, jobId, update: { notes: value.trim() ? value : null } },
      { onSuccess: () => setSaved(value) },
    )
  }

  return (
    <Card>
      <CardHeader title="Recruiter notes" icon={<NotebookPen className="h-4 w-4" />} />
      <CardBody className="space-y-2">
        <Textarea
          value={draft}
          onChange={(event) => setDraft(event.target.value)}
          onBlur={save}
          onKeyDown={(event) => {
            if (event.key === 'Enter' && (event.metaKey || event.ctrlKey)) {
              event.preventDefault()
              save()
            }
          }}
          rows={4}
          placeholder="Private notes about this candidate — interview impressions, follow-ups…"
          aria-label="Recruiter notes"
        />
        <div className="flex items-center justify-between gap-2">
          <span className="text-xs text-slate-500" aria-live="polite">
            {update.isPending ? (
              <span className="inline-flex items-center gap-1.5">
                <Spinner className="h-3 w-3" /> Saving…
              </span>
            ) : dirty ? (
              'Unsaved changes'
            ) : saved ? (
              <span className="inline-flex items-center gap-1 text-emerald-600">
                <Check className="h-3 w-3" /> Saved
              </span>
            ) : (
              'Saved automatically when you leave the field'
            )}
          </span>
          <Button size="sm" variant="secondary" onClick={save} disabled={!dirty} loading={update.isPending}>
            Save
          </Button>
        </div>
      </CardBody>
    </Card>
  )
}
