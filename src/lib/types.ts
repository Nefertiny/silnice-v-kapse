export type VehicleType = 'osobni' | 'elektro' | 'hybrid' | 'motorka';

export type Car = {
  id: string;
  spz: string;
  type: VehicleType;
  /** Volitelný popis, např. „Škoda Octavia“. */
  name?: string;
  /** VIN z malého technického průkazu (řádek E), kvůli dohledání STK. */
  vin?: string;
  /** Datumy ve tvaru RRRR-MM-DD. */
  vignetteUntil?: string;
  vignetteExempt?: boolean;
  stkUntil?: string;
  insuranceUntil?: string;
  insurer?: string;
  /** Dojezd elektroauta v km. */
  rangeKm?: number;
  verifiedAt?: string;
};

export type DeadlineKind = 'vignette' | 'stk' | 'insurance';

export type LookupSourceId = 'edalnice' | 'ckp' | 'tachometr' | 'overeniauta';
