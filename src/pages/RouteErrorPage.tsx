import { isRouteErrorResponse, useRouteError } from 'react-router-dom'
import { CrashScreen } from '../components/ErrorBoundary'
import { ErrorState } from '../components/ui'
import { NotFoundPage } from './NotFoundPage'

/** Router error element. `inline` renders inside the app shell; otherwise full-screen. */
export function RouteErrorPage({ inline = false }: { inline?: boolean }) {
  const error = useRouteError()
  if (isRouteErrorResponse(error) && error.status === 404) return <NotFoundPage />
  const message = error instanceof Error ? error.message : isRouteErrorResponse(error) ? error.statusText : undefined
  if (!inline) return <CrashScreen message={message} />
  return (
    <div className="py-10">
      <ErrorState
        title="This page crashed"
        error={error instanceof Error ? error : new Error(message ?? 'Unexpected error')}
        onRetry={() => window.location.reload()}
      />
    </div>
  )
}
