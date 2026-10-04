/**
 * Pojišťovny, u kterých jde v Česku sjednat povinné ručení. Klient vybírá tlačítkem.
 * ČKP pojistitele podle SPZ ukazuje jen poškozeným po nehodě, proto ho appka sama nezjišťuje.
 */
export const INSURERS = [
  'Kooperativa',
  'Allianz',
  'Generali Česká',
  'ČSOB Pojišťovna',
  'ČPP',
  'Uniqa',
  'Direct',
  'Slavia',
  'Pillow',
  'HVP',
] as const;

export const OTHER_INSURER = 'Jiná pojišťovna';
