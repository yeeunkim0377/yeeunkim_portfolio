(function (root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  root.PleatsMamaCore = api;
}(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  function layerKind(layer) {
    if (layer?.src) return 'image';
    if (layer?.paths?.length) return 'vector';
    if (layer?.text !== null && layer?.text !== undefined) return 'text';
    return 'container';
  }

  function imageFillBounds(frame, transform) {
    if (!frame || !transform || transform.m00 <= 0 || transform.m11 <= 0) {
      throw new TypeError('image frame and fill transform must use positive dimensions');
    }
    return {
      x: -(transform.m02 / transform.m00) * frame.x,
      y: -(transform.m12 / transform.m11) * frame.y,
      w: frame.x / transform.m00,
      h: frame.y / transform.m11,
    };
  }

  function layerBackground(layer) {
    return layerKind(layer) === 'container' ? layer?.fill ?? null : null;
  }

  function layerBorder(layer) {
    if (layerKind(layer) === 'vector' || !layer?.stroke || !layer?.strokeWidth) return null;
    return {
      width: layer.strokeWidth,
      color: layer.stroke,
      style: layer.dash?.length ? 'dashed' : 'solid',
    };
  }

  const uxSteps = new Map([
    ['24:38', { step: 0, route: 'down-right', connector: true }],
    ['24:39', { step: 0, route: 'down', connector: false }],
    ...['24:57', '24:63', '24:64', '24:65', '24:66'].map((id) => [id, { step: 1, route: 'down', connector: false }]),
    ...['24:67', '24:83'].map((id) => [id, { step: 2, route: 'down', connector: false }]),
    ...['24:74', '24:75', '24:82'].map((id) => [id, { step: 3, route: 'right', connector: false }]),
    ...['24:112', '24:113', '24:114'].map((id) => [id, { step: 4, route: 'right', connector: false }]),
    ['24:88', { step: 1, route: 'down', connector: true }],
    ['24:108', { step: 2, route: 'down', connector: true }],
    ['24:109', { step: 2, route: 'down', connector: true }],
    ['24:110', { step: 3, route: 'right', connector: true }],
    ['24:111', { step: 4, route: 'right', connector: true }],
  ]);

  function uxPresentation(id) {
    const presentation = uxSteps.get(id);
    const delays = [0, 0, 0.36, 0.72, 1.08];
    return presentation ? {
      ...presentation,
      delay: delays[presentation.step],
      duration: 0.72,
    } : null;
  }

  function opacityPlan(opacity, animated) {
    return animated
      ? { inlineOpacity: null, finalOpacity: opacity }
      : { inlineOpacity: opacity, finalOpacity: null };
  }

  function routeRevealPlan(layer) {
    if (layer?.id !== '24:38' || !layer.size) return null;
    return {
      duration: 0.72,
      vertical: { x: 0, y: 0, width: 2, height: layer.size.y },
      horizontal: { x: 0, y: layer.size.y - 2, width: layer.size.x, height: 2 },
    };
  }

  function nextPerspectiveIndex(index, count) {
    if (!Number.isInteger(count) || count < 1) throw new RangeError('Perspective count must be positive');
    return (index + 1) % count;
  }

  function perspectiveMotion() {
    return {
      duration: 600,
      easing: 'cubic-bezier(.22,1,.36,1)',
      outgoing: [{ transform: 'translateX(0%)' }, { transform: 'translateX(-100%)' }],
      incoming: [{ transform: 'translateX(100%)' }, { transform: 'translateX(0%)' }],
    };
  }

  function magnifierFrame(pointer, bounds, size, gap = 0, bottomInset = size / 2) {
    const left = pointer.x - size - gap;
    const preferredTop = pointer.y - size + bottomInset;
    const top = Math.min(Math.max(preferredTop, bounds.top), bounds.bottom - size);
    return {
      left,
      top,
      focusX: size / 2,
      focusY: size / 2,
    };
  }

  function magnifierTransform(pointer, lens, zoom) {
    return `translate(${lens.focusX - pointer.x * zoom}px, ${lens.focusY - pointer.y * zoom}px) scale(${zoom})`;
  }

  return {
    layerKind,
    imageFillBounds,
    layerBackground,
    layerBorder,
    uxPresentation,
    opacityPlan,
    routeRevealPlan,
    nextPerspectiveIndex,
    perspectiveMotion,
    magnifierFrame,
    magnifierTransform,
  };
}));
