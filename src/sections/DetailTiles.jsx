import { compassPoint, uvLevel } from '../core/conditions'
import { formatDistance, formatPressure, formatRain, formatTemp, formatWind } from '../core/units'
import { useI18n } from '../i18n/context'

/**
 * The square tiles under the week: the conditions right now that are not the
 * temperature.
 *
 * Each tile is a figure and a sentence. The figure is for the reader who
 * knows what 1012 hPa means; the sentence is for everyone else, and says what
 * the figure means for the next few hours. A tile with nothing to show is left
 * out rather than drawn with a dash in it.
 */
const isNum = (v) => typeof v === 'number' && Number.isFinite(v)

export function DetailTiles({ view, system }) {
  const { t, fmt } = useI18n()
  if (!view?.hasDetails) return null
  const { now, tiles } = view
  const deg = (c) => `${formatTemp(c, system)}°`
  const items = []

  if (isNum(now.uv)) {
    const level = uvLevel(Math.round(now.uv))
    items.push(
      <Tile key="uv" icon="uv" title={t('tiles.uv')} value={Math.round(now.uv)} sub={t(`uv.${level}`)}
            sentence={isNum(tiles.uvMaxToday) ? t('tiles.uvToday', { value: Math.round(tiles.uvMaxToday) }) : null}>
        <UvScale uv={now.uv} />
      </Tile>,
    )
  }

  if (tiles.sun) {
    const { next, time, other, progress } = tiles.sun
    items.push(
      <Tile key="sun" icon={next} title={t(`hourly.${next}`)} value={fmt.hour(time)}
            sentence={t(next === 'sunset' ? 'tiles.sunriseAt' : 'tiles.sunsetAt', { time: fmt.hour(other) })}>
        <SunArc progress={progress} />
      </Tile>,
    )
  }

  if (isNum(now.wind)) {
    const point = compassPoint(now.windDir)
    items.push(
      <Tile key="wind" icon="wind" title={t('tiles.wind')}
            value={<>{formatWind(now.wind, system)}<small className="tile-unit">{system.windSymbol}</small></>}
            sub={point ? t('tiles.windFrom', { dir: t(`compass.${point}`) }) : null}
            sentence={isNum(now.gusts) ? t('tiles.gusts', { speed: `${formatWind(now.gusts, system)} ${system.windSymbol}` }) : null}>
        {isNum(now.windDir) && <Compass degrees={now.windDir} north={t('compass.northLetter')} />}
      </Tile>,
    )
  }

  if (isNum(tiles.rainSoFar) || isNum(tiles.rainNext24)) {
    const next = tiles.rainNext24
    items.push(
      <Tile key="rain" icon="rain" title={t('params.precipitation.name')}
            value={<>{formatRain(tiles.rainSoFar ?? 0, system)}<small className="tile-unit">{system.rainSymbol}</small></>}
            sub={t('tiles.rainSoFar')}
            sentence={!isNum(next) ? null : next < 0.1
              ? t('tiles.rainNoneNext')
              : t('tiles.rainNext', { amount: `${formatRain(next, system)} ${system.rainSymbol}` })} />,
    )
  }

  if (isNum(now.feelsLike)) {
    const diff = isNum(now.temp) ? now.feelsLike - now.temp : 0
    let key = 'tiles.feelsSame'
    if (diff >= 2) key = isNum(now.humidity) && now.humidity >= 60 ? 'tiles.feelsHumid' : 'tiles.feelsWarmer'
    else if (diff <= -2) key = isNum(now.wind) && now.wind >= 15 ? 'tiles.feelsWindy' : 'tiles.feelsCooler'
    items.push(<Tile key="feels" icon="temp" title={t('tiles.feelsLike')} value={deg(now.feelsLike)} sentence={t(key)} />)
  }

  if (isNum(now.humidity)) {
    items.push(
      <Tile key="humidity" icon="humidity" title={t('tiles.humidity')} value={`${Math.round(now.humidity)}%`}
            sentence={isNum(now.dewPoint) ? t('tiles.dewPoint', { temp: deg(now.dewPoint) }) : null} />,
    )
  }

  if (isNum(now.visibility)) {
    const m = now.visibility
    items.push(
      <Tile key="vis" icon="eye" title={t('tiles.visibility')}
            value={<>{formatDistance(m, system)}<small className="tile-unit">{system.distanceSymbol}</small></>}
            sentence={t(m >= 10000 ? 'tiles.visClear' : m >= 1000 ? 'tiles.visReduced' : 'tiles.visPoor')} />,
    )
  }

  if (isNum(now.pressure)) {
    items.push(
      <Tile key="pressure" icon="gauge" title={t('tiles.pressure')}
            value={<>{formatPressure(now.pressure, system)}<small className="tile-unit">{system.pressureSymbol}</small></>}
            sentence={tiles.pressureTrend ? t(`tiles.pressure_${tiles.pressureTrend}`) : null} />,
    )
  }

  if (!items.length) return null
  return (
    <section className="tiles" aria-labelledby="details-title">
      <h2 id="details-title" className="sr-only">{t('tiles.title')}</h2>
      <div className="tile-grid">{items}</div>
    </section>
  )
}

function Tile({ icon, title, value, sub, sentence, children }) {
  return (
    <div className="glass px-3.5 py-4 flex flex-col min-h-[11rem]">
      <h3 className="glass-label flex items-center gap-1.5">
        <TileGlyph name={icon} />
        <span className="min-w-0">{title}</span>
      </h3>
      <p className="mt-1.5 flex flex-wrap items-baseline text-[2rem] font-semibold leading-none">{value}</p>
      {sub && <p className="mt-1 text-lg font-semibold leading-tight">{sub}</p>}
      {children}
      {sentence && <p className="mt-auto pt-3 text-base leading-snug">{sentence}</p>}
    </div>
  )
}

const GLYPHS = {
  uv: 'M12 4v2M12 18v2M4 12h2M18 12h2M6.3 6.3l1.4 1.4M16.3 16.3l1.4 1.4M17.7 6.3l-1.4 1.4M7.7 16.3l-1.4 1.4M12 9a3 3 0 1 0 0 6 3 3 0 0 0 0-6Z',
  sunrise: 'M4 18h16M7 18a5 5 0 0 1 10 0M12 4v6M9.5 6.5 12 4l2.5 2.5',
  sunset: 'M4 18h16M7 18a5 5 0 0 1 10 0M12 4v6M9.5 7.5 12 10l2.5-2.5',
  wind: 'M3 9h11a3 3 0 1 0-3-3M3 15h15a3 3 0 1 1-3 3M3 12h8',
  rain: 'M12 3.5s-6 6.6-6 10.5a6 6 0 0 0 12 0c0-3.9-6-10.5-6-10.5Z',
  temp: 'M10 14.5V5a2 2 0 1 1 4 0v9.5a4 4 0 1 1-4 0Z',
  humidity: 'M12 3.5s-6 6.6-6 10.5a6 6 0 0 0 12 0c0-3.9-6-10.5-6-10.5ZM9.5 14.5a2.5 2.5 0 0 0 2.5 2.5',
  eye: 'M2.5 12S6 5.5 12 5.5 21.5 12 21.5 12 18 18.5 12 18.5 2.5 12 2.5 12ZM12 9.5a2.5 2.5 0 1 0 0 5 2.5 2.5 0 0 0 0-5Z',
  gauge: 'M4.5 17a8 8 0 1 1 15 0M12 13l3.5-4',
}

function TileGlyph({ name }) {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" style={{ width: '1.1rem', height: '1.1rem' }} className="shrink-0">
      <path d={GLYPHS[name] ?? GLYPHS.uv} fill="none" stroke="currentColor" strokeWidth="2.2"
            strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

/** The WHO UV colours along a bar, with today's reading as a dot. */
function UvScale({ uv }) {
  const pos = Math.max(0, Math.min(1, uv / 11)) * 100
  return (
    <span className="relative block mt-3 h-[0.38rem] rounded-full" aria-hidden="true"
          style={{ background: 'linear-gradient(90deg,#4ade80,#facc15 30%,#fb923c 55%,#ef4444 75%,#c084fc)' }}>
      <span className="absolute top-1/2 h-[0.7rem] w-[0.7rem] -translate-x-1/2 -translate-y-1/2 rounded-full
                       bg-white ring-2 ring-black/35" style={{ left: `${pos}%` }} />
    </span>
  )
}

/** Half an ellipse from sunrise to sunset, with the sun on it while it is up. */
function SunArc({ progress }) {
  const p = progress == null ? null : Math.max(0, Math.min(1, progress))
  const angle = p == null ? null : Math.PI * (1 - p)
  const x = angle == null ? null : 50 + 40 * Math.cos(angle)
  const y = angle == null ? null : 34 - 26 * Math.sin(angle)
  return (
    <svg viewBox="0 0 100 40" className="mt-2 w-full h-[2.6rem]" aria-hidden="true">
      <path d="M10 34a40 26 0 0 1 80 0" fill="none" stroke="rgba(255,255,255,0.45)" strokeWidth="2.2"
            strokeDasharray="3 4" />
      <path d="M2 34h96" stroke="rgba(255,255,255,0.6)" strokeWidth="1.6" />
      {x != null && <circle cx={x} cy={y} r="5" fill="#ffc83d" stroke="#ffffff" strokeWidth="1.5" />}
    </svg>
  )
}

/** A compass card with the arrow pointing the way the wind is blowing — from
 *  the direction named in the tile, across the middle. */
function Compass({ degrees, north }) {
  return (
    <svg viewBox="0 0 60 60" className="mt-2 self-start h-[3.6rem] w-[3.6rem]" aria-hidden="true">
      <circle cx="30" cy="30" r="25" fill="none" stroke="rgba(255,255,255,0.45)" strokeWidth="2" />
      <text x="30" y="12" textAnchor="middle" fontSize="9" fontWeight="700" fill="#ffffff">{north}</text>
      <g transform={`rotate(${degrees + 180} 30 30)`}>
        <path d="M30 44V22" stroke="#ffffff" strokeWidth="3" strokeLinecap="round" />
        <path d="m24.5 26 5.5-7 5.5 7Z" fill="#ffffff" />
      </g>
    </svg>
  )
}
