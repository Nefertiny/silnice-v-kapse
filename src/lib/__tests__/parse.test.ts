import { nextAnniversary } from '../dates';
import { parseLookup } from '../lookup/parse';

const today = new Date(2026, 9, 4);

// Texty jsou smyšlené ukázky. Skutečné výstupy webů je potřeba doplnit po prvním testu na telefonu.
describe('parseLookup', () => {
  it('detects a wrong captcha code', () => {
    expect(parseLookup('edalnice', 'Zadaný kód je nesprávný, opište kód znovu.', today)).toEqual({ kind: 'wrong-code' });
  });

  it('reads vignette validity', () => {
    expect(parseLookup('edalnice', 'Známka pro 4H72318 je platná do 31. 1. 2027', today)).toEqual({
      kind: 'vignette',
      until: '2027-01-31',
      exempt: false,
      valid: true,
    });
    expect(parseLookup('edalnice', 'Vozidlo je od časového poplatku osvobozeno.', today)).toMatchObject({ exempt: true });
    // Obecné texty z titulní stránky eDálnice nejsou výsledek ověření.
    const page = 'Ověřte, zda máte platnou elektronickou dálniční známku či zda je Vaše vozidlo od úhrady osvobozeno.\nOsvobozená vozidla';
    expect(parseLookup('edalnice', page, today)).toEqual({ kind: 'unknown' });
    expect(parseLookup('edalnice', `${page}\nPlatnost od 1. 2. 2026 do 31. 1. 2027`, today)).toMatchObject({ exempt: false, until: '2027-01-31' });
    expect(parseLookup('edalnice', 'Ověření platnosti\nZadané údaje nejsou platné.', today)).toEqual({
      kind: 'vignette',
      exempt: false,
      valid: false,
    });
  });

  it('reads the eDálnice result messages', () => {
    expect(parseLookup('edalnice', 'Platná\nPlatná 1. února 2026 – 31. ledna 2027\nMůžete vyrazit na cestu.', today)).toMatchObject({
      until: '2027-01-31',
      valid: true,
    });
    expect(parseLookup('edalnice', 'Osvobozeno\nToto vozidlo je osvobozeno od zpoplatnění.', today)).toMatchObject({ exempt: true });
    expect(parseLookup('edalnice', 'Neplatná\nVozidlo nemá pro dnešní den zakoupenou dálniční známku.', today)).toEqual({
      kind: 'vignette',
      exempt: false,
      valid: false,
    });
    // „Možné osvobození“ není osvobození, platí se dál, dokud úřad žádost neschválí.
    const possible = 'Možné osvobození\nVozidlo může být osvobozeno od poplatku. Pro potvrzení osvobození je nutné podat žádost.';
    expect(parseLookup('edalnice', possible, today)).toEqual({ kind: 'unknown' });
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
    expect(nextAnniversary('2026-10-04', today)).toBe('2026-10-04');
  });
});
