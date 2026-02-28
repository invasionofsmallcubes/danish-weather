/**
 * WMO Weather interpretation codes
 * Maps numeric weather codes to human-readable descriptions
 * Used by Open-Meteo API
 */

const WEATHER_CODE_MAP: Record<number, string> = {
  0: 'Clear sky',
  1: 'Mainly clear',
  2: 'Partly cloudy',
  3: 'Overcast',
  45: 'Foggy',
  48: 'Depositing rime fog',
  51: 'Light drizzle',
  53: 'Moderate drizzle',
  55: 'Dense drizzle',
  61: 'Slight rain',
  63: 'Moderate rain',
  65: 'Heavy rain',
  71: 'Slight snow',
  73: 'Moderate snow',
  75: 'Heavy snow',
  80: 'Slight rain showers',
  81: 'Moderate rain showers',
  82: 'Violent rain showers',
  85: 'Slight snow showers',
  86: 'Heavy snow showers',
  95: 'Thunderstorm',
  96: 'Thunderstorm with slight hail',
  99: 'Thunderstorm with heavy hail',
}

/**
 * Get human-readable weather description from WMO code
 */
export function getWeatherDescription(code: number): string {
  return WEATHER_CODE_MAP[code] ?? 'Unknown'
}

/**
 * Get simple weather icon based on WMO code
 */
export function getWeatherIcon(code: number): string {
  if (code === 0) return '☀️'
  if (code === 1 || code === 2) return '🌤️'
  if (code === 3) return '☁️'
  if ([45, 48].includes(code)) return '🌫️'
  if ([51, 53, 55].includes(code)) return '🌦️'
  if ([61, 63, 65].includes(code)) return '🌧️'
  if ([71, 73, 75].includes(code)) return '❄️'
  if ([80, 81, 82].includes(code)) return '⛈️'
  if ([85, 86].includes(code)) return '🌨️'
  if ([95, 96, 99].includes(code)) return '⛈️'
  return '🌡️'
}
