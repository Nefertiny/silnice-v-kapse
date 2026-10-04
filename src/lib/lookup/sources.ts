import type { LookupSourceId } from '../types';

export type LookupSource = {
  id: LookupSourceId;
  /** Co ověřujeme, jak to vidí klient. */
  label: string;
  /** Odkud data jsou. V appce to musí být vidět. */
  provider: string;
  url: string;
  query: 'spz' | 'vin';
  /** Kousky názvu/popisku pole, podle kterých najdeme políčko pro SPZ nebo VIN. */
  inputHints: string[];
  /** Přesné CSS selektory, když je známe. Mají přednost před hledáním podle popisků. */
  inputSelector?: string;
  submitSelector?: string;
  /** Část stránky, kde se objeví výsledek. Bez ní čteme celou stránku. */
  resultSelector?: string;
  /** Text, podle kterého poznáme hotový výsledek, když ho obecné hledání nepozná. */
  donePattern?: string;
  /** Ochrana proti robotům, kterou ukážeme jen tehdy, když je opravdu vidět (neviditelná reCAPTCHA). */
  widgetSelector?: string;
  /** Tlačítko pro jiný obrázek s kódem, když nemá text. */
  refreshSelector?: string;
};

// Skript níže hledá políčka podle selektorů a popisků, takže drobné změny webů přežije.
// Povinné ručení se tu nezjišťuje: vyhledávání ČKP je jen pro poškozené po nehodě.
export const SOURCES: Record<LookupSourceId, LookupSource> = {
  edalnice: {
    id: 'edalnice',
    label: 'Dálniční známka',
    provider: 'eDálnice',
    // Formulář „Ověření platnosti“ je na titulní stránce (stav k 4. 10. 2026, stát je předvyplněný CZ).
    url: 'https://edalnice.gov.cz/cs#validity-section',
    query: 'spz',
    inputHints: ['spz', 'licen', 'plate', 'registra', 'značk'],
    inputSelector: 'input[name="licensePlate"],[data-testid="form-licensePlate"]',
    submitSelector: '[data-testid="btn-validity-check-submit"]',
    resultSelector: '#validity-section',
  },
  overeniauta: {
    id: 'overeniauta',
    label: 'Technická (STK)',
    provider: 'OvěřeníAuta.cz',
    url: 'https://www.overeniauta.cz/',
    query: 'spz',
    inputHints: ['spz', 'vin', 'rz', 'registra', 'značk'],
  },
  tachometr: {
    id: 'tachometr',
    label: 'Technická (STK)',
    provider: 'Kontrola tachometru (ministerstvo dopravy)',
    url: 'https://www.kontrolatachometru.cz/',
    query: 'vin',
    inputHints: ['vin'],
    // Stav 4. 10. 2026: pole #VIN, kód z obrázku #captcha_TB_I, tlačítko #btnSubmit, výsledky v #inspectionTable.
    inputSelector: '#VIN',
    submitSelector: '#btnSubmit',
    refreshSelector: '#captcha_RIMG',
    // Špatný kód hlásí web anglicky.
    donePattern: 'incorrect',
  },
  policie: {
    id: 'policie',
    label: 'Kradené auto',
    provider: 'Policie ČR (pátrání po vozidlech)',
    // Stav 4. 10. 2026: pole Spz a Vin, tlačítko Vyhledat, neviditelná reCAPTCHA.
    url: 'https://policie.gov.cz/patrani-vozidla',
    query: 'vin',
    inputHints: ['vin'],
    inputSelector: 'input[name="Vin"]',
    submitSelector: 'form button[type="submit"]',
    donePattern: 'nebyly nalezeny|otevřít detail|detail odcizen',
    widgetSelector: 'iframe[src*="recaptcha"][src*="bframe"]',
  },
};

/** Policie hledá i podle SPZ, když VIN nemáme. */
export const POLICIE_BY_SPZ: LookupSource = {
  ...SOURCES.policie,
  query: 'spz',
  inputHints: ['spz'],
  inputSelector: 'input[name="Spz"]',
};

export type LookupEvent =
  | { type: 'captcha-image'; image: string }
  | { type: 'captcha-widget' }
  | { type: 'checking' }
  | { type: 'result'; text: string }
  | { type: 'error'; message: string }
  | { type: 'unsupported' };

/**
 * Skript, který se spustí uvnitř oficiální stránky v telefonu klienta.
 * Vyplní SPZ/VIN, pošle appce obrázek s kódem (nebo řekne, že web má widget
 * „Nejsem robot“), po zadání kódu formulář odešle a vrátí text výsledku.
 * Nic neobchází: kód vždy opisuje člověk.
 */
export function buildLookupScript(source: LookupSource, value: string): string {
  const cfg = JSON.stringify({
    hints: source.inputHints,
    value,
    id: source.id,
    inputSelector: source.inputSelector ?? null,
    submitSelector: source.submitSelector ?? null,
    resultSelector: source.resultSelector ?? null,
    done: source.donePattern ?? null,
    widgetSelector: source.widgetSelector ?? null,
    refreshSelector: source.refreshSelector ?? null,
  });
  return `(function () {
  if (window.__sivk) return;
  window.__sivk = true;
  var CFG = ${cfg};
  var PHASE_KEY = '__sivk_phase_' + CFG.id;
  function post(m) { window.ReactNativeWebView.postMessage(JSON.stringify(m)); }
  function attrs(el) {
    var s = [el.name, el.id, el.placeholder, el.getAttribute('aria-label'), el.getAttribute('formcontrolname'), el.className].join(' ');
    if (el.id) {
      var lab = document.querySelector('label[for="' + el.id + '"]');
      if (lab) s += ' ' + lab.textContent;
    }
    return s.toLowerCase();
  }
  function has(el, hints) { var s = attrs(el); return hints.some(function (h) { return s.indexOf(h) >= 0; }); }
  var CAPTCHA_HINTS = ['captcha', 'kód', 'kod', 'code', 'opište', 'opiste'];
  function inputs() {
    return Array.prototype.slice.call(document.querySelectorAll('input')).filter(function (i) {
      var t = (i.type || 'text').toLowerCase();
      return ['text', 'search', 'tel'].indexOf(t) >= 0 && i.offsetParent !== null;
    });
  }
  function queryInput() {
    if (CFG.inputSelector) {
      var exact = document.querySelector(CFG.inputSelector);
      if (exact) return exact;
    }
    var list = inputs();
    for (var i = 0; i < list.length; i++) if (has(list[i], CFG.hints) && !has(list[i], CAPTCHA_HINTS)) return list[i];
    return null;
  }
  function captchaInput() {
    var list = inputs();
    for (var i = 0; i < list.length; i++) if (has(list[i], CAPTCHA_HINTS)) return list[i];
    return null;
  }
  function captchaImage() {
    var imgs = document.querySelectorAll('img');
    for (var i = 0; i < imgs.length; i++) {
      var s = (imgs[i].src + ' ' + imgs[i].alt + ' ' + imgs[i].id + ' ' + imgs[i].className).toLowerCase();
      if (s.indexOf('captcha') >= 0 || s.indexOf('kod') >= 0) return imgs[i];
    }
    return null;
  }
  function hasWidget() {
    if (CFG.widgetSelector) {
      var w = document.querySelector(CFG.widgetSelector);
      return !!w && getComputedStyle(w).visibility !== 'hidden' && w.getBoundingClientRect().height > 50;
    }
    return !!document.querySelector('iframe[src*="recaptcha"],iframe[src*="hcaptcha"],iframe[src*="turnstile"],iframe[src*="challenges.cloudflare.com"],.g-recaptcha,.h-captcha,.cf-turnstile');
  }
  // Výsledek hledáme v dané části stránky a v dialozích nebo hláškách, které se mohou otevřít mimo ni.
  function resultText() {
    var box = CFG.resultSelector ? document.querySelector(CFG.resultSelector) : null;
    if (!box) return document.body ? document.body.innerText : '';
    var parts = [box.innerText];
    var extra = document.querySelectorAll('[role="dialog"],[role="alertdialog"],[role="alert"],[aria-live]');
    for (var i = 0; i < extra.length; i++) if (!box.contains(extra[i])) parts.push(extra[i].innerText);
    return parts.join('\\n');
  }
  function setValue(el, v) {
    var desc = Object.getOwnPropertyDescriptor(Object.getPrototypeOf(el), 'value');
    if (desc && desc.set) desc.set.call(el, v); else el.value = v;
    el.dispatchEvent(new Event('input', { bubbles: true }));
    el.dispatchEvent(new Event('change', { bubbles: true }));
  }
  function submitButton(form) {
    if (CFG.submitSelector) {
      var exact = document.querySelector(CFG.submitSelector);
      if (exact) return exact;
    }
    var scope = form || document;
    var b = scope.querySelector('button[type="submit"],input[type="submit"]');
    if (b) return b;
    var all = scope.querySelectorAll('button,a');
    for (var i = 0; i < all.length; i++) {
      if (/ověř|over|hledat|vyhled|zobraz|odeslat|potvrd|zkontrol/i.test(all[i].textContent || '')) return all[i];
    }
    return null;
  }
  function sendImage(img) {
    try {
      var c = document.createElement('canvas');
      c.width = img.naturalWidth || img.width;
      c.height = img.naturalHeight || img.height;
      c.getContext('2d').drawImage(img, 0, 0);
      post({ type: 'captcha-image', image: c.toDataURL('image/png') });
    } catch (e) {
      post({ type: 'captcha-image', image: img.src });
    }
  }
  var widgetShown = false;
  var watching = false;
  var reported = false;
  function report(text) {
    if (reported) return;
    reported = true;
    post({ type: 'result', text: text.slice(0, 6000) });
  }
  // Jen řádky, které po odeslání přibyly. Stránky mají i stálé texty (např. eDálnice
  // „zda je Vaše vozidlo od úhrady osvobozeno“), které se nesmí plést s výsledkem.
  function newLines(text, before) {
    if (before === null) return text;
    var seen = {};
    before.split('\\n').forEach(function (l) { seen[l.trim()] = true; });
    return text.split('\\n').filter(function (l) { var t = l.trim(); return t && !seen[t]; }).join('\\n');
  }
  // Hlídá jen jedna smyčka a výsledek se pošle jen jednou, i když člověk potvrdí kontrolu víckrát.
  function watchResult(before) {
    if (watching) return;
    watching = true;
    var n = 0;
    (function wait() {
      var fresh = newLines(resultText(), before);
      if (/\\d{1,2}\\.\\s?\\d{1,2}\\.\\s?\\d{4}|nenalezen|neplatn|nejsou platn|osvoboz|chybn|nesprávn|nemá pro dnešní den|vyrazit na cestu|ověřit další|nepodařilo|selhalo/i.test(fresh) || (CFG.done && new RegExp(CFG.done, 'i').test(fresh))) {
        return report(fresh);
      }
      // Ochrana proti robotům (např. Cloudflare Turnstile) se může ukázat až po odeslání.
      // Pak ji ukážeme člověku a čekáme déle, než ji potvrdí.
      if (!widgetShown && hasWidget()) {
        widgetShown = true;
        post({ type: 'captcha-widget' });
      }
      if (++n < (widgetShown ? 240 : 30)) setTimeout(wait, 500); else report(fresh);
    })();
  }
  var field = null;
  window.__sivkSubmit = function (code) {
    var before = resultText();
    if (code) { var ci = captchaInput(); if (ci) setValue(ci, code); }
    try { sessionStorage.setItem(PHASE_KEY, 'submitted'); } catch (e) {}
    var btn = submitButton(field && field.form);
    if (btn) btn.click(); else if (field && field.form) field.form.submit();
    post({ type: 'checking' });
    watchResult(before);
  };
  window.__sivkRefresh = function () {
    var exact = CFG.refreshSelector ? document.querySelector(CFG.refreshSelector) : null;
    if (exact) exact.click();
    var all = document.querySelectorAll('a,button');
    for (var i = 0; !exact && i < all.length; i++) {
      if (/jiný obrázek|jiny obrazek|obnovit|nový kód/i.test(all[i].textContent || '')) { all[i].click(); break; }
    }
    setTimeout(function () { var img = captchaImage(); if (img) sendImage(img); }, 900);
  };
  var tries = 0;
  function start() {
    var phase = null;
    try { phase = sessionStorage.getItem(PHASE_KEY); sessionStorage.removeItem(PHASE_KEY); } catch (e) {}
    if (phase === 'submitted') { watchResult(null); return; }
    field = queryInput();
    if (!field) {
      if (++tries < 40) return setTimeout(start, 500);
      return post({ type: 'error', message: 'query-input-not-found' });
    }
    setValue(field, CFG.value);
    setTimeout(function () {
      if (hasWidget()) return post({ type: 'captcha-widget' });
      var img = captchaImage();
      if (!img) return window.__sivkSubmit('');
      if (img.complete) sendImage(img); else img.addEventListener('load', function () { sendImage(img); });
    }, 600);
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start); else start();
})();
true;`;
}
