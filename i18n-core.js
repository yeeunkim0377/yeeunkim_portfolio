(function (root, factory) {
  const api = factory(root && root.document ? root : null);
  if (typeof module === 'object' && module.exports) module.exports = api;
  if (root && root.document) root.PortfolioI18n = api;
})(typeof window !== 'undefined' ? window : globalThis, function (browser) {
  const VALID_LANGUAGES = new Set(['ko', 'en']);
  const STORAGE_KEY = 'portfolio-language';
  let language = 'ko';
  let messages = { ko: {}, en: {} };
  let literalKeys = new Map();
  let initialized = false;
  const originalText = new WeakMap();
  const originalAttributes = new WeakMap();

  function resolveLanguage({ search = '', stored = '' } = {}) {
    const requested = new URLSearchParams(search).get('lang');
    if (VALID_LANGUAGES.has(requested)) return requested;
    return stored === 'en' ? 'en' : 'ko';
  }

  function localizeUrl(value, nextLanguage) {
    const hashIndex = value.indexOf('#');
    const hash = hashIndex >= 0 ? value.slice(hashIndex) : '';
    const withoutHash = hashIndex >= 0 ? value.slice(0, hashIndex) : value;
    const queryIndex = withoutHash.indexOf('?');
    const path = queryIndex >= 0 ? withoutHash.slice(0, queryIndex) : withoutHash;
    const params = new URLSearchParams(queryIndex >= 0 ? withoutHash.slice(queryIndex + 1) : '');
    if (nextLanguage === 'en') params.set('lang', 'en');
    else params.delete('lang');
    const query = params.toString();
    return `${path}${query ? `?${query}` : ''}${hash}`;
  }

  function register(dictionary) {
    ['ko', 'en'].forEach((lang) => Object.assign(messages[lang], dictionary[lang] || {}));
    literalKeys = new Map(Object.entries(messages.ko).map(([key, value]) => [normalize(value), key]));
    if (browser && initialized) apply(browser.document);
  }

  function normalize(value) {
    return String(value).replace(/<br\s*\/?>/gi, ' ').replace(/\s+/g, ' ').trim();
  }

  function translateLiteral(source, nextLanguage = language) {
    if (nextLanguage === 'ko') return source;
    const key = literalKeys.get(normalize(source));
    return key && messages.en[key] ? messages.en[key].replace(/<br\s*\/?>/gi, ' ') : source;
  }

  function t(key, fallback = '') {
    return messages[language][key] ?? messages.ko[key] ?? fallback;
  }

  function updateLinks(document) {
    document.querySelectorAll('a[href]').forEach((link) => {
      const href = link.getAttribute('href');
      if (!href || /^(?:https?:|mailto:|tel:|javascript:)/i.test(href)) return;
      link.setAttribute('href', localizeUrl(href, language));
    });
  }

  function apply(document) {
    document.documentElement.lang = language;
    document.querySelectorAll('[data-i18n]').forEach((node) => {
      const key = node.dataset.i18n;
      const attribute = node.dataset.i18nAttr;
      if (attribute) {
        const fallback = node.getAttribute(attribute) || '';
        node.setAttribute(attribute, t(key, fallback));
      } else {
        const translated = t(key, node.innerHTML);
        if (node.innerHTML !== translated) node.innerHTML = translated;
      }
    });
    document.querySelectorAll('[data-language]').forEach((button) => {
      button.setAttribute('aria-pressed', String(button.dataset.language === language));
    });
    const walker = document.createTreeWalker(document.body, browser.NodeFilter.SHOW_TEXT);
    let textNode;
    while ((textNode = walker.nextNode())) {
      const parent = textNode.parentElement;
      if (!parent || parent.closest('[data-i18n],script,style')) continue;
      if (!originalText.has(textNode)) originalText.set(textNode, textNode.nodeValue);
      const source = originalText.get(textNode);
      const translated = language === 'en' ? translateLiteral(source, 'en') : source;
      if (textNode.nodeValue !== translated) textNode.nodeValue = translated;
    }
    document.querySelectorAll('[aria-label],[alt],[title]').forEach((node) => {
      const saved = originalAttributes.get(node) || {};
      ['aria-label', 'alt', 'title'].forEach((attribute) => {
        if (!node.hasAttribute(attribute) || (node.hasAttribute('data-i18n') && node.dataset.i18nAttr === attribute)) return;
        if (!(attribute in saved)) saved[attribute] = node.getAttribute(attribute);
        const source = saved[attribute];
        node.setAttribute(attribute, language === 'en' ? translateLiteral(source, 'en') : source);
      });
      originalAttributes.set(node, saved);
    });
    const title = t(document.body.dataset.i18nTitle || 'meta.title', document.title);
    if (title) document.title = title;
    updateLinks(document);
  }

  function setLanguage(nextLanguage, options = {}) {
    language = VALID_LANGUAGES.has(nextLanguage) ? nextLanguage : 'ko';
    if (!browser) return language;
    try { browser.localStorage.setItem(STORAGE_KEY, language); } catch (_) {}
    apply(browser.document);
    if (options.updateUrl !== false) {
      try {
        const current = `${browser.location.pathname}${browser.location.search}${browser.location.hash}`;
        browser.history.replaceState(browser.history.state, '', localizeUrl(current, language));
      } catch (_) {}
    }
    browser.document.dispatchEvent(new browser.CustomEvent('portfolio:languagechange', {
      detail: { language }
    }));
    return language;
  }

  function getLanguage() { return language; }

  function init() {
    if (!browser || initialized) return language;
    initialized = true;
    let stored = '';
    try { stored = browser.localStorage.getItem(STORAGE_KEY) || ''; } catch (_) {}
    language = resolveLanguage({ search: browser.location.search, stored });
    browser.document.querySelectorAll('[data-language]').forEach((button) => {
      button.addEventListener('click', () => setLanguage(button.dataset.language));
    });
    setLanguage(language, { updateUrl: new URLSearchParams(browser.location.search).has('lang') });
    if (browser.document.readyState === 'complete') apply(browser.document);
    else browser.addEventListener('load', () => apply(browser.document), { once: true });
    browser.document.addEventListener('click', (event) => {
      if (event.target.closest('[data-language]')) return;
      browser.queueMicrotask(() => apply(browser.document));
    });
    return language;
  }

  if (browser) {
    if (browser.document.readyState === 'loading') browser.document.addEventListener('DOMContentLoaded', init);
    else init();
  }

  return { resolveLanguage, localizeUrl, register, translateLiteral, t, setLanguage, getLanguage, init };
});
