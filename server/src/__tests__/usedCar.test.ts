import { mapUsedCar, type Json } from '../autokuk';
import { sample, today } from '../fixtures/autokukSample';

const withData = (data: { [key: string]: Json }): Json => ({ status: 'ok', data, meta: null, error: null });

describe('mapUsedCar', () => {
  it('maps the documented answer', () => {
    expect(mapUsedCar(sample, today)).toEqual({
      vin: 'TMBJJ7NE5K0123456',
      name: 'ŠKODA OCTAVIA III',
      year: 2017,
      firstRegistration: '2018-03-15',
      fuel: 'Nafta',
      powerKw: 110,
      stkUntil: '2026-03-20',
      mileage: [
        { date: '2020-03-10', km: 61200 },
        { date: '2022-03-08', km: 121500 },
        { date: '2024-03-05', km: 98000 },
      ],
      imported: { country: 'DE', date: '2019-11-02' },
      deregistered: undefined,
      stolen: false,
      owners: 2,
      notes: ['Svolavaci akce vyrobce'],
    });
  });

  it('never passes owner names or addresses', () => {
    const json = JSON.stringify(mapUsedCar(sample, today));
    expect(json).not.toContain('Novak');
    expect(json).not.toContain('Praha');
  });

  it('falls back to inspections for mileage', () => {
    const { mileage } = mapUsedCar(withData({ inspections: [{ datum: '2021-04-05', km: 50000 }, { datum: '2099-01-01', km: 90000 }, { datum: '2023-04-05', km: 0 }] }), today);
    expect(mileage).toEqual([{ date: '2021-04-05', km: 50000 }]);
  });

  it('says stolen only when a check is clear about it', () => {
    const theft = (...checks: Json[]) => mapUsedCar(withData({ theft: { status: 'x', checks } }), today).stolen;
    expect(theft({ country_code: 'CZ', status: 'found' })).toBe(true);
    expect(theft({ country_code: 'CZ', status: 'not_found' }, { country_code: 'SK', status: 'found' })).toBe(true);
    expect(theft({ country_code: 'CZ', status: 'not_found' }, { country_code: 'SK', status: 'unknown' })).toBe(false);
    // Česká kontrola nedoběhla nebo neznámý stav: rozhodne web policie.
    expect(theft({ country_code: 'CZ', status: 'unknown', reason: 'timeout' })).toBeUndefined();
    expect(theft({ country_code: 'CZ', status: 'error' })).toBeUndefined();
    expect(mapUsedCar(withData({}), today).stolen).toBeUndefined();
  });

  it('tells a current deregistration from a past one', () => {
    expect(mapUsedCar(withData({ vehicle: { status: 'Vyrazene z provozu' } }), today).deregistered).toEqual({ current: true, date: undefined });
    expect(mapUsedCar(withData({ vehicle: { status: 'Provozovane' }, deregistrations: [{ od: '2021-02-01', do: '2021-08-01' }] }), today).deregistered).toEqual({
      current: false,
      date: '2021-08-01',
    });
    expect(mapUsedCar(withData({ vehicle: { status: 'Provozovane' }, deregistrations: [] }), today).deregistered).toBeUndefined();
  });

  it('finds an import in history when imports is empty', () => {
    const data = { imports: [], history: [{ category: 'kostka_vozidla_dovoz', date: '2019-11-02', data: { country: 'AT', imported_at: '2019-11-02' } }] };
    expect(mapUsedCar(withData(data), today).imported).toEqual({ country: 'AT', date: '2019-11-02' });
  });
});
