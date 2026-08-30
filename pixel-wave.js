(function (root, factory) {
  const api = factory(root);

  if (typeof module === 'object' && module.exports) {
    module.exports = api;
  }

  if (!root.document) return;

  root.PixelWave = api;
  const start = () => api.initHeroPixelWave(root.document);

  if (root.document.readyState === 'loading') {
    root.document.addEventListener('DOMContentLoaded', start, { once: true });
  } else {
    start();
  }
})(typeof globalThis !== 'undefined' ? globalThis : this, (root) => {
  const clamp = (value, min, max) => Math.min(max, Math.max(min, value));
  const easeOut = (value) => 1 - Math.pow(1 - value, 3);
  const smoothstep = (value) => value * value * (3 - 2 * value);

  function createGridMetrics(width, height, targetTileSize = 20) {
    const safeWidth = Math.max(1, Math.round(width));
    const safeHeight = Math.max(1, Math.round(height));
    const tileSize = Math.max(1, Math.round(targetTileSize));
    return {
      columns: Math.ceil(safeWidth / tileSize),
      rows: Math.ceil(safeHeight / tileSize),
      tileSize,
    };
  }

  function activeTileCoordinates(columns, rows, point, radius = 8) {
    const coordinates = [];
    const startColumn = Math.max(0, Math.floor(point.column - radius));
    const endColumn = Math.min(columns - 1, Math.ceil(point.column + radius));
    const startRow = Math.max(0, Math.floor(point.row - radius));
    const endRow = Math.min(rows - 1, Math.ceil(point.row + radius));

    for (let row = startRow; row <= endRow; row += 1) {
      for (let column = startColumn; column <= endColumn; column += 1) {
        if (Math.hypot(column - point.column, row - point.row) <= radius) {
          coordinates.push({ column, row });
        }
      }
    }
    return coordinates;
  }

  function distanceToTrail(column, row, trail) {
    if (!trail.length) return Infinity;
    if (trail.length === 1) {
      return Math.hypot(column - trail[0].column, row - trail[0].row);
    }

    let closest = Infinity;
    for (let index = 1; index < trail.length; index += 1) {
      const a = trail[index - 1];
      const b = trail[index];
      const dx = b.column - a.column;
      const dy = b.row - a.row;
      const length = dx * dx + dy * dy;
      const progress = length
        ? clamp(((column - a.column) * dx + (row - a.row) * dy) / length, 0, 1)
        : 0;
      const segmentX = a.column + dx * progress;
      const segmentY = a.row + dy * progress;
      closest = Math.min(closest, Math.hypot(column - segmentX, row - segmentY));
    }
    return closest;
  }

  function intensity(distance) {
    return Math.round(Math.pow(clamp(1 - distance / 6, 0, 1), 1.58) * 10) / 10;
  }

  function fadeFactor(elapsed, duration = 1000) {
    const progress = clamp(elapsed / duration, 0, 1);
    return 1 - smoothstep(progress);
  }

  function initHeroPixelWave(documentRoot) {
    const BASE = 16;
    const TARGET_TILE_SIZE = 20;
    const ACTIVE_RADIUS = 8;
    const FADE_MS = 1000;
    const field = documentRoot.querySelector('#hero-pixel-wave');
    if (!field || field.dataset.pixelWaveReady === 'true') return;

    field.dataset.pixelWaveReady = 'true';
    const view = documentRoot.defaultView || root;
    const reducedMotion = view.matchMedia('(prefers-reduced-motion: reduce)');
    const tiles = [];
    const activeTiles = new Set();
    let columns = BASE;
    let rows = BASE;
    let tileSize = 1;
    let trail = [];
    let painted = new Set();
    let lastPaintPoint = null;
    let pointerDown = false;
    let dragging = false;
    let activePointer = null;
    let downPosition = { x: 0, y: 0 };
    let rippleCenter = { column: 0, row: 0 };
    let rippleStarted = -Infinity;
    let lastRipple = -Infinity;
    let fadeStarted = Infinity;
    let releaseHandled = true;
    let suppressClick = false;
    let suppressTimer;
    let resizeTimer;

    const keyOf = (column, row) => `${column}:${row}`;

    function buildGrid() {
      const rect = field.getBoundingClientRect();
      ({ columns, rows, tileSize } = createGridMetrics(
        rect.width,
        rect.height,
        TARGET_TILE_SIZE,
      ));
      activeTiles.clear();
      field.replaceChildren();
      tiles.length = 0;
      Object.assign(field.style, {
        gridTemplateColumns: `repeat(${columns}, ${tileSize}px)`,
        gridTemplateRows: `repeat(${rows}, ${tileSize}px)`,
      });

      for (let row = 0; row < rows; row += 1) {
        for (let column = 0; column < columns; column += 1) {
          const element = documentRoot.createElement('div');
          element.className = 'pixel-wave__tile';
          field.appendChild(element);
          const a = Math.abs(Math.sin((row + 1) * 12.9898 + (column + 1) * 78.233)) % 1;
          const b = Math.abs(Math.sin((row + 3) * 41.173 + (column + 5) * 19.719)) % 1;
          tiles.push({
            element,
            row,
            column,
            opacity: 0,
            fadeOpacity: 0,
            pathDistance: Infinity,
            x: 0,
            y: 0,
            scale: 1,
            rotation: 0,
            mass: .94 + a * .12,
            jitter: (b - .5) * 7,
            damping: 88 + b * 18,
            variation: a,
          });
        }
      }
    }

    function resetTile(tile) {
      tile.opacity = 0;
      tile.fadeOpacity = 0;
      tile.pathDistance = Infinity;
      tile.x = 0;
      tile.y = 0;
      tile.scale = 1;
      tile.rotation = 0;
      tile.element.style.setProperty('--red-opacity', '0');
      tile.element.style.removeProperty('--motion-transform');
      tile.element.style.removeProperty('--motion-alpha');
    }

    function clearActiveTiles() {
      for (const tile of activeTiles) resetTile(tile);
      activeTiles.clear();
    }

    function activateAround(point) {
      for (const { column, row } of activeTileCoordinates(
        columns,
        rows,
        point,
        ACTIVE_RADIUS,
      )) {
        const tile = tiles[row * columns + column];
        tile.pathDistance = Math.min(
          tile.pathDistance,
          Math.hypot(column - point.column, row - point.row),
        );
        activeTiles.add(tile);
      }
    }

    function pointAt(clientX, clientY, snap = false) {
      const rect = field.getBoundingClientRect();
      const rawColumn = (clientX - rect.left) / tileSize - (snap ? 0 : .5);
      const rawRow = (clientY - rect.top) / tileSize - (snap ? 0 : .5);
      return {
        column: snap
          ? Math.floor(clamp(rawColumn, 0, columns - 1))
          : clamp(rawColumn, 0, columns - 1),
        row: snap
          ? Math.floor(clamp(rawRow, 0, rows - 1))
          : clamp(rawRow, 0, rows - 1),
      };
    }

    function markSegment(a, b) {
      const steps = Math.max(1, Math.ceil(Math.hypot(b.column - a.column, b.row - a.row) * 4));
      for (let index = 0; index <= steps; index += 1) {
        const progress = index / steps;
        const point = {
          column: a.column + (b.column - a.column) * progress,
          row: a.row + (b.row - a.row) * progress,
        };
        painted.add(keyOf(Math.round(point.column), Math.round(point.row)));
        activateAround(point);
      }
    }

    function appendPoint(point) {
      const last = trail.at(-1);
      if (!last || Math.hypot(point.column - last.column, point.row - last.row) >= .12) {
        trail.push({ ...point });
      } else {
        trail[trail.length - 1] = { ...point };
      }
    }

    function beginImpact(point, now) {
      fadeStarted = Infinity;
      clearActiveTiles();
      trail = [{ ...point }];
      painted = new Set();
      lastPaintPoint = { ...point };
      markSegment(point, point);
      rippleCenter = { ...point };
      rippleStarted = now;
    }

    function startFade(now) {
      if (Number.isFinite(fadeStarted)) return;
      for (const tile of activeTiles) tile.fadeOpacity = tile.opacity;
      fadeStarted = now;
    }

    field.addEventListener('pointerdown', (event) => {
      if (pointerDown) return;
      event.preventDefault();
      pointerDown = true;
      dragging = false;
      releaseHandled = false;
      activePointer = event.pointerId;
      downPosition = { x: event.clientX, y: event.clientY };
      const point = pointAt(event.clientX, event.clientY, true);
      beginImpact(point, view.performance.now());
      field.setPointerCapture?.(event.pointerId);
    });

    field.addEventListener('pointermove', (event) => {
      if (!pointerDown || event.pointerId !== activePointer) return;
      if (Math.hypot(event.clientX - downPosition.x, event.clientY - downPosition.y) > 3) {
        dragging = true;
      }
      if (!dragging) return;
      const point = pointAt(event.clientX, event.clientY);
      const cell = { column: Math.round(point.column), row: Math.round(point.row) };
      if (painted.has(keyOf(cell.column, cell.row))) return;
      appendPoint(point);
      markSegment(lastPaintPoint || point, point);
      lastPaintPoint = { ...point };
      const now = view.performance.now();
      if (now - lastRipple >= 24) {
        rippleCenter = { ...point };
        rippleStarted = now;
        lastRipple = now;
      }
    });

    function release(event) {
      if (releaseHandled || !pointerDown || event.pointerId !== activePointer) return;
      releaseHandled = true;
      const wasDrag = dragging;
      pointerDown = false;
      dragging = false;
      activePointer = null;
      startFade(view.performance.now());
      if (wasDrag) {
        suppressClick = true;
        view.clearTimeout(suppressTimer);
        suppressTimer = view.setTimeout(() => { suppressClick = false; }, 80);
      }
      if (field.hasPointerCapture?.(event.pointerId)) {
        field.releasePointerCapture(event.pointerId);
      }
    }

    field.addEventListener('pointerup', release);
    field.addEventListener('pointercancel', release);
    field.addEventListener('lostpointercapture', release);
    field.addEventListener('click', (event) => {
      if (!suppressClick) return;
      event.preventDefault();
      event.stopImmediatePropagation();
      suppressClick = false;
      view.clearTimeout(suppressTimer);
    }, true);

    function animate(now) {
      const fading = Number.isFinite(fadeStarted);
      let fade = 1;

      if (fading) {
        const elapsed = now - fadeStarted;
        fade = fadeFactor(elapsed, FADE_MS);
        if (elapsed >= FADE_MS) {
          trail = [];
          fadeStarted = Infinity;
          fade = 0;
          clearActiveTiles();
        }
      }

      for (const tile of activeTiles) {
        const target = fading ? tile.fadeOpacity * fade : intensity(tile.pathDistance) * .98;
        const smoothing = reducedMotion.matches ? 1 : target < tile.opacity ? .8 : dragging ? .66 : .5;
        tile.opacity += (target - tile.opacity) * smoothing;
        tile.element.style.setProperty('--red-opacity', tile.opacity.toFixed(3));

        const dx = tile.column - rippleCenter.column;
        const dy = tile.row - rippleCenter.row;
        const distance = Math.hypot(dx, dy);
        const local = now - rippleStarted - (distance < .5 ? 0 : distance * 18 + tile.jitter);
        const influence = Math.exp(-distance / 2.05);
        const directionX = distance > .001 ? dx / distance : 0;
        const directionY = distance > .001 ? dy / distance : 0;
        let displacement = 0;
        let scale = 1;
        let rotation = 0;

        if (!reducedMotion.matches && local >= 0 && local < 360) {
          if (distance < .5) {
            const press = 56;
            const delta = local < press
              ? -.078 * easeOut(local / press)
              : -.078 * Math.exp(-(local - press) / (74 * tile.mass))
                * Math.cos(((local - press) / (41 * tile.mass)) * Math.PI);
            scale = 1 + delta;
          } else {
            const wave = Math.exp(-local / tile.damping)
              * Math.sin((local / (39 * tile.mass)) * Math.PI);
            displacement = tileSize * .047 * influence * (.92 + tile.variation * .16) * wave;
            scale = 1 - Math.abs(wave) * .014 * influence;
            rotation = (directionX * .62 - directionY * .44)
              * (1.05 + tile.variation * .45) * influence * wave;
          }
        }

        tile.x += (directionX * displacement - tile.x) * .68;
        tile.y += (directionY * displacement - tile.y) * .68;
        tile.scale += (scale - tile.scale) * .72;
        tile.rotation += (rotation - tile.rotation) * .64;
        const active = !reducedMotion.matches && influence > .025 && local >= 0 && local < 350;

        if (active) {
          tile.element.style.setProperty(
            '--motion-transform',
            `translate(${tile.x.toFixed(2)}px, ${tile.y.toFixed(2)}px) rotate(${tile.rotation.toFixed(3)}deg) scale(${tile.scale.toFixed(4)})`,
          );
          tile.element.style.setProperty('--motion-alpha', (.035 + influence * .08).toFixed(3));
        } else if (tile.element.style.getPropertyValue('--motion-transform')) {
          tile.x = 0;
          tile.y = 0;
          tile.scale = 1;
          tile.rotation = 0;
          tile.element.style.removeProperty('--motion-transform');
          tile.element.style.removeProperty('--motion-alpha');
        }
      }

      view.requestAnimationFrame(animate);
    }

    function rebuildGrid() {
      trail = [];
      painted.clear();
      fadeStarted = Infinity;
      activeTiles.clear();
      buildGrid();
    }

    buildGrid();
    if ('ResizeObserver' in view) {
      const resizeObserver = new view.ResizeObserver(() => {
        view.clearTimeout(resizeTimer);
        resizeTimer = view.setTimeout(rebuildGrid, 90);
      });
      resizeObserver.observe(field);
    } else {
      view.addEventListener('resize', () => {
        view.clearTimeout(resizeTimer);
        resizeTimer = view.setTimeout(rebuildGrid, 90);
      });
    }
    view.requestAnimationFrame(animate);
  }

  return {
    createGridMetrics,
    activeTileCoordinates,
    distanceToTrail,
    intensity,
    fadeFactor,
    initHeroPixelWave,
  };
});
