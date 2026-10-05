import { mapAutokuk, normalizeDate, remainingToday } from '../autokuk';
import { sample, today } from '../fixtures/autokukSample';

describe('mapAutokuk', () => {
  it('normalizes date formats', () => {
    expect(normalizeDate('2027-01-31T00:00:00Z')).toBe('2027-01-31');
    expect(normalizeDate('31. 1. 2027')).toBe('2027-01-31');
    expect(normalizeDate(42)).toBeUndefined();
  });

  it('maps VIN, name, STK and vignette', () => {
    expect(mapAutokuk(sample, today)).toEqual({
      vin: 'TMBJJ7NE5K0123456',
      name: 'ŠKODA OCTAVIA III',
      // Poslední způsobilá prohlídka 20. 3. 2024 (opakovaná), evidenční kontrola STK neprodlužuje.
      stkUntil: '2026-03-20',
      vignetteUntil: '2027-01-31',
      vignetteExempt: undefined,
    });
  });

  it('handles an exempt vehicle and an empty answer', () => {
    expect(mapAutokuk({ data: { vignette: { exempt: true, valid_until: null } } })).toMatchObject({ vignetteExempt: true, vignetteUntil: undefined });
    expect(mapAutokuk({ status: 'error', data: null })).toEqual({ vin: undefined, name: undefined, stkUntil: undefined, vignetteUntil: undefined, vignetteExempt: undefined });
  });

  it('reads the remaining daily quota', () => {
    expect(remainingToday(sample)).toBe(72);
    expect(remainingToday({})).toBeUndefined();
  });
});
