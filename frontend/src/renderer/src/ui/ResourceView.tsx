import type { ReactNode } from 'react'

import type { Resource } from '../data/use-resource'
import { ErrorState } from './ErrorState'

export function ResourceView<T>({
  resource,
  loading,
  isEmpty,
  empty,
  children
}: {
  resource: Resource<T>
  loading: ReactNode
  isEmpty?: (data: T) => boolean
  empty?: ReactNode
  children: (data: T) => ReactNode
}): React.JSX.Element {
  if (resource.status === 'loading') return <div aria-busy="true">{loading}</div>
  if (resource.status === 'error') {
    return <ErrorState message={resource.error.message} onRetry={resource.reload} />
  }
  if (empty !== undefined && isEmpty?.(resource.data)) return <>{empty}</>
  return <>{children(resource.data)}</>
}
