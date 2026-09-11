# Bilingual Portfolio Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a persistent KR/EN switcher to every portfolio page, translating static and dynamic content without reloads or losing page state.

**Architecture:** A framework-free shared `i18n-core.js` module resolves URL and stored language state, updates keyed DOM content and internal links, and exposes a small browser/global API. A focused `i18n-translations.js` dictionary contains approved page copy; existing project renderers read localized fields through that API while retaining Korean fallbacks.

**Tech Stack:** Static HTML5, CSS, browser JavaScript, Node.js built-in test runner

**Spec:** `docs/superpowers/specs/2026-09-11-bilingual-portfolio-design.md`

## Global Constraints

- Korean remains the no-JavaScript default in every HTML file.
- Language priority is valid URL `lang`, then `localStorage`, then Korean.
- English URLs use `?lang=en`; Korean URLs omit `lang` while preserving other query parameters and hashes.
- The switch changes content without reload and preserves scroll and open UI state.
- The switcher uses Raleway at the existing navigation size/weight/gap, a thin black border, 5px radius, and a `#000000` active segment.
- Translate visible copy, titles, dynamic data, meaningful alt text, `aria-label`, and screen-reader text.
- Missing translations retain Korean fallback copy.
- Do not translate text embedded in bitmap/video assets or internal source identifiers.

---

### Task 1: Shared language-state core

**Files:**
- Create: `i18n-core.js`
- Create: `tests/i18n-core.test.cjs`

**Interfaces:**
- Produces: `window.PortfolioI18n` with `resolveLanguage({ search, stored })`, `localizeUrl(url, lang)`, `register(dictionary)`, `t(key, fallback)`, `setLanguage(lang)`, `getLanguage()`, and `init()`.
- Consumes: dictionaries shaped as `{ ko: Record<string,string>, en: Record<string,string> }` registered before `init()`.

- [ ] **Step 1: Write failing pure-function tests**

```js
const test = require('node:test');
const assert = require('node:assert/strict');
const core = require('../i18n-core.js');

test('URL language overrides storage and invalid values fall back', () => {
  assert.equal(core.resolveLanguage({ search: '?lang=en', stored: 'ko' }), 'en');
  assert.equal(core.resolveLanguage({ search: '', stored: 'en' }), 'en');
  assert.equal(core.resolveLanguage({ search: '?lang=xx', stored: 'xx' }), 'ko');
});

test('localized URLs retain query values and hashes', () => {
  assert.equal(core.localizeUrl('pulio.html?view=grid#work', 'en'), 'pulio.html?view=grid&lang=en#work');
  assert.equal(core.localizeUrl('pulio.html?view=grid&lang=en#work', 'ko'), 'pulio.html?view=grid#work');
});
```

- [ ] **Step 2: Run the tests and verify the expected failure**

Run: `node --test tests/i18n-core.test.cjs`  
Expected: FAIL because `i18n-core.js` does not exist.

- [ ] **Step 3: Implement the CommonJS/browser-compatible core**

Implement deterministic language resolution and URL rewriting as pure exported functions. In the browser wrapper, capture Korean fallback text/attributes once, apply `data-i18n` and `data-i18n-attr` values, update `<html lang>`, title, `aria-pressed`, internal links, `localStorage`, and `history.replaceState`; catch storage/history errors so switching still works in-memory.

```js
function resolveLanguage({ search = '', stored = '' } = {}) {
  const urlLanguage = new URLSearchParams(search).get('lang');
  if (urlLanguage === 'ko' || urlLanguage === 'en') return urlLanguage;
  return stored === 'en' ? 'en' : 'ko';
}
```

- [ ] **Step 4: Add DOM behavior tests with a minimal fake document/window**

Test that `setLanguage('en')` updates text, translated attributes, title, `html.lang`, pressed states, saved state and links while leaving `scrollY` unchanged. Test a missing English key retains the captured Korean value.

- [ ] **Step 5: Run the focused tests**

Run: `node --test tests/i18n-core.test.cjs`  
Expected: PASS with zero failures.

- [ ] **Step 6: Commit the core**

```bash
git add i18n-core.js tests/i18n-core.test.cjs
git commit -m "feat: add persistent portfolio language core"
```

### Task 2: Shared switcher UI and static home translations

**Files:**
- Create: `i18n-translations.js`
- Modify: `styles.css`
- Modify: `index.html`
- Modify: `spatial.html`
- Create: `tests/i18n-pages.test.cjs`

**Interfaces:**
- Consumes: `window.PortfolioI18n.register(dictionary)` and `init()` from Task 1.
- Produces: global dictionary keys grouped by `common`, `home`, `pulio`, `hyundai`, `pleats`, and `dataCenter`; identical `.language-switcher` markup on every page.

- [ ] **Step 1: Write failing structure and coverage tests**

Read HTML as UTF-8 and assert both home files load `i18n-translations.js` then `i18n-core.js`, contain `data-language="ko"` and `data-language="en"` buttons, have translation keys on all Korean visible/accessible strings, and include no unmatched visitor-facing Korean after applying an explicit allowlist for source filenames.

- [ ] **Step 2: Run the page tests and verify failure**

Run: `node --test tests/i18n-pages.test.cjs`  
Expected: FAIL because switcher markup and translation scripts are absent.

- [ ] **Step 3: Create the approved translation dictionary**

Transcribe the approved entries from `docs/english-translation-review.md` into `i18n-translations.js`. Keep stable semantic keys such as `home.hero.tagline`, `common.nav.hyundaiProject`, and `pulio.description.ads`; preserve line breaks only where each language needs them.

- [ ] **Step 4: Add switcher markup and keyed static content**

Place the control after `contact` inside each navigation group:

```html
<span class="language-switcher" role="group" aria-label="Select language" data-i18n="common.language.label" data-i18n-attr="aria-label">
  <button type="button" data-language="ko" aria-pressed="true">KR</button>
  <button type="button" data-language="en" aria-pressed="false">EN</button>
</span>
```

Annotate Korean visible text with `data-i18n`; annotate titles and accessibility attributes with the corresponding attribute mapping. Load dictionary then core with `defer` on both pages.

- [ ] **Step 5: Add exact navigation-matching styles**

```css
.language-switcher{display:inline-flex;overflow:hidden;border:1px solid #000;border-radius:5px;font:inherit}
.language-switcher button{border:0;padding:2px 6px;background:transparent;color:#000;font:inherit;line-height:1;cursor:pointer}
.language-switcher button[aria-pressed="true"]{background:#000;color:#fff}
.language-switcher button:focus-visible{outline:2px solid #000;outline-offset:2px}
```

Keep `nav div` at its current gap and allow the switcher to occupy one item. Confirm the mobile `nav` font-size rule is inherited.

- [ ] **Step 6: Run focused tests**

Run: `node --test tests/i18n-core.test.cjs tests/i18n-pages.test.cjs`  
Expected: PASS with zero failures.

- [ ] **Step 7: Commit the home integration**

```bash
git add i18n-translations.js styles.css index.html spatial.html tests/i18n-pages.test.cjs
git commit -m "feat: add bilingual home navigation"
```

### Task 3: Static and dynamic project-page integration

**Files:**
- Modify: `pulio.html`
- Modify: `pulio.js`
- Modify: `hyundai.html`
- Modify: `hyundai-card-detail-data.js`
- Modify: `hyundai.js`
- Modify: `pleats-mama.html`
- Modify: `pleats-mama-data.js`
- Modify: `pleats-mama.js`
- Modify: `data-center.html`
- Modify: `data-center-detail-data.js`
- Modify: `data-center.js`
- Modify: `i18n-translations.js`
- Modify: `tests/i18n-pages.test.cjs`

**Interfaces:**
- Consumes: `PortfolioI18n.t(key, fallback)` and `PortfolioI18n.getLanguage()` from Task 1.
- Produces: each page dispatches and responds to `portfolio:languagechange` with `{ detail: { language } }`; project renderers use localized text without resetting their current slide, gallery, floor, or overlay state.

- [ ] **Step 1: Extend failing page coverage tests**

Assert every detail page contains the switcher and script order, every visitor-facing Korean HTML string has an English dictionary key, every Korean dynamic-data entry has an English value or explicit non-visible allowlist, and generated labels call `PortfolioI18n.t`.

- [ ] **Step 2: Run tests and verify the project pages fail coverage**

Run: `node --test tests/i18n-pages.test.cjs`  
Expected: FAIL listing untranslated detail pages and dynamic sources.

- [ ] **Step 3: Integrate PULIO and HYUNDAI E&C**

Add the switcher and keyed static content to both HTML files. Add approved PULIO and HYUNDAI dictionary entries. Replace generated Korean labels with `t(key, koreanFallback)`. Store HYUNDAI localized card-description fields by language or semantic translation key and rerender only the currently visible detail text on `portfolio:languagechange`.

- [ ] **Step 4: Run the PULIO and HYUNDAI tests**

Run: `node --test tests/pulio-page.test.cjs tests/hyundai-page.test.cjs tests/hyundai-card-detail.test.cjs tests/i18n-pages.test.cjs`  
Expected: PASS for existing behavior and new translation coverage.

- [ ] **Step 5: Integrate PLEATS MAMA**

Add the switcher and keyed HTML attributes. Add approved PLEATS MAMA translations. Attach semantic translation keys to text-bearing generated layer records or resolve them at render time; on language change, update text layers and the current perspective `alt` without changing the active floor.

- [ ] **Step 6: Run PLEATS MAMA tests**

Run: `node --test tests/pleats-mama-renderer.test.cjs tests/pleats-mama-page.test.cjs tests/i18n-pages.test.cjs`  
Expected: PASS with current floor and render behavior intact.

- [ ] **Step 7: Integrate DATA CENTER**

Add the switcher and keyed static HTML. Add all approved overview, model, floor-detail and accessibility translations. Localize dynamic floor description fields through semantic keys and update mounted detail layers in place on `portfolio:languagechange`; preserve selected floor and overlay focus state. Translate next/previous top/bottom labels with `t()`.

- [ ] **Step 8: Run DATA CENTER tests**

Run: `node --test tests/data-center-detail.test.cjs tests/data-center-lower.test.cjs tests/floor-title-background.test.cjs tests/i18n-pages.test.cjs`  
Expected: PASS with floor controls and overlays unchanged.

- [ ] **Step 9: Commit all project-page integrations**

```bash
git add pulio.html pulio.js hyundai.html hyundai-card-detail-data.js hyundai.js pleats-mama.html pleats-mama-data.js pleats-mama.js data-center.html data-center-detail-data.js data-center.js i18n-translations.js tests/i18n-pages.test.cjs
git commit -m "feat: localize portfolio project pages"
```

### Task 4: Full regression and visual verification

**Files:**
- Modify if required by findings: `styles.css`
- Modify if required by findings: `i18n-translations.js`
- Modify if required by findings: affected page HTML/CSS/JS
- Test: `tests/*.test.cjs`

**Interfaces:**
- Consumes: completed bilingual site from Tasks 1–3.
- Produces: verified bilingual behavior at the existing desktop and responsive layouts.

- [ ] **Step 1: Run the complete automated suite**

Run: `node --test tests/*.test.cjs`  
Expected: all tests pass with zero failures.

- [ ] **Step 2: Run translation and whitespace audits**

Run: `rg -n --glob '*.html' --glob '*.js' '[가-힣]' .` and compare every result against Korean fallback locations and the explicit internal-name allowlist.  
Run: `git diff --check`  
Expected: no unkeyed visitor-facing Korean and no whitespace errors.

- [ ] **Step 3: Verify in the browser**

At desktop and responsive home widths, verify the segmented control’s Raleway font, inherited size and weight, existing navigation gap, 5px radius, black active state, keyboard focus, instant copy switching, retained scroll/open UI, and absence of text overflow. Open every detail page directly with `?lang=en`, switch both ways, open its primary interaction, and navigate back to home.

- [ ] **Step 4: Correct only verified defects and rerun affected tests**

For each visual or behavioral defect, add or tighten a regression assertion where practical, apply the smallest focused correction, rerun its focused test, then rerun `node --test tests/*.test.cjs`.

- [ ] **Step 5: Commit verification fixes**

```bash
git add styles.css i18n-core.js i18n-translations.js *.html *.js tests
git commit -m "fix: polish bilingual portfolio behavior"
```

