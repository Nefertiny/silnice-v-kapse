// Ukázkové nabídky, dokud nebude podepsaná smlouva se srovnávačem pojištění.
// Skutečné ceny dodá partner přes své API podle auta klienta.
export type OfferKind = 'cena' | 'vyhody' | 'doporuceni';

export type Offer = {
  kind: OfferKind;
  tag: string;
  insurer: string;
  pricePerYear: number;
  features: string;
  /** Placená pozice partnera. Musí být v appce označená jako reklama. */
  sponsored: boolean;
};

export function sampleOffers(currentPrice: number): Offer[] {
  return [
    { kind: 'cena', tag: 'Nejlepší cena', insurer: 'Pojišťovna B', pricePerYear: Math.round(currentPrice * 0.77), features: 'limity 100/100 mil. Kč', sponsored: false },
    { kind: 'vyhody', tag: 'Stejná cena, víc výhod', insurer: 'Pojišťovna C', pricePerYear: Math.round(currentPrice * 0.99), features: 'asistence, sklo, střet se zvěří, živel', sponsored: false },
    { kind: 'doporuceni', tag: 'Naše doporučení', insurer: 'Pojišťovna D', pricePerYear: Math.round(currentPrice * 0.85), features: 'asistence a čelní sklo v ceně', sponsored: true },
  ];
}

export function formatKc(value: number): string {
  return `${value.toLocaleString('cs-CZ').replace(/,/g, ' ')} Kč`;
}
