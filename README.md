# BestCast

A local forecast in Vietnamese, English and Japanese, on one phone-style screen.

Sixteen independent forecast services are queried at once and reconciled into a
single most likely figure for each day and each hour. Nothing in the interface
names a model, a provider or an API parameter — the reader is told what the
number is, which is the question they arrived with.

> The project began as a tool for comparing sixteen named forecast models side
> by side, and some of the code still carries that shape. The roster in
> `core/models.js` is what produces the reconciled figure; it never reaches the
> interface.

## What it shows

One screen, laid out the way a phone's own weather app is, so nobody has to
learn it. The background takes the colour of the sky outside — blue on a clear
day, grey under cloud or rain, slate in a storm, navy at night — and the
browser's status bar follows it.

- **Now.** The place name (tap it to change place), the temperature in large
  type, the sky in words with an icon, today's high and low, and what it feels
  like. Below it, when the forecast was fetched and a worded *Update* button.
- **The next 24 hours**, scrolling sideways: hour, sky, chance of rain (shown
  from 20 % up, so the hours that matter stand out) and temperature, with
  sunrise and sunset slotted in where they fall. Above the strip, one
  sentence for the question most people open the app with: *"Rain likely from
  around 14:00."* / *"Rain now, stopping around 19:00."*
- **The week**, one row a day: day, sky, low, a range bar, high. The bars share
  one scale, so a cold day sits visibly left of a warm one, and today's bar
  carries a dot for the temperature now. Behind each bar a faint band runs
  from the coldest low to the warmest high that *any* forecast service gives —
  the app's own addition to the familiar layout: a wide band is a day the
  services disagree about. Tap a day for its rain, chance of rain, strongest
  wind, UV, sunrise, sunset and that full range in words.
- **Tiles** for UV, sunrise/sunset, wind (with a compass and gusts), rainfall
  today and in the next 24 hours, feels-like, humidity and dew point,
  visibility and pressure. Each is a figure and a sentence saying what the
  figure means; a tile with nothing to show is left out rather than drawn with
  a dash.
- **Detailed charts**, one tap away at the bottom: the app's original four
  cards — rainfall, chance of rain, temperature and wind — each with a
  fortnight day by day and a week hour by hour, every bar labelled with its
  value and a table view offered to everyone. The choice to show them is
  remembered.

Choosing a place and the settings are bottom sheets that slide up over the
forecast and close straight back onto it:

- **Locations** — use my location, recent places (one tap back to the town you
  checked yesterday, with *Remove*), town search, and *Choose on the map* for a
  spot with no name worth searching for.
- **Settings** — language, units, text size, about, and the author.

The language switcher also stays in the strip at the top of the screen: a
reader who cannot read the interface cannot find a setting that would fix it.

## Three languages

Vietnamese, English and Japanese, switchable at runtime from the header with no
reload. The choice is remembered; on a first visit the browser's own language
list decides, falling back to English.

Switching a language moves more than the words:

- **Dates, clocks and numerals** go through `Intl` with a real locale tag, so a
  switch to Japanese gives `2026年9月14日` rather than a half-translated
  `14 Sep`. `en` is tagged `en-GB`, not bare `en` — plain `en` resolves to US
  conventions, and day-first sits better beside the other two.
- **Place names** are refetched. Searching 東京 returns 東京都, and a pin dropped
  on Hanoi reverse-geocodes to `Hà Nội` in Vietnamese and `ハノイ` in Japanese.
  A place name is part of the interface, not data passing through it.
- **The `lang` attribute** is restamped, so a Japanese screen reader does not
  pronounce 気温 through an English voice.

Two rules hold in `i18n/messages.js`. No sentence is assembled from fragments —
anything with a moving part is a whole template with a `{placeholder}`, because
"Updated 5 minutes ago" puts the verb first and `5 分前に更新` puts it last.
And no module below the UI holds a sentence: geolocation failures and network
errors travel as translation keys, so an error raised before a language switch
is re-rendered in the new language instead of being stuck in the old one.

There are deliberately **no flags**. Windows ships no glyphs for regional
indicator pairs, so 🇻🇳 renders there as the bare letters "VN" beside the word it
was meant to illustrate — and a flag is a country rather than a language in any
case. `日本語` identifies itself to the only reader who needs to find it.

## The things that make it honest

**Identical services are counted once — but only when they really are the
same.** Ask about Hanoi and three of the regional services return *identical*
series, because outside their own region they all fall back to the same global
model. Counting them as three agreeing forecasts would manufacture confidence
that does not exist, and would drag the middle value they feed. At Oslo those
same three are genuinely distinct and all count.

Duplication is decided **once, from a signature variable** (temperature), then
applied to every variable. Deciding it per-variable was wrong in a way that
mattered: over a single day several services forecast zero rain for all 24
hours, producing identical precipitation series — and those services genuinely
and independently agree that it will not rain.

**Outliers are shown, not smoothed.** Daily rainfall is violently skewed: one
service can forecast 200 mm for a single day while the rest sit under 10 mm.
Scaling the axis to that peak flattens the readable week into the bottom tenth
of the chart; clipping it away deletes the single most important sentence the
app can say. So the daily rain ceiling comes from a percentile, and a column
that runs off the top is labelled `▲` **with its real figure**. An overflow
label is never thinned away and never replaced by the headline number.

The hourly chart takes the same treatment, and needs it more now that it covers
a week than it did at three days: scaled to its single wettest hour, every
ordinary hour flattened into an invisible smear along the axis.

**Marks are placed on the clock at the place being forecast.** Every timestamp
the API returns is local to that place and carries no timezone. Using the
browser's clock instead put the "now" rule a day into the future when a reader
in Asia looked at a point in the Pacific: the axis said 14:00 and the rule stood
at hour 38. Both marks now come from `utc_offset_seconds`.

**Freshness is measured, not assumed.** `navigator.onLine` reports true on a
Wi-Fi with no route out. Worse, the service worker replays a stored response
when the network is gone, so the request *succeeds* — and `Date.now()` would
report a day-old answer as "updated just now". The age comes from the response's
own `Date` header, which travels with the cached copy.

**The cache and its shape guard must agree.** A stored forecast is reused for 15
minutes, and `loadCachedForecast` rejects anything not in the current shape.
When those two disagreed — the freshness probe saying "fresh" while the loader
returned `null` for a shape it no longer recognised — every returning reader
inside the window got an error page over a perfectly good forecast sitting in
their own storage. Both now test the same key.

## API notes worth knowing

- `best_match` **cannot** be combined with other model ids — passing it
  alongside them makes the API reject the whole call. It is a second request.
- The API can answer **HTTP 200 with invalid JSON**, emitting bare `nan` tokens,
  for a regional model asked about a point outside its domain. `res.json()`
  throws on that, so bodies are parsed by hand.
- It also answers 200 with an all-null series rather than an error when a model
  has no data for a point. A successful fetch is not the same as usable data.
- **Precipitation probability is thinner than the rest.** Only 5–8 services
  carry it where 10–14 carry rain, temperature and wind, so its figure rests on
  about half the roster. Nothing special-cases it — services returning nulls are
  dropped anyway — but it is worth knowing that this one parameter is reconciled
  from fewer opinions than the other three.
- Conditions *now* (`current=`), the sky codes, sunrise/sunset, UV, humidity,
  dew point, visibility, pressure, gusts and wind direction come from the
  `best_match` requests the app already makes, so the phone screen added
  variables but no requests: still four in all. These are details for the
  screen, not reconciled figures — the four reconciled parameters still come
  from the whole roster, and the big numbers on screen use their "most
  likely" value so the top of the screen and the charts never disagree.
- The geocoding API has **no reverse endpoint**. Passing it coordinates returns
  nothing, so reverse lookup goes to BigDataCloud's keyless
  `reverse-geocode-client`, which takes the same language codes.

## Design rules

- Root font size is 18px and every dimension is in `rem`, so the text-size
  control grows buttons, gaps and chart labels together. Nothing interactive is
  under `3.4rem`.
- One hue per parameter, held across its daily and hourly charts, so a reader
  scanning the page knows what they are looking at before reading the title.
  Each hue has a band tint chosen per mode rather than flipped.
- Every card has a table view carrying the values as text, offered to everyone
  rather than hidden behind a screen-reader-only class.
- Charts measure their labels before drawing them and thin on a fixed stride, so
  the largest text size degrades evenly rather than overlapping — and so no day
  reads as singled out by an accident of collision.
- `min-w-0` on the parameter cards is load-bearing. A grid item defaults to
  `min-width: auto`, so the several-thousand-pixel hourly strip inside one would
  otherwise set the width of the whole column and push the page off the screen.
  For the same reason the grid declares `grid-cols-1` explicitly: an implicit
  track is auto-sized to max-content.
- The hourly charts cap their backing store at 1.5x. A week of hours is a canvas
  thousands of CSS pixels wide, and at a full retina ratio four of them cross
  what mobile Safari will allocate — past that limit a canvas silently comes
  back blank rather than erroring.
- The today/now rule is labelled in the padding *above* the plot. Along the
  bottom it collided with the value label of every zero-valued bar, so on a dry
  day "0mm" and "today" were drawn on top of each other.

- The forecast screen sits on the sky colour in both colour schemes, so its
  text is white whatever the system is set to. Pure white clears 4.5:1 on every
  sky palette in `core/conditions.js`; the dimmed white only does so inside a
  card, where the card's black wash darkens the sky behind it — so dimmed text
  is never placed directly on the sky. The sheets use the normal light and dark
  page colours.
- `<main>` is `position: relative`, and the hourly strip is too. Visually hidden
  labels are absolutely positioned; without a positioned ancestor they are
  placed against the page at their spot far down the forecast, and the whole
  page — header and all — becomes scrollable behind it, or wider than the phone.
- The week's columns are fixed widths so the bars line up and share a scale.
  When the text size leaves the bar too little room, a container query puts
  each day on two lines instead of squeezing the bar or cutting the day name.
  The tiles drop to one column the same way.
- The first download is the forecast screen and React only — about 97 KB
  gzipped, half what it was. The map library (with its stylesheet) loads when
  someone chooses on the map, and the chart library when the charts are
  opened. React has a chunk of its own on purpose: Rollup puts any dependency
  of a manual chunk that has no chunk of its own *inside* it, so React landed in
  the chart chunk and the entry had to preload both heavy libraries to reach it.

## Running it

```bash
npm install
npm run dev        # http://localhost:5173
npm run build
npm run preview
npm run lint
npm run icons      # regenerate the PWA icons from scripts/make-icons.mjs
```

Geolocation needs a secure context; `localhost` counts, a LAN IP over plain
`http` does not.

`core/` has no React in it and runs straight from Node, which is how the roster
was probed and how the four-parameter rewrite was checked against live data:

```bash
node -e "import('./src/core/ensemble.js').then(async m => {
  const d = await m.fetchEnsemble({ lat: 21.03, lon: 105.85 })
  console.log(d.days.length, 'days,', d.hours.length, 'hours')
})"
```

## Layout

```
src/
  i18n/
    locales.js        the three languages, their Intl tags, and detection
    messages.js       every string, in all three
    I18nProvider.jsx  the provider and the locale-aware formatters
    context.js        the context and useI18n, split out so the provider
                      file exports a component and nothing else
  core/               no React in here — runnable straight from Node
    models.js         the roster, and what is retired. Never reaches the UI
    ensemble.js       the four parameters, fetching, de-duplication, distribution
    geocode.js        town search, reverse lookup, coordinate wrapping
    storage.js        remembered place, recent places, language, settings, offline copy
    units.js          conversion and display formatting
    defaults.js       fallback city per language
    conditions.js     weather codes to words, icons and sky colours; the outlook sentence
    view.js           the forecast arranged for the screen: now, 24 hours, week, tiles
  hooks/
    useSavedPlaces.js the recent-places list
  components/
    ConditionIcon.jsx colour sky icons for the forecast screen
    Sheet.jsx         the bottom sheet: a modal dialog with a worded Done button
    LanguageSwitcher.jsx
    charts/RangeBarChart.jsx   the solid bar, its band, and the labels
  sections/
    NowHero.jsx       place, temperature, sky, high/low, feels like
    HourlyStrip.jsx   the next 24 hours and the outlook sentence
    DailyList.jsx     the week, with the spread band and tap-to-open days
    DetailTiles.jsx   UV, sun, wind, rain, feels like, humidity, visibility, pressure
    ChartsSection.jsx the detailed charts, loaded on demand
    LocationsSheet.jsx  my location, recent places, search, the map
    SettingsSheet.jsx language, units, text size, about, author
    ParameterCard.jsx one parameter: daily chart, hourly chart, legend, table
```

## Data

Forecasts from [Open-Meteo](https://open-meteo.com) (free, no key, CC-BY 4.0).
Reverse geocoding from [BigDataCloud](https://www.bigdatacloud.com) (keyless
client endpoint). Map tiles from
[OpenStreetMap](https://www.openstreetmap.org/copyright).

## Deploying

The build is path-relative, so one build works from a domain root, from a
project subpath, or anywhere else it is served. `VITE_BASE_PATH` still
overrides it for a host that needs an absolute base, and whatever it ends up
as feeds the manifest's `start_url` and `scope` — an installed app whose
start_url sits outside its scope opens in a browser tab instead of standalone.

It cannot be opened as a file. A browser refuses to load an ES module over
`file://`, treating every script there as cross-origin, so `dist/index.html`
on the disk says that in the page rather than showing a blank screen.

- **Vercel** — deploys on every push to `main`. `vercel.json` carries the
  cache headers, and it must stay plain JSON: the schema rejects unknown
  properties, so a `comment` key there fails the deploy before the build even
  starts. The two rules worth knowing:
  - `/sw.js` is never served from cache. Cache it and an installed app can pin
    itself to an old build forever, with no way back.
  - `/assets/*` is immutable by construction — every filename carries a hash.
- **GitHub Pages** — the workflow builds on a push to `main` and publishes to
  <https://xuantinhsea.github.io/BestCast/>. It derives
  `VITE_BASE_PATH` from the repository name rather than hard-coding it, so a
  rename cannot leave a stale path behind, and it runs `actions/configure-pages`
  with `enablement: true` so a fresh clone of the repo does not need anyone to
  visit Settings before the first deploy can succeed.

## The roster behind the range

Maintainers only — none of this reaches the interface. Every id was probed
against the live API at Hanoi, Oslo and Sydney. Several ids still in circulation
are **dead** — they answer HTTP 200 and return nulls forever — and are recorded
in `RETIRED` in `core/models.js` so nobody re-adds them: `ecmwf_ifs04`,
`ecmwf_aifs025`, `access_global`, `bom_access_global`, `kma_seamless`,
`kma_gdps`, `gfs_graphcast025`.

| | Model | Centre | Reach |
|---|---|---|---|
| Global | ICON | DWD, Germany | ~9 d |
| | GFS | NOAA, United States | ~18 d |
| | IFS | ECMWF | ~17 d |
| | AIFS | ECMWF — machine learning | ~17 d |
| | GEM | ECCC, Canada | ~12 d |
| | GRAPES | CMA, China | ~7 d |
| | ARPEGE | Météo-France | ~6 d |
| | JMA GSM | JMA, Japan | ~13 d |
| | UKMO | Met Office, UK | ~9 d |
| Regional | MET Nordic | MET Norway | ~17 d |
| | HARMONIE | KNMI, Netherlands | ~17 d |
| | HARMONIE | DMI, Denmark | ~17 d |
| | ICON-EU | DWD, Germany | ~7 d |
| | ARPEGE-EU | Météo-France | ~6 d |
| | AROME | Météo-France | ~2 d |
| | ICON-2I | ARPAE, Italy | ~3 d |

`reach` is what each model actually returned, not what its documentation claims.
Within a 7-day forecast window almost all of them are still answering, which is
why the bands here do not narrow towards the right the way a 16-day chart does.

## Not in this version

Imperial units are plumbed through `core/units.js` and reachable from Settings,
but the app defaults to metric. Not included: ensemble members within a single
service, flood-specific series such as river discharge and return periods, and
any variable beyond the four above.

The spread between services is drawn on the week list, as the faint band
behind each day's temperature bar. The detailed charts still draw only the most
likely value; adding it there means passing the `stats` arrays already on each
series back into `RangeBarChart` as a second, paler dataset.

## Author

Nguyen Xuan TINH (Ph.D.) — Nippon Koei Co., Ltd., Water Resources & Energy Dept.
<xuantinhsea@gmail.com> · <https://xuantinhsea.github.io/>

© 2026 Nguyen Xuan TINH. All rights reserved.
