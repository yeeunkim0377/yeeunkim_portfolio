(function () {
  'use strict';

  const reels = Array.from(document.querySelectorAll('.hyundai-reel'));

  function pauseOtherReels(video) {
    reels.forEach((candidate) => {
      if (candidate !== video && !candidate.paused) candidate.pause();
    });
  }

  reels.forEach((video) => {
    video.addEventListener('play', () => pauseOtherReels(video));
  });

  function loadReelPosters() {
    reels.forEach((video) => {
      if (!video.dataset.poster) return;
      video.poster = video.dataset.poster;
      delete video.dataset.poster;
    });
  }

  const firstPhone = document.querySelector('.hyundai-phone');
  if (reels.length) {
    if (!firstPhone || typeof IntersectionObserver === 'undefined') {
      loadReelPosters();
    } else {
      const posterObserver = new IntersectionObserver((entries) => {
        if (!entries.some((entry) => entry.isIntersecting)) return;
        posterObserver.disconnect();
        loadReelPosters();
      }, { rootMargin: '300px 0px', threshold: 0.01 });
      posterObserver.observe(firstPhone);
    }
  }

  const counters = Array.from(document.querySelectorAll('.hyundai-stat strong[data-count]'));
  const results = document.querySelector('.hyundai-results');
  const formatter = new Intl.NumberFormat('en-US');
  const duration = 900;

  function showFinalCounts() {
    counters.forEach((counter) => {
      counter.textContent = formatter.format(Number(counter.dataset.count));
    });
  }

  function animateCounters() {
    const targets = counters.map((counter) => Number(counter.dataset.count));
    const lastValues = counters.map(() => -1);
    let startTime;

    function update(timestamp) {
      if (startTime === undefined) startTime = timestamp;
      const progress = Math.min((timestamp - startTime) / duration, 1);
      const easedProgress = 1 - Math.pow(1 - progress, 3);
      counters.forEach((counter, index) => {
        const value = Math.round(targets[index] * easedProgress);
        if (value === lastValues[index]) return;
        lastValues[index] = value;
        counter.textContent = formatter.format(value);
      });

      if (progress < 1) requestAnimationFrame(update);
      else showFinalCounts();
    }

    requestAnimationFrame(update);
  }

  if (counters.length && results) {
    const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    if (reducedMotion) {
      showFinalCounts();
    } else {
      counters.forEach((counter) => { counter.textContent = '0'; });

      if (typeof IntersectionObserver === 'undefined') {
        animateCounters();
      } else {
        const observer = new IntersectionObserver((entries) => {
          if (!entries.some((entry) => entry.isIntersecting)) return;
          observer.disconnect();
          animateCounters();
        }, { threshold: 0.35 });

        observer.observe(results);
      }
    }
  }

  function initCardDetails() {
    const triggers = Array.from(document.querySelectorAll('.hyundai-card-news[data-card-detail]'));
    const overlay = document.querySelector('[data-hyundai-card-detail]');
    const canvas = overlay && overlay.querySelector('[data-hyundai-card-detail-canvas]');
    const stage = overlay && overlay.querySelector('[data-hyundai-card-detail-stage]');
    const closeButton = overlay && overlay.querySelector('[data-hyundai-card-detail-close]');
    const frames = window.HyundaiCardDetailData;
    if (!triggers.length || !overlay || !canvas || !stage || !closeButton || !Array.isArray(frames)) return;

    let lastTrigger = null;

    function syncCanvasScale() {
      const scale = Math.min(window.innerWidth / 1440, window.innerHeight / 1048);
      canvas.style.setProperty('--hyundai-card-detail-scale', scale);
    }

    function renderFrame(frame) {
      const page = document.createElement('div');
      page.className = 'hyundai-card-detail-page';
      page.dataset.cardDetailPage = frame.id;

      frame.images.forEach((item) => {
        const image = document.createElement('img');
        image.className = 'hyundai-card-detail-image';
        image.src = item.src;
        image.alt = item.alt;
        image.decoding = 'async';
        image.style.left = `${item.x}px`;
        image.style.top = `${item.y}px`;
        image.style.width = `${item.w}px`;
        image.style.height = `${item.h}px`;
        page.appendChild(image);
      });

      const panel = document.createElement('div');
      panel.className = 'hyundai-card-detail-panel';
      panel.style.left = `${frame.panel.x}px`;
      panel.style.top = `${frame.panel.y}px`;
      panel.style.width = `${frame.panel.w}px`;
      panel.style.height = `${frame.panel.h}px`;
      panel.style.backgroundColor = frame.panel.color;
      panel.style.opacity = frame.panel.opacity;
      page.appendChild(panel);

      frame.texts.forEach((item) => {
        const text = document.createElement('p');
        text.className = 'hyundai-card-detail-text';
        text.textContent = item.text;
        text.style.left = `${item.x}px`;
        text.style.top = `${item.y}px`;
        text.style.width = `${item.w}px`;
        text.style.height = `${item.h}px`;
        text.style.fontFamily = `'${item.family}', sans-serif`;
        text.style.fontSize = `${item.size}px`;
        text.style.fontWeight = item.weight;
        text.style.color = item.color;
        page.appendChild(text);
      });

      stage.replaceChildren(page);
    }

    function openDetail(detailId, trigger) {
      const frame = frames.find((candidate) => candidate.id === detailId);
      if (!frame) return;
      lastTrigger = trigger;
      syncCanvasScale();
      renderFrame(frame);
      overlay.hidden = false;
      document.body.classList.add('is-card-detail-open');
      overlay.classList.add('is-opening');
      canvas.focus({ preventScroll: true });
      window.setTimeout(() => overlay.classList.remove('is-opening'), 400);
    }

    function closeDetail() {
      if (overlay.hidden) return;
      overlay.hidden = true;
      document.body.classList.remove('is-card-detail-open');
      stage.replaceChildren();
      if (lastTrigger) lastTrigger.focus({ preventScroll: true });
    }

    triggers.forEach((trigger) => trigger.addEventListener('click', () => openDetail(trigger.dataset.cardDetail, trigger)));
    closeButton.addEventListener('click', closeDetail);
    window.addEventListener('resize', syncCanvasScale);
    document.addEventListener('keydown', (event) => {
      if (!overlay.hidden && event.key === 'Escape') closeDetail();
    });
  }

  initCardDetails();
}());
