(() => {
  const model = window.PulioCore.createGalleryModel(window.PulioAssets);
  const da = document.querySelector('#da-gallery');
  model.da.forEach((src, index) => {
    const img = new Image();
    window.PortfolioMedia.image(img, src);
    img.alt = `DA 콘텐츠 디자인 ${index + 1}`;
    da.appendChild(img);
  });

  const jp = document.querySelector('#jp-gallery');
  model.jp.forEach((column, columnIndex) => {
    const wrapper = document.createElement('div');
    wrapper.className = 'pulio-jp-column';
    column.forEach((src, imageIndex) => {
      const img = new Image();
      window.PortfolioMedia.image(img, src);
      img.alt = `JP translation ${columnIndex + 1}-${imageIndex + 1}`;
      wrapper.appendChild(img);
    });
    jp.appendChild(wrapper);
  });

  document.querySelectorAll('video[data-video]').forEach((video) => {
    const asset = window.PulioAssets.videos[video.dataset.video];
    video.src = asset.src;
    window.PortfolioMedia.poster(video, asset.poster);
  });

  const workflowObjects = [...document.querySelectorAll('object[data-workflow]')];
  const syncWorkflowLanguage = () => {
    const language = window.PortfolioI18n?.getLanguage() || document.documentElement.lang;
    workflowObjects.forEach((object) => {
      window.PulioCore.translateWorkflowDocument(object.contentDocument, language);
    });
  };
  workflowObjects.forEach((object) => object.addEventListener('load', syncWorkflowLanguage));
  document.addEventListener('portfolio:languagechange', syncWorkflowLanguage);
  syncWorkflowLanguage();

  window.PulioCore.bindClickToPlay(document);
})();
