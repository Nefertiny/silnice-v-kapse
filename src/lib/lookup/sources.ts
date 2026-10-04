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
};

// Adresy a podoba formulářů se musí doladit na skutečném telefonu: z vývojového
// prostředí jsou weby eDálnice a ČKP nedostupné. Skript níže hledá políčka podle
// popisků, takže drobné změny webů přežije, ale přesné cesty je potřeba ověřit.
export const SOURCES: Record<LookupSourceId, LookupSource> = {
  edalnice: {
    id: 'edalnice',
    label: 'Dálniční známka',
    provider: 'eDálnice',
    url: 'https://edalnice.cz/',
    query: 'spz',
    inputHints: ['spz', 'rz', 'registra', 'licen', 'plate', 'značk'],
  },
  ckp: {
    id: 'ckp',
    label: 'Povinné ručení',
    provider: 'ČKP',
    url: 'https://www.ckp.cz/',
    query: 'spz',
    inputHints: ['spz', 'rz', 'registra', 'značk', 'vin'],
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
  },
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
  const cfg = JSON.stringify({ hints: source.inputHints, value, id: source.id });
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
    return !!document.querySelector('iframe[src*="recaptcha"],iframe[src*="hcaptcha"],iframe[src*="turnstile"],.g-recaptcha,.h-captcha,.cf-turnstile');
  }
  function setValue(el, v) {
    var desc = Object.getOwnPropertyDescriptor(Object.getPrototypeOf(el), 'value');
    if (desc && desc.set) desc.set.call(el, v); else el.value = v;
    el.dispatchEvent(new Event('input', { bubbles: true }));
    el.dispatchEvent(new Event('change', { bubbles: true }));
  }
  function submitButton(form) {
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
  function watchResult(before) {
    var n = 0;
    (function wait() {
      var text = document.body ? document.body.innerText : '';
      var changed = before === null || text !== before;
      if (changed && /\\d{1,2}\\.\\s?\\d{1,2}\\.\\s?\\d{4}|nenalezen|neplatn|osvoboz|chybn|nesprávn/i.test(text)) {
        return post({ type: 'result', text: text.slice(0, 6000) });
      }
      if (++n < 30) setTimeout(wait, 500); else post({ type: 'result', text: text.slice(0, 6000) });
    })();
  }
  var field = null;
  window.__sivkSubmit = function (code) {
    var before = document.body ? document.body.innerText : '';
    if (code) { var ci = captchaInput(); if (ci) setValue(ci, code); }
    try { sessionStorage.setItem(PHASE_KEY, 'submitted'); } catch (e) {}
    var btn = submitButton(field && field.form);
    if (btn) btn.click(); else if (field && field.form) field.form.submit();
    post({ type: 'checking' });
    watchResult(before);
  };
  window.__sivkRefresh = function () {
    var all = document.querySelectorAll('a,button');
    for (var i = 0; i < all.length; i++) {
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
