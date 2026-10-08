/**
 * Weather condition icons, in colour, for the sky-coloured main screen.
 *
 * Same construction rules as WeatherIcon — one bold silhouette, no hairlines —
 * but filled with the colours phone weather apps have taught everyone to read:
 * a yellow sun, white clouds, blue rain. The word for the condition is always
 * printed beside or near the icon; the icon only speeds up recognition.
 */
const SUN = '#ffc83d'
const MOON = '#f2e6b8'
const CLOUD = '#f1f5f9'
const CLOUD_DARK = '#cbd5e1'
const DROP = '#6cbcff'
const BOLT = '#ffd54a'

const STROKE = { fill: 'none', strokeLinecap: 'round', strokeLinejoin: 'round' }

// The same cloud outline as WeatherIcon, high and low variants.
const CLOUD_PATH = 'M7.5 18.5A4.5 4.5 0 0 1 8 9.6a5.6 5.6 0 0 1 10.6 1.7 3.9 3.9 0 0 1-.6 7.2Z'
const CLOUD_HIGH = 'M7.5 15.6A4.3 4.3 0 0 1 8 6.9a5.5 5.5 0 0 1 10.4 1.6 3.8 3.8 0 0 1-.6 7.1Z'

function Sun() {
  return (
    <g>
      <circle cx="12" cy="12" r="4.6" fill={SUN} />
      <path d="M12 2.4v2.2M12 19.4v2.2M2.4 12h2.2M19.4 12h2.2M5.2 5.2l1.6 1.6M17.2 17.2l1.6 1.6M18.8 5.2l-1.6 1.6M6.8 17.2l-1.6 1.6"
            stroke={SUN} strokeWidth="2.2" {...STROKE} />
    </g>
  )
}

function Moon() {
  return <path d="M14.6 3.2a8.8 8.8 0 1 0 6.2 13.6A7 7 0 0 1 14.6 3.2Z" fill={MOON} />
}

function Partly({ night }) {
  return (
    <g>
      <g transform="translate(-2.4 -2.8) scale(0.78)">{night ? <Moon /> : <Sun />}</g>
      <path d={CLOUD_PATH} fill={CLOUD} transform="translate(1.4 1.2) scale(0.95)" />
    </g>
  )
}

function Drops({ count = 3, long = false, color = DROP }) {
  const xs = count === 2 ? [9.5, 14.5] : [7.5, 12, 16.5]
  return (
    <g stroke={color} strokeWidth={long ? 2.6 : 2.2} {...STROKE}>
      {xs.map((x) => <path key={x} d={`M${x} 17.6 L${x - 1.2} ${long ? 22.8 : 21.4}`} />)}
    </g>
  )
}

function Flakes() {
  return (
    <g fill="#ffffff">
      {[[7.6, 19.4], [12, 21.4], [16.4, 19.4]].map(([x, y]) => <circle key={x} cx={x} cy={y} r="1.5" />)}
    </g>
  )
}

const ICONS = {
  clear: () => <Sun />,
  'clear-night': () => <Moon />,
  partly: () => <Partly />,
  'partly-night': () => <Partly night />,
  cloud: () => <path d={CLOUD_PATH} fill={CLOUD} />,
  fog: () => (
    <g>
      <path d={CLOUD_HIGH} fill={CLOUD_DARK} />
      <path d="M4 18.6h16M6.5 21.6h11" stroke={CLOUD} strokeWidth="2.2" {...STROKE} />
    </g>
  ),
  drizzle: () => <g><path d={CLOUD_HIGH} fill={CLOUD} /><Drops count={2} /></g>,
  rain: () => <g><path d={CLOUD_HIGH} fill={CLOUD} /><Drops /></g>,
  heavy: () => <g><path d={CLOUD_HIGH} fill={CLOUD_DARK} /><Drops long /></g>,
  sleet: () => (
    <g>
      <path d={CLOUD_HIGH} fill={CLOUD} />
      <path d="M8.5 17.6 7.3 21.4" stroke={DROP} strokeWidth="2.2" {...STROKE} />
      <circle cx="13" cy="19.6" r="1.5" fill="#ffffff" />
      <path d="M17 17.6 15.8 21.4" stroke={DROP} strokeWidth="2.2" {...STROKE} />
    </g>
  ),
  snow: () => <g><path d={CLOUD_HIGH} fill={CLOUD} /><Flakes /></g>,
  thunder: () => (
    <g>
      <path d={CLOUD_HIGH} fill={CLOUD_DARK} />
      <path d="M12.6 13.2 9.4 18.4h3l-1.4 4.4 4.4-6h-3.1l1.6-3.6Z" fill={BOLT} />
    </g>
  ),
  sunrise: () => (
    <g>
      <path d="M6.6 16.6a5.4 5.4 0 0 1 10.8 0Z" fill={SUN} />
      <path d="M3 19.6h18M12 3.2v6.2M9.4 6 12 3.2 14.6 6" stroke={SUN} strokeWidth="2.2" {...STROKE} />
    </g>
  ),
  sunset: () => (
    <g>
      <path d="M6.6 16.6a5.4 5.4 0 0 1 10.8 0Z" fill="#ffad5c" />
      <path d="M3 19.6h18M12 3.2v6.2M9.4 6.6 12 9.4 14.6 6.6" stroke="#ffad5c" strokeWidth="2.2" {...STROKE} />
    </g>
  ),
}

/**
 * @param name  an icon from core/conditions.js describe(), or sunrise/sunset
 * @param size  a rem string, so icons grow with the text-size control
 */
export function ConditionIcon({ name, size = '2rem', className = '' }) {
  const Shape = ICONS[name] ?? ICONS.cloud
  return (
    <svg
      viewBox="0 0 24 24"
      width={size}
      height={size}
      className={className}
      style={{ width: size, height: size, flexShrink: 0 }}
      aria-hidden="true"
      focusable="false"
    >
      <Shape />
    </svg>
  )
}
