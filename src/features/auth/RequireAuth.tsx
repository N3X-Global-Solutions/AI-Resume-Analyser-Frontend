import type { ReactNode } from 'react'
import { Navigate, useLocation } from 'react-router-dom'
import { isApiError } from '../../api/client'
import { useMe } from '../../api/hooks'
import { LogoMark } from '../../components/LogoMark'
import { ErrorState, Spinner } from '../../components/ui'
import { loginPath } from './redirect'

/** Renders its children only for a signed-in admin; otherwise sends the visitor to /login. */
export function RequireAuth({ children }: { children: ReactNode }) {
  const me = useMe()
  const location = useLocation()

  if (me.isPending) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-4 bg-slate-50" aria-busy="true">
        <LogoMark className="h-10 w-10" />
        <Spinner className="h-5 w-5 text-slate-400" label="Checking your session" />
      </div>
    )
  }

  if (me.isError) {
    if (isApiError(me.error) && me.error.status === 401) {
      return <Navigate to={loginPath(location.pathname + location.search)} replace />
    }
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-50 px-4">
        <ErrorState
          title="Couldn't check your session"
          error={me.error}
          onRetry={() => void me.refetch()}
          retrying={me.isFetching}
        />
      </div>
    )
  }

  return <>{children}</>
}
