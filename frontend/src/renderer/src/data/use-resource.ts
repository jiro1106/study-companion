import { useCallback, useEffect, useState, type DependencyList } from 'react'

import { toApiError, type ApiError } from './api'

type ResourceState<T> =
  | { status: 'loading' }
  | { status: 'error'; error: ApiError }
  | { status: 'ready'; data: T }

export type Resource<T> = ResourceState<T> & { reload: () => void }

/** Runs `load` when deps change or `reload()` is called. Ignores results from stale calls. */
export function useResource<T>(load: () => Promise<T>, deps: DependencyList): Resource<T> {
  const [state, setState] = useState<ResourceState<T>>({ status: 'loading' })
  const [attempt, setAttempt] = useState(0)

  useEffect(() => {
    let current = true
    setState({ status: 'loading' })
    load().then(
      (data) => current && setState({ status: 'ready', data }),
      (error: unknown) => current && setState({ status: 'error', error: toApiError(error) })
    )
    return () => {
      current = false
    }
    // Callers pass the deps that `load` closes over; `attempt` re-runs it on reload().
  }, [...deps, attempt])

  const reload = useCallback(() => setAttempt((n) => n + 1), [])
  return { ...state, reload }
}
