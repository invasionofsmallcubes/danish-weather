import { degreesToCompass } from '../wind'

describe('degreesToCompass', () => {
  it('converts 0° to N', () => {
    expect(degreesToCompass(0)).toBe('N')
  })

  it('converts 360° to N', () => {
    expect(degreesToCompass(360)).toBe('N')
  })

  it('converts 90° to E', () => {
    expect(degreesToCompass(90)).toBe('E')
  })

  it('converts 180° to S', () => {
    expect(degreesToCompass(180)).toBe('S')
  })

  it('converts 270° to W', () => {
    expect(degreesToCompass(270)).toBe('W')
  })

  it('converts 295° to WNW', () => {
    expect(degreesToCompass(295)).toBe('WNW')
  })

  it('converts 45° to NE', () => {
    expect(degreesToCompass(45)).toBe('NE')
  })

  it('converts 225° to SW', () => {
    expect(degreesToCompass(225)).toBe('SW')
  })

  it('handles negative degrees', () => {
    expect(degreesToCompass(-90)).toBe('W')
  })

  it('handles degrees > 360', () => {
    expect(degreesToCompass(450)).toBe('E')
  })
})
