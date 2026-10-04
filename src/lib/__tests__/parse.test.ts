import { nextAnniversary, parseLookup } from '../lookup/parse';

const today = new Date(2026, 9, 4);

// Texty jsou smyšlené ukázky. Skutečné výstupy webů je potřeba doplnit po prvním testu na telefonu.
describe('parseLookup', () => {
  it('detects a wrong captcha code', () => {
    expect(parseLookup('ckp', 'Zadaný kód je nesprávný, opište kód znovu.', today)).toEqual({ kind: 'wrong-code' });
  });

  it('reads vignette validity', () => {
    expect(parseLookup('edalnice', 'Známka pro 4H72318 je platná do 31. 1. 2027', today)).toEqual({
      kind: 'vignette',
      until: '2027-01-31',
      exempt: false,
      valid: true,
    });
    expect(parseLookup('edalnice', 'Vozidlo je od časového poplatku osvobozeno.', today)).toMatchObject({ exempt: true });
  });

  it('reads insurer and next anniversary from ČKP', () => {
    const text = 'Výsledek\nPojistitel: Kooperativa pojišťovna, a.s.\nPojištěno od: 14. 11. 2023';
    expect(parseLookup('ckp', text, today)).toEqual({
      kind: 'insurance',
      insurer: 'Kooperativa pojišťovna, a.s.',
      until: '2026-11-14',
    });
    expect(parseLookup('ckp', 'Vozidlo nebylo nalezeno.', today)).toEqual({ kind: 'not-found' });
  });

  it('estimates next STK from inspection history', () => {
    const text = 'Datum prohlídky 12. 3. 2022 120 400 km\nDatum prohlídky 10. 3. 2024 151 200 km';
    expect(parseLookup('tachometr', text, today)).toEqual({
      kind: 'stk',
      lastInspection: '2024-03-10',
      estimatedUntil: '2026-03-10',
    });
  });

  it('reads VIN and STK from OvěřeníAuta', () => {
    const text = 'VIN: TMBJJ7NE5K0123456\nPlatnost STK do: 27. 10. 2026';
    expect(parseLookup('overeniauta', text, today)).toEqual({
      kind: 'vehicle',
      vin: 'TMBJJ7NE5K0123456',
      stkUntil: '2026-10-27',
    });
  });

  it('computes the next anniversary', () => {
    expect(nextAnniversary('2023-11-14', today)).toBe('2026-11-14');
    expect(nextAnniversary('2023-02-01', today)).toBe('2027-02-01');
  });
});
