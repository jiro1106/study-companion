import { PAGE } from '../ui/page'
import { ScreenHeader } from '../ui/ScreenHeader'

export function TodayScreen(): React.JSX.Element {
  return (
    <div className={PAGE}>
      <ScreenHeader title="Today" eyebrow="Coming in Wave 2" />
    </div>
  )
}
