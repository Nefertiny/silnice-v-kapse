// Převod odpovědi Autokuk API na náš tvar. Přesné schéma odpovědi zatím neznáme
// (dokumentace ho veřejně neukazuje), proto hledáme pole podle názvů klíčů.
// Po prvním skutečném dotazu je dobré mapování zpřesnit podle reálné odpovědi.

export type VehicleInfo = {
  vin?: string;
  name?: string;
  stkUntil?: string;
  vignetteUntil?: string;
  vignetteExempt?: boolean;
};

export type Json = null | boolean | number | string | Json[] | { [key: string]: Json };

const VIN_RE = /^[A-HJ-NPR-Z0-9]{17}$/;

/** Převede „2027-01-31“, „2027-01-31T00:00:00Z“ nebo „31. 1. 2027“ na RRRR-MM-DD. */
export function normalizeDate(value: Json): string | undefined {
  if (typeof value !== 'string') return undefined;
  const iso = /^(\d{4})-(\d{2})-(\d{2})/.exec(value);
  if (iso) return `${iso[1]}-${iso[2]}-${iso[3]}`;
  const cz = /^(\d{1,2})\.\s?(\d{1,2})\.\s?(\d{4})/.exec(value.trim());
  if (cz) return `${cz[3]}-${cz[2].padStart(2, '0')}-${cz[1].padStart(2, '0')}`;
  return undefined;
}

type Entry = { path: string[]; key: string; value: Json };

function walk(node: Json, path: string[] = [], out: Entry[] = []): Entry[] {
  if (node && typeof node === 'object') {
    if (Array.isArray(node)) node.forEach((v, i) => walk(v, [...path, String(i)], out));
    else
      for (const [k, v] of Object.entries(node)) {
        out.push({ path, key: k, value: v });
        walk(v, [...path, k], out);
      }
  }
  return out;
}

const UNTIL_KEY = /valid|until|platn|expir|next|konec|do$/i;

function findDate(entries: Entry[], section: RegExp): string | undefined {
  const dates = entries
    .filter((e) => (section.test(e.key) || e.path.some((p) => section.test(p))) && UNTIL_KEY.test(e.key))
    .map((e) => normalizeDate(e.value))
    .filter((d): d is string => !!d)
    .sort();
  return dates.at(-1);
}

export function mapAutokuk(data: Json): VehicleInfo {
  const entries = walk(data);
  const str = (re: RegExp) => entries.find((e) => re.test(e.key) && typeof e.value === 'string')?.value as string | undefined;

  const vinCandidate = entries.find((e) => /^vin$/i.test(e.key) && typeof e.value === 'string' && VIN_RE.test(e.value));
  const brand = str(/^(brand|znacka|značka|make)$/i);
  const model = str(/^(model|obchodni_oznaceni|commercialName)$/i);
  const exempt = entries.some((e) => /vignette|znamk|dalnic/i.test(e.path.join('.') + e.key) && /exempt|osvobozen/i.test(e.key) && e.value === true);

  return {
    vin: vinCandidate?.value as string | undefined,
    name: [brand, model].filter(Boolean).join(' ') || undefined,
    stkUntil: findDate(entries, /stk|inspection|technick|prohlidk/i),
    vignetteUntil: exempt ? undefined : findDate(entries, /vignette|znamk|dalnic/i),
    vignetteExempt: exempt || undefined,
  };
}

// Prověření ojetiny: víc údajů z jedné odpovědi. Taky podle názvů klíčů, ze stejného důvodu jako výše.

export type MileageRecord = { date: string; km: number };

export type UsedCarReport = {
  vin?: string;
  name?: string;
  firstRegistration?: string;
  fuel?: string;
  powerKw?: number;
  stkUntil?: string;
  /** Stav tachometru při prohlídkách, od nejstaršího. */
  mileage: MileageRecord[];
  /** Jen když je auto dovezené. */
  imported?: { country?: string; date?: string };
  /** Jen když bylo auto vyřazené z provozu. */
  deregistered?: { date?: string };
  /** true kradené, false čisté, undefined když odpověď nejde spolehlivě přečíst (appka pak ověří na webu policie). */
  stolen?: boolean;
};

const DATE_KEY = /date|datum|time|^at$|_at$|^day$|^den$/i;
const KM_KEY = /mileage|odometer|^km$|_km$|^km_|tachometr|tacho|najet|nájezd|kilomet/i;
const KM_VALUE_KEY = /^(value|hodnota|stav|state|amount|count)$/i;
const THEFT = /theft|stolen|odciz|kraden|patran|pátrán/i;
const IMPORT = /import|dovoz|dovez/i;
const DEREG = /deregist|decommission|vyrazen|vyřazen|out_?of_?(service|operation)|scrap/i;

function toNumber(value: Json): number | undefined {
  if (typeof value === 'number') return value;
  if (typeof value !== 'string' || !/^\s*[\d\s .]+(km)?\s*$/i.test(value)) return undefined;
  const n = Number(value.replace(/[^\d]/g, ''));
  return Number.isFinite(n) ? n : undefined;
}

function inSection(e: Entry, re: RegExp): boolean {
  return re.test(e.key) || e.path.some((p) => re.test(p));
}

function objects(node: Json, path: string[] = [], out: { path: string[]; obj: Record<string, Json> }[] = []) {
  if (Array.isArray(node)) node.forEach((v, i) => objects(v, [...path, String(i)], out));
  else if (node && typeof node === 'object') {
    out.push({ path, obj: node });
    for (const [k, v] of Object.entries(node)) objects(v, [...path, k], out);
  }
  return out;
}

/** Každý objekt, který má datum a stav km, je jeden záznam tachometru. */
function findMileage(data: Json): MileageRecord[] {
  const today = new Date().toISOString().slice(0, 10);
  const seen = new Set<string>();
  const records: MileageRecord[] = [];
  for (const { path, obj } of objects(data)) {
    const fields = Object.entries(obj);
    const date = fields.filter(([k]) => DATE_KEY.test(k)).map(([, v]) => normalizeDate(v)).find(Boolean);
    const mileageList = path.some((p) => KM_KEY.test(p));
    const km = fields
      .filter(([k]) => KM_KEY.test(k) || (mileageList && KM_VALUE_KEY.test(k)))
      .map(([, v]) => toNumber(v))
      .find((n) => n !== undefined && n > 0 && n < 2_000_000);
    if (!date || km === undefined || date < '1950' || date > today) continue;
    const key = `${date}|${km}`;
    if (seen.has(key)) continue;
    seen.add(key);
    records.push({ date, km });
  }
  return records.sort((a, b) => a.date.localeCompare(b.date) || a.km - b.km);
}

/** Kradené jen podle jasné odpovědi. Když si nejsme jistí, vrátíme undefined a rozhodne web policie. */
function findStolen(entries: Entry[]): boolean | undefined {
  const theft = entries.filter((e) => inSection(e, THEFT));
  const flags = theft.filter(
    (e) => typeof e.value === 'boolean' && /stolen|odciz|kraden|wanted|hledan|theft$/i.test(e.key) && !/check|kontrol|verif|ověř|over|avail|dostup|includ/i.test(e.key),
  );
  if (flags.some((f) => f.value === true)) return true;
  if (flags.length) return false;
  const status = theft.find((e) => typeof e.value === 'string' && /status|state|stav|result|vysledek|výsledek/i.test(e.key))?.value as string | undefined;
  if (status) {
    if (/(^|[^a-z])(not|no|none|clean|clear|ok)([^a-z]|$)|není|neni|nenalez|negativ|čist|cist/i.test(status)) return false;
    if (/stolen|odciz|kraden|wanted|hledan|positiv|pozitiv/i.test(status)) return true;
  }
  const list = entries.find((e) => THEFT.test(e.key) && Array.isArray(e.value));
  if (list && (list.value as Json[]).length === 0) return false;
  return undefined;
}

function findImport(entries: Entry[]): UsedCarReport['imported'] {
  const section = entries.filter((e) => inSection(e, IMPORT));
  const flag = section.find((e) => IMPORT.test(e.key) && typeof e.value === 'boolean');
  if (flag?.value === false) return undefined;
  const country = section.find((e) => /country|zem[eě]|origin|^st[aá]t$/i.test(e.key) && typeof e.value === 'string' && e.value.trim())?.value as string | undefined;
  const date = section.map((e) => (DATE_KEY.test(e.key) ? normalizeDate(e.value) : undefined)).find(Boolean);
  return flag?.value === true || country || date ? { country: country?.trim(), date } : undefined;
}

function findDeregistration(entries: Entry[]): UsedCarReport['deregistered'] {
  const section = entries.filter((e) => inSection(e, DEREG));
  const flag = section.find((e) => typeof e.value === 'boolean' && (DEREG.test(e.key) || /^(active|aktivni|aktivní)$/i.test(e.key)));
  if (flag?.value === false) return undefined;
  const date = section.map((e) => (DATE_KEY.test(e.key) || DEREG.test(e.key) ? normalizeDate(e.value) : undefined)).find(Boolean);
  return flag?.value === true || date ? { date } : undefined;
}

export function mapUsedCar(data: Json): UsedCarReport {
  const entries = walk(data);
  const basic = mapAutokuk(data);
  const firstReg = entries
    .filter((e) => /(first|prvni|první)[\s._-]?reg|reg\w*[\s._-](first|prvni|první)|datum_?1/i.test([...e.path, e.key].join('.')))
    .map((e) => normalizeDate(e.value))
    .find(Boolean);
  const fuel = entries.find((e) => /^(fuel|fuel_?type|palivo|druh_?paliva)$/i.test(e.key) && typeof e.value === 'string')?.value as string | undefined;
  const power = entries
    .filter((e) => /power|vykon|výkon/i.test(e.key) && !/hp|ps|kon[ěe]/i.test(e.key))
    .map((e) => toNumber(e.value))
    .find((n) => n !== undefined && n >= 10 && n <= 1000);

  return {
    vin: basic.vin,
    name: basic.name,
    firstRegistration: firstReg,
    fuel: fuel?.trim() || undefined,
    powerKw: power,
    stkUntil: basic.stkUntil,
    mileage: findMileage(data),
    imported: findImport(entries),
    deregistered: findDeregistration(entries),
    stolen: findStolen(entries),
  };
}

/** Jen názvy a typy polí, bez hodnot. Do logu serveru, ať jde mapování zpřesnit podle skutečné odpovědi. */
export function shapeOf(node: Json): Json {
  if (Array.isArray(node)) return node.length ? [shapeOf(node[0])] : [];
  if (node && typeof node === 'object') return Object.fromEntries(Object.entries(node).map(([k, v]) => [k, shapeOf(v)]));
  return node === null ? 'null' : typeof node;
}
