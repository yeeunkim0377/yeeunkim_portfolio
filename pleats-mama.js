(() => {
  const host = document.querySelector('[data-pleats-layers]');
  const data = window.PleatsMamaFigma;
  const core = window.PleatsMamaCore;
  if (!host || !data || !core) return;
  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');

  const matrix = ({ m00 = 1, m01 = 0, m02 = 0, m10 = 0, m11 = 1, m12 = 0 } = {}) =>
    `matrix(${m00},${m10},${m01},${m11},${m02},${m12})`;
  const GUIDE_COPY_IDS = new Set(['24:41', '24:42']);

  function applyGeometry(element, layer, presentation) {
    element.style.width = `${layer.size.x}px`;
    element.style.height = `${layer.size.y}px`;
    element.style.transform = matrix(layer.transform);
    const opacity = core.opacityPlan(layer.opacity, Boolean(presentation));
    if (opacity.inlineOpacity === null) {
      element.style.removeProperty('opacity');
      element.style.setProperty('--ux-final-opacity', opacity.finalOpacity);
    } else {
      element.style.opacity = opacity.inlineOpacity;
    }
    if (layer.clip) element.style.overflow = 'hidden';
    if (layer.radius) element.style.borderRadius = `${layer.radius}px`;
  }

  function applyAppearance(element, layer) {
    const background = core.layerBackground(layer);
    if (background) element.style.backgroundColor = background;
    if (layer.gradient) element.style.backgroundImage = layer.gradient;
    const border = core.layerBorder(layer);
    if (border) {
      element.style.border = `${border.width}px ${border.style} ${border.color}`;
    }
    if (layer.text !== null) {
      element.textContent = layer.text;
      element.style.color = layer.fill ?? '#000';
      element.style.fontFamily = `'${layer.fontFamily}',sans-serif`;
      if (layer.fontSize) element.style.fontSize = `${layer.fontSize}px`;
      if (layer.fontWeight) element.style.fontWeight = layer.fontWeight;
      if (layer.lineHeight) element.style.lineHeight = `${layer.lineHeight}px`;
      if (layer.textAlign) element.style.textAlign = layer.textAlign;
    }
  }

  function renderVector(layer) {
    const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    svg.classList.add('pleats-layer', 'pleats-layer--svg');
    svg.dataset.figmaId = layer.id;
    svg.setAttribute('viewBox', `0 0 ${layer.size.x} ${layer.size.y}`);
    const reveal = core.routeRevealPlan(layer);
    let maskId = null;
    if (reveal) {
      maskId = `pleats-route-mask-${layer.id.replace(':', '-')}`;
      svg.style.setProperty('--ux-route-duration', `${reveal.duration}s`);
      const defs = document.createElementNS('http://www.w3.org/2000/svg', 'defs');
      const mask = document.createElementNS('http://www.w3.org/2000/svg', 'mask');
      mask.id = maskId;
      mask.setAttribute('maskUnits', 'userSpaceOnUse');
      mask.setAttribute('x', '0');
      mask.setAttribute('y', '0');
      mask.setAttribute('width', layer.size.x);
      mask.setAttribute('height', layer.size.y);
      for (const [direction, geometry] of Object.entries({ vertical: reveal.vertical, horizontal: reveal.horizontal })) {
        const rect = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
        rect.classList.add('pleats-ux-route-mask-segment', `pleats-ux-route-mask--${direction}`);
        rect.setAttribute('x', geometry.x);
        rect.setAttribute('y', geometry.y);
        rect.setAttribute('width', geometry.width);
        rect.setAttribute('height', geometry.height);
        rect.setAttribute('fill', '#fff');
        mask.appendChild(rect);
      }
      defs.appendChild(mask);
      svg.appendChild(defs);
    }
    for (const item of layer.paths) {
      const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
      path.setAttribute('d', item.d);
      if (item.kind === 'stroke') {
        path.setAttribute('fill', 'none');
        path.setAttribute('stroke', item.color);
        path.setAttribute('stroke-width', layer.strokeWidth || 1);
        if (layer.dash?.length) path.setAttribute('stroke-dasharray', layer.dash.join(' '));
      } else {
        path.setAttribute('fill', item.color);
        path.setAttribute('fill-rule', item.rule);
      }
      if (maskId) path.setAttribute('mask', `url(#${maskId})`);
      svg.appendChild(path);
    }
    return svg;
  }

  function render(layer) {
    if (!layer.visible) return null;
    let element;
    const kind = core.layerKind(layer);
    if (kind === 'image') {
      element = document.createElement('span');
      element.className = 'pleats-layer pleats-layer--image-frame';
      const image = document.createElement('img');
      image.className = 'pleats-layer-image-fill';
      image.src = layer.src;
      image.alt = '';
      image.decoding = 'async';
      if (layer.imageScaleMode === 'STRETCH' && layer.fillTransform) {
        const bounds = core.imageFillBounds(layer.size, layer.fillTransform);
        image.style.left = `${bounds.x}px`;
        image.style.top = `${bounds.y}px`;
        image.style.width = `${bounds.w}px`;
        image.style.height = `${bounds.h}px`;
      } else {
        image.style.inset = '0';
        image.style.width = '100%';
        image.style.height = '100%';
        image.style.objectFit = layer.imageScaleMode === 'FIT' ? 'contain' : 'cover';
      }
      element.appendChild(image);
    } else if (kind === 'vector') {
      element = renderVector(layer);
    } else if (kind === 'text') {
      element = document.createElement('p');
      element.className = 'pleats-layer pleats-layer--text';
    } else {
      element = document.createElement('div');
      element.className = `pleats-layer${layer.type === 'ELLIPSE' ? ' pleats-layer--ellipse' : ''}`;
    }
    element.dataset.figmaId = layer.id;
    if (layer.id === '24:119') element.dataset.i18n = 'pleats.record';
    if (GUIDE_COPY_IDS.has(layer.id)) element.classList.add('pleats-guide-small-copy');
    if (layer.id === '24:24') element.classList.add('pleats-site-badge');
    if (layer.id === '24:25') element.classList.add('pleats-site-badge__text');
    if (layer.id === '24:531') element.classList.add('pleats-concept-copy-title');
    if (layer.id === '24:532') element.classList.add('pleats-concept-copy-body');
    if (layer.id === '24:37') element.classList.add('pleats-ux-scene');
    const presentation = core.uxPresentation(layer.id);
    if (presentation) {
      element.classList.add('pleats-ux-step');
      if (presentation.connector) element.classList.add('pleats-ux-connector');
      element.dataset.uxRoute = presentation.route;
      element.style.setProperty('--ux-delay', `${presentation.delay}s`);
      element.style.setProperty('--ux-duration', `${presentation.duration}s`);
    }
    applyGeometry(element, layer, presentation);
    applyAppearance(element, layer);
    for (const child of layer.children) {
      const rendered = render(child);
      if (rendered) element.appendChild(rendered);
    }
    return element;
  }

  const fragment = document.createDocumentFragment();
  for (const layer of data.layers) {
    const element = render(layer);
    if (element) fragment.appendChild(element);
  }
  host.appendChild(fragment);

  const conceptCopyTitle = host.querySelector('.pleats-concept-copy-title');
  const conceptCopyBody = host.querySelector('.pleats-concept-copy-body');
  function syncConceptCopyLayout() {
    if (!conceptCopyTitle || !conceptCopyBody) return;
    const titleTop = 1476.6453857421875;
    conceptCopyBody.style.transform = matrix({ m02: 706.23046875, m12: titleTop + conceptCopyTitle.offsetHeight + 20 });
  }
  syncConceptCopyLayout();
  window.addEventListener('load', syncConceptCopyLayout);
  document.addEventListener('portfolio:languagechange', syncConceptCopyLayout);

  const perspectiveViewport = document.querySelector('[data-pleats-perspective]');
  const perspectiveNext = document.querySelector('[data-pleats-next]');
  const perspectiveSlides = data.perspectives ?? [];
  const planFrame = host.querySelector('[data-figma-id="24:6"]');
  const floorLabel = host.querySelector('[data-figma-id="24:28"]');
  const description = host.querySelector('[data-figma-id="24:133"]');
  const planMarker = host.querySelector('[data-figma-id="24:135"]');
  const canvas = host.closest('.pleats-canvas');
  const finePointer = window.matchMedia('(hover:hover) and (pointer:fine)').matches;
  const magnifier = finePointer && canvas ? document.createElement('div') : null;
  const magnifierContent = magnifier ? document.createElement('div') : null;
  const perspectiveOrigin = { x: 149.6317, y: 3035.7412 };
  let perspectiveIndex = 0;
  let perspectiveLocked = false;

  if (magnifier && magnifierContent) {
    magnifier.className = 'pleats-plan-magnifier';
    magnifier.setAttribute('aria-hidden', 'true');
    magnifierContent.className = 'pleats-plan-magnifier-content';
    magnifier.appendChild(magnifierContent);
    canvas.appendChild(magnifier);
  }

  function refreshMagnifierContent() {
    if (!magnifierContent || !planFrame || !planMarker) return;
    magnifierContent.replaceChildren();
    const planClone = planFrame.cloneNode(true);
    const markerClone = planMarker.cloneNode(true);
    planClone.removeAttribute('data-figma-id');
    markerClone.removeAttribute('data-figma-id');
    magnifierContent.append(planClone, markerClone);
  }

  function hideMagnifier() {
    magnifier?.classList.remove('is-visible');
  }

  function moveMagnifier(event) {
    if (!magnifier || !magnifierContent || !canvas || !planFrame) return;
    const canvasBounds = canvas.getBoundingClientRect();
    const planBounds = planFrame.getBoundingClientRect();
    const scaleX = canvas.offsetWidth / canvasBounds.width;
    const scaleY = canvas.offsetHeight / canvasBounds.height;
    const pointer = {
      x: (event.clientX - canvasBounds.left) * scaleX,
      y: (event.clientY - canvasBounds.top) * scaleY,
    };
    const bounds = {
      left: (planBounds.left - canvasBounds.left) * scaleX,
      top: (planBounds.top - canvasBounds.top) * scaleY,
      right: (planBounds.right - canvasBounds.left) * scaleX,
      bottom: (planBounds.bottom - canvasBounds.top) * scaleY,
    };
    const lens = core.magnifierFrame(pointer, bounds, 160, 10, 10);
    magnifier.style.left = `${lens.left}px`;
    magnifier.style.top = `${lens.top}px`;
    magnifierContent.style.transform = core.magnifierTransform(pointer, lens, 2);
    magnifier.classList.add('is-visible');
  }

  function preparePerspectiveImage(image, slide) {
    image.className = 'pleats-perspective';
    image.src = slide.main.src;
    image.alt = `PLEATS MAMA ${slide.floorLabel.replace('. Floor plan', '')} 공간 투시도`;
    image.decoding = 'async';
    image.style.left = `${slide.main.transform.m02 - perspectiveOrigin.x}px`;
    image.style.top = `${slide.main.transform.m12 - perspectiveOrigin.y}px`;
    image.style.width = `${slide.main.size.x}px`;
    image.style.height = `${slide.main.size.y}px`;
  }

  function updatePerspectiveDetails(slide) {
    const planImage = planFrame?.querySelector('img');
    if (planFrame) {
      planFrame.style.width = `${slide.plan.size.x}px`;
      planFrame.style.height = `${slide.plan.size.y}px`;
      planFrame.style.transform = matrix(slide.plan.transform);
    }
    if (planImage) {
      planImage.src = slide.plan.src;
      planImage.alt = slide.floorLabel;
      if (slide.plan.imageScaleMode === 'STRETCH' && slide.plan.fillTransform) {
        const bounds = core.imageFillBounds(slide.plan.size, slide.plan.fillTransform);
        planImage.style.left = `${bounds.x}px`;
        planImage.style.top = `${bounds.y}px`;
        planImage.style.width = `${bounds.w}px`;
        planImage.style.height = `${bounds.h}px`;
        planImage.style.inset = 'auto';
      } else {
        planImage.style.inset = '0';
        planImage.style.width = '100%';
        planImage.style.height = '100%';
        planImage.style.objectFit = slide.plan.imageScaleMode === 'FIT' ? 'contain' : 'cover';
      }
    }
    if (floorLabel) floorLabel.textContent = slide.floorLabel;
    if (description) {
      const language = window.PortfolioI18n?.getLanguage?.() || 'ko';
      description.textContent = language === 'en' && slide.enDescription ? slide.enDescription : slide.description;
    }
    if (planMarker) {
      planMarker.style.width = `${slide.marker.size.x}px`;
      planMarker.style.height = `${slide.marker.size.y}px`;
      planMarker.style.transform = matrix(slide.marker.transform);
      planMarker.style.backgroundColor = slide.marker.fill;
    }
    refreshMagnifierContent();
  }
  document.addEventListener('portfolio:languagechange', () => {
    if (perspectiveSlides[perspectiveIndex]) updatePerspectiveDetails(perspectiveSlides[perspectiveIndex]);
  });

  async function showNextPerspective() {
    hideMagnifier();
    if (perspectiveLocked || !perspectiveViewport || perspectiveSlides.length < 2) return;
    const current = perspectiveViewport.querySelector('.pleats-perspective');
    if (!current) return;
    const nextIndex = core.nextPerspectiveIndex(perspectiveIndex, perspectiveSlides.length);
    const nextSlide = perspectiveSlides[nextIndex];
    const incoming = document.createElement('img');
    preparePerspectiveImage(incoming, nextSlide);
    perspectiveViewport.appendChild(incoming);

    if (reducedMotion.matches || typeof current.animate !== 'function') {
      current.remove();
      perspectiveIndex = nextIndex;
      updatePerspectiveDetails(nextSlide);
      return;
    }

    perspectiveLocked = true;
    perspectiveNext.disabled = true;
    const motion = core.perspectiveMotion();
    const detailTimer = window.setTimeout(() => updatePerspectiveDetails(nextSlide), motion.duration / 2);
    const outgoing = current.animate(motion.outgoing, { duration: motion.duration, easing: motion.easing, fill: 'forwards' });
    const entering = incoming.animate(motion.incoming, { duration: motion.duration, easing: motion.easing, fill: 'forwards' });
    await Promise.allSettled([outgoing.finished, entering.finished]);
    window.clearTimeout(detailTimer);
    updatePerspectiveDetails(nextSlide);
    current.remove();
    incoming.getAnimations().forEach((animation) => animation.cancel());
    perspectiveIndex = nextIndex;
    perspectiveLocked = false;
    perspectiveNext.disabled = false;
  }

  if (perspectiveViewport && perspectiveNext && perspectiveSlides.length) {
    preparePerspectiveImage(perspectiveViewport.querySelector('.pleats-perspective'), perspectiveSlides[0]);
    updatePerspectiveDetails(perspectiveSlides[0]);
    perspectiveNext.addEventListener('click', showNextPerspective);
  }

  if (planFrame && magnifier) {
    planFrame.addEventListener('pointerenter', (event) => {
      refreshMagnifierContent();
      moveMagnifier(event);
    });
    planFrame.addEventListener('pointermove', moveMagnifier);
    planFrame.addEventListener('pointerleave', hideMagnifier);
  }

  const uxScene = host.querySelector('[data-figma-id="24:37"]');
  if (!uxScene) return;
  if (reducedMotion.matches || !('IntersectionObserver' in window)) {
    uxScene.classList.add('is-visible');
    return;
  }
  const observer = new IntersectionObserver((entries) => {
    if (!entries.some((entry) => entry.isIntersecting)) return;
    uxScene.classList.add('is-visible');
    observer.disconnect();
  }, { threshold: 0.12 });
  observer.observe(uxScene);
})();
