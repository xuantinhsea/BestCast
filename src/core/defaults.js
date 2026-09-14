/**
 * Where to point the map when we have nothing else.
 *
 * Only coordinates are stored, never a name: the name is fetched through the
 * same reverse geocoder as every other pin, so it arrives in whatever language
 * the reader is using rather than being frozen in whichever one we typed it in.
 *
 * The choice follows the interface language because that is the best guess
 * available at that moment — someone who opened the app in Japanese is far more
 * likely to want Tokyo than London. It is only a starting point; the search box
 * and the map are right there.
 */
const FALLBACKS = {
  vi: { lat: 21.0285, lon: 105.8542 },   // Hà Nội
  ja: { lat: 35.6895, lon: 139.6917 },   // 東京
  en: { lat: 51.5072, lon: -0.1276 },    // London
}

export function fallbackPlace(locale) {
  return FALLBACKS[locale] ?? FALLBACKS.en
}
