import { AlertOctagon, RotateCcw } from 'lucide-react'
import { Component, type ErrorInfo, type ReactNode } from 'react'

interface ErrorBoundaryProps {
  children: ReactNode
}

interface ErrorBoundaryState {
  error: Error | null
}

/** Top-level safety net for render errors outside the router's own error element. */
export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  override state: ErrorBoundaryState = { error: null }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { error }
  }

  override componentDidCatch(error: Error, info: ErrorInfo) {
    console.error('Unhandled UI error', error, info.componentStack)
  }

  override render() {
    if (!this.state.error) return this.props.children
    return <CrashScreen message={this.state.error.message} onReset={() => this.setState({ error: null })} />
  }
}

export function CrashScreen({ message, onReset }: { message?: string; onReset?: () => void }) {
  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-50 p-6">
      <div className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-8 text-center shadow-sm">
        <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-rose-50 text-rose-600">
          <AlertOctagon className="h-6 w-6" />
        </div>
        <h1 className="text-lg font-semibold text-slate-900">Something broke on this page</h1>
        <p className="mt-2 text-sm text-slate-500">
          An unexpected error occurred. Your data is safe — try reloading the page.
        </p>
        {message && (
          <pre className="mt-4 max-h-32 overflow-auto rounded-lg bg-slate-50 p-3 text-left text-xs whitespace-pre-wrap text-slate-600">
            {message}
          </pre>
        )}
        <div className="mt-6 flex justify-center gap-2">
          {onReset && (
            <button
              type="button"
              onClick={onReset}
              className="inline-flex h-9 items-center rounded-lg px-3.5 text-sm font-medium text-slate-700 ring-1 ring-slate-300 ring-inset hover:bg-slate-50"
            >
              Try again
            </button>
          )}
          <button
            type="button"
            onClick={() => window.location.assign('/')}
            className="inline-flex h-9 items-center gap-2 rounded-lg bg-indigo-600 px-3.5 text-sm font-medium text-white hover:bg-indigo-700"
          >
            <RotateCcw className="h-4 w-4" />
            Back to dashboard
          </button>
        </div>
      </div>
    </div>
  )
}
