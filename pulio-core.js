(function expose(root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  if (root) root.PulioCore = api;
}(typeof globalThis !== 'undefined' ? globalThis : this, function createCore() {
  function createGalleryModel(assets) {
    if (!assets || assets.daImages.length !== 47) throw new Error('Expected 47 DA images');
    if (assets.jpColumns.length !== 4 || assets.jpColumns.some((column) => column.length !== 5)) {
      throw new Error('Expected four JP columns with five images each');
    }
    return { da: assets.daImages, daColumns: 4, daRows: 12, jp: assets.jpColumns };
  }

  async function activateVideo(video) {
    video.controls = true;
    video.dataset.activated = 'true';
    try {
      await video.play();
      video.dataset.playback = 'playing';
    } catch (error) {
      video.dataset.playback = 'error';
    }
  }

  function bindClickToPlay(root) {
    root.querySelectorAll('video[data-click-to-play]').forEach((video) => {
      video.tabIndex = 0;
      video.addEventListener('click', () => {
        if (video.dataset.activated !== 'true') activateVideo(video);
      });
      video.addEventListener('keydown', (event) => {
        if (video.dataset.activated === 'true') return;
        if (event.key !== 'Enter' && event.key !== ' ' && event.key !== 'Spacebar') return;
        if (event.key === ' ' || event.key === 'Spacebar') event.preventDefault();
        activateVideo(video);
      });
    });
  }

  return { createGalleryModel, activateVideo, bindClickToPlay };
}));
