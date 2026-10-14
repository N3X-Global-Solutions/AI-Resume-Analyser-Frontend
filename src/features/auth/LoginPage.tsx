import { AlertCircle, Eye, EyeOff, Lock, LogIn, Mail, ShieldCheck } from 'lucide-react'
import { useId, useState, type FormEvent } from 'react'
import { Navigate, useNavigate, useSearchParams } from 'react-router-dom'
import { errorMessage, isApiError } from '../../api/client'
import { useLogin, useMe } from '../../api/hooks'
import { LogoMark } from '../../components/LogoMark'
import { Button, Field, Input } from '../../components/ui'
import { useDocumentTitle } from '../../hooks/useDocumentTitle'
import { APP_NAME } from '../../lib/constants'
import { safeNextPath } from './redirect'

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

function loginErrorMessage(error: unknown): string {
  if (isApiError(error)) {
    if (error.status === 401) return 'Incorrect email or password.'
    if (error.status === 429) return 'Too many failed attempts. Please wait a few minutes and try again.'
  }
  return errorMessage(error, 'Sign in failed. Please try again.')
}

export function LoginPage() {
  useDocumentTitle('Admin sign in')
  const [params] = useSearchParams()
  const navigate = useNavigate()
  const next = safeNextPath(params.get('next'))
  const expired = params.get('expired') === '1'

  const me = useMe()
  const login = useLogin()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [touched, setTouched] = useState(false)
  const emailId = useId()
  const passwordId = useId()

  // Already signed in (e.g. opened /login in a second tab): go straight to the app.
  if (me.isSuccess && !login.isPending) return <Navigate to={next} replace />

  const emailError = touched && !EMAIL_RE.test(email.trim()) ? 'Enter a valid email address' : null
  const passwordError = touched && !password ? 'Enter your password' : null

  function onSubmit(e: FormEvent) {
    e.preventDefault()
    setTouched(true)
    if (!EMAIL_RE.test(email.trim()) || !password) return
    login.mutate(
      { email: email.trim(), password },
      { onSuccess: () => navigate(next, { replace: true }) },
    )
  }

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-slate-50 px-4 py-10">
      <div className="w-full max-w-sm">
        <div className="mb-8 flex flex-col items-center text-center">
          <LogoMark className="h-12 w-12" />
          <h1 className="mt-4 text-xl font-semibold tracking-tight text-slate-900">Sign in to {APP_NAME}</h1>
          <p className="mt-1.5 flex items-center gap-1.5 text-sm text-slate-500">
            <ShieldCheck className="h-4 w-4 text-indigo-500" aria-hidden />
            Admin access only
          </p>
        </div>

        <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-xs sm:p-7">
          {expired && !login.isError && (
            <p className="mb-5 rounded-lg bg-amber-50 px-3 py-2.5 text-sm text-amber-800 ring-1 ring-amber-600/20 ring-inset">
              Your session has expired. Please sign in again.
            </p>
          )}
          {login.isError && (
            <div
              className="mb-5 flex items-start gap-2 rounded-lg bg-rose-50 px-3 py-2.5 text-sm text-rose-700 ring-1 ring-rose-600/20 ring-inset"
              role="alert"
            >
              <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
              <span>{loginErrorMessage(login.error)}</span>
            </div>
          )}

          <form className="space-y-5" onSubmit={onSubmit} noValidate>
            <Field label="Email" htmlFor={emailId} error={emailError}>
              <Input
                id={emailId}
                type="email"
                name="email"
                autoComplete="username"
                inputMode="email"
                autoFocus
                required
                placeholder="admin@company.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                invalid={!!emailError}
                leading={<Mail className="h-4 w-4" />}
                className="[&_input]:h-10"
              />
            </Field>

            <Field label="Password" htmlFor={passwordId} error={passwordError}>
              <Input
                id={passwordId}
                type={showPassword ? 'text' : 'password'}
                name="password"
                autoComplete="current-password"
                required
                placeholder="••••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                invalid={!!passwordError}
                leading={<Lock className="h-4 w-4" />}
                className="[&_input]:h-10"
                trailing={
                  <button
                    type="button"
                    onClick={() => setShowPassword((v) => !v)}
                    className="rounded-md p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500"
                    aria-label={showPassword ? 'Hide password' : 'Show password'}
                    aria-pressed={showPassword}
                  >
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                }
              />
            </Field>

            <Button
              type="submit"
              variant="primary"
              size="lg"
              block
              loading={login.isPending}
              icon={<LogIn className="h-4 w-4" />}
              className="text-sm"
            >
              {login.isPending ? 'Signing in…' : 'Sign in'}
            </Button>
          </form>
        </div>

        <p className="mt-6 text-center text-xs leading-relaxed text-slate-400">
          Accounts are created by an administrator. Contact your admin if you need access.
        </p>
      </div>
    </div>
  )
}
