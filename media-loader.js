(function (browser) {
  'use strict';
  const assets = browser.PortfolioMediaAssets || {};
  const pendingPosters = new WeakMap();
  const posterObserver = typeof browser.IntersectionObserver === 'function'
    ? new browser.IntersectionObserver(entries => {
      entries.forEach(entry => {
        if (!entry.isIntersecting) return;
        entry.target.poster = source(pendingPosters.get(entry.target));
        pendingPosters.delete(entry.target);
        posterObserver.unobserve(entry.target);
      });
    }, { rootMargin: '300px 0px' }) : null;

  function source(src) { return assets[src]?.src || src; }

  function image(element, src, lazy = true) {
    element.loading = lazy ? 'lazy' : 'eager';
    element.decoding = 'async';
    const asset = assets[src];
    if (asset) {
      element.width = asset.width;
      element.height = asset.height;
    }
    element.src = source(src);
  }

  function poster(video, src) {
    if (!posterObserver) { video.poster = source(src); return; }
    pendingPosters.set(video, src);
    posterObserver.observe(video);
  }

  browser.PortfolioMedia = { source, image, poster };
}(window));
