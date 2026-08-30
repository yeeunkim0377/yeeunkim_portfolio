(() => {
  const model = window.PulioCore.createGalleryModel(window.PulioAssets);
  const da = document.querySelector('#da-gallery');
  model.da.forEach((src, index) => {
    const img = new Image();
    img.src = src;
    img.alt = `DA 콘텐츠 디자인 ${index + 1}`;
    img.loading = index < 12 ? 'eager' : 'lazy';
    da.appendChild(img);
  });

  const jp = document.querySelector('#jp-gallery');
  model.jp.forEach((column, columnIndex) => {
    const wrapper = document.createElement('div');
    wrapper.className = 'pulio-jp-column';
    column.forEach((src, imageIndex) => {
      const img = new Image();
      img.src = src;
      img.alt = `JP translation ${columnIndex + 1}-${imageIndex + 1}`;
      img.loading = imageIndex === 0 ? 'eager' : 'lazy';
      wrapper.appendChild(img);
    });
    jp.appendChild(wrapper);
  });

  document.querySelectorAll('video[data-video]').forEach((video) => {
    const asset = window.PulioAssets.videos[video.dataset.video];
    video.src = asset.src;
    video.poster = asset.poster;
  });
  window.PulioCore.bindClickToPlay(document);
})();
