import { AlertCircle, ArrowLeft, ChevronLeft, ChevronRight, FileText, Link2, Mail, MapPin, Phone, Sparkles, ThumbsUp } from 'lucide-react'
import { Link, useParams } from 'react-router-dom'
import { toast } from 'sonner'
import { isNotFoundError } from '../../api/client'
import { useCandidate, useCandidateAtRank, useUpdateCandidate } from '../../api/hooks'
import type { CandidateDetail, CandidateStatus } from '../../api/types'
import { SourceBadge } from '../../components/SourceBadge'
import { StatusButtons } from '../../components/StatusActions'
import { Avatar, Card, CardBody, CardHeader, CopyButton, ErrorState, ScoreRing, Skeleton, StatusBadge, TierBadge } from '../../components/ui'
import { useDocumentTitle } from '../../hooks/useDocumentTitle'
import { cn } from '../../lib/cn'
import { STATUS_META, TIER_META } from '../../lib/constants'
import { displayName, formatRelative, formatYears, prettyLink, toHref } from '../../lib/format'
import { NotFoundPage } from '../../pages/NotFoundPage'
import { AgentTrace } from './AgentTrace'
import { NotesCard } from './NotesCard'
import { CertificationsAndLanguages, EducationList, Projects, RelevantHighlights, SkillsCard, WorkHistory } from './ProfileSections'
import { RankExplanationCard } from './RankExplanationCard'
import { RequirementsChecklist } from './RequirementsChecklist'
import { ResumeViewer } from './ResumeViewer'
import { ScoreBreakdown } from './ScoreBreakdown'

export function CandidateDetailPage() {
  const { candidateId } = useParams()
  const candidate = useCandidate(candidateId)
  const data = candidate.data
  useDocumentTitle(data ? `${displayName(data.name)} · ${data.job_title}` : 'Candidate')

  const rank = data?.rank ?? null
  const prev = useCandidateAtRank(data?.job_id, rank !== null && rank > 1 ? rank - 1 : null)
  const next = useCandidateAtRank(data?.job_id, rank !== null && data && rank < data.total_candidates ? rank + 1 : null)

  if (candidate.isPending) return <DetailSkeleton />
  if (candidate.isError) {
    if (isNotFoundError(candidate.error)) {
      return <NotFoundPage title="Candidate not found" description="This candidate may have been deleted with its resume or job." />
    }
    return (
      <ErrorState
        title="Couldn't load this candidate"
        error={candidate.error}
        onRetry={() => void candidate.refetch()}
        retrying={candidate.isFetching}
      />
    )
  }

  const c = candidate.data
  return (
    <div className="space-y-6">
      <nav className="flex flex-wrap items-center justify-between gap-3" aria-label="Candidate navigation">
        <Link
          to={`/jobs/${c.job_id}?tab=candidates`}
          className="inline-flex min-w-0 items-center gap-1 text-sm font-medium text-slate-500 hover:text-slate-800"
        >
          <ArrowLeft className="h-4 w-4 shrink-0" />
          <span className="truncate">{c.job_title} · ranking</span>
        </Link>
        {rank !== null && (
          <div className="flex items-center gap-1">
            <NeighbourLink to={prev.data?.id} direction="prev" label={prev.data ? `#${prev.data.rank} ${displayName(prev.data.name)}` : undefined} />
            <span className="px-2 text-xs text-slate-400 tabular-nums">
              {rank} / {c.total_candidates}
            </span>
            <NeighbourLink to={next.data?.id} direction="next" label={next.data ? `#${next.data.rank} ${displayName(next.data.name)}` : undefined} />
          </div>
        )}
      </nav>

      <CandidateHeader candidate={c} />

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <div className="min-w-0 space-y-6 lg:col-span-2">
          <SummaryCard candidate={c} />
          <ScoreBreakdown evaluation={c.evaluation} />
          <RequirementsChecklist evaluation={c.evaluation} />
          <RankExplanationCard key={`${c.id}-${c.rank}-${c.match_score}`} candidateId={c.id} rank={c.rank} total={c.total_candidates} />
          <RelevantHighlights evaluation={c.evaluation} />
          <WorkHistory profile={c.profile} />
          <Projects profile={c.profile} />
          <ResumeViewer resumeId={c.resume_id} filename={c.original_filename} contentType={c.resume_content_type} rawText={c.raw_text} />
          <AgentTrace steps={c.agent_trace} modelId={c.evaluation.model_id} analyzedAt={c.evaluation.analyzed_at} />
        </div>
        <aside className="min-w-0 space-y-6">
          <NotesCard key={c.id} candidateId={c.id} jobId={c.job_id} initialNotes={c.notes} />
          <SkillsCard profile={c.profile} evaluation={c.evaluation} />
          <EducationList profile={c.profile} />
          <CertificationsAndLanguages profile={c.profile} />
          {c.profile.summary && (
            <Card>
              <CardHeader title="Candidate’s own summary" icon={<FileText className="h-4 w-4" />} />
              <CardBody>
                <p className="text-sm leading-relaxed whitespace-pre-wrap text-slate-700">{c.profile.summary}</p>
              </CardBody>
            </Card>
          )}
        </aside>
      </div>
    </div>
  )
}

function NeighbourLink({ to, direction, label }: { to: string | undefined; direction: 'prev' | 'next'; label?: string }) {
  const Icon = direction === 'prev' ? ChevronLeft : ChevronRight
  const text = direction === 'prev' ? 'Previous candidate' : 'Next candidate'
  const className =
    'inline-flex h-8 items-center gap-1 rounded-lg px-2 text-sm font-medium focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500'
  if (!to) {
    return (
      <span className={cn(className, 'cursor-not-allowed text-slate-300')} aria-disabled="true">
        <Icon className="h-4 w-4" />
        <span className="sr-only">{text}</span>
      </span>
    )
  }
  return (
    <Link to={`/candidates/${to}`} className={cn(className, 'text-slate-600 hover:bg-slate-100')} title={label} aria-label={`${text}: ${label ?? ''}`}>
      {direction === 'prev' && <Icon className="h-4 w-4" />}
      <span className="hidden sm:inline">{direction === 'prev' ? 'Prev' : 'Next'}</span>
      {direction === 'next' && <Icon className="h-4 w-4" />}
    </Link>
  )
}

function CandidateHeader({ candidate: c }: { candidate: CandidateDetail }) {
  const update = useUpdateCandidate()
  const name = displayName(c.name)
  const pendingStatus = update.isPending ? (update.variables?.update.status ?? null) : null
  const tier = TIER_META[c.match_tier]

  function setStatus(status: CandidateStatus) {
    if (status === c.status) return
    const previous = c.status
    update.mutate(
      { candidateId: c.id, jobId: c.job_id, update: { status } },
      {
        onSuccess: () =>
          toast.success(status === 'new' ? `${name} reset to New` : `${name} → ${STATUS_META[status].label}`, {
            action: {
              label: 'Undo',
              onClick: () => update.mutate({ candidateId: c.id, jobId: c.job_id, update: { status: previous } }),
            },
          }),
      },
    )
  }

  return (
    <Card>
      <div className="flex flex-col gap-6 p-5 sm:p-6 md:flex-row md:items-start md:justify-between">
        <div className="flex min-w-0 gap-4">
          <Avatar name={c.name} size="lg" />
          <div className="min-w-0 space-y-2">
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <h1 className="text-2xl font-semibold tracking-tight text-slate-900">{name}</h1>
                <StatusBadge status={c.status} />
                <SourceBadge source={c.source} />
              </div>
              {c.headline && <p className="text-base text-slate-600">{c.headline}</p>}
            </div>
            <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5 text-sm text-slate-600">
              {c.location && (
                <span className="inline-flex items-center gap-1.5">
                  <MapPin className="h-4 w-4 text-slate-400" aria-hidden />
                  {c.location}
                </span>
              )}
              {c.total_experience_years !== null && <span>{formatYears(c.total_experience_years)} experience</span>}
              {c.email && (
                <span className="inline-flex items-center gap-1">
                  <Mail className="h-4 w-4 text-slate-400" aria-hidden />
                  <a href={`mailto:${c.email}`} className="hover:text-indigo-700 hover:underline">
                    {c.email}
                  </a>
                  <CopyButton text={c.email} label="Email" />
                </span>
              )}
              {c.phone && (
                <span className="inline-flex items-center gap-1">
                  <Phone className="h-4 w-4 text-slate-400" aria-hidden />
                  <a href={`tel:${c.phone.replace(/\s+/g, '')}`} className="hover:text-indigo-700 hover:underline">
                    {c.phone}
                  </a>
                  <CopyButton text={c.phone} label="Phone" />
                </span>
              )}
            </div>
            {c.profile.links.length > 0 && (
              <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-sm">
                {c.profile.links.map((link) => (
                  <a
                    key={link}
                    href={toHref(link)}
                    target="_blank"
                    rel="noreferrer noopener"
                    className="inline-flex max-w-full items-center gap-1 truncate text-indigo-600 hover:text-indigo-700 hover:underline"
                  >
                    <Link2 className="h-3.5 w-3.5 shrink-0" aria-hidden />
                    <span className="truncate">{prettyLink(link)}</span>
                  </a>
                ))}
              </div>
            )}
            <p className="text-xs text-slate-400">
              {c.original_filename} · analyzed {formatRelative(c.evaluation.analyzed_at)}
            </p>
          </div>
        </div>

        <div className={cn('flex shrink-0 items-center gap-4 rounded-xl border p-4 md:flex-col md:items-center md:px-6', tier.border, tier.soft)}>
          <ScoreRing score={c.match_score} tier={c.match_tier} size={112} caption="match" />
          <div className="space-y-1.5 md:text-center">
            <TierBadge tier={c.match_tier} size="md" />
            {c.rank !== null && (
              <p className="text-sm text-slate-600">
                Rank <span className="font-semibold text-slate-900">#{c.rank}</span> of {c.total_candidates}
              </p>
            )}
          </div>
        </div>
      </div>
      <div className="flex flex-col gap-3 border-t border-slate-100 px-5 py-3 sm:flex-row sm:items-center sm:justify-between sm:px-6">
        <span className="text-sm font-medium text-slate-500">Decision</span>
        <StatusButtons status={c.status} onChange={setStatus} pendingStatus={pendingStatus} />
      </div>
    </Card>
  )
}

function SummaryCard({ candidate: c }: { candidate: CandidateDetail }) {
  const { evaluation } = c
  return (
    <Card>
      <CardHeader title="AI summary" description="Written by GLM-5 from the resume and your requirements" icon={<Sparkles className="h-4 w-4" />} />
      <CardBody className="space-y-5">
        <p className="text-[15px] leading-relaxed text-slate-700">{evaluation.summary || c.summary}</p>
        <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
          <div>
            <h3 className="flex items-center gap-1.5 text-xs font-semibold tracking-wide text-emerald-700 uppercase">
              <ThumbsUp className="h-3.5 w-3.5" /> Strengths
            </h3>
            <ul className="mt-2 space-y-1.5">
              {evaluation.strengths.length === 0 && <li className="text-sm text-slate-400">None highlighted</li>}
              {evaluation.strengths.map((item) => (
                <li key={item} className="flex gap-2 text-sm text-slate-700">
                  <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-emerald-500" aria-hidden />
                  {item}
                </li>
              ))}
            </ul>
          </div>
          <div>
            <h3 className="flex items-center gap-1.5 text-xs font-semibold tracking-wide text-rose-700 uppercase">
              <AlertCircle className="h-3.5 w-3.5" /> Main gaps
            </h3>
            <ul className="mt-2 space-y-1.5">
              {evaluation.gaps.length === 0 && <li className="text-sm text-slate-400">No significant gaps</li>}
              {evaluation.gaps.map((item) => (
                <li key={item} className="flex gap-2 text-sm text-slate-700">
                  <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-rose-500" aria-hidden />
                  {item}
                </li>
              ))}
            </ul>
          </div>
        </div>
      </CardBody>
    </Card>
  )
}

function DetailSkeleton() {
  return (
    <div className="space-y-6" aria-busy="true" aria-label="Loading candidate">
      <Skeleton className="h-4 w-48" />
      <Skeleton className="h-44 rounded-xl" />
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <div className="space-y-6 lg:col-span-2">
          <Skeleton className="h-48 rounded-xl" />
          <Skeleton className="h-80 rounded-xl" />
        </div>
        <div className="space-y-6">
          <Skeleton className="h-40 rounded-xl" />
          <Skeleton className="h-56 rounded-xl" />
        </div>
      </div>
    </div>
  )
}
