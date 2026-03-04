/**
 * Converts wind direction in degrees to a compass cardinal/intercardinal direction.
 *
 * @param degrees - Wind direction in degrees (0-360)
 * @returns Compass direction string (e.g. "N", "NE", "WSW")
 */
export function degreesToCompass(degrees: number): string {
  const directions = [
    'N', 'NNE', 'NE', 'ENE',
    'E', 'ESE', 'SE', 'SSE',
    'S', 'SSW', 'SW', 'WSW',
    'W', 'WNW', 'NW', 'NNW',
  ]
  const index = Math.round(((degrees % 360 + 360) % 360) / 22.5) % 16
  return directions[index]
}
