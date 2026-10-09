import { useCallback, useEffect, useRef, useState, type DependencyList } from 'react'

import { toApiError, type ApiError } from './api'

type ResourceState<T> =
  | { status: 'loading' }
  | { status: 'error'; error: ApiError }
  | { status: 'ready'; data: T }

export type Resource<T> = ResourceState<T> & { reload: () => void }

/** Runs `load` when deps change or `reload()` is called. Ignores results from stale calls. reload() refetches without blanking ready data. */
export function useResource<T>(load: () => Promise<T>, deps: DependencyList): Resource<T> {
  const [state, setState] = useState<ResourceState<T>>({ status: 'loading' })
  const [attempt, setAttempt] = useState(0)
  const soft = useRef(false)

  useEffect(() => {
    let current = true
    // reload() keeps ready data on screen while refetching; changed deps start from loading.
    setState((s) => (soft.current && s.status === 'ready' ? s : { status: 'loading' }))
    soft.current = false
    load().then(
      (data) => current && setState({ status: 'ready', data }),
      (error: unknown) => current && setState({ status: 'error', error: toApiError(error) })
    )
    return () => {
      current = false
    }
    // Callers pass the deps that `load` closes over; `attempt` re-runs it on reload().
  }, [...deps, attempt])

  const reload = useCallback(() => {
    soft.current = true
    setAttempt((n) => n + 1)
  }, [])
  return { ...state, reload }
}
