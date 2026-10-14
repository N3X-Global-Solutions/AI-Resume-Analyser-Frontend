import { ArrowLeft, Compass } from 'lucide-react'
import { ButtonLink, EmptyState } from '../components/ui'
import { useDocumentTitle } from '../hooks/useDocumentTitle'

export function NotFoundPage({
  title = 'Page not found',
  description = "The page you're looking for doesn't exist or may have been moved.",
}: {
  title?: string
  description?: string
}) {
  useDocumentTitle('Not found')
  return (
    <div className="flex min-h-[60vh] items-center justify-center">
      <EmptyState
        icon={<Compass />}
        title={title}
        description={description}
        action={
          <>
            <ButtonLink to="/" variant="primary" icon={<ArrowLeft className="h-4 w-4" />}>
              Back to dashboard
            </ButtonLink>
            <ButtonLink to="/jobs" variant="secondary">
              View jobs
            </ButtonLink>
          </>
        }
      />
    </div>
  )
}
