import { useCallback, useEffect, useRef } from 'react'

/** Returns a stable, debounced version of `fn` (always calls the latest `fn`). */
export function useDebouncedCallback<A extends unknown[]>(fn: (...args: A) => void, delay = 300) {
  const fnRef = useRef(fn)
  const timer = useRef<number | undefined>(undefined)

  useEffect(() => {
    fnRef.current = fn
  })

  useEffect(() => () => window.clearTimeout(timer.current), [])

  return useCallback(
    (...args: A) => {
      window.clearTimeout(timer.current)
      timer.current = window.setTimeout(() => fnRef.current(...args), delay)
    },
    [delay],
  )
}
