# PLEATS MAMA STORE Detail Page Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a new `pleats-mama.html` detail page from the leftmost Figma frame and connect both portfolio variants to it.

**Architecture:** A fixed `1440 × 3600` page renders the leftmost Figma frame as a hierarchy of generated layer data so local transforms, images, vectors, typography, and clipping stay faithful to the source. Navigation remains semantic HTML, while the Perspective image is emitted as a separately addressable layer for a later animation.

**Tech Stack:** HTML, CSS, vanilla JavaScript, Node.js test runner, `openfig-core` for build-time `.fig` extraction

**Spec:** `docs/superpowers/specs/2026-09-07-pleats-mama-detail-design.md`

## Global Constraints

- Use Figma frame `24:5`, the leftmost `1440 × 4097` frame in `ref.figma/pleats mama.fig`.
- Render a `1440 × 3600` canvas with `overflow: hidden`.
- Preserve every source x/y/width/height value; do not pull content upward after reducing the canvas height.
- Render gradient node `24:8` at `0, 305.5805`, size `1440 × 194.1272`, from opaque `#fffaf9` at the top to transparent at the bottom.
- Keep Perspective node `24:130` separate at `149.6328, 3036.0779`, size `814.89 × 458.4875`, radius `10px`.
- Add no Perspective animation in this implementation.
- Use local assets for the core layout; missing assets must fail tests.

## File Structure

- Create `pleats-mama.html`: semantic shell, portfolio navigation, and Figma layer host.
- Create `pleats-mama.css`: fixed canvas, layer renderer styles, exact gradient, and Perspective hook.
- Create `pleats-mama-data.js`: generated leftmost-frame layer tree and local asset references.
- Create `pleats-mama.js`: deterministic renderer for generated Figma layers.
- Create `assets/pleats-mama/`: extracted source bitmaps used by frame `24:5`.
- Create `tests/pleats-mama-page.test.cjs`: page contract, geometry, asset, and navigation regression coverage.
- Modify `index.html`: replace the PLEATS button with a detail-page link.
- Modify `spatial.html`: replace the PLEATS button with a detail-page link.
- Modify `tests/portfolio-variants.test.cjs`: update the Work-list navigation expectation.

---

### Task 1: Lock the detail-page contract with failing tests

**Files:**
- Create: `tests/pleats-mama-page.test.cjs`
- Modify: `tests/portfolio-variants.test.cjs`

**Interfaces:**
- Consumes: existing static portfolio HTML and Node.js test runner
- Produces: executable expectations for `pleats-mama.html`, `pleats-mama.css`, `pleats-mama-data.js`, and both Work-list links

- [ ] **Step 1: Write the failing page-shell and navigation tests**

```js
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');
const assert = require('node:assert/strict');

const workspace = path.resolve(__dirname, '..');
const read = (file) => fs.readFileSync(path.join(workspace, file), 'utf8');

test('Pleats uses the fixed 1440 by 3600 clipped canvas', () => {
  const html = read('pleats-mama.html');
  const css = read('pleats-mama.css');
  assert.match(html, /<main class="pleats-canvas"/);
  assert.match(css, /\.pleats-canvas\{[^}]*width:1440px;[^}]*height:3600px;[^}]*overflow:hidden;/);
});

test('both portfolio variants link Pleats to its detail page', () => {
  for (const file of ['index.html', 'spatial.html']) {
    assert.match(read(file), /href="pleats-mama\.html"[^>]*><strong>PLEATS MAMA STORE<\/strong>/);
  }
});
```

- [ ] **Step 2: Write the failing Figma geometry tests**

```js
test('Pleats retains the Figma hero gradient and left Perspective geometry', () => {
  const css = read('pleats-mama.css');
  assert.match(css, /\.pleats-hero-gradient\{[^}]*left:0;[^}]*top:305\.5805px;[^}]*width:1440px;[^}]*height:194\.1272px;/);
  assert.match(css, /linear-gradient\(180deg,#fffaf9 0%,rgba\(255,250,249,0\) 100%\)/);
  assert.match(css, /\.pleats-perspective\{[^}]*left:149\.6328px;[^}]*top:3036\.0779px;[^}]*width:814\.89px;[^}]*height:458\.4875px;[^}]*border-radius:10px;/);
});
```

- [ ] **Step 3: Run the tests and confirm the intended failure**

Run: `node --test tests/pleats-mama-page.test.cjs tests/portfolio-variants.test.cjs`

Expected: FAIL because `pleats-mama.html` and its page assets do not exist and the Work entries are not links yet.

- [ ] **Step 4: Commit the contract tests**

```bash
git add tests/pleats-mama-page.test.cjs tests/portfolio-variants.test.cjs
git commit -m "test: define pleats mama detail contract"
```

### Task 2: Extract the leftmost Figma frame data and assets

**Files:**
- Create: `pleats-mama-data.js`
- Create: `assets/pleats-mama/*`
- Use locally: `.codex-work/fig_parser/inspect-pleats.mjs`
- Test: `tests/pleats-mama-page.test.cjs`

**Interfaces:**
- Consumes: `ref.figma/pleats mama.fig`, Figma root node `24:5`, `openfig-core`
- Produces: `window.PleatsMamaFigma = { frame, layers }`, where each layer has `id`, `type`, `name`, `transform`, `size`, `style`, `text`, `src`, `svgPath`, and `children`

- [ ] **Step 1: Add a failing generated-data test**

```js
test('generated Pleats data identifies the approved Figma frame and local assets', () => {
  const data = read('pleats-mama-data.js');
  assert.match(data, /rootId:\s*['"]24:5['"]/);
  assert.match(data, /sourceWidth:\s*1440/);
  assert.match(data, /sourceHeight:\s*4097/);
  assert.match(data, /id:\s*['"]24:130['"]/);
  assert.doesNotMatch(data, /ref\.figma/);
});
```

- [ ] **Step 2: Run the data test and confirm it fails**

Run: `node --test tests/pleats-mama-page.test.cjs`

Expected: FAIL because `pleats-mama-data.js` does not exist.

- [ ] **Step 3: Extend the local extractor to serialize the approved frame**

Use `parseFig`, `nodeId`, `resolveVectorNodePaths`, and `resolveGradientGeometry` from `openfig-core`. Preserve hierarchy rather than adding parent translations manually:

```js
function serialize(node) {
  const id = nodeId(node);
  return {
    id,
    type: node.type,
    name: node.name,
    visible: node.visible !== false,
    opacity: node.opacity ?? 1,
    transform: node.transform ?? { m00: 1, m01: 0, m02: 0, m10: 0, m11: 1, m12: 0 },
    size: node.size ?? { x: 0, y: 0 },
    style: serializeStyle(node),
    text: serializeText(node),
    src: extractImage(node),
    svgPaths: serializeVector(node),
    children: (doc.childrenMap.get(id) ?? []).map(serialize),
  };
}
```

Only serialize descendants of `24:5`. Copy each referenced bitmap to `assets/pleats-mama/<sha1>.<ext>` without resizing or recompression. Mark node `24:130` with `role: 'perspective'` and omit nodes `24:9` through `24:14` from generated layers because semantic navigation replaces them.

- [ ] **Step 4: Generate data and assets**

Run: `node .codex-work/fig_parser/inspect-pleats.mjs export`

Expected: `pleats-mama-data.js` exists and every `src` points to a file in `assets/pleats-mama/`.

- [ ] **Step 5: Add and run asset-existence assertions**

```js
test('every generated Pleats image exists locally', () => {
  const data = read('pleats-mama-data.js');
  const sources = [...data.matchAll(/src:\s*['"]([^'"]+)['"]/g)].map((match) => match[1]);
  assert.ok(sources.length > 0);
  for (const source of sources) assert.ok(fs.existsSync(path.join(workspace, source)), source);
});
```

Run: `node --test tests/pleats-mama-page.test.cjs`

Expected: generated-data and asset tests PASS; page-shell tests remain failing.

- [ ] **Step 6: Commit generated data and assets**

```bash
git add pleats-mama-data.js assets/pleats-mama tests/pleats-mama-page.test.cjs
git commit -m "feat: extract pleats mama figma assets"
```

### Task 3: Render the fixed Figma canvas and semantic navigation

**Files:**
- Create: `pleats-mama.html`
- Create: `pleats-mama.css`
- Create: `pleats-mama.js`
- Test: `tests/pleats-mama-page.test.cjs`

**Interfaces:**
- Consumes: `window.PleatsMamaFigma.layers`
- Produces: one `.pleats-layer` DOM subtree per visible serialized node; semantic portfolio navigation; independent `.pleats-perspective` image

- [ ] **Step 1: Create the semantic page shell**

```html
<!doctype html>
<html lang="ko">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=1440">
  <title>PLEATS MAMA STORE — 김예은 Portfolio</title>
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Gothic+A1:wght@100;200;300;400;500;600;700&family=Raleway:wght@300;400&display=swap" rel="stylesheet">
  <link rel="stylesheet" href="styles.css">
  <link rel="stylesheet" href="pleats-mama.css">
  <script defer src="pleats-mama-data.js"></script>
  <script defer src="pleats-mama.js"></script>
</head>
<body class="pleats-body">
  <header class="pleats-header"><nav aria-label="Portfolio navigation"><a href="index.html#home">@yeeunkim</a><div><a href="index.html#work">work</a><a href="index.html#about">about</a><a href="index.html#contact">contact</a></div></nav></header>
  <main class="pleats-canvas"><div class="pleats-figma-layers" data-pleats-layers></div><div class="pleats-hero-gradient" aria-hidden="true"></div></main>
</body>
</html>
```

- [ ] **Step 2: Add exact fixed-canvas and approved special-layer CSS**

```css
:root{--pleats-paper:#fffaf9}
.pleats-body{min-width:1440px;overflow-x:auto;background:var(--pleats-paper)}
.pleats-canvas{position:relative;width:1440px;height:3600px;margin:0 auto;padding:0;overflow:hidden;background:var(--pleats-paper);font-family:'Gothic A1',sans-serif;color:#000}
.pleats-layer{position:absolute;display:block;box-sizing:border-box;transform-origin:0 0}
.pleats-hero-gradient{position:absolute;z-index:20;left:0;top:305.5805px;width:1440px;height:194.1272px;background:linear-gradient(180deg,#fffaf9 0%,rgba(255,250,249,0) 100%);pointer-events:none}
.pleats-perspective{position:absolute;left:149.6328px;top:3036.0779px;width:814.89px;height:458.4875px;border-radius:10px;overflow:hidden}
```

- [ ] **Step 3: Implement the deterministic recursive renderer**

```js
(() => {
  const host = document.querySelector('[data-pleats-layers]');
  const data = window.PleatsMamaFigma;
  if (!host || !data) return;

  const render = (layer) => {
    if (!layer.visible || layer.id === '24:8') return null;
    const element = document.createElement(layer.text ? 'p' : layer.svgPaths?.length ? 'svg' : layer.src ? 'img' : 'div');
    element.className = `pleats-layer${layer.role === 'perspective' ? ' pleats-perspective' : ''}`;
    element.dataset.figmaId = layer.id;
    applyGeometry(element, layer);
    applyAppearance(element, layer);
    for (const child of layer.children ?? []) {
      const rendered = render(child);
      if (rendered) element.appendChild(rendered);
    }
    return element;
  };

  for (const layer of data.layers) {
    const element = render(layer);
    if (element) host.appendChild(element);
  }
})();
```

`applyGeometry` must use the node's local matrix as `matrix(m00,m10,m01,m11,m02,m12)` and must not add parent coordinates. `applyAppearance` must apply extracted solid/gradient/image fills, text metrics, opacity, radius, and SVG paths without default paragraph margins.

- [ ] **Step 4: Keep the Perspective image outside generic geometry overrides**

When `role === 'perspective'`, render the approved image source into a wrapper with class `.pleats-perspective` and an inner image at `width:100%;height:100%;object-fit:cover`. Do not attach transitions, keyframes, scroll listeners, or pointer animation.

- [ ] **Step 5: Run page and geometry tests**

Run: `node --test tests/pleats-mama-page.test.cjs`

Expected: all tests PASS.

- [ ] **Step 6: Commit the page renderer**

```bash
git add pleats-mama.html pleats-mama.css pleats-mama.js tests/pleats-mama-page.test.cjs
git commit -m "feat: render pleats mama detail page"
```

### Task 4: Connect the Work-list entry to the new page

**Files:**
- Modify: `index.html:4`
- Modify: `spatial.html:4`
- Modify: `tests/portfolio-variants.test.cjs`
- Test: `tests/pleats-mama-page.test.cjs`

**Interfaces:**
- Consumes: `pleats-mama.html`
- Produces: direct anchor navigation from both portfolio variants

- [ ] **Step 1: Confirm the navigation test still fails**

Run: `node --test tests/pleats-mama-page.test.cjs tests/portfolio-variants.test.cjs`

Expected: FAIL because PLEATS is still a button.

- [ ] **Step 2: Replace only the PLEATS button in both files**

```html
<a class="project pleats-project-link" href="pleats-mama.html" aria-label="PLEATS MAMA STORE 프로젝트 상세 페이지로 이동"><strong>PLEATS MAMA STORE</strong><span class="details"><span>first offline store</span></span></a>
```

Keep the entry after HYUNDAI E&amp;C. Do not change the Pulio, Data Center, or Hyundai destinations.

- [ ] **Step 3: Update the portfolio regression test**

Assert the exact visible order `PULIO JAPAN TEAM`, `DATA CENTER`, `HYUNDAI E&C`, `PLEATS MAMA STORE` and the new `pleats-mama.html` destination in both portfolio files.

- [ ] **Step 4: Run the focused navigation tests**

Run: `node --test tests/pleats-mama-page.test.cjs tests/portfolio-variants.test.cjs`

Expected: all focused tests PASS.

- [ ] **Step 5: Commit the navigation change**

```bash
git add index.html spatial.html tests/portfolio-variants.test.cjs
git commit -m "feat: link pleats mama project page"
```

### Task 5: Verify Figma fidelity and regression safety

**Files:**
- Modify only if verification exposes a mismatch: `pleats-mama.css`, `pleats-mama-data.js`, `pleats-mama.js`
- Test: `tests/pleats-mama-page.test.cjs`

**Interfaces:**
- Consumes: completed detail page and approved Figma geometry
- Produces: verified static page with no unintended animation or coordinate shifts

- [ ] **Step 1: Add invariants for unchanged coordinates and no Perspective motion**

```js
test('Pleats keeps Perspective static and clips instead of repositioning lower content', () => {
  const css = read('pleats-mama.css');
  const js = read('pleats-mama.js');
  assert.doesNotMatch(css, /@keyframes[^}]*pleats|\.pleats-perspective[^}]*transition:/);
  assert.doesNotMatch(js, /scroll|pointermove|requestAnimationFrame/);
  assert.match(css, /height:3600px/);
});
```

- [ ] **Step 2: Run all focused tests and whitespace validation**

Run: `node --test tests/pleats-mama-page.test.cjs tests/portfolio-variants.test.cjs`

Expected: all focused tests PASS.

Run: `git diff --check`

Expected: exit code 0.

- [ ] **Step 3: Run the repository test suite and record unrelated failures separately**

Run: `node --test`

Expected: the new PLEATS tests pass. If pre-existing Data Center detail assertions remain failing, report their exact count without changing unrelated files.

- [ ] **Step 4: Compare a local render with the Figma thumbnail when Browser is available**

Check the hero blend, Concept section, User Experience diagram, left Perspective image, and 3600px clipping boundary. Adjust only values that differ from Figma source data; do not visually improvise.

- [ ] **Step 5: Commit verification-only corrections if any were necessary**

```bash
git add pleats-mama.css pleats-mama-data.js pleats-mama.js tests/pleats-mama-page.test.cjs
git commit -m "fix: align pleats mama page with figma"
```
