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

const infoSections = document.querySelectorAll('.info-section');

document.querySelectorAll('.project[data-project="PLEATS MAMA"]').forEach((project) => project.remove());

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
