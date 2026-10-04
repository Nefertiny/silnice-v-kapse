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

type Json = null | boolean | number | string | Json[] | { [key: string]: Json };

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
