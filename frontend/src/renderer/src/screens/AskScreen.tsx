import { PAGE } from '../ui/page'
import { ScreenHeader } from '../ui/ScreenHeader'

export function AskScreen(): React.JSX.Element {
  return (
    <div className={PAGE}>
      <ScreenHeader title="Ask notes" eyebrow="Coming in Wave 2" />
    </div>
  )
}
