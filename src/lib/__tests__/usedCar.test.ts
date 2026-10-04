import { parseLookup } from '../lookup/parse';
import { fmtKm, parseMileage, parseStolen, summarizeMileage } from '../usedCar';

// Tabulka prohlídek tak, jak ji vrátí innerText (buňky oddělené tabulátorem).
const TABLE = [
  'Datum prohlídky\tProhlídka\tDruh prohlídky\tStav km\tPoznámka',
  '14. 3. 2019\tSTK\tPravidelná\t98 512\t',
  '14. 3. 2019\tEmise\tPravidelná\t98 512\t',
  '2. 4. 2021\tSTK\tPravidelná\t141 230\t',
  '28. 3. 2023\tSTK\tPravidelná\t96 004\t',
  '20. 3. 2025\tSTK\tPravidelná\t121 800\t',
  'Datum první registrace\t1. 6. 2015',
].join('\n');

describe('prověření ojetiny', () => {
  it('tells a stolen car from a clean one', () => {
    expect(parseStolen('Nebyly nalezeny žádné výsledky.')).toBe('clear');
    expect(parseStolen('RZ\tVIN\tMPZ\n4H72318\tTMBJJ7NE5K0123456\tCZ\tOtevřít detail')).toBe('stolen');
    expect(parseStolen('Detail odcizeného vozidla\nBarva: černá')).toBe('stolen');
    expect(parseStolen('Načítám…')).toBe('unknown');
  });

  it('reads the mileage of every inspection', () => {
    expect(parseMileage(TABLE)).toEqual([
      { date: '2019-03-14', km: 98512 },
      { date: '2021-04-02', km: 141230 },
      { date: '2023-03-28', km: 96004 },
      { date: '2025-03-20', km: 121800 },
    ]);
  });

  it('reads the mileage from inspection details too', () => {
    const detail = ['Datum prohlídky', '14.03.2019', 'Prohlídka', 'STK', 'Stav km', '98 512', 'Datum prohlídky', '02.04.2021', 'Stav km', '141 230 km'].join('\n');
    // Hodnota je pod popiskem „Stav km“ na vlastním řádku, nebo hned za ním.
    expect(parseMileage(detail.replace(/Stav km\n/g, 'Stav km: '))).toEqual(parseMileage(detail));
    expect(parseMileage(detail)).toEqual([
      { date: '2019-03-14', km: 98512 },
      { date: '2021-04-02', km: 141230 },
    ]);
  });

  it('finds the biggest rollback', () => {
    const summary = summarizeMileage(parseMileage(TABLE));
    expect(summary.rollback).toEqual({ from: { date: '2021-04-02', km: 141230 }, to: { date: '2023-03-28', km: 96004 } });
    expect(summary.last).toEqual({ date: '2025-03-20', km: 121800 });
    expect(fmtKm(141230)).toBe('141 230 km');
  });

  it('is calm about a normal history', () => {
    const summary = summarizeMileage([
      { date: '2019-03-14', km: 40000 },
      { date: '2021-03-14', km: 70000 },
      { date: '2023-03-14', km: 100000 },
    ]);
    expect(summary.rollback).toBeUndefined();
    expect(summary.perYear).toBe(15000);
  });

  it('knows the English wrong-code message of the mileage site', () => {
    expect(parseLookup('tachometr', 'The submitted code is incorrect')).toEqual({ kind: 'wrong-code' });
  });
});
