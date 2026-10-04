import { accidentReportHtml, claimAdvice, missingItems, newAccident, policeVerdict, POLICE_QUESTIONS, type Accident } from '../accident';
import { addressText } from '../accidentPlace';

const allNo = Object.fromEntries(POLICE_QUESTIONS.map((q) => [q.id, false]));

function filled(): Accident {
  return {
    ...newAccident(new Date(2026, 9, 5, 14, 7)),
    place: { lat: 50.2104, lon: 15.8327, address: 'Gočárova třída 1, Hradec Králové' },
    police: allNo,
    photos: (['overview', 'myDamage', 'otherDamage', 'otherPlate', 'otherLicence', 'otherDocs'] as const).map((kind, i) => ({ id: `p${i}`, kind, uri: `file:///nehoda/${kind}.jpg` })),
    other: { name: 'Jan Novák', phone: '777 123 456', spz: '1AB 2345', insurer: 'Kooperativa', policy: '' },
    description: 'Stál jsem na červenou, <druhé> auto do mě narazilo zezadu.',
    fault: 'other',
  };
}

describe('nehoda krok za krokem', () => {
  it('says to call the police when any condition applies', () => {
    expect(policeVerdict({ police: {} })).toBe('unanswered');
    expect(policeVerdict({ police: { injury: false } })).toBe('unanswered');
    expect(policeVerdict({ police: { damage: true } })).toBe('call');
    expect(policeVerdict({ police: allNo })).toBe('not-needed');
    // Když se řidiči neshodnou na viníkovi, policie musí přijet, i když jinak bylo všechno „ne“.
    expect(policeVerdict({ police: allNo, fault: 'unclear' })).toBe('call');
  });

  it('lists what is still missing while the other driver is there', () => {
    expect(missingItems(filled())).toEqual([]);
    const fresh = newAccident();
    const missing = missingItems(fresh);
    expect(missing[0]).toBe('místo nehody');
    expect(missing).toContain('fotka „SPZ druhého auta“');
    expect(missing).toContain('pojišťovna druhého auta');
    expect(missingItems({ ...fresh, placeNote: 'D1 km 34' })).not.toContain('místo nehody');
  });

  it('tells who reports the damage to which insurer', () => {
    expect(claimAdvice('other', 'Kooperativa')).toContain('pojišťovně druhého řidiče (Kooperativa)');
    expect(claimAdvice('me', '', 'Allianz')).toBe('Druhý řidič nahlásí škodu vaší pojišťovně (Allianz). Vy jí nehodu oznamte bez zbytečného odkladu.');
    expect(claimAdvice('unclear', '')).toContain('158');
    expect(claimAdvice(undefined, '')).toBeNull();
  });

  it('builds the PDF page with photos and escaped text', () => {
    const html = accidentReportHtml(filled(), { spz: '4H7 2318', insurer: 'Allianz' }, { p0: 'data:image/jpeg;base64,AAA' });
    expect(html).toContain('5. 10. 2026 v 14:07');
    expect(html).toContain('Gočárova třída 1, Hradec Králové');
    expect(html).toContain('https://www.google.com/maps/search/?api=1&query=50.210400,15.832700');
    expect(html).toContain('&lt;druhé&gt; auto');
    expect(html).not.toContain('<druhé>');
    expect(html).toContain('<img src="data:image/jpeg;base64,AAA"/><figcaption>Celkový pohled</figcaption>');
    // Fotky, které nejde načíst, v PDF nejsou.
    expect(html.match(/<img /g)).toHaveLength(1);
    expect(html).toContain('Nebylo nutné ji volat');
  });

  it('turns the phone address into one line', () => {
    expect(addressText({ street: 'Gočárova třída', streetNumber: '1', city: 'Hradec Králové' })).toBe('Gočárova třída 1, Hradec Králové');
    expect(addressText({ name: 'D11', subregion: 'Hradec Králové' })).toBe('D11, Hradec Králové');
    expect(addressText({ formattedAddress: 'Česko' })).toBe('Česko');
    expect(addressText({})).toBeUndefined();
  });
});
