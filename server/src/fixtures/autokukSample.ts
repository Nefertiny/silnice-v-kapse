// Odpověď ve tvaru podle https://autokuk.cz/api/openapi.yaml (příklad ze schématu, upravené hodnoty).
import type { Json } from '../autokuk';

export const today = new Date('2026-10-05T12:00:00Z');

export const sample: Json = {
  status: 'ok',
  data: {
    query: '1AB2345',
    vin: 'TMBJJ7NE5K0123456',
    searched_by_spz: true,
    vehicle: {
      vin: 'TMBJJ7NE5K0123456',
      brand: 'ŠKODA',
      model: 'OCTAVIA III',
      first_registration: '2018-03-15',
      manufacture_year: 2017,
      power_kw: 110,
      fuel: 'Nafta',
      status: 'Provozovane',
    },
    technical: { registration: { first_registration: '2018-03-15', status: 'Provozovane' } },
    inspections: [
      { datum: '2022-03-08', typ: 'pravidelna', km: 121500, zpusobilost: 'zpusobile', source: 'STK' },
      { datum: '2024-03-05', typ: 'pravidelna', km: 98000, zpusobilost: 'castecne zpusobile', source: 'STK' },
      { datum: '2024-03-20', typ: 'opakovana', km: 98100, zpusobilost: 'zpusobile', source: 'STK' },
      { datum: '2025-01-10', typ: 'evidencni', km: 99000, zpusobilost: 'zpusobile', source: 'STK' },
    ],
    mileage: {
      points: [
        { date: '2020-03-10', mileage: 61200, source: 'stk' },
        { date: '2022-03-08', mileage: 121500, source: 'stk' },
        { date: '2024-03-05', mileage: 98000, source: 'stk' },
      ],
      last: 98000,
      is_manipulated: true,
      extra_mileage: null,
    },
    imports: [{ country: 'DE', imported_at: '2019-11-02' }],
    deregistrations: [],
    owners: {
      count: 3,
      records: [
        { from: '2019-11-02', to: '2022-05-01', subject_type: 'FO', vehicle_relation: 'Vlastník', name: 'Jan Novak', address: 'Praha' },
        { from: '2019-11-02', to: '2022-05-01', subject_type: 'FO', vehicle_relation: 'Provozovatel', name: 'Jan Novak', address: 'Praha' },
        { from: '2022-05-01', to: null, subject_type: 'FO', vehicle_relation: 'Vlastník', name: 'Eva Dvorak', address: 'Brno' },
      ],
    },
    insurance: [{ insurer_code: '1', insurer_name: 'Kooperativa', valid_from: '2022-05-01' }],
    manufacturer_notes: ['Svolavaci akce vyrobce'],
    history: [{ category: 'kostka_vozidla_dovoz', date: '2019-11-02', data: { country: 'DE', imported_at: '2019-11-02' } }],
    theft: {
      status: 'partial',
      checks: [
        { country_code: 'CZ', status: 'not_found' },
        { country_code: 'SK', status: 'unknown', reason: 'timeout' },
      ],
    },
    vignette: { status: 'ok', exempt: false, valid: true, valid_from: '2026-02-01', valid_until: '2027-01-31' },
  },
  meta: { sections: ['basic', 'theft'], quota: { daily_limit: 75, used_today: 3, remaining_today: 72, search_date: '2026-10-05' } },
  error: null,
};
