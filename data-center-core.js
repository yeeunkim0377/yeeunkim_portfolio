(function expose(root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  else root.DataCenterCore = api;
}(typeof globalThis !== 'undefined' ? globalThis : this, () => {
  function validate(currentIndex, slideCount) {
    if (!Number.isInteger(currentIndex) || !Number.isInteger(slideCount) || slideCount < 1) {
      throw new TypeError('carousel indexes must be integers and slideCount must be positive');
    }
  }

  function nextTrackIndex(currentIndex, slideCount) {
    validate(currentIndex, slideCount);
    return Math.min(currentIndex + 1, slideCount);
  }

  function settleTrackIndex(trackIndex, slideCount) {
    validate(trackIndex, slideCount);
    return trackIndex === slideCount ? 0 : trackIndex;
  }

  function nextFloorIndex(currentIndex, floorCount) {
    validate(currentIndex, floorCount);
    return Math.min(currentIndex + 1, floorCount - 1);
  }

  function previousFloorIndex(currentIndex, floorCount) {
    validate(currentIndex, floorCount);
    return Math.max(currentIndex - 1, 0);
  }

  function floorIndexOf(floorId, floorOrder) {
    if (typeof floorId !== 'string' || !Array.isArray(floorOrder)) return -1;
    return floorOrder.indexOf(floorId);
  }

  function shouldCloseDetail(intent) {
    return Boolean(intent && (intent.key === 'Escape' || intent.backdrop === true));
  }

  function isTopFloor(currentIndex, floorCount) {
    validate(currentIndex, floorCount);
    return currentIndex === floorCount - 1;
  }

  function isBottomFloor(currentIndex) {
    if (!Number.isInteger(currentIndex) || currentIndex < 0) throw new TypeError('floor index must be a non-negative integer');
    return currentIndex === 0;
  }

  function detailCanvasScale(viewportWidth, viewportHeight) {
    if (!Number.isFinite(viewportWidth) || !Number.isFinite(viewportHeight) || viewportWidth <= 0 || viewportHeight <= 0) {
      throw new TypeError('viewport dimensions must be positive numbers');
    }
    return Math.min(viewportWidth / 1440, viewportHeight / 1048);
  }

  function detailTextWhiteSpace(item) {
    if (item && item.preserveBreaks) return 'pre';
    return item && item.nowrap ? 'nowrap' : 'pre-wrap';
  }

  function detailTextWidth(item, items) {
    if (!item || item.type !== 'text' || item.nowrap || item.ui || !Array.isArray(items)) return item && item.w;
    const candidates = items.filter((candidate) => candidate.type === 'image'
      && Number.isFinite(candidate.x) && Number.isFinite(candidate.y)
      && Number.isFinite(candidate.w) && Number.isFinite(candidate.h)
      && candidate.y <= item.y && candidate.x + candidate.w > item.x);
    if (!candidates.length) return item.w;
    const image = candidates.reduce((best, candidate) => {
      const score = Math.abs(candidate.x - item.x) + Math.abs((candidate.y + candidate.h) - item.y) * 0.15;
      const bestScore = Math.abs(best.x - item.x) + Math.abs((best.y + best.h) - item.y) * 0.15;
      return score < bestScore ? candidate : best;
    });
    return Math.max(0, image.x + image.w - item.x);
  }

  function detailImageFillBounds(frame, transform) {
    if (!frame || !transform || transform.m00 <= 0 || transform.m11 <= 0) {
      throw new TypeError('image fill frame and scale must be positive');
    }
    return {
      x: -(transform.m02 / transform.m00) * frame.w,
      y: -(transform.m12 / transform.m11) * frame.h,
      w: frame.w / transform.m00,
      h: frame.h / transform.m11,
    };
  }

  function togglePhysicalModelSelection(currentId, targetId, selectableIds) {
    if (!Array.isArray(selectableIds) || !selectableIds.includes(targetId)) return currentId;
    return currentId === targetId ? null : targetId;
  }

  function physicalModelDescriptionId(imageId) {
    return {
      'model-01': 'description-03',
      'model-02': 'description-01',
      'model-03': 'description-02',
      'model-04': 'description-04',
      'model-05': 'description-05',
    }[imageId] ?? null;
  }

  function physicalModelDescriptionShiftX(imageId, imageWidth, expandedScale) {
    if (!Number.isFinite(imageWidth) || !Number.isFinite(expandedScale)) return 0;
    if (imageId === 'model-03') return Number((-imageWidth * (expandedScale - 1) / 2).toFixed(4));
    if (!['model-04', 'model-05'].includes(imageId)) return 0;
    return 22.1052;
  }

  function physicalModelDescriptionShiftY(imageId, imageHeight, expandedScale) {
    if (imageId !== 'model-03' || !Number.isFinite(imageHeight) || !Number.isFinite(expandedScale)) return 0;
    return Number((imageHeight * (expandedScale - 1) / 2).toFixed(4));
  }

  return { nextTrackIndex, settleTrackIndex, nextFloorIndex, previousFloorIndex, floorIndexOf, shouldCloseDetail, isTopFloor, isBottomFloor, detailCanvasScale, detailTextWhiteSpace, detailTextWidth, detailImageFillBounds, togglePhysicalModelSelection, physicalModelDescriptionId, physicalModelDescriptionShiftX, physicalModelDescriptionShiftY };
}));
