import { useState } from 'react'

import { loadProfile, ProfileContext, saveProfile, type Profile } from './profile'
import { OnboardingScreen } from './screens/OnboardingScreen'
import { Shell } from './shell/Shell'

export default function App(): React.JSX.Element {
  const [profile, setProfileState] = useState(loadProfile)
  const setProfile = (next: Profile): void => {
    saveProfile(next)
    setProfileState(next)
  }

  if (!profile) return <OnboardingScreen onDone={setProfile} />
  return (
    <ProfileContext value={{ profile, setProfile }}>
      <Shell />
    </ProfileContext>
  )
}
