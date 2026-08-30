(function () {
  'use strict';

  function initDataCenterCarousel() {
    const root = document.querySelector('[data-carousel]');
    const track = root && root.querySelector('[data-carousel-track]');
    const core = window.DataCenterCore;
    if (!root || !track || !core) return;

    const realSlides = Array.from(track.querySelectorAll('[data-slide]'));
    const allSlides = Array.from(track.children);
    const buttons = Array.from(root.querySelectorAll('[data-carousel-next]'));
    const slideCount = realSlides.length;
    const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
    let trackIndex = 0;
    let isLocked = false;

    function updateAccessibility() {
      const visibleIndex = trackIndex === slideCount ? slideCount : trackIndex;
      allSlides.forEach((slide, index) => {
        const visible = index === visibleIndex;
        slide.setAttribute('aria-hidden', String(!visible));
        const button = slide.querySelector('[data-carousel-next]');
        if (button) button.tabIndex = visible ? 0 : -1;
      });
    }

    function render(animate) {
      track.classList.toggle('is-jumping', !animate);
      track.style.transform = `translate3d(${-1440 * trackIndex}px,0,0)`;
      updateAccessibility();
      if (!animate) {
        void track.offsetWidth;
        requestAnimationFrame(() => track.classList.remove('is-jumping'));
      }
    }

    function advance() {
      if (isLocked) return;
      trackIndex = core.nextTrackIndex(trackIndex, slideCount);

      if (reducedMotion.matches) {
        trackIndex = core.settleTrackIndex(trackIndex, slideCount);
        render(false);
        return;
      }

      isLocked = true;
      render(true);
    }

    buttons.forEach((button) => button.addEventListener('click', advance));
    track.addEventListener('transitionend', (event) => {
      if (event.target !== track || event.propertyName !== 'transform' || !isLocked) return;
      const settledIndex = core.settleTrackIndex(trackIndex, slideCount);
      if (settledIndex !== trackIndex) {
        trackIndex = settledIndex;
        render(false);
      }
      isLocked = false;
    });

    render(false);
  }

  function initPhysicalModel() {
    const model = document.querySelector('[data-physical-model]');
    if (!model) return;
    const shots = Array.from(model.querySelectorAll('.dc-model-shot'));
    const selectables = Array.from(model.querySelectorAll('[data-model-selectable]'));
    const descriptions = Array.from(model.querySelectorAll('[data-model-description]'));
    const core = window.DataCenterCore;
    if (!selectables.length || !descriptions.length || !core) return;
    const selectableIds = selectables.map((shot) => shot.dataset.modelSelectable);
    const gap = 16;
    let hovered = null;
    let selected = null;

    function bounds(shot, shiftX, shiftY, scale) {
      const x = shot.offsetLeft + shiftX;
      const y = shot.offsetTop + shiftY;
      const w = shot.offsetWidth * scale;
      const h = shot.offsetHeight * scale;
      return { left: x - (w - shot.offsetWidth) / 2, top: y - (h - shot.offsetHeight) / 2, right: x - (w - shot.offsetWidth) / 2 + w, bottom: y - (h - shot.offsetHeight) / 2 + h };
    }

    function update() {
      const active = selected || hovered;
      const shifts = new Map(shots.map((shot) => [shot, { x: 0, y: 0 }]));
      if (active) {
        for (let pass = 0; pass < shots.length * 2; pass += 1) {
          shots.forEach((first, firstIndex) => shots.slice(firstIndex + 1).forEach((second) => {
            const firstShift = shifts.get(first);
            const secondShift = shifts.get(second);
            const firstBox = bounds(first, firstShift.x, firstShift.y, first === active ? 1.15 : 1);
            const secondBox = bounds(second, secondShift.x, secondShift.y, second === active ? 1.15 : 1);
            const overlapX = Math.min(firstBox.right, secondBox.right) - Math.max(firstBox.left, secondBox.left) + gap;
            const overlapY = Math.min(firstBox.bottom, secondBox.bottom) - Math.max(firstBox.top, secondBox.top) + gap;
            if (overlapX <= 0 || overlapY <= 0) return;
            const moveFirst = first !== active;
            const moveSecond = second !== active;
            const horizontal = overlapX < overlapY;
            const firstCenter = horizontal ? (firstBox.left + firstBox.right) / 2 : (firstBox.top + firstBox.bottom) / 2;
            const secondCenter = horizontal ? (secondBox.left + secondBox.right) / 2 : (secondBox.top + secondBox.bottom) / 2;
            const direction = firstCenter <= secondCenter ? -1 : 1;
            if (moveFirst && moveSecond) {
              const amount = (horizontal ? overlapX : overlapY) / 2;
              if (horizontal) { firstShift.x += direction * amount; secondShift.x -= direction * amount; }
              else { firstShift.y += direction * amount; secondShift.y -= direction * amount; }
            } else if (moveFirst || moveSecond) {
              const target = moveFirst ? firstShift : secondShift;
              const amount = horizontal ? overlapX : overlapY;
              const sign = moveFirst ? direction : -direction;
              if (horizontal) target.x += sign * amount;
              else target.y += sign * amount;
            }
          }));
        }
      }
      shots.forEach((shot) => {
        const shift = shifts.get(shot);
        shot.classList.toggle('is-expanded', shot === active);
        shot.classList.toggle('is-displaced', shot !== active && (shift.x !== 0 || shift.y !== 0));
        shot.classList.toggle('is-dimmed', Boolean(selected) && shot !== selected);
        shot.style.transform = `translate(${shift.x}px,${shift.y}px) scale(${shot === active ? 1.15 : 1})`;
      });
      const isSelected = Boolean(selected);
      model.classList.toggle('is-model-selected', isSelected);
      const activeDescriptionId = selected ? core.physicalModelDescriptionId(selected.dataset.modelSelectable) : null;
      const descriptionShiftX = selected
        ? core.physicalModelDescriptionShiftX(selected.dataset.modelSelectable, selected.offsetWidth, 1.15)
        : 0;
      const descriptionShiftY = selected
        ? core.physicalModelDescriptionShiftY(selected.dataset.modelSelectable, selected.offsetHeight, 1.15)
        : 0;
      selectables.forEach((shot) => shot.setAttribute('aria-expanded', String(shot === selected)));
      descriptions.forEach((description) => {
        const isActive = description.dataset.modelDescription === activeDescriptionId;
        description.style.setProperty('--dc-model-description-shift-x', `${isActive ? descriptionShiftX : 0}px`);
        description.style.setProperty('--dc-model-description-shift-y', `${isActive ? descriptionShiftY : 0}px`);
        description.classList.toggle('is-active', isActive);
        description.setAttribute('aria-hidden', String(!isActive));
      });
    }

    shots.forEach((shot) => {
      shot.addEventListener('mouseenter', () => { hovered = shot; update(); });
      shot.addEventListener('mouseleave', () => { if (hovered === shot) { hovered = null; update(); } });
      shot.addEventListener('focus', () => { hovered = shot; update(); });
      shot.addEventListener('blur', () => { if (hovered === shot) { hovered = null; update(); } });
    });

    selectables.forEach((shot) => shot.addEventListener('click', (event) => {
      event.stopPropagation();
      const nextId = core.togglePhysicalModelSelection(selected?.dataset.modelSelectable ?? null, shot.dataset.modelSelectable, selectableIds);
      selected = selectables.find((candidate) => candidate.dataset.modelSelectable === nextId) ?? null;
      update();
    }));

    model.addEventListener('click', () => {
      if (!selected) return;
      selected = null;
      update();
    });

    update();
  }

  function initFloorDetail() {
    const guide = document.querySelector('[data-floor-guide]');
    const overlay = document.querySelector('[data-floor-detail]');
    const canvas = overlay && overlay.querySelector('[data-floor-detail-canvas]');
    const stage = overlay && overlay.querySelector('[data-floor-detail-stage]');
    const nextButton = overlay && overlay.querySelector('[data-floor-detail-next]');
    const previousButton = overlay && overlay.querySelector('[data-floor-detail-previous]');
    const closeButton = overlay && overlay.querySelector('[data-floor-detail-close]');
    const core = window.DataCenterCore;
    const frames = window.DataCenterDetailData;
    if (!guide || !overlay || !canvas || !stage || !nextButton || !previousButton || !closeButton || !core || !Array.isArray(frames)) return;

    const floorOrder = frames.map((frame) => frame.id);
    const floorButtons = Array.from(guide.querySelectorAll('[data-floor]'));
    const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
    let currentIndex = 0;
    let currentPage = null;
    let lastTrigger = null;
    let locked = false;

    function syncCanvasScale() {
      canvas.style.setProperty('--dc-detail-scale', core.detailCanvasScale(window.innerWidth, window.innerHeight));
    }

    function createPage(frame) {
      const page = document.createElement('div');
      page.className = 'dc-floor-detail-page';
      page.dataset.detailFloor = frame.id;
      frame.items.forEach((item) => {
        let element;
        const isFloorTitle = item.type === 'text' && /^[\w-]+f\./i.test(item.text || '');
        const isCenteredUpsText = item.type === 'text' && item.centerInParent === true;
        if (item.type === 'image') {
          const image = document.createElement('img');
          image.src = item.src;
          image.alt = item.alt || '';
          if (item.fillTransform) {
            const bounds = core.detailImageFillBounds(item, item.fillTransform);
            element = document.createElement('span');
            image.style.position = 'absolute';
            image.style.left = `${bounds.x}px`;
            image.style.top = `${bounds.y}px`;
            image.style.width = `${bounds.w}px`;
            image.style.height = `${bounds.h}px`;
            image.style.maxWidth = 'none';
            element.appendChild(image);
          } else {
            element = image;
          }
          element.style.borderRadius = `${item.radius || 0}px`;
        } else if (item.type === 'text') {
          element = document.createElement('p');
          element.textContent = item.text;
          element.style.fontSize = `${item.fontSize}px`;
          element.style.fontFamily = `'${item.family}', sans-serif`;
          element.style.fontWeight = item.weight;
          element.style.color = item.color;
          if (item.textAlign) element.style.textAlign = item.textAlign;
          element.style.whiteSpace = core.detailTextWhiteSpace(item);
        } else if (item.type === 'dash-line') {
          element = document.createElement('span');
          element.className = 'dc-floor-detail-dash-line';
          element.style.width = `${item.w}px`;
          element.style.height = `${item.h}px`;
          element.style.borderTop = item.side === 'top' ? '2px dashed #fff' : '0';
          element.style.borderLeft = item.side === 'left' ? '2px dashed #fff' : '0';
          element.style.borderRight = item.side === 'right' ? '2px dashed #fff' : '0';
          element.style.borderBottom = ['left', 'right'].includes(item.side) ? '2px dashed #fff' : '0';
        } else if (item.type === 'zone-background') {
          element = document.createElement('span');
          element.style.backgroundColor = item.color;
        } else if (item.type === 'axon-group') {
          element = document.createElement('span');
          item.children.forEach((child) => {
            const image = document.createElement('img');
            image.src = child.src;
            image.alt = child.alt || '';
            if (child.image) {
              const part = document.createElement('span');
              part.className = `dc-floor-detail-axon-part dc-floor-detail-axon-part--${child.role}`;
              part.style.left = `${child.x}px`;
              part.style.top = `${child.y}px`;
              part.style.width = `${child.w}px`;
              part.style.height = `${child.h}px`;
              part.style.zIndex = child.z;
              image.style.left = `${child.image.x}px`;
              image.style.top = `${child.image.y}px`;
              image.style.width = `${child.image.w}px`;
              image.style.height = `${child.image.h}px`;
              part.appendChild(image);
              element.appendChild(part);
            } else {
              image.style.left = `${child.x}px`;
              image.style.top = `${child.y}px`;
              image.style.width = `${child.w}px`;
              image.style.height = `${child.h}px`;
              element.appendChild(image);
            }
          });
        } else if (item.type === 'marker') {
          element = document.createElement('span');
          element.style.filter = `drop-shadow(0 ${item.shadowY}px ${item.shadowBlur}px rgba(0,0,0,${item.shadowOpacity}))`;
          const number = document.createElement('span');
          number.className = 'dc-floor-detail-marker-number';
          number.textContent = item.text;
          number.style.left = `${item.textX}px`;
          number.style.top = `${item.textY}px`;
          number.style.fontSize = `${item.fontSize}px`;
          number.style.fontFamily = `'${item.family}', sans-serif`;
          number.style.fontWeight = item.weight;
          const dot = document.createElement('i');
          dot.style.left = `${item.dot.x}px`;
          dot.style.top = `${item.dot.y}px`;
          dot.style.width = `${item.dot.w}px`;
          dot.style.height = `${item.dot.h}px`;
          element.append(number, dot);
        } else {
          return;
        }
        element.className = `dc-floor-detail-item dc-floor-detail-item--${item.type}`;
        element.style.left = `${item.x}px`;
        element.style.top = `${item.y}px`;
          element.style.width = `${core.detailTextWidth(item, frame.items)}px`;
        element.style.height = `${item.h}px`;
        if (isCenteredUpsText) {
          element.classList.add('dc-floor-detail-item--centered');
          element.style.transform = 'none';
        }
        if (isFloorTitle) {
          element.classList.add('dc-floor-title');
          const titleZone = frame.items.find((frameItem) => frameItem.type === 'zone-background');
          const titlePadding = titleZone ? Math.max(0, item.x - titleZone.x) : 4.5;
          const floorTitleTop = frame.id === 'floor-8' && titleZone
            ? titleZone.y + titleZone.h
            : item.y - titlePadding;
          const verticalPadding = frame.id === 'floor-8' && titleZone
            ? item.y - floorTitleTop
            : titlePadding;
          element.style.left = `${item.x - titlePadding}px`;
          element.style.top = `${floorTitleTop}px`;
          element.style.width = `${item.w + titlePadding * 2}px`;
          element.style.height = `${item.h + verticalPadding * 2}px`;
          element.style.padding = `${verticalPadding}px ${titlePadding}px`;
          element.style.whiteSpace = 'nowrap';
          element.style.backgroundColor = '#ffffff';
          element.style.color = '#000000';
        }
        page.appendChild(element);
        if (isCenteredUpsText) {
          const arrowCenter = previousButton.offsetLeft + (previousButton.offsetWidth / 2);
          const centerOffset = Number(item.centerOffsetX) || 0;
          element.style.left = `${arrowCenter - (element.offsetWidth / 2) + centerOffset}px`;
        }
      });
      return page;
    }

    function updateNavigationState() {
      const atTop = core.isTopFloor(currentIndex, frames.length);
      const atBottom = core.isBottomFloor(currentIndex);
      nextButton.disabled = atTop;
      nextButton.hidden = atTop;
      previousButton.disabled = atBottom;
      previousButton.hidden = atBottom;
      nextButton.setAttribute('aria-label', atTop ? '최상층입니다' : '위층 상세 설명 보기');
      previousButton.setAttribute('aria-label', atBottom ? '최하층입니다' : '아래층 상세 설명 보기');
    }

    function showFrame(index, animate, direction = 'up') {
      if (locked || index === currentIndex && currentPage) return;
      const incoming = createPage(frames[index]);
      const outgoing = currentPage;
      currentIndex = index;
      currentPage = incoming;
      stage.appendChild(incoming);
      updateNavigationState();

      if (!animate || reducedMotion.matches || !outgoing) {
        if (outgoing) outgoing.remove();
        return;
      }

      locked = true;
      const enteringClass = `is-entering-${direction}`;
      const leavingClass = `is-leaving-${direction}`;
      incoming.classList.add(enteringClass);
      requestAnimationFrame(() => requestAnimationFrame(() => {
        incoming.classList.remove(enteringClass);
        outgoing.classList.add(leavingClass);
      }));
      window.setTimeout(() => {
        outgoing.remove();
        locked = false;
      }, 580);
    }

    function openDetail(floorId, trigger) {
      const index = core.floorIndexOf(floorId, floorOrder);
      if (index < 0) return;
      lastTrigger = trigger;
      syncCanvasScale();
      overlay.hidden = false;
      document.body.classList.add('is-floor-detail-open');
      overlay.classList.add('is-opening');
      currentPage = null;
      stage.replaceChildren();
      showFrame(index, false);
      canvas.focus({ preventScroll: true });
      window.setTimeout(() => overlay.classList.remove('is-opening'), 400);
    }

    function closeDetail() {
      if (overlay.hidden) return;
      overlay.hidden = true;
      document.body.classList.remove('is-floor-detail-open');
      stage.replaceChildren();
      currentPage = null;
      locked = false;
      if (lastTrigger) lastTrigger.focus({ preventScroll: true });
    }

    floorButtons.forEach((button) => button.addEventListener('click', () => openDetail(button.dataset.floor, button)));
    window.addEventListener('resize', syncCanvasScale);
    nextButton.addEventListener('click', () => {
      if (nextButton.disabled || locked) return;
      showFrame(core.nextFloorIndex(currentIndex, frames.length), true, 'up');
    });
    previousButton.addEventListener('click', () => {
      if (previousButton.disabled || locked) return;
      showFrame(core.previousFloorIndex(currentIndex, frames.length), true, 'down');
    });
    closeButton.addEventListener('click', closeDetail);
    document.addEventListener('keydown', (event) => {
      if (overlay.hidden) return;
      if (event.key === 'Escape') closeDetail();
      else if (event.key === 'ArrowUp' && !nextButton.disabled && !locked) showFrame(core.nextFloorIndex(currentIndex, frames.length), true, 'up');
      else if (event.key === 'ArrowDown' && !previousButton.disabled && !locked) showFrame(core.previousFloorIndex(currentIndex, frames.length), true, 'down');
    });
  }

  function init() {
    initDataCenterCarousel();
    initPhysicalModel();
    initFloorDetail();
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
}());
