/**
 * @jest-environment jsdom
 */
import { buildLookupScript, SOURCES } from '../lookup/sources';

// Zjednodušená kopie formuláře „Ověření platnosti“ z edalnice.gov.cz (stav 4. 10. 2026).
const EDALNICE_FORM = `
  <section id="validity-section">
    <h3>Ověření platnosti</h3>
    <p>Stačí zadat SPZ vozidla a hned se dozvíte, zda máte platnou elektronickou dálniční známku či zda je Vaše vozidlo od úhrady osvobozeno.</p>
    <form>
      <div data-slot="form-item">
        <label for="country">Stát registrace vozidla</label>
        <button id="country" type="button" role="combobox"><span>CZ – Česká republika</span></button>
      </div>
      <div data-slot="form-item">
        <label for="_R_mn5_-form-item">SPZ</label>
        <input data-slot="form-control" data-testid="form-licensePlate" placeholder="1P35010 (ukázkový vzor)" id="_R_mn5_-form-item" name="licensePlate" value="">
      </div>
      <button data-testid="btn-validity-check-submit" type="submit"><span>Ověřit platnost</span></button>
    </form>
  </section>
  <footer>Novinka: od 1. 3. 2027 nové ceny</footer>`;

type Msg = { type: string; text?: string };

function run(script: string) {
  new Function(script)();
}

describe('lookup script on eDálnice', () => {
  let messages: Msg[];

  beforeAll(() => {
    // jsdom innerText nezná. Stačí každý kousek textu na vlastním řádku, jako u bloků v prohlížeči.
    Object.defineProperty(HTMLElement.prototype, 'innerText', {
      configurable: true,
      get(this: HTMLElement) {
        const walker = document.createTreeWalker(this, NodeFilter.SHOW_TEXT);
        const lines: string[] = [];
        while (walker.nextNode()) {
          const t = (walker.currentNode.textContent ?? '').trim();
          if (t) lines.push(t);
        }
        return lines.join('\n');
      },
    });
  });

  beforeEach(() => {
    jest.useFakeTimers();
    messages = [];
    document.body.innerHTML = EDALNICE_FORM;
    (window as unknown as { __sivk?: boolean }).__sivk = undefined;
    sessionStorage.clear();
    (window as unknown as { ReactNativeWebView: { postMessage: (m: string) => void } }).ReactNativeWebView = {
      postMessage: (m) => messages.push(JSON.parse(m)),
    };
  });

  afterEach(() => jest.useRealTimers());

  it('fills the SPZ, submits, shows Turnstile to the user and reports the result once', () => {
    const form = document.querySelector('form')!;
    form.addEventListener('submit', (e) => e.preventDefault());
    const button = document.querySelector<HTMLButtonElement>('[data-testid="btn-validity-check-submit"]')!;
    let clicks = 0;
    button.addEventListener('click', () => {
      clicks++;
      if (clicks === 1) {
        const challenge = document.createElement('iframe');
        challenge.src = 'https://challenges.cloudflare.com/cdn-cgi/challenge-platform/turnstile';
        document.body.appendChild(challenge);
      }
    });

    run(buildLookupScript(SOURCES.edalnice, '4H72318'));
    expect(document.querySelector<HTMLInputElement>('input[name="licensePlate"]')!.value).toBe('4H72318');

    jest.advanceTimersByTime(700);
    expect(clicks).toBe(1);
    // Věta „…zda je Vaše vozidlo od úhrady osvobozeno“ je na stránce pořád a výsledek není.
    jest.advanceTimersByTime(3000);
    expect(messages.map((m) => m.type)).toEqual(['checking', 'captcha-widget']);

    // Člověk potvrdí kontrolu a ťukne na „Hotovo, pokračovat“.
    (window as unknown as { __sivkSubmit: (code: string) => void }).__sivkSubmit('');
    const result = document.createElement('p');
    result.textContent = 'Platná 1. 2. 2026 – 31. 1. 2027';
    document.getElementById('validity-section')!.appendChild(result);
    jest.advanceTimersByTime(2000);

    const results = messages.filter((m) => m.type === 'result');
    expect(results).toHaveLength(1);
    expect(results[0].text).toBe('Platná 1. 2. 2026 – 31. 1. 2027');
  });
});
