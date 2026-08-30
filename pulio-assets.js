(function expose(root, factory) {
  const assets = factory();
  if (typeof module === 'object' && module.exports) module.exports = assets;
  if (root) root.PulioAssets = assets;
}(typeof globalThis !== 'undefined' ? globalThis : this, function createAssets() {
  const pad = (value) => String(value).padStart(2, '0');
  return {
    daImages: Array.from({ length: 47 }, (_, index) => `assets/pulio/da/da-${pad(index + 1)}.png`),
    jpColumns: Array.from({ length: 4 }, (_, column) => Array.from({ length: 5 }, (_, index) =>
      `assets/pulio/jp/jp-c${column + 1}-${pad(index + 1)}.png`)),
    videos: {
      reelOne: { src: 'assets/pulio/videos/reel-01.mp4', poster: 'assets/pulio/posters/reel-01.png' },
      reelTwo: { src: 'assets/pulio/videos/reel-02.mp4', poster: 'assets/pulio/posters/reel-02.png' },
      workflowBefore: { src: 'assets/pulio/videos/workflow-before.mp4', poster: 'assets/pulio/posters/workflow-before.png' },
      workflowAfter: { src: 'assets/pulio/videos/workflow-after.mp4', poster: 'assets/pulio/posters/workflow-after.png' },
    },
  };
}));
