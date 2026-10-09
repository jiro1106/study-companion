import { PAGE } from '../ui/page'
import { ScreenHeader } from '../ui/ScreenHeader'

export function FlashcardsScreen(): React.JSX.Element {
  return (
    <div className={PAGE}>
      <ScreenHeader title="Flashcards" eyebrow="Coming in Wave 2" />
    </div>
  )
}
