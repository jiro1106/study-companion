import PixelMascot from '../components/mascot/PixelMascot'

/** In-app mascot: same Bardy sprite as the floating assistant. */
export function Mascot({
  awake = true,
  size = 64
}: {
  awake?: boolean
  size?: number
}): React.JSX.Element {
  return <PixelMascot state={awake ? 'awake' : 'sleeping'} size={size} />
}
