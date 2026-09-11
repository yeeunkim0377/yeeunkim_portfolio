const projects = document.querySelectorAll('button.project');
const previewLabel = document.querySelector('.preview .bar');
const previewSquare = document.querySelector('.square');

projects.forEach((button) => {
  button.addEventListener('click', () => {
    const projectPages = {
      'DATA CENTER': 'data-center.html',
      'PULIO JAPAN TEAM': 'pulio.html'
    };

    if (projectPages[button.dataset.project]) {
      window.location.href = projectPages[button.dataset.project];
      return;
    }

    projects.forEach((item) => {
      const selected = item === button;
      item.classList.toggle('active', selected);
      item.setAttribute('aria-expanded', String(selected));
    });

    previewLabel.textContent = button.dataset.project;
    previewSquare.style.transform = 'scale(.985)';
    setTimeout(() => { previewSquare.style.transform = ''; }, 180);
  });
});

(() => {
  const reel = document.querySelector('[data-pulio-da-reel]');
  const track = reel?.querySelector('.pulio-da-track');
  const core = window.HomeReelCore;
  if (!reel || !track || !core) return;

  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
  const mobileViewport = window.matchMedia('(max-width: 520px)');
  const dataCenterImages = [
    { file: '07b224d1a42de03d5813255aaad61ddeef3c223a.png' },
    { file: '1fa4582d43b7ce79a1bdb6368ddfd9f975e32b30.png' },
    { file: '5ff1329122835b6573924f4433a16d9ff3dde325.png' },
    { file: '6d748280a7354fbba2fb3087f7808cb798181ab2.png' },
    { file: '7304c4477e0fc69b94af869a87a8fda9c580b753.jpg' },
    { file: '87b2a8f8525f9c25fef3e576adc1902aa94fc8f7.png' },
    { file: 'b5a8cadfbc4ea3197df827410380bcaa4ac55de8.png' },
    { file: 'c95348b5292a7793cb148cf4d3b95338b9f0ae9d.png' },
    { file: 'e85427fb4450391ca08f19826c60cff6539b5f50.png' }
  ];
  const hyundaiImages = [
    { file: '4.jpg' },
    { file: '6.jpg' },
    { file: '10.jpg' },
    { file: '11.jpg' }
  ];
  const pleatsImages = [
    { file: '1.png' },
    { file: '59ef942f17f13c16104725ddd7c4a34137a5565c.png' },
    { file: '7b287e9f512745548fa3ab8f01370e9f1426bfe7.png' },
    { file: 'd0f87fb0bf2c4d1c28c6b833f9fd0b5a1ddf6e25.png' },
    { file: 'fe190d8412f370a5b6578b479b5d742dff61d38c.png' }
  ];
  const recent = [];
  let deck = [];
  let mode = 'pulio';

  const nextNumber = () => {
    if (!deck.length) deck = core.createDeck(47, 10, Math.random, recent.slice(-3));
    const number = deck.shift();
    recent.push(number);
    if (recent.length > 10) recent.shift();
    return number;
  };

  const createPulioImage = () => {
    const number = String(nextNumber()).padStart(2, '0');
    const image = document.createElement('img');
    image.src = `assets/pulio/da/da-${number}.png`;
    image.alt = '';
    image.decoding = 'async';
    image.loading = 'eager';
    return image;
  };

  const createDataCenterImage = (item) => {
    const frame = document.createElement('span');
    const image = document.createElement('img');
    frame.className = 'data-center-reel-image';
    image.src = `assets/data-center/scroll/${item.file}`;
    image.alt = '';
    image.decoding = 'async';
    image.loading = 'eager';
    frame.appendChild(image);
    return frame;
  };

  const createHyundaiImage = (item) => {
    const image = document.createElement('img');
    image.className = 'hyundai-reel-image';
    image.src = `assets/hyundai/scroll/${item.file}`;
    image.alt = '';
    image.decoding = 'async';
    image.loading = 'eager';
    return image;
  };

  const createPleatsImage = (item) => {
    const image = document.createElement('img');
    image.className = 'pleats-reel-image';
    image.src = `assets/pleats-mama/scroll/${item.file}`;
    image.alt = '';
    image.decoding = 'async';
    image.loading = 'eager';
    return image;
  };

  const stop = () => {
    track.style.transition = 'none';
    track.style.transform = 'translateY(0)';
  };

  const fillPulio = () => {
    mode = 'pulio';
    stop();
    track.replaceChildren();
    reel.classList.remove('is-data-center', 'is-hyundai', 'is-pleats');
    for (let index = 0; index < 4; index += 1) track.appendChild(createPulioImage());
    void track.offsetHeight;
    if (!reducedMotion.matches && !mobileViewport.matches) requestAnimationFrame(advance);
  };

  const fillDataCenter = () => {
    if (mode === 'data-center') return;
    mode = 'data-center';
    stop();
    track.replaceChildren(...dataCenterImages.map(createDataCenterImage));
    reel.classList.remove('is-hyundai', 'is-pleats');
    reel.classList.add('is-data-center');
    void track.offsetHeight;
    if (!reducedMotion.matches && !mobileViewport.matches) requestAnimationFrame(advance);
  };

  const fillHyundai = () => {
    if (mode === 'hyundai') return;
    mode = 'hyundai';
    stop();
    track.replaceChildren(...hyundaiImages.map(createHyundaiImage));
    reel.classList.remove('is-data-center', 'is-pleats');
    reel.classList.add('is-hyundai');
    void track.offsetHeight;
    if (!reducedMotion.matches && !mobileViewport.matches) requestAnimationFrame(advance);
  };

  const fillPleats = () => {
    if (mode === 'pleats') return;
    mode = 'pleats';
    stop();
    track.replaceChildren(...pleatsImages.map(createPleatsImage));
    reel.classList.remove('is-data-center', 'is-hyundai');
    reel.classList.add('is-pleats');
    void track.offsetHeight;
    if (!reducedMotion.matches && !mobileViewport.matches) requestAnimationFrame(advance);
  };

  const advance = () => {
    const firstImage = track.firstElementChild;
    if (!firstImage) return;
    const distance = firstImage.getBoundingClientRect().height + 20;
    track.style.transition = `transform ${Math.round(distance * 7)}ms linear`;
    track.style.transform = `translateY(-${distance}px)`;
  };

  track.addEventListener('transitionend', (event) => {
    if (event.propertyName !== 'transform') return;
    const firstImage = track.firstElementChild;
    track.style.transition = 'none';
    track.style.transform = 'translateY(0)';
    if (mode !== 'pulio') {
      if (firstImage) track.appendChild(firstImage);
    } else {
      firstImage?.remove();
      track.appendChild(createPulioImage());
    }
    void track.offsetHeight;
    if (!mobileViewport.matches) requestAnimationFrame(advance);
  });

  document.querySelectorAll('[data-project="DATA CENTER"]').forEach((project) => {
    project.addEventListener('mouseenter', fillDataCenter);
    project.addEventListener('focus', fillDataCenter);
  });

  document.querySelectorAll('[data-project="PULIO JAPAN TEAM"]').forEach((project) => {
    project.addEventListener('mouseenter', fillPulio);
    project.addEventListener('focus', fillPulio);
  });

  document.querySelectorAll('.hyundai-project-link').forEach((project) => {
    project.addEventListener('mouseenter', fillHyundai);
    project.addEventListener('focus', fillHyundai);
  });

  document.querySelectorAll('.pleats-project-link').forEach((project) => {
    project.addEventListener('mouseenter', fillPleats);
    project.addEventListener('focus', fillPleats);
  });

  fillPulio();
})();

const infoSections = document.querySelectorAll('.info-section');

infoSections.forEach((section) => {
  const trigger = section.querySelector('.info-trigger');
  let actionToken = 0;

  trigger.addEventListener('click', () => {
    actionToken += 1;
    const token = actionToken;
    const willOpen = !section.classList.contains('is-open');

    if (!willOpen) {
      section.classList.remove('is-open');
      trigger.setAttribute('aria-expanded', 'false');
      return;
    }

    section.classList.remove('is-open');
    trigger.setAttribute('aria-expanded', 'false');

    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        if (token !== actionToken) return;
        section.classList.add('is-open');
        trigger.setAttribute('aria-expanded', 'true');
      });
    });
  });
});

const observer = new IntersectionObserver((entries) => {
  entries.forEach((entry) => {
    if (entry.isIntersecting) {
      entry.target.classList.add('visible');
      observer.unobserve(entry.target);
    }
  });
}, { threshold: .1 });

document.querySelectorAll('.reveal').forEach((item) => observer.observe(item));

(() => {
  const cursor = document.createElement('div');
  cursor.className = 'interactive-cursor';
  cursor.setAttribute('aria-hidden', 'true');
  cursor.dataset.enabled = 'false';
  cursor.dataset.visible = 'false';
  cursor.dataset.interactive = 'false';
  cursor.dataset.pressed = 'false';
  cursor.innerHTML = '<span class="interactive-cursor__pulse"></span><span class="interactive-cursor__arrow"></span>';
  document.body.appendChild(cursor);

  const finePointer = window.matchMedia('(hover: hover) and (pointer: fine)');
  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
  const interactiveSelector = "a, button, input, select, textarea, summary, [role='button'], [data-cursor-interactive]";
  const position = { x: -100, y: -100 };
  const target = { x: -100, y: -100 };
  const ease = .28;
  let frameId = null;
  let listening = false;
  let hasPosition = false;
  let pulseTimer = null;

  const renderFrame = () => {
    position.x += (target.x - position.x) * ease;
    position.y += (target.y - position.y) * ease;
    cursor.style.transform = `translate3d(${position.x}px, ${position.y}px, 0)`;

    if (Math.abs(target.x - position.x) > .1 || Math.abs(target.y - position.y) > .1) {
      frameId = requestAnimationFrame(renderFrame);
    } else {
      position.x = target.x;
      position.y = target.y;
      cursor.style.transform = `translate3d(${position.x}px, ${position.y}px, 0)`;
      frameId = null;
    }
  };

  const requestRender = () => {
    if (frameId === null) frameId = requestAnimationFrame(renderFrame);
  };

  const onPointerMove = (event) => {
    if (event.pointerType !== 'mouse') return;
    target.x = event.clientX;
    target.y = event.clientY;
    if (!hasPosition) {
      position.x = target.x;
      position.y = target.y;
      hasPosition = true;
    }
    cursor.dataset.visible = 'true';
    requestRender();
  };

  const onPointerOver = (event) => {
    const element = event.target instanceof Element ? event.target : null;
    cursor.dataset.interactive = String(Boolean(element?.closest(interactiveSelector)));
  };

  const onPointerDown = (event) => {
    if (event.pointerType !== 'mouse') return;
    cursor.dataset.pressed = 'true';
    cursor.classList.remove('is-pulsing');
    void cursor.offsetWidth;
    cursor.classList.add('is-pulsing');
    clearTimeout(pulseTimer);
    pulseTimer = setTimeout(() => cursor.classList.remove('is-pulsing'), 320);
  };

  const onPointerUp = () => { cursor.dataset.pressed = 'false'; };
  const onPointerLeave = () => {
    cursor.dataset.visible = 'false';
    cursor.dataset.interactive = 'false';
    cursor.dataset.pressed = 'false';
  };

  const addEvents = () => {
    if (listening) return;
    window.addEventListener('pointermove', onPointerMove, { passive: true });
    window.addEventListener('pointerover', onPointerOver, { passive: true });
    window.addEventListener('pointerdown', onPointerDown, { passive: true });
    window.addEventListener('pointerup', onPointerUp, { passive: true });
    window.addEventListener('pointercancel', onPointerUp, { passive: true });
    document.documentElement.addEventListener('pointerleave', onPointerLeave);
    listening = true;
  };

  const removeEvents = () => {
    if (!listening) return;
    window.removeEventListener('pointermove', onPointerMove);
    window.removeEventListener('pointerover', onPointerOver);
    window.removeEventListener('pointerdown', onPointerDown);
    window.removeEventListener('pointerup', onPointerUp);
    window.removeEventListener('pointercancel', onPointerUp);
    document.documentElement.removeEventListener('pointerleave', onPointerLeave);
    listening = false;
  };

  const updateAvailability = () => {
    const enabled = finePointer.matches && !reducedMotion.matches;
    cursor.dataset.enabled = String(enabled);
    document.documentElement.classList.toggle('interactive-cursor-active', enabled);
    if (enabled) {
      addEvents();
    } else {
      removeEvents();
      if (frameId !== null) cancelAnimationFrame(frameId);
      frameId = null;
      cursor.dataset.visible = 'false';
    }
  };

  finePointer.addEventListener('change', updateAvailability);
  reducedMotion.addEventListener('change', updateAvailability);
  updateAvailability();
})();
