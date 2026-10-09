// Stand-in until the mascot team delivers art. Replace this file only.
const AWAKE = [
  '......LL.LL.....',
  '.....LLLSLLL....',
  '........S.......',
  '....GGGGGGGG....',
  '..GGGWGGGGGGGG..',
  '.GGWGGGGGGGGGGG.',
  '.GGFFFFFFFFFFGG.',
  'GGFFFFFFFFFFFFGG',
  'GGFFEEFFFFEEFFGG',
  'GGFFEEFFFFEEFFGG',
  'GGFFFFFFFFFFFFGG',
  'GGFFFFFEEFFFFFGG',
  '.GGFFFFFFFFFFGG.',
  '.GGGGGGGGGGGGGG.',
  '..DGGGGGGGGGGD..',
  '...DDDDDDDDDD...',
  '...GG......GG...',
  '...DD......DD...'
]
const ASLEEP_ROWS: Record<number, string> = {
  8: 'GGFFFFFFFFFFFFGG',
  9: 'GGFEEEFFFFEEEFGG'
}
const PALETTE: Record<string, string> = {
  G: '#58cc02',
  D: '#58a700',
  L: '#a5ed6e',
  S: '#58a700',
  F: '#000437',
  E: '#a5ed6e',
  W: '#d7ffb8'
}

export function Mascot({
  awake = true,
  size = 64
}: {
  awake?: boolean
  size?: number
}): React.JSX.Element {
  const rows = AWAKE.map((row, y) => (awake ? row : (ASLEEP_ROWS[y] ?? row)))
  return (
    <svg
      viewBox="0 0 16 18"
      width={size}
      height={(size * 18) / 16}
      shapeRendering="crispEdges"
      role="img"
      aria-label={awake ? 'BARDHIE mascot, awake' : 'BARDHIE mascot, asleep'}
    >
      {rows.flatMap((row, y) =>
        [...row].map((key, x) =>
          PALETTE[key] ? (
            <rect key={`${x}-${y}`} x={x} y={y} width={1} height={1} fill={PALETTE[key]} />
          ) : null
        )
      )}
    </svg>
  )
}
