import { isValidVin, normalizeVin, vinHint } from '../vin';

describe('vin', () => {
  it('cleans up what people type', () => {
    expect(normalizeVin('tmb jj7ne5-k0123456')).toBe('TMBJJ7NE5K0123456');
    expect(normalizeVin('TMBJJ7NE5KO12345I')).toBe('TMBJJ7NE5K0123451');
    expect(normalizeVin('TMBJJ7NE5K0123456789')).toHaveLength(17);
  });

  it('accepts only 17 valid characters', () => {
    expect(isValidVin('TMBJJ7NE5K0123456')).toBe(true);
    expect(isValidVin('TMBJJ7NE5K012345')).toBe(false);
    expect(isValidVin('TMBJJ7NE5KO123456')).toBe(false);
  });

  it('says how many characters are missing', () => {
    expect(vinHint('')).toBeNull();
    expect(vinHint('TMBJJ7NE5K0123456')).toBeNull();
    expect(vinHint('TMBJJ7NE5K012345')).toBe('Chybí ještě 1 znak.');
    expect(vinHint('TMBJJ7NE5K0123')).toBe('Chybí ještě 3 znaky.');
    expect(vinHint('TMB')).toBe('Chybí ještě 14 znaků.');
  });
});
