import { MutationCache, QueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { errorMessage, isApiError } from './client'

declare module '@tanstack/react-query' {
  interface Register {
    mutationMeta: {
      /** Title of the error toast; `false` to let the caller handle errors itself. */
      errorTitle?: string | false
    }
  }
}

export function createQueryClient(): QueryClient {
  return new QueryClient({
    mutationCache: new MutationCache({
      onError: (error, _variables, _context, mutation) => {
        const title = mutation.meta?.errorTitle
        if (title === false) return
        toast.error(title ?? 'Action failed', { description: errorMessage(error) })
      },
    }),
    defaultOptions: {
      queries: {
        staleTime: 15_000,
        refetchOnWindowFocus: false,
        retry: (failureCount, error) => {
          // Don't retry client errors (404, 422 …); retry network / 5xx twice.
          if (isApiError(error) && error.status >= 400 && error.status < 500) return false
          return failureCount < 2
        },
      },
      mutations: {
        retry: false,
      },
    },
  })
}
