import { carDeadlines, daysLabel, daysUntil, findCzDates, formatCz, okCount } from '../dates';
import type { Car } from '../types';

const today = new Date(2026, 9, 4); // 4. 10. 2026

describe('dates', () => {
  it('counts days to a date', () => {
    expect(daysUntil('2026-10-27', today)).toBe(23);
    expect(daysUntil('2026-10-04', today)).toBe(0);
    expect(daysUntil('2026-10-01', today)).toBe(-3);
  });

  it('formats Czech dates', () => {
    expect(formatCz('2027-01-31')).toBe('31. 1. 2027');
  });

  it('finds dates in text in both spellings', () => {
    expect(findCzDates('Platí od 1. 2. 2026 do 31.01.2027')).toEqual(['2026-02-01', '2027-01-31']);
  });

  it('labels remaining days in Czech', () => {
    expect(daysLabel(-1)).toBe('Propadlo');
    expect(daysLabel(1)).toBe('Zítra');
    expect(daysLabel(3)).toBe('Za 3 dny');
    expect(daysLabel(23)).toBe('Za 23 dní');
  });

  it('derives deadline states for a car', () => {
    jest.useFakeTimers().setSystemTime(today);
    const car: Car = { id: 'a', spz: '4H7 2318', type: 'osobni', vignetteUntil: '2027-01-31', stkUntil: '2026-10-27' };
    const [vignette, stk, insurance] = carDeadlines(car);
    expect(vignette.state).toBe('ok');
    expect(stk.state).toBe('soon');
    expect(insurance.state).toBe('unknown');
    expect(okCount(car)).toBe(1);
    expect(carDeadlines({ ...car, type: 'motorka' })[0].state).toBe('exempt');
    jest.useRealTimers();
  });
});
