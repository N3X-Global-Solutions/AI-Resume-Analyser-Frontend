import { QueryClientProvider } from '@tanstack/react-query'
import { lazy } from 'react'
import { createBrowserRouter, RouterProvider } from 'react-router-dom'
import { Toaster } from 'sonner'
import { setUnauthorizedHandler } from './api/client'
import { createQueryClient } from './api/queryClient'
import { ErrorBoundary } from './components/ErrorBoundary'
import { AppLayout } from './components/layout/AppLayout'
import { LoginPage } from './features/auth/LoginPage'
import { loginPath } from './features/auth/redirect'
import { RequireAuth } from './features/auth/RequireAuth'
import { NotFoundPage } from './pages/NotFoundPage'
import { RouteErrorPage } from './pages/RouteErrorPage'

// Route-level code splitting (each page is its own chunk).
const DashboardPage = lazy(() => import('./features/dashboard/DashboardPage').then((m) => ({ default: m.DashboardPage })))
const JobsListPage = lazy(() => import('./features/jobs/JobsListPage').then((m) => ({ default: m.JobsListPage })))
const JobFormPage = lazy(() => import('./features/jobs/JobFormPage').then((m) => ({ default: m.JobFormPage })))
const JobWorkspacePage = lazy(() =>
  import('./features/workspace/JobWorkspacePage').then((m) => ({ default: m.JobWorkspacePage })),
)
const CandidateDetailPage = lazy(() =>
  import('./features/candidates/CandidateDetailPage').then((m) => ({ default: m.CandidateDetailPage })),
)
const ShortlistPage = lazy(() => import('./features/shortlist/ShortlistPage').then((m) => ({ default: m.ShortlistPage })))

const queryClient = createQueryClient()

const router = createBrowserRouter([
  { path: '/login', element: <LoginPage />, errorElement: <RouteErrorPage /> },
  {
    path: '/',
    element: (
      <RequireAuth>
        <AppLayout />
      </RequireAuth>
    ),
    errorElement: <RouteErrorPage />,
    children: [
      {
        errorElement: <RouteErrorPage inline />,
        children: [
          { index: true, element: <DashboardPage /> },
          { path: 'jobs', element: <JobsListPage /> },
          { path: 'jobs/new', element: <JobFormPage mode="create" /> },
          { path: 'jobs/:jobId', element: <JobWorkspacePage /> },
          { path: 'jobs/:jobId/edit', element: <JobFormPage mode="edit" /> },
          { path: 'candidates/:candidateId', element: <CandidateDetailPage /> },
          { path: 'shortlist', element: <ShortlistPage /> },
          { path: '*', element: <NotFoundPage /> },
        ],
      },
    ],
  },
])

// A 401 from any API call mid-session (token expired, admin deactivated) → back to the login page.
setUnauthorizedHandler(() => {
  const { pathname, search } = router.state.location
  if (pathname === '/login') return
  // Clear the cache only after the protected pages have unmounted, so they don't refetch into more 401s.
  void router.navigate(loginPath(pathname + search, true), { replace: true }).then(() => queryClient.clear())
})

export function App() {
  return (
    <ErrorBoundary>
      <QueryClientProvider client={queryClient}>
        <RouterProvider router={router} />
        <Toaster position="bottom-right" richColors closeButton toastOptions={{ duration: 5000 }} />
      </QueryClientProvider>
    </ErrorBoundary>
  )
}
