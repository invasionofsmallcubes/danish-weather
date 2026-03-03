import { getWeatherDescription, getWeatherIcon } from '@/lib/utils/weatherCodes';

describe('weatherCodes', () => {
  describe('getWeatherDescription', () => {
    it('should return correct description for clear sky (code 0)', () => {
      expect(getWeatherDescription(0)).toBe('Clear sky');
    });

    it('should return correct description for partly cloudy (code 2)', () => {
      expect(getWeatherDescription(2)).toBe('Partly cloudy');
    });

    it('should return correct description for moderate rain (code 63)', () => {
      expect(getWeatherDescription(63)).toBe('Moderate rain');
    });

    it('should return correct description for heavy snow (code 75)', () => {
      expect(getWeatherDescription(75)).toBe('Heavy snow');
    });

    it('should return correct description for thunderstorm with heavy hail (code 99)', () => {
      expect(getWeatherDescription(99)).toBe('Thunderstorm with heavy hail');
    });

    it('should return "Unknown" for unmapped weather code', () => {
      expect(getWeatherDescription(9999)).toBe('Unknown');
    });
  });

  describe('getWeatherIcon', () => {
    it('should return sun emoji for clear sky (code 0)', () => {
      expect(getWeatherIcon(0)).toBe('☀️');
    });

    it('should return partly cloudy emoji for code 1 and 2', () => {
      expect(getWeatherIcon(1)).toBe('🌤️');
      expect(getWeatherIcon(2)).toBe('🌤️');
    });

    it('should return cloud emoji for overcast (code 3)', () => {
      expect(getWeatherIcon(3)).toBe('☁️');
    });

    it('should return fog emoji for foggy conditions (codes 45, 48)', () => {
      expect(getWeatherIcon(45)).toBe('🌫️');
      expect(getWeatherIcon(48)).toBe('🌫️');
    });

    it('should return rain emoji for light rain (code 61)', () => {
      expect(getWeatherIcon(61)).toBe('🌧️');
    });

    it('should return snow emoji for snow conditions (codes 71-75)', () => {
      expect(getWeatherIcon(71)).toBe('❄️');
      expect(getWeatherIcon(73)).toBe('❄️');
      expect(getWeatherIcon(75)).toBe('❄️');
    });

    it('should return thunderstorm emoji for thunderstorms (codes 95-99)', () => {
      expect(getWeatherIcon(95)).toBe('⛈️');
      expect(getWeatherIcon(96)).toBe('⛈️');
      expect(getWeatherIcon(99)).toBe('⛈️');
    });

    it('should return default thermometer emoji for unknown code', () => {
      expect(getWeatherIcon(9999)).toBe('🌡️');
    });
  });
});
