import { mapAutokuk, normalizeDate } from '../autokuk';

// Smyšlená odpověď ve tvaru, jaký API pravděpodobně vrací. Upravit po prvním skutečném dotazu.
const sample = {
  vehicle: { vin: 'TMBJJ7NE5K0123456', brand: 'ŠKODA', model: 'OCTAVIA' },
  inspections: [
    { date: '2022-10-20', valid_until: '2024-10-27' },
    { date: '2024-10-25', valid_until: '2026-10-27' },
  ],
  vignette: { valid: true, valid_until: '31. 1. 2027' },
};

describe('mapAutokuk', () => {
  it('normalizes date formats', () => {
    expect(normalizeDate('2027-01-31T00:00:00Z')).toBe('2027-01-31');
    expect(normalizeDate('31. 1. 2027')).toBe('2027-01-31');
    expect(normalizeDate(42)).toBeUndefined();
  });

  it('maps VIN, name, STK and vignette', () => {
    expect(mapAutokuk(sample)).toEqual({
      vin: 'TMBJJ7NE5K0123456',
      name: 'ŠKODA OCTAVIA',
      stkUntil: '2026-10-27',
      vignetteUntil: '2027-01-31',
      vignetteExempt: undefined,
    });
  });

  it('handles an exempt vehicle and an empty answer', () => {
    expect(mapAutokuk({ vignette: { exempt: true } })).toMatchObject({ vignetteExempt: true, vignetteUntil: undefined });
    expect(mapAutokuk({})).toEqual({ vin: undefined, name: undefined, stkUntil: undefined, vignetteUntil: undefined, vignetteExempt: undefined });
  });
});
