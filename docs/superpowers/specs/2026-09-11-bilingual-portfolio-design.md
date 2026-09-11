# Bilingual Portfolio Design

Date: 2026-09-11  
Status: Approved in chat; awaiting written-spec review

## Goal

Add a persistent Korean/English language switcher to the portfolio. Visitors can change languages without leaving their current page, and their choice remains active across project pages and future visits. The English copy is sourced from `docs/english-translation-review.md` after final wording approval.

## Scope

The bilingual experience covers:

- `index.html`
- `spatial.html`
- `pulio.html`
- `hyundai.html`
- `pleats-mama.html`
- `data-center.html`
- Visible static copy
- Page titles and document language metadata
- Dynamic text rendered from JavaScript data
- Interactive labels, image alternative text, and other accessibility copy
- Existing English phrases identified for cleanup in the translation review

Images that contain baked-in Korean text are not altered in this phase. Source filenames, Figma layer names, and other internal identifiers are not translated unless they are exposed as accessibility text.

## Language-switcher interface

Each page header receives a segmented `KR | EN` control within the existing navigation group.

- Typeface: Raleway, inherited from the navigation
- Font size: the navigation's existing `15px` desktop size and `13px` mobile size
- Font weight: identical to the existing navigation
- Spacing: placed as another navigation item using the existing navigation gap
- Container: thin black border with a `5px` corner radius and clipped contents
- Selected segment: `#000000` background with white text
- Unselected segment: transparent background with black text
- Both segments are real buttons with visible keyboard focus states
- The active button exposes `aria-pressed="true"`; the inactive button exposes `aria-pressed="false"`
- The group has an accessible label such as `Select language`

The switcher must remain legible over the existing translucent header treatment and must not disrupt the established header alignment on fixed-width detail pages or responsive home pages.

## State and URL behavior

Language is resolved in this order:

1. A valid `lang` query parameter
2. The visitor's saved language in `localStorage`
3. Korean as the default

English URLs use `?lang=en`. Korean URLs omit the parameter. Invalid parameter or stored values fall back safely to Korean.

When a visitor switches language:

1. The page content changes in place.
2. The current scroll position and open UI state remain unchanged.
3. The preference is written to `localStorage`.
4. `history.replaceState` updates the current URL without navigation or reload.
5. Internal portfolio links are updated so the selected language is preserved when navigating to another page or section.

Opening or sharing an English URL directly must render English even if the recipient has no saved preference. Because the explicit URL has the highest priority, it also overrides a conflicting saved preference and becomes the new saved preference.

## Translation architecture

A shared language module owns language resolution, switching, persistence document metadata, and internal-link synchronization. Page-specific translation dictionaries keep project content isolated and understandable.

Static HTML copy uses stable translation keys through `data-i18n` attributes. Attribute translations use explicit mappings such as `data-i18n-attr="aria-label"`. The shared module updates these nodes without replacing their layout structure or replacing interactive elements.

Dynamic pages use localized data rather than translating rendered text by string matching:

- PULIO supplies localized generated gallery labels.
- HYUNDAI E&C supplies localized card-detail descriptions and labels.
- PLEATS MAMA supplies localized project-layer descriptions and dynamic image labels.
- DATA CENTER supplies localized floor-detail descriptions, model copy, labels, and navigation states.

Translation keys remain stable across languages. Korean source copy is preserved as the canonical default, and approved English copy is stored alongside it. Duplicate same-source strings share one translation entry where practical.

## Loading and visual stability

The language module loads with `defer` before page-specific rendering code. It resolves the initial language and updates the document as early as the current architecture permits.

The implementation should avoid a visible Korean-to-English flash. An initial language marker is applied to the root element before normal rendering where possible, while the content remains usable if JavaScript fails. Korean remains present in the HTML as the no-JavaScript fallback.

English text may be longer than Korean. Existing manual line breaks will be reviewed per language instead of copied mechanically. Layouts will be checked at their intended fixed 1440px canvas and at the current home-page responsive breakpoints. Translation work must not reduce font sizes solely to force English into Korean-sized boxes; copy or local layout spacing should be adjusted deliberately where needed.

## Failure handling

- If `localStorage` is unavailable, switching still works for the current page and URL.
- If a translation key is missing, Korean fallback copy remains visible; the UI must not show an empty string or raw key.
- If a query parameter is invalid, the page uses Korean and removes or ignores the invalid value.
- If a dynamic project entry lacks English copy, its Korean fallback is retained and the missing key is detectable in tests.
- Browser history is not polluted by repeated language switches because the URL uses `replaceState`.

## Accessibility

- Update `<html lang>` to `ko` or `en` with every language change.
- Translate the document title, visible copy, `aria-label` values, screen-reader-only text, dynamic control states, and meaningful image alternative text.
- Do not translate internal image filenames literally. Replace exposed production labels with concise, meaningful English descriptions.
- The switcher must support keyboard activation and visible focus.
- Active state must not rely on color alone; `aria-pressed` communicates it programmatically.
- Existing focus management for overlays and project interactions must remain intact during language changes.

## Testing

Automated tests will verify:

- Korean is the default without a URL or stored preference.
- `?lang=en` selects English and persists it.
- A stored English preference restores English on a later visit.
- Explicit URL state overrides conflicting saved state.
- Switching updates visible text, `<html lang>`, document title, active-button attributes, and the URL.
- Internal home/detail links preserve English state.
- Switching does not reload the page or change the current scroll position.
- All registered Korean translation keys have approved English values.
- Dynamic descriptions and accessibility labels change on each project page.
- Missing keys retain their Korean fallback.
- Existing project interaction tests continue to pass.

Manual browser checks will cover desktop and current responsive breakpoints, header spacing, the 5px segmented-control styling, keyboard focus, text overflow, overlays, galleries, and English deep links to every project page.

## Delivery sequence

1. Finalize the English wording in `docs/english-translation-review.md`.
2. Add language-state and dictionary tests.
3. Implement the shared language module and switcher styles.
4. Mark up and translate the home and spatial variants.
5. Integrate the four project detail pages and their dynamic data.
6. Run the full automated suite and browser-based visual/accessibility checks.

## Out of scope

- Automatic machine translation
- A third language
- Translating text embedded inside image or video assets
- A CMS or external localization service
- Redesigning the navigation beyond the approved language control
