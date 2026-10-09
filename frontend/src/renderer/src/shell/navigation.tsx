import { createContext, useContext, useMemo, useState, type ReactNode } from 'react'

export type Route =
  | { screen: 'today' }
  | { screen: 'library' }
  | { screen: 'ask'; documentId?: string }
  | { screen: 'cards'; deckId?: string }
  | { screen: 'quiz'; documentId?: string }

export type ScreenName = Route['screen']

interface Navigation {
  route: Route
  navigate: (route: Route) => void
  openQuickAsk: () => void
}

const NavigationContext = createContext<Navigation | null>(null)

export function NavigationProvider({
  openQuickAsk,
  children
}: {
  openQuickAsk: () => void
  children: ReactNode
}): React.JSX.Element {
  const [route, setRoute] = useState<Route>({ screen: 'today' })
  const value = useMemo(() => ({ route, navigate: setRoute, openQuickAsk }), [route, openQuickAsk])
  return <NavigationContext.Provider value={value}>{children}</NavigationContext.Provider>
}

export function useNavigation(): Navigation {
  const navigation = useContext(NavigationContext)
  if (!navigation) throw new Error('useNavigation must be used inside NavigationProvider')
  return navigation
}
