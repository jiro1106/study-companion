import { PAGE } from '../ui/page'
import { ScreenHeader } from '../ui/ScreenHeader'

export function QuizScreen(): React.JSX.Element {
  return (
    <div className={PAGE}>
      <ScreenHeader title="Quiz" eyebrow="Coming in Wave 2" />
    </div>
  )
}
