import { Briefcase, LayoutDashboard, LogOut, Menu, Plus, Star, X } from 'lucide-react'
import { Suspense, useState } from 'react'
import { Link, NavLink, Outlet, ScrollRestoration, useNavigate } from 'react-router-dom'
import { useHealth, useLogout, useMe } from '../../api/hooks'
import { cn } from '../../lib/cn'
import { APP_NAME } from '../../lib/constants'
import { LogoMark } from '../LogoMark'
import { Avatar, ButtonLink, Skeleton } from '../ui'

const NAV = [
  { to: '/', label: 'Dashboard', icon: LayoutDashboard, end: true },
  { to: '/jobs', label: 'Jobs', icon: Briefcase, end: false },
  { to: '/shortlist', label: 'Shortlist', icon: Star, end: false },
] as const

function HealthIndicator() {
  const health = useHealth()
  let dot = 'bg-slate-300'
  let text = 'Checking API…'
  if (health.isError) {
    dot = 'bg-rose-500'
    text = 'API offline'
  } else if (health.data) {
    const ok = health.data.database === 'ok' && health.data.worker_running
    dot = ok ? 'bg-emerald-500' : 'bg-amber-400'
    text = ok ? 'All systems running' : health.data.database !== 'ok' ? 'Database issue' : 'Worker stopped'
  }
  return (
    <div className="flex items-center gap-2 text-xs text-slate-500" title={health.data ? `${health.data.model_id} · ${health.data.region}` : undefined}>
      <span className={cn('h-2 w-2 rounded-full', dot)} aria-hidden />
      <span>{text}</span>
    </div>
  )
}

function AccountMenu() {
  const me = useMe()
  const logout = useLogout()
  const navigate = useNavigate()
  if (!me.data) return null
  return (
    <div className="flex items-center gap-2.5">
      <Avatar name={me.data.email} size="sm" />
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium text-slate-800" title={me.data.email}>
          {me.data.email}
        </p>
        <p className="text-xs text-slate-500">Administrator</p>
      </div>
      <button
        type="button"
        onClick={() => logout.mutate(undefined, { onSuccess: () => navigate('/login', { replace: true }) })}
        disabled={logout.isPending}
        className="rounded-lg p-2 text-slate-500 hover:bg-slate-100 hover:text-slate-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 disabled:opacity-50"
        aria-label="Sign out"
        title="Sign out"
      >
        <LogOut className="h-4 w-4" />
      </button>
    </div>
  )
}

function SidebarContent({ onNavigate }: { onNavigate?: () => void }) {
  return (
    <div className="flex h-full flex-col">
      <Link
        to="/"
        onClick={onNavigate}
        className="flex items-center gap-2.5 rounded-lg px-2 py-1 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500"
      >
        <LogoMark className="h-8 w-8" />
        <span className="text-[15px] font-semibold tracking-tight text-slate-900">{APP_NAME}</span>
      </Link>

      <ButtonLink to="/jobs/new" variant="primary" block className="mt-6" icon={<Plus className="h-4 w-4" />} onClick={onNavigate}>
        New Job
      </ButtonLink>

      <nav className="mt-6 space-y-0.5" aria-label="Main">
        {NAV.map(({ to, label, icon: Icon, end }) => (
          <NavLink
            key={to}
            to={to}
            end={end}
            onClick={onNavigate}
            className={({ isActive }) =>
              cn(
                'flex items-center gap-3 rounded-lg px-2.5 py-2 text-sm font-medium transition-colors',
                'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500',
                isActive ? 'bg-indigo-50 text-indigo-700' : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900',
              )
            }
          >
            {({ isActive }) => (
              <>
                <Icon className={cn('h-4 w-4', isActive ? 'text-indigo-600' : 'text-slate-400')} aria-hidden />
                {label}
              </>
            )}
          </NavLink>
        ))}
      </nav>

      <div className="mt-auto space-y-3 border-t border-slate-200 pt-4">
        <AccountMenu />
        <HealthIndicator />
        <p className="text-xs leading-relaxed text-slate-400">
          Powered by Amazon Bedrock · <span className="font-medium text-slate-500">GLM-5</span>
        </p>
      </div>
    </div>
  )
}

function PageFallback() {
  return (
    <div className="space-y-4" aria-busy="true" aria-label="Loading page">
      <Skeleton className="h-8 w-64 max-w-full" />
      <Skeleton className="h-4 w-96 max-w-full" />
      <Skeleton className="mt-6 h-64 w-full rounded-xl" />
    </div>
  )
}

export function AppLayout() {
  const [mobileOpen, setMobileOpen] = useState(false)

  return (
    <div className="min-h-screen bg-slate-50">
      <a
        href="#main"
        className="sr-only z-50 rounded-md bg-white px-3 py-2 text-sm font-medium text-indigo-700 shadow focus:not-sr-only focus:fixed focus:top-3 focus:left-3"
      >
        Skip to content
      </a>

      {/* Desktop sidebar */}
      <aside className="fixed inset-y-0 left-0 z-30 hidden w-60 border-r border-slate-200 bg-white px-4 py-5 lg:block">
        <SidebarContent />
      </aside>

      {/* Mobile top bar */}
      <div className="sticky top-0 z-30 flex h-14 items-center justify-between border-b border-slate-200 bg-white/90 px-4 backdrop-blur lg:hidden">
        <Link to="/" className="flex items-center gap-2">
          <LogoMark className="h-7 w-7" />
          <span className="text-sm font-semibold text-slate-900">{APP_NAME}</span>
        </Link>
        <button
          type="button"
          onClick={() => setMobileOpen(true)}
          className="rounded-lg p-2 text-slate-600 hover:bg-slate-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500"
          aria-label="Open navigation"
          aria-expanded={mobileOpen}
        >
          <Menu className="h-5 w-5" />
        </button>
      </div>

      {/* Mobile drawer */}
      {mobileOpen && (
        <div className="fixed inset-0 z-50 lg:hidden" role="dialog" aria-modal="true" aria-label="Navigation">
          <div className="absolute inset-0 bg-slate-900/40" onClick={() => setMobileOpen(false)} aria-hidden />
          <div className="absolute inset-y-0 left-0 w-72 max-w-[85vw] bg-white px-4 py-5 shadow-xl">
            <button
              type="button"
              onClick={() => setMobileOpen(false)}
              className="absolute top-4 right-3 rounded-lg p-1.5 text-slate-500 hover:bg-slate-100"
              aria-label="Close navigation"
            >
              <X className="h-5 w-5" />
            </button>
            <SidebarContent onNavigate={() => setMobileOpen(false)} />
          </div>
        </div>
      )}

      <div className="lg:pl-60">
        <main id="main" className="mx-auto w-full max-w-7xl px-4 py-6 sm:px-6 lg:px-10 lg:py-8">
          <Suspense fallback={<PageFallback />}>
            <Outlet />
          </Suspense>
        </main>
      </div>
      <ScrollRestoration getKey={(location) => location.pathname} />
    </div>
  )
}
