import { mapUsedCar, shapeOf } from '../autokuk';

// Smyšlená odpověď. Přesné schéma Autokuk API zatím neznáme, upravit po prvním skutečném dotazu.
const sample = {
  vehicle: {
    vin: 'TMBJJ7NE5K0123456',
    brand: 'ŠKODA',
    model: 'OCTAVIA III',
    first_registration: '2018-03-15',
    fuel: 'Nafta',
    power_kw: 110,
  },
  inspections: [
    { date: '2020-03-10', type: 'STK', mileage: 61200, valid_until: '2022-03-10' },
    { date: '2022-03-08', type: 'STK', mileage: '121 500 km', valid_until: '2024-03-08' },
    { date: '2024-03-05', type: 'STK', mileage: 98000, valid_until: '2026-03-05' },
  ],
  import: { imported: true, country: 'DE', date: '2019-11-02' },
  deregistration: null,
  theft: { stolen: false, checked_at: '2026-10-05T10:00:00Z' },
};

describe('mapUsedCar', () => {
  it('maps vehicle details, mileage, import and theft', () => {
    expect(mapUsedCar(sample)).toEqual({
      vin: 'TMBJJ7NE5K0123456',
      name: 'ŠKODA OCTAVIA III',
      firstRegistration: '2018-03-15',
      fuel: 'Nafta',
      powerKw: 110,
      stkUntil: '2026-03-05',
      mileage: [
        { date: '2020-03-10', km: 61200 },
        { date: '2022-03-08', km: 121500 },
        { date: '2024-03-05', km: 98000 },
      ],
      imported: { country: 'DE', date: '2019-11-02' },
      deregistered: undefined,
      stolen: false,
    });
  });

  it('reads a separate mileage list with plain values', () => {
    const { mileage } = mapUsedCar({ odometer: [{ datum: '5. 4. 2021', value: 50000 }, { datum: '5. 4. 2023', value: 82000 }] });
    expect(mileage).toEqual([
      { date: '2021-04-05', km: 50000 },
      { date: '2023-04-05', km: 82000 },
    ]);
  });

  it('says stolen only when the answer is clear', () => {
    expect(mapUsedCar({ theft: { is_stolen: true } }).stolen).toBe(true);
    expect(mapUsedCar({ theft: { status: 'STOLEN' } }).stolen).toBe(true);
    expect(mapUsedCar({ theft: { status: 'not_found' } }).stolen).toBe(false);
    expect(mapUsedCar({ theft: [] }).stolen).toBe(false);
    // Nejasné odpovědi nechá na webu policie.
    expect(mapUsedCar({ theft: { stolen_check_done: true } }).stolen).toBeUndefined();
    expect(mapUsedCar({ theft: [{ source: 'PČR' }] }).stolen).toBeUndefined();
    expect(mapUsedCar({ theft: null }).stolen).toBeUndefined();
    expect(mapUsedCar({}).stolen).toBeUndefined();
  });

  it('reports import and deregistration only when they happened', () => {
    expect(mapUsedCar({ import: { imported: false, country: 'DE' } }).imported).toBeUndefined();
    expect(mapUsedCar({ deregistration: { deregistered: true, date: '2023-01-10' } }).deregistered).toEqual({ date: '2023-01-10' });
    expect(mapUsedCar({ deregistration: { deregistered: false } }).deregistered).toBeUndefined();
  });

  it('skips future dates and nonsense mileage', () => {
    const { mileage } = mapUsedCar({ inspections: [{ date: '2099-01-01', mileage: 1000 }, { date: '2020-01-01', mileage: 0 }] });
    expect(mileage).toEqual([]);
  });

  it('logs only field names and types', () => {
    expect(shapeOf({ vehicle: { vin: 'X', power: 110 }, list: [{ a: true }, { b: 1 }], none: null })).toEqual({
      vehicle: { vin: 'string', power: 'number' },
      list: [{ a: 'boolean' }],
      none: 'null',
    });
  });
});
