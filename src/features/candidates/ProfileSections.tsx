import { Award, Briefcase, FolderGit2, GraduationCap, Languages, Sparkles, Tags, Target } from 'lucide-react'
import type { CandidateProfile, Evaluation } from '../../api/types'
import { Badge, Card, CardBody, CardHeader } from '../../components/ui'
import { cn } from '../../lib/cn'
import { EDUCATION_SHORT } from '../../lib/constants'
import { formatPeriod, formatYears } from '../../lib/format'

function normalize(text: string): string {
  return text.toLowerCase().replace(/[^a-z0-9+#]/g, '')
}

export function RelevantHighlights({ evaluation }: { evaluation: Evaluation }) {
  if (evaluation.relevant_highlights.length === 0) return null
  return (
    <Card>
      <CardHeader
        title="Relevant experience"
        description="The parts of the candidate’s history the AI found most relevant to this job."
        icon={<Target className="h-4 w-4" />}
      />
      <CardBody className="space-y-4">
        {evaluation.relevant_highlights.map((item, index) => (
          <div key={`${item.title}-${item.company}-${index}`} className="rounded-lg border border-slate-100 bg-slate-50/60 p-4">
            <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-0.5">
              <p className="text-sm font-semibold text-slate-900">
                {item.title ?? 'Role'}
                {item.company && <span className="font-normal text-slate-500"> · {item.company}</span>}
              </p>
              {item.period && <span className="text-xs text-slate-500">{item.period}</span>}
            </div>
            {item.highlights.length > 0 && (
              <ul className="mt-2 list-disc space-y-1 pl-5 text-sm text-slate-700 marker:text-slate-300">
                {item.highlights.map((highlight) => (
                  <li key={highlight}>{highlight}</li>
                ))}
              </ul>
            )}
          </div>
        ))}
      </CardBody>
    </Card>
  )
}

export function WorkHistory({ profile }: { profile: CandidateProfile }) {
  return (
    <Card>
      <CardHeader
        title="Work history"
        description={
          profile.total_experience_years !== null ? `${formatYears(profile.total_experience_years)} of experience in total` : undefined
        }
        icon={<Briefcase className="h-4 w-4" />}
      />
      <CardBody>
        {profile.work_experience.length === 0 ? (
          <p className="text-sm text-slate-400">No work experience found in the resume.</p>
        ) : (
          <ol className="relative space-y-6 border-l border-slate-200 pl-6">
            {profile.work_experience.map((job, index) => {
              const period = formatPeriod(job.start_date, job.end_date)
              const current = job.end_date?.toLowerCase() === 'present'
              return (
                <li key={`${job.company}-${job.title}-${index}`} className="relative">
                  <span
                    className={cn(
                      'absolute top-1.5 -left-[30.5px] h-3 w-3 rounded-full border-2 border-white ring-1',
                      current ? 'bg-indigo-600 ring-indigo-200' : 'bg-slate-300 ring-slate-200',
                    )}
                    aria-hidden
                  />
                  <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-0.5">
                    <p className="text-sm font-semibold text-slate-900">
                      {job.title ?? 'Role'}
                      {job.company && <span className="font-normal text-slate-600"> · {job.company}</span>}
                    </p>
                    <span className="text-xs text-slate-500">
                      {[period, job.duration_years !== null ? formatYears(job.duration_years) : null].filter(Boolean).join(' · ')}
                    </span>
                  </div>
                  {job.location && <p className="text-xs text-slate-400">{job.location}</p>}
                  {job.highlights.length > 0 && (
                    <ul className="mt-2 list-disc space-y-1 pl-5 text-sm text-slate-700 marker:text-slate-300">
                      {job.highlights.map((highlight) => (
                        <li key={highlight}>{highlight}</li>
                      ))}
                    </ul>
                  )}
                </li>
              )
            })}
          </ol>
        )}
      </CardBody>
    </Card>
  )
}

export function EducationList({ profile }: { profile: CandidateProfile }) {
  return (
    <Card>
      <CardHeader title="Education" icon={<GraduationCap className="h-4 w-4" />} />
      <CardBody>
        {profile.education.length === 0 ? (
          <p className="text-sm text-slate-400">No education found in the resume.</p>
        ) : (
          <ul className="space-y-4">
            {profile.education.map((edu, index) => (
              <li key={`${edu.institution}-${edu.degree}-${index}`}>
                <div className="flex items-start justify-between gap-2">
                  <p className="text-sm font-semibold text-slate-900">
                    {[edu.degree, edu.field].filter(Boolean).join(', ') || 'Degree'}
                  </p>
                  {edu.level && edu.level !== 'none' && <Badge>{EDUCATION_SHORT[edu.level]}</Badge>}
                </div>
                {edu.institution && <p className="text-sm text-slate-600">{edu.institution}</p>}
                <p className="text-xs text-slate-400">
                  {[
                    edu.start_year && edu.end_year ? `${edu.start_year} – ${edu.end_year}` : (edu.end_year ?? edu.start_year),
                    edu.grade,
                  ]
                    .filter(Boolean)
                    .join(' · ')}
                </p>
              </li>
            ))}
          </ul>
        )}
      </CardBody>
    </Card>
  )
}

export function Projects({ profile }: { profile: CandidateProfile }) {
  if (profile.projects.length === 0) return null
  return (
    <Card>
      <CardHeader title="Projects" icon={<FolderGit2 className="h-4 w-4" />} />
      <CardBody className="grid grid-cols-1 gap-3 md:grid-cols-2">
        {profile.projects.map((project, index) => (
          <div key={`${project.name}-${index}`} className="rounded-lg border border-slate-200 p-4">
            <p className="text-sm font-semibold text-slate-900">{project.name}</p>
            {project.description && <p className="mt-1 text-sm text-slate-600">{project.description}</p>}
            {project.technologies.length > 0 && (
              <div className="mt-2 flex flex-wrap gap-1">
                {project.technologies.map((tech) => (
                  <Badge key={tech}>{tech}</Badge>
                ))}
              </div>
            )}
          </div>
        ))}
      </CardBody>
    </Card>
  )
}

export function SkillsCard({ profile, evaluation }: { profile: CandidateProfile; evaluation: Evaluation }) {
  const required = evaluation.required_skills.map((item) => normalize(item.requirement))
  const preferred = evaluation.preferred_skills.map((item) => normalize(item.requirement))
  const matches = (skill: string, list: string[]) => {
    const n = normalize(skill)
    return n.length > 0 && list.some((req) => req === n || (req.length >= 3 && n.length >= 3 && (req.includes(n) || n.includes(req))))
  }
  const sorted = [...profile.skills].sort((a, b) => {
    const score = (s: string) => (matches(s, required) ? 0 : matches(s, preferred) ? 1 : 2)
    return score(a) - score(b)
  })

  return (
    <Card>
      <CardHeader
        title="Skills"
        description={`${profile.skills.length} extracted from the resume`}
        icon={<Tags className="h-4 w-4" />}
      />
      <CardBody>
        {sorted.length === 0 ? (
          <p className="text-sm text-slate-400">No skills extracted.</p>
        ) : (
          <>
            <div className="flex flex-wrap gap-1.5">
              {sorted.map((skill) => {
                const isRequired = matches(skill, required)
                const isPreferred = !isRequired && matches(skill, preferred)
                return (
                  <Badge
                    key={skill}
                    size="md"
                    tone={isRequired ? 'indigo' : isPreferred ? 'sky' : 'neutral'}
                    title={isRequired ? 'Matches a required skill' : isPreferred ? 'Matches a preferred skill' : undefined}
                  >
                    {isRequired && <Sparkles className="h-3 w-3" aria-hidden />}
                    {skill}
                  </Badge>
                )
              })}
            </div>
            <div className="mt-3 flex flex-wrap gap-3 text-xs text-slate-500">
              <span className="inline-flex items-center gap-1.5">
                <span className="h-2 w-2 rounded-full bg-indigo-500" aria-hidden /> Required skill
              </span>
              <span className="inline-flex items-center gap-1.5">
                <span className="h-2 w-2 rounded-full bg-sky-500" aria-hidden /> Preferred skill
              </span>
            </div>
          </>
        )}
      </CardBody>
    </Card>
  )
}

export function CertificationsAndLanguages({ profile }: { profile: CandidateProfile }) {
  if (profile.certifications.length === 0 && profile.languages.length === 0) return null
  return (
    <Card>
      <CardBody className="space-y-4">
        {profile.certifications.length > 0 && (
          <div>
            <h3 className="flex items-center gap-2 text-sm font-semibold text-slate-900">
              <Award className="h-4 w-4 text-slate-500" /> Certifications
            </h3>
            <ul className="mt-2 space-y-1 text-sm text-slate-700">
              {profile.certifications.map((cert) => (
                <li key={cert} className="flex gap-2">
                  <span className="mt-2 h-1 w-1 shrink-0 rounded-full bg-slate-400" aria-hidden />
                  {cert}
                </li>
              ))}
            </ul>
          </div>
        )}
        {profile.languages.length > 0 && (
          <div>
            <h3 className="flex items-center gap-2 text-sm font-semibold text-slate-900">
              <Languages className="h-4 w-4 text-slate-500" /> Languages
            </h3>
            <div className="mt-2 flex flex-wrap gap-1.5">
              {profile.languages.map((language) => (
                <Badge key={language}>{language}</Badge>
              ))}
            </div>
          </div>
        )}
      </CardBody>
    </Card>
  )
}
