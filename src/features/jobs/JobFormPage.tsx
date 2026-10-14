import {
  ArrowLeft,
  Briefcase,
  ClipboardList,
  GraduationCap,
  ListChecks,
  Scale,
  Sparkles,
  Star,
} from 'lucide-react'
import { useState, type FormEvent, type ReactNode } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { toast } from 'sonner'
import { isNotFoundError } from '../../api/client'
import { useCreateJob, useJob, useReanalyze, useUpdateJob } from '../../api/hooks'
import type { EducationLevel, Job, JobDraft, WorkMode } from '../../api/types'
import { PageHeader } from '../../components/PageHeader'
import {
  Button,
  Card,
  CardBody,
  CardHeader,
  ErrorState,
  Field,
  Input,
  SegmentedControl,
  Select,
  Skeleton,
  TagInput,
  Textarea,
} from '../../components/ui'
import { useDocumentTitle } from '../../hooks/useDocumentTitle'
import { CURRENCIES, EDUCATION_LABELS, EDUCATION_ORDER, WORK_MODE_LABELS, WORK_MODE_ORDER } from '../../lib/constants'
import { NotFoundPage } from '../../pages/NotFoundPage'
import { AutoFillPanel } from './AutoFillPanel'
import {
  diffJobPayload,
  emptyJobForm,
  formToJobCreate,
  jobToForm,
  mergeDraft,
  REQUIREMENT_KEYS,
  validateJobForm,
  type JobFormErrors,
  type JobFormValues,
} from './jobForm'
import { WeightsEditor } from './WeightsEditor'

const SKILL_SUGGESTIONS = ['Python', 'JavaScript', 'TypeScript', 'React', 'Node.js', 'SQL', 'AWS', 'Docker', 'Kubernetes', 'Java']

export function JobFormPage({ mode }: { mode: 'create' | 'edit' }) {
  const { jobId } = useParams()
  const job = useJob(mode === 'edit' ? jobId : undefined)
  useDocumentTitle(mode === 'create' ? 'New job' : job.data ? `Edit · ${job.data.title}` : 'Edit job')

  if (mode === 'create') return <JobForm key="create" mode="create" />

  if (job.isPending) {
    return (
      <div className="space-y-4" aria-busy="true">
        <Skeleton className="h-8 w-64" />
        <Skeleton className="h-64 rounded-xl" />
        <Skeleton className="h-48 rounded-xl" />
      </div>
    )
  }
  if (job.isError) {
    if (isNotFoundError(job.error)) return <NotFoundPage title="Job not found" description="This job may have been deleted." />
    return <ErrorState title="Couldn't load the job" error={job.error} onRetry={() => void job.refetch()} />
  }
  return <JobForm key={job.data.id} mode="edit" job={job.data} />
}

function Section({
  title,
  description,
  icon,
  children,
  actions,
}: {
  title: string
  description?: ReactNode
  icon: ReactNode
  children: ReactNode
  actions?: ReactNode
}) {
  return (
    <Card>
      <CardHeader title={title} description={description} icon={icon} actions={actions} />
      <CardBody className="space-y-5 py-5">{children}</CardBody>
    </Card>
  )
}

function JobForm({ mode, job }: { mode: 'create' | 'edit'; job?: Job }) {
  const navigate = useNavigate()
  const [initial] = useState<JobFormValues>(() => (job ? jobToForm(job) : emptyJobForm()))
  const [values, setValues] = useState<JobFormValues>(initial)
  const [submitted, setSubmitted] = useState(false)
  const createJob = useCreateJob()
  const updateJob = useUpdateJob(job?.id ?? '')
  const reanalyze = useReanalyze(job?.id ?? '')

  const errors: JobFormErrors = submitted ? validateJobForm(values) : {}
  const saving = createJob.isPending || updateJob.isPending

  function set<K extends keyof JobFormValues>(key: K, value: JobFormValues[K]) {
    setValues((current) => ({ ...current, [key]: value }))
  }

  function applyDraft(draft: JobDraft, pastedText: string) {
    const merged = mergeDraft(values, draft, pastedText)
    setValues(merged.values)
    if (merged.filled.length > 0) {
      toast.success('Form pre-filled with AI', {
        description: `Filled ${merged.filled.join(', ')}. Review everything before saving.`,
      })
    } else {
      toast.info('Nothing new found in that description', { description: 'Your form already contains everything GLM-5 extracted.' })
    }
  }

  function onSubmit(event: FormEvent) {
    event.preventDefault()
    setSubmitted(true)
    const validation = validateJobForm(values)
    if (Object.keys(validation).length > 0) {
      toast.error('Please fix the highlighted fields')
      const firstKey = Object.keys(validation)[0]
      if (firstKey) document.getElementById(`field-${firstKey}`)?.focus()
      return
    }
    const payload = formToJobCreate(values)

    if (mode === 'create') {
      createJob.mutate(payload, {
        onSuccess: (created) => {
          toast.success('Job created', { description: 'Now upload resumes — the AI agent starts analyzing right away.' })
          navigate(`/jobs/${created.id}?tab=upload`)
        },
      })
      return
    }

    if (!job) return
    const diff = diffJobPayload(formToJobCreate(initial), payload)
    const changedKeys = Object.keys(diff)
    if (changedKeys.length === 0) {
      toast.info('No changes to save')
      navigate(`/jobs/${job.id}`)
      return
    }
    const requirementsChanged = REQUIREMENT_KEYS.some((key) => changedKeys.includes(key))
    const weightsChanged = changedKeys.includes('scoring_weights')
    updateJob.mutate(diff, {
      onSuccess: (updated) => {
        // Only structured requirement fields flag re-analysis — title / description edits never do.
        if (requirementsChanged && updated.needs_reanalysis && updated.stats.total_resumes > 0) {
          toast.warning('Requirements changed — re-analysis needed', {
            description:
              'Existing candidates were evaluated against the old requirements. Re-analyze them to refresh scores and rankings.',
            duration: 12_000,
            action: {
              label: 'Re-analyze now',
              onClick: () =>
                reanalyze.mutate(undefined, {
                  onSuccess: (result) => toast.success(`Re-analyzing ${result.queued} resumes`),
                }),
            },
          })
        } else if (weightsChanged && updated.stats.total_resumes > 0) {
          toast.success('Job saved — scores recalculated', {
            description: 'All candidates were re-scored with the new weights (no AI re-run needed).',
          })
        } else {
          toast.success('Job saved')
        }
        navigate(`/jobs/${updated.id}`)
      },
    })
  }

  const workModeOptions = [
    { value: '' as const, label: 'Not set' },
    ...WORK_MODE_ORDER.map((workMode) => ({ value: workMode, label: WORK_MODE_LABELS[workMode] })),
  ]

  return (
    <>
      <PageHeader
        eyebrow={
          <Link
            to={job ? `/jobs/${job.id}` : '/jobs'}
            className="inline-flex items-center gap-1 text-sm font-medium text-slate-500 hover:text-slate-800"
          >
            <ArrowLeft className="h-4 w-4" /> {job ? job.title : 'Jobs'}
          </Link>
        }
        title={mode === 'create' ? 'Create a job' : 'Edit job'}
        description={
          mode === 'create'
            ? 'Define what a great candidate looks like. The AI checks every resume against these requirements.'
            : 'Changing requirements flags existing candidates for re-analysis (title and description edits don’t). Changing only weights re-scores instantly.'
        }
      />

      <form onSubmit={onSubmit} noValidate className="space-y-6">
        <AutoFillPanel onApply={applyDraft} defaultOpen={mode === 'create'} />

        <Section title="Job details" icon={<Briefcase className="h-4 w-4" />}>
          <Field label="Job title" htmlFor="field-title" required error={errors.title}>
            <Input
              id="field-title"
              value={values.title}
              onChange={(event) => set('title', event.target.value)}
              placeholder="e.g. Senior Backend Engineer"
              maxLength={200}
              invalid={Boolean(errors.title)}
              autoFocus={mode === 'create'}
            />
          </Field>
          <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
            <Field label="Department" htmlFor="field-department">
              <Input
                id="field-department"
                value={values.department}
                onChange={(event) => set('department', event.target.value)}
                placeholder="e.g. Engineering"
              />
            </Field>
            <Field label="Location" htmlFor="field-location">
              <Input
                id="field-location"
                value={values.location}
                onChange={(event) => set('location', event.target.value)}
                placeholder="e.g. Bengaluru, India"
              />
            </Field>
          </div>
          <Field label="Work mode">
            <SegmentedControl<WorkMode | ''>
              ariaLabel="Work mode"
              options={workModeOptions}
              value={values.work_mode}
              onChange={(value) => set('work_mode', value)}
            />
          </Field>
          <Field
            label="Salary range"
            htmlFor="field-salary_min"
            hint="Optional — informational only, never used in scoring."
            error={errors.salary_min ?? errors.salary_max}
          >
            <div className="grid grid-cols-[minmax(0,1fr)_minmax(0,1fr)_6.5rem] gap-2">
              <Input
                id="field-salary_min"
                type="number"
                min={0}
                inputMode="numeric"
                value={values.salary_min}
                onChange={(event) => set('salary_min', event.target.value)}
                placeholder="Min"
                aria-label="Minimum salary"
                invalid={Boolean(errors.salary_min)}
              />
              <Input
                id="field-salary_max"
                type="number"
                min={0}
                inputMode="numeric"
                value={values.salary_max}
                onChange={(event) => set('salary_max', event.target.value)}
                placeholder="Max"
                aria-label="Maximum salary"
                invalid={Boolean(errors.salary_max)}
              />
              <Select
                value={values.salary_currency}
                onChange={(event) => set('salary_currency', event.target.value)}
                aria-label="Currency"
              >
                {CURRENCIES.map((currency) => (
                  <option key={currency} value={currency}>
                    {currency}
                  </option>
                ))}
              </Select>
            </div>
          </Field>
          <Field
            label="Description"
            htmlFor="field-description"
            hint="Role summary for context. The AI uses the structured requirements below for scoring."
          >
            <Textarea
              id="field-description"
              value={values.description}
              onChange={(event) => set('description', event.target.value)}
              rows={5}
              placeholder="What will this person do? What does the team work on?"
            />
          </Field>
        </Section>

        <Section
          title="Skills"
          icon={<Star className="h-4 w-4" />}
          description="Required skills carry the most weight. Synonyms are handled (Postgres = PostgreSQL, k8s = Kubernetes)."
        >
          <Field
            label="Required skills"
            htmlFor="field-required_skills"
            hint="Must-haves. Type a skill and press Enter or comma. Paste a comma-separated list to add many."
            aside={`${values.required_skills.length} added`}
          >
            <TagInput
              id="field-required_skills"
              value={values.required_skills}
              onChange={(next) => set('required_skills', next)}
              placeholder="e.g. Python, FastAPI, PostgreSQL"
              suggestions={values.required_skills.length === 0 ? SKILL_SUGGESTIONS : undefined}
            />
          </Field>
          <Field
            label="Preferred skills"
            htmlFor="field-preferred_skills"
            hint="Nice-to-haves that give candidates a bonus."
            aside={`${values.preferred_skills.length} added`}
          >
            <TagInput
              id="field-preferred_skills"
              value={values.preferred_skills}
              onChange={(next) => set('preferred_skills', next)}
              placeholder="e.g. Docker, Kubernetes, Redis"
              tone="slate"
            />
          </Field>
        </Section>

        <Section title="Experience" icon={<ClipboardList className="h-4 w-4" />}>
          <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
            <Field
              label="Minimum years"
              htmlFor="field-min_experience_years"
              error={errors.min_experience_years}
              hint="0 = no minimum (experience is then not scored)."
            >
              <Input
                id="field-min_experience_years"
                type="number"
                min={0}
                max={60}
                step={0.5}
                value={values.min_experience_years}
                onChange={(event) => set('min_experience_years', event.target.value)}
                invalid={Boolean(errors.min_experience_years)}
                trailing={<span className="pr-1 text-xs">years</span>}
              />
            </Field>
            <Field
              label="Maximum years"
              htmlFor="field-max_experience_years"
              error={errors.max_experience_years}
              hint="Optional upper bound."
            >
              <Input
                id="field-max_experience_years"
                type="number"
                min={0}
                max={60}
                step={0.5}
                value={values.max_experience_years}
                onChange={(event) => set('max_experience_years', event.target.value)}
                placeholder="No maximum"
                invalid={Boolean(errors.max_experience_years)}
                trailing={<span className="pr-1 text-xs">years</span>}
              />
            </Field>
          </div>
          <Field
            label="Relevant experience areas"
            htmlFor="field-relevant_experience_areas"
            hint="Domains the experience should be in, e.g. “Backend development”, “API development”, “Fintech”."
          >
            <TagInput
              id="field-relevant_experience_areas"
              value={values.relevant_experience_areas}
              onChange={(next) => set('relevant_experience_areas', next)}
              placeholder="e.g. Backend development"
            />
          </Field>
        </Section>

        <Section title="Education" icon={<GraduationCap className="h-4 w-4" />}>
          <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
            <Field label="Minimum education level" htmlFor="field-education_level">
              <Select
                id="field-education_level"
                value={values.education_level}
                onChange={(event) => set('education_level', event.target.value as EducationLevel)}
              >
                {EDUCATION_ORDER.map((level) => (
                  <option key={level} value={level}>
                    {EDUCATION_LABELS[level]}
                  </option>
                ))}
              </Select>
            </Field>
            <Field label="Is education a must-have?">
              <SegmentedControl<'required' | 'preferred'>
                ariaLabel="Education requirement strictness"
                options={[
                  { value: 'preferred', label: 'Preferred' },
                  { value: 'required', label: 'Required' },
                ]}
                value={values.education_required ? 'required' : 'preferred'}
                onChange={(value) => set('education_required', value === 'required')}
              />
            </Field>
          </div>
          <Field
            label="Fields of study"
            htmlFor="field-education_fields"
            hint="Preferred fields, e.g. Computer Science, Information Technology."
          >
            <TagInput
              id="field-education_fields"
              value={values.education_fields}
              onChange={(next) => set('education_fields', next)}
              placeholder="e.g. Computer Science"
              tone="slate"
            />
          </Field>
        </Section>

        <Section
          title="Custom requirements"
          icon={<ListChecks className="h-4 w-4" />}
          description="Anything else that matters. The AI splits this into individual checks and looks for evidence of each."
        >
          <Field
            label="Requirements in your own words"
            htmlFor="field-custom_requirements"
            hint="Example: “Has built and operated production APIs at scale; startup experience preferred; has mentored junior engineers.”"
          >
            <Textarea
              id="field-custom_requirements"
              value={values.custom_requirements}
              onChange={(event) => set('custom_requirements', event.target.value)}
              rows={4}
              placeholder="Separate checks with semicolons or new lines…"
            />
          </Field>
        </Section>

        <Section
          title="Scoring weights"
          icon={<Scale className="h-4 w-4" />}
          description={
            <>
              How much each category contributes to the final score. The score is computed by the app — not the AI —{' '}
              so it’s fully transparent.
            </>
          }
        >
          <div id="field-scoring_weights" tabIndex={-1} className="focus:outline-none">
            <WeightsEditor
              weights={values.scoring_weights}
              onChange={(next) => set('scoring_weights', next)}
              requirements={{
                required_skills: values.required_skills,
                preferred_skills: values.preferred_skills,
                min_experience_years: Number(values.min_experience_years) || 0,
                relevant_experience_areas: values.relevant_experience_areas,
                education_level: values.education_level,
                education_fields: values.education_fields,
                custom_requirements: values.custom_requirements,
              }}
              error={errors.scoring_weights}
            />
          </div>
        </Section>

        <div className="sticky bottom-0 z-20 -mx-4 border-t border-slate-200 bg-white/90 px-4 py-3 backdrop-blur sm:-mx-6 sm:px-6 lg:-mx-10 lg:px-10">
          <div className="flex flex-col-reverse gap-2 sm:flex-row sm:items-center sm:justify-between">
            <p className="hidden items-center gap-1.5 text-xs text-slate-500 sm:flex">
              <Sparkles className="h-3.5 w-3.5 text-indigo-500" />
              {mode === 'create'
                ? 'Next: upload resumes and the AI agent ranks them against these requirements.'
                : 'Saved changes apply to this job’s ranking immediately.'}
            </p>
            <div className="flex gap-2 sm:justify-end">
              <Button variant="secondary" onClick={() => navigate(job ? `/jobs/${job.id}` : '/jobs')} disabled={saving}>
                Cancel
              </Button>
              <Button type="submit" variant="primary" loading={saving} className="flex-1 sm:flex-none">
                {mode === 'create' ? 'Create job & upload resumes' : 'Save changes'}
              </Button>
            </div>
          </div>
        </div>
      </form>
    </>
  )
}
