// The "Plates" mark: a loaded barbell seen end-on, heaviest plate innermost.
// Header sizes drop the collar and keep 3 plates per side (small-size rule).
const SIZES = {
  sm: { plates: [[2, 9], [3, 14], [4, 20]], bar: [7, 2] },
  md: { plates: [[3, 12], [4, 18], [6, 26]], bar: [10, 3] },
} as const

export default function LogoMark({ size = 'sm' }: { size?: keyof typeof SIZES }) {
  const { plates, bar } = SIZES[size]
  const side = plates.map(([w, h], i) => (
    <i key={i} className="block bg-accent" style={{ width: w, height: h }} />
  ))
  return (
    <span className="flex items-center gap-px" aria-hidden="true">
      {side}
      <i className="block bg-bg" style={{ width: bar[0], height: bar[1] }} />
      {[...side].reverse().map((el, i) => (
        <i key={`r${i}`} className="block bg-accent" style={el.props.style} />
      ))}
    </span>
  )
}
