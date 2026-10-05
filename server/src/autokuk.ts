// Převod odpovědi Autokuk API na náš tvar. Schéma: https://autokuk.cz/api/openapi.yaml (verze 1.0.0).
// Odpověď je obálka { status, data, meta, error }, údaje o autě jsou v data.
// Jména a adresy majitelů (data.owners.records) nikdy dál neposíláme, bereme jen jejich počet.

export type Json = null | boolean | number | string | Json[] | { [key: string]: Json };
type Obj = { [key: string]: Json };

export type VehicleInfo = {
  vin?: string;
  name?: string;
  stkUntil?: string;
  vignetteUntil?: string;
  vignetteExempt?: boolean;
};

export type MileageRecord = { date: string; km: number };

export type UsedCarReport = {
  vin?: string;
  name?: string;
  year?: number;
  firstRegistration?: string;
  fuel?: string;
  powerKw?: number;
  stkUntil?: string;
  /** Stav tachometru při prohlídkách, od nejstaršího. */
  mileage: MileageRecord[];
  /** Jen když je auto dovezené. */
  imported?: { country?: string; date?: string };
  /** current: auto je teď vyřazené. Jinak bylo vyřazené jen v minulosti. */
  deregistered?: { current: boolean; date?: string };
  /** true kradené, false čisté, undefined když to Autokuk neví (appka pak ověří na webu policie). */
  stolen?: boolean;
  owners?: number;
  /** Poznámky výrobce, například svolávací akce. */
  notes?: string[];
};

const VIN_RE = /^[A-HJ-NPR-Z0-9]{17}$/;

const obj = (v: Json | undefined): Obj => (v && typeof v === 'object' && !Array.isArray(v) ? v : {});
const list = (v: Json | undefined): Json[] => (Array.isArray(v) ? v : []);
const text = (v: Json | undefined): string | undefined => (typeof v === 'string' && v.trim() ? v.trim() : undefined);
const num = (v: Json | undefined): number | undefined => (typeof v === 'number' && Number.isFinite(v) ? v : undefined);

/** Převede „2027-01-31“, „2027-01-31T00:00:00Z“ nebo „31. 1. 2027“ na RRRR-MM-DD. */
export function normalizeDate(value: Json | undefined): string | undefined {
  if (typeof value !== 'string') return undefined;
  const iso = /^(\d{4})-(\d{2})-(\d{2})/.exec(value);
  if (iso) return `${iso[1]}-${iso[2]}-${iso[3]}`;
  const cz = /^(\d{1,2})\.\s?(\d{1,2})\.\s?(\d{4})/.exec(value.trim());
  if (cz) return `${cz[3]}-${cz[2].padStart(2, '0')}-${cz[1].padStart(2, '0')}`;
  return undefined;
}

function addYears(iso: string, years: number): string {
  return `${Number(iso.slice(0, 4)) + years}${iso.slice(4)}`;
}

const isoToday = (today: Date) => today.toISOString().slice(0, 10);

function dataOf(body: Json): Obj {
  return obj(obj(body).data);
}

/**
 * Autokuk platnost STK přímo nevrací. Odhadneme ji jako appka u kontroly tachometru:
 * poslední prohlídka, při které bylo auto způsobilé, plus 2 roky.
 */
function stkUntil(data: Obj, today: Date): string | undefined {
  const last = list(data.inspections)
    .map(obj)
    .filter((i) => /^(zpusobil|způsobil)/i.test(text(i.zpusobilost) ?? '') && !/evidenc|zadost|žádost/i.test(text(i.typ) ?? ''))
    .map((i) => normalizeDate(i.datum))
    .filter((d): d is string => !!d && d <= isoToday(today))
    .sort()
    .at(-1);
  return last ? addYears(last, 2) : undefined;
}

export function mapAutokuk(body: Json, today: Date = new Date()): VehicleInfo {
  const data = dataOf(body);
  const vehicle = obj(data.vehicle);
  const vignette = obj(data.vignette);
  const vin = text(data.vin) ?? text(vehicle.vin);
  const exempt = vignette.exempt === true;
  return {
    vin: vin && VIN_RE.test(vin) ? vin : undefined,
    name: [text(vehicle.brand), text(vehicle.model)].filter(Boolean).join(' ') || undefined,
    stkUntil: stkUntil(data, today),
    vignetteUntil: exempt ? undefined : normalizeDate(vignette.valid_until),
    vignetteExempt: exempt || undefined,
  };
}

/** Body z data.mileage.points, a když chybí, stav km z prohlídek. */
function mileage(data: Obj, today: Date): MileageRecord[] {
  const points = list(obj(data.mileage).points).map((p) => ({ date: normalizeDate(obj(p).date), km: num(obj(p).mileage) }));
  const fromInspections = list(data.inspections).map((i) => ({ date: normalizeDate(obj(i).datum), km: num(obj(i).km) }));
  const seen = new Set<string>();
  const records: MileageRecord[] = [];
  for (const { date, km } of points.length ? points : fromInspections) {
    if (!date || km === undefined || km <= 0 || km >= 2_000_000 || date > isoToday(today)) continue;
    if (seen.has(`${date}|${km}`)) continue;
    seen.add(`${date}|${km}`);
    records.push({ date, km });
  }
  return records.sort((a, b) => a.date.localeCompare(b.date) || a.km - b.km);
}

function imported(data: Obj): UsedCarReport['imported'] {
  const fromHistory = list(data.history)
    .map(obj)
    .filter((h) => /dovoz|import/i.test(text(h.category) ?? ''))
    .map((h) => obj(h.data));
  const record = [...list(data.imports).map(obj), ...fromHistory].find((r) => text(r.country) || normalizeDate(r.imported_at));
  return record ? { country: text(record.country), date: normalizeDate(record.imported_at) } : undefined;
}

function deregistered(data: Obj): UsedCarReport['deregistered'] {
  const status = text(obj(data.vehicle).status) ?? text(obj(obj(data.technical).registration).status) ?? '';
  const current = /vyrazen|vyřazen|zanik|zánik|odhlasen|odhlášen/i.test(status);
  const records = list(data.deregistrations);
  // Tvar položek schéma nepopisuje, vezmeme z nich nejnovější datum.
  const date = records
    .flatMap((r) => Object.values(obj(r)).map(normalizeDate))
    .filter((d): d is string => !!d)
    .sort()
    .at(-1);
  return current || records.length ? { current, date } : undefined;
}

/**
 * Pátrání: data.theft.checks, jedna kontrola na zemi (CZ, SK). Kradené jen když některá kontrola auto našla,
 * čisté jen když česká kontrola výslovně nic nenašla. Jinak (třeba „unknown“ po timeoutu) rozhodne web policie.
 */
function stolen(data: Obj): boolean | undefined {
  const checks = list(obj(data.theft).checks).map(obj);
  const status = (c: Obj) => (text(c.status) ?? '').toLowerCase();
  if (checks.some((c) => /found|stolen|match|hit|wanted/.test(status(c)) && !/not[_ ]?found/.test(status(c)))) return true;
  if (checks.some((c) => text(c.country_code)?.toUpperCase() === 'CZ' && /^not[_ ]?found$/.test(status(c)))) return false;
  return undefined;
}

function owners(data: Obj): number | undefined {
  const section = obj(data.owners);
  const records = list(section.records).map(obj);
  const ownersOnly = records.filter((r) => /vlastn|owner/i.test(text(r.vehicle_relation) ?? '')).length;
  return ownersOnly || num(section.count) || undefined;
}

export function mapUsedCar(body: Json, today: Date = new Date()): UsedCarReport {
  const data = dataOf(body);
  const basic = mapAutokuk(body, today);
  const vehicle = obj(data.vehicle);
  const notes = list(data.manufacturer_notes).map(text).filter((n): n is string => !!n);
  return {
    vin: basic.vin,
    name: basic.name,
    year: num(vehicle.manufacture_year),
    firstRegistration: normalizeDate(vehicle.first_registration) ?? normalizeDate(obj(obj(data.technical).registration).first_registration),
    fuel: text(vehicle.fuel),
    powerKw: num(vehicle.power_kw),
    stkUntil: basic.stkUntil,
    mileage: mileage(data, today),
    imported: imported(data),
    deregistered: deregistered(data),
    stolen: stolen(data),
    owners: owners(data),
    notes: notes.length ? notes : undefined,
  };
}

/** Kolik vyhledání zbývá dnes (meta.quota). Jen číslo, do logu serveru. */
export function remainingToday(body: Json): number | undefined {
  return num(obj(obj(obj(body).meta).quota).remaining_today);
}
