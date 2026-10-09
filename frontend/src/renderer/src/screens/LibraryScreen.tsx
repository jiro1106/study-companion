import { PAGE } from '../ui/page'
import { ScreenHeader } from '../ui/ScreenHeader'

export function LibraryScreen(): React.JSX.Element {
  return (
    <div className={PAGE}>
      <ScreenHeader title="Library" eyebrow="Coming in Wave 2" />
    </div>
  )
}
