/**
 * Nehoda krok za krokem. Všechno zůstává v telefonu, appka nic neodesílá.
 * Pravidla podle zákona 361/2000 Sb. (§ 47, limit škody od 1. 7. 2025).
 */

export type PhotoKind = 'overview' | 'myDamage' | 'otherDamage' | 'otherPlate' | 'otherLicence' | 'otherDocs' | 'extra';

export type AccidentPhoto = { id: string; kind: PhotoKind; uri: string };

export type PoliceQuestion = 'injury' | 'property' | 'damage' | 'fault' | 'driver' | 'traffic' | 'animal';

export type Fault = 'me' | 'other' | 'unclear';

export type AccidentPlace = { lat: number; lon: number; address?: string };

export type Accident = {
  startedAt: string;
  place?: AccidentPlace;
  placeNote: string;
  safety: string[];
  police: Partial<Record<PoliceQuestion, boolean>>;
  photos: AccidentPhoto[];
  myCarId?: string;
  other: { name: string; phone: string; spz: string; insurer: string; policy: string };
  witness: { name: string; phone: string };
  description: string;
  fault?: Fault;
};

export function newAccident(now: Date = new Date()): Accident {
  return {
    startedAt: now.toISOString(),
    placeNote: '',
    safety: [],
    police: {},
    photos: [],
    other: { name: '', phone: '', spz: '', insurer: '', policy: '' },
    witness: { name: '', phone: '' },
    description: '',
  };
}

export const SAFETY_STEPS = [
  { id: 'lights', text: 'Zapněte výstražná světla.' },
  { id: 'vest', text: 'Než vystoupíte, oblékněte si reflexní vestu.' },
  { id: 'triangle', text: 'Postavte trojúhelník aspoň 50 m za auto, na dálnici 100 m.' },
  { id: 'people', text: 'Lidi ať jdou mimo silnici, na dálnici za svodidla.' },
  { id: 'help', text: 'Zraněným poskytněte první pomoc a volejte záchranku 155.' },
] as const;

export const POLICE_QUESTIONS: { id: PoliceQuestion; text: string }[] = [
  { id: 'injury', text: 'Je někdo zraněný?' },
  { id: 'property', text: 'Je poškozené něco jiného než vaše auta? Třeba svodidla, značka, plot nebo zaparkované auto bez řidiče.' },
  { id: 'damage', text: 'Je škoda na některém autě zřejmě vyšší než 200 000 Kč?' },
  { id: 'fault', text: 'Neshodnete se, kdo nehodu zavinil?' },
  { id: 'driver', text: 'Ujel viník, nebo je někdo pod vlivem alkoholu či drog nebo bez řidičáku?' },
  { id: 'traffic', text: 'Nejde auta odsunout a uvolnit silnici?' },
  { id: 'animal', text: 'Srazili jste zvíře, třeba srnu nebo divočáka?' },
];

export type PoliceVerdict = 'call' | 'not-needed' | 'unanswered';

/** Policii je nutné volat, když platí aspoň jedna z podmínek. Bez ní jen když jsou všechny odpovědi „ne“. */
export function policeVerdict(accident: Pick<Accident, 'police' | 'fault'>): PoliceVerdict {
  const answers = POLICE_QUESTIONS.map((q) => accident.police[q.id]);
  if (answers.some((a) => a === true) || accident.fault === 'unclear') return 'call';
  return answers.every((a) => a === false) ? 'not-needed' : 'unanswered';
}

export const PHOTO_SHOTS: { kind: PhotoKind; title: string; hint: string }[] = [
  { kind: 'overview', title: 'Celkový pohled', hint: 'Z dálky, ať je vidět, kde auta stojí' },
  { kind: 'myDamage', title: 'Škoda na mém autě', hint: 'Zblízka i z pár kroků' },
  { kind: 'otherDamage', title: 'Škoda na druhém autě', hint: 'Zblízka i z pár kroků' },
  { kind: 'otherPlate', title: 'SPZ druhého auta', hint: 'Ať jde přečíst' },
  { kind: 'otherLicence', title: 'Řidičák druhého řidiče', hint: 'Přední strana' },
  { kind: 'otherDocs', title: 'Techničák a zelená karta', hint: 'Druhého auta' },
];

export function photosOf(accident: Accident, kind: PhotoKind): AccidentPhoto[] {
  return accident.photos.filter((p) => p.kind === kind);
}

export function photoTitle(kind: PhotoKind): string {
  return PHOTO_SHOTS.find((s) => s.kind === kind)?.title ?? 'Další fotka';
}

/** Co v záznamu ještě chybí. Ukazujeme to na konci, ať na nic nezapomene, dokud je druhý řidič na místě. */
export function missingItems(accident: Accident): string[] {
  const missing: string[] = [];
  if (!accident.place && !accident.placeNote.trim()) missing.push('místo nehody');
  for (const shot of PHOTO_SHOTS) if (!photosOf(accident, shot.kind).length) missing.push(`fotka „${shot.title}“`);
  if (!accident.other.name.trim()) missing.push('jméno druhého řidiče');
  if (!accident.other.phone.trim()) missing.push('telefon druhého řidiče');
  if (!accident.other.spz.trim()) missing.push('SPZ druhého auta');
  if (!accident.other.insurer) missing.push('pojišťovna druhého auta');
  if (!accident.fault) missing.push('kdo nehodu zavinil');
  return missing;
}

/** Kdo komu hlásí škodu. Z povinného ručení platí pojišťovna viníka. */
export function claimAdvice(fault: Fault | undefined, otherInsurer: string, myInsurer?: string): string | null {
  const other = otherInsurer ? `pojišťovně druhého řidiče (${otherInsurer})` : 'pojišťovně druhého řidiče';
  const mine = myInsurer ? ` (${myInsurer})` : '';
  switch (fault) {
    case 'other':
      return `Škodu na svém autě nahlásíte ${other}. Udělejte to bez zbytečného odkladu, nejlépe ještě dnes.`;
    case 'me':
      return `Druhý řidič nahlásí škodu vaší pojišťovně${mine}. Vy jí nehodu oznamte bez zbytečného odkladu.`;
    case 'unclear':
      return 'Když se neshodnete, kdo nehodu zavinil, volejte policii na 158.';
    default:
      return null;
  }
}

export function formatWhen(iso: string): string {
  const d = new Date(iso);
  return `${d.getDate()}. ${d.getMonth() + 1}. ${d.getFullYear()} v ${d.getHours()}:${String(d.getMinutes()).padStart(2, '0')}`;
}

export function mapLink(place: AccidentPlace): string {
  return `https://www.google.com/maps/search/?api=1&query=${place.lat.toFixed(6)},${place.lon.toFixed(6)}`;
}

function esc(text: string): string {
  return text.replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]!);
}

const FAULT_TEXT: Record<Fault, string> = { me: 'Já', other: 'Druhý řidič', unclear: 'Neshodneme se' };

export type ReportCar = { spz: string; name?: string; insurer?: string };

/** HTML pro PDF podklad. Fotky přicházejí jako data URI, protože iOS při tisku neumí načíst soubory z telefonu. */
export function accidentReportHtml(accident: Accident, myCar: ReportCar | undefined, images: Record<string, string>): string {
  const row = (label: string, value?: string) => (value?.trim() ? `<tr><th>${esc(label)}</th><td>${esc(value.trim())}</td></tr>` : '');
  const place = accident.place;
  const verdict = policeVerdict(accident);
  const yes = POLICE_QUESTIONS.filter((q) => accident.police[q.id]).map((q) => q.text);
  const photos = accident.photos
    .filter((p) => images[p.id])
    .map((p) => `<figure><img src="${images[p.id]}"/><figcaption>${esc(photoTitle(p.kind))}</figcaption></figure>`)
    .join('');

  return `<!doctype html><html><head><meta charset="utf-8"/><style>
body{font-family:-apple-system,Roboto,Arial,sans-serif;color:#111;font-size:12px;margin:28px}
h1{font-size:20px;margin:0 0 4px}h2{font-size:14px;margin:18px 0 6px;border-bottom:1px solid #ccc;padding-bottom:3px}
.sub{color:#555;margin:0 0 10px}table{border-collapse:collapse;width:100%}th{text-align:left;width:34%;color:#555;font-weight:600;padding:3px 8px 3px 0;vertical-align:top}
td{padding:3px 0}p{margin:4px 0}.grid{display:flex;flex-wrap:wrap;gap:8px}figure{margin:0;width:48%;page-break-inside:avoid}
img{width:100%;border-radius:4px}figcaption{color:#555;font-size:11px;margin-top:2px}a{color:#0645ad}
</style></head><body>
<h1>Podklad k záznamu o dopravní nehodě</h1>
<p class="sub">Připraveno v appce Silnice v kapse. Nenahrazuje společný záznam o dopravní nehodě podepsaný oběma řidiči.</p>
<h2>Kdy a kde</h2><table>
${row('Datum a čas', formatWhen(accident.startedAt))}
${row('Místo', place?.address)}
${place ? `<tr><th>GPS</th><td><a href="${mapLink(place)}">${place.lat.toFixed(6)}, ${place.lon.toFixed(6)}</a></td></tr>` : ''}
${row('Upřesnění místa', accident.placeNote)}
</table>
<h2>Moje auto</h2><table>
${row('SPZ', myCar?.spz)}${row('Auto', myCar?.name)}${row('Pojišťovna', myCar?.insurer)}
</table>
<h2>Druhý řidič</h2><table>
${row('Jméno', accident.other.name)}${row('Telefon', accident.other.phone)}${row('SPZ', accident.other.spz)}
${row('Pojišťovna', accident.other.insurer)}${row('Číslo pojistky nebo zelené karty', accident.other.policy)}
</table>
${accident.witness.name.trim() || accident.witness.phone.trim() ? `<h2>Svědek</h2><table>${row('Jméno', accident.witness.name)}${row('Telefon', accident.witness.phone)}</table>` : ''}
<h2>Co se stalo</h2>
${accident.description.trim() ? `<p>${esc(accident.description.trim()).replace(/\n/g, '<br/>')}</p>` : ''}
<table>${row('Kdo nehodu zavinil', accident.fault ? FAULT_TEXT[accident.fault] : undefined)}
${row('Policie', verdict === 'call' ? 'Bylo nutné ji volat' : verdict === 'not-needed' ? 'Nebylo nutné ji volat' : undefined)}</table>
${yes.length ? `<p>Důvody pro policii: ${yes.map(esc).join(' ')}</p>` : ''}
${photos ? `<h2>Fotky</h2><div class="grid">${photos}</div>` : ''}
</body></html>`;
}
