/** VIN má vždy 17 znaků a nikdy neobsahuje písmena I, O a Q (pletla by se s 1 a 0). */
export const VIN_LENGTH = 17;
const VIN_RE = /^[A-HJ-NPR-Z0-9]{17}$/;

/** Velká písmena, bez mezer a pomlček. Překlepy O, Q → 0 a I → 1 rovnou opraví. */
export function normalizeVin(value: string): string {
  return value
    .toUpperCase()
    .replace(/[OQ]/g, '0')
    .replace(/I/g, '1')
    .replace(/[^A-Z0-9]/g, '')
    .slice(0, VIN_LENGTH);
}

export function isValidVin(value: string): boolean {
  return VIN_RE.test(value);
}

/** Co uživateli říct pod polem, nebo null, když je VIN v pořádku (nebo prázdný). */
export function vinHint(value: string): string | null {
  if (!value || isValidVin(value)) return null;
  const missing = VIN_LENGTH - value.length;
  if (missing === 1) return 'Chybí ještě 1 znak.';
  if (missing >= 2 && missing <= 4) return `Chybí ještě ${missing} znaky.`;
  return `Chybí ještě ${missing} znaků.`;
}
