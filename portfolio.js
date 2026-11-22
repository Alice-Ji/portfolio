const filters = [...document.querySelectorAll('[data-filter]')];
const projects = [...document.querySelectorAll('.project[data-kind]')];
const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
const portrait = document.querySelector('.hero-portrait');
if (portrait) {
  portrait.addEventListener('pointermove', event => {
    if (event.pointerType !== 'mouse' || reduceMotion.matches) return;
    const bounds = portrait.getBoundingClientRect();
    const x = Math.max(0, Math.min(1, (event.clientX - bounds.left) / bounds.width));
    const y = Math.max(0, Math.min(1, (event.clientY - bounds.top) / bounds.height));
    portrait.style.setProperty('--portrait-tilt', `${(x - 0.5) * 22}deg`);
    portrait.style.setProperty('--light-x', `${x * 100}%`);
    portrait.style.setProperty('--light-y', `${y * 100}%`);
  });
}
if (projects.length && 'IntersectionObserver' in window) {
  const reveal = new IntersectionObserver(entries => {
    for (const entry of entries) {
      if (!entry.isIntersecting || entry.target.hidden) continue;
      const card = entry.target;
      reveal.unobserve(card);
      if (reduceMotion.matches || card.matches(':focus-within')) continue;
      card.animate(
        [{ opacity: 0, translate: '0 22px' }, { opacity: 1, translate: '0 0' }],
        { duration: 540, easing: 'cubic-bezier(.2,.75,.25,1)' },
      );
    }
  });
  projects.forEach(card => reveal.observe(card));
}

function applyFilter(filter) {
  for (const option of filters) option.setAttribute('aria-pressed', String(option.dataset.filter === filter));
  for (const project of projects) project.hidden = filter !== 'all' && project.dataset.kind !== filter;
  const count = projects.filter(project => !project.hidden).length;
  document.querySelector('#filter-status').textContent = count + ' projects shown';
}

function isRegularClick(event) {
  return event.button === 0 && !event.defaultPrevented &&
    !event.altKey && !event.ctrlKey && !event.metaKey && !event.shiftKey;
}

let filterAnimation;
for (const button of filters) {
  button.addEventListener('click', () => {
    if (button.getAttribute('aria-pressed') === 'true') return;
    applyFilter(button.dataset.filter);
    filterAnimation?.cancel();
    if (!reduceMotion.matches) {
      filterAnimation = projects[0].parentElement.animate(
        [{ opacity: 0.72, transform: 'translateY(6px)' }, { opacity: 1, transform: 'translateY(0)' }],
        { duration: 240, easing: 'cubic-bezier(.2,.75,.25,1)' },
      );
    }
  });
}

const returnKey = 'alice-ji-portfolio-return';
if (projects.length) {
  document.querySelector('#project-grid').addEventListener('click', event => {
    const card = event.target.closest('.project');
    if (!card || !isRegularClick(event)) return;
    const filter = filters.find(option => option.getAttribute('aria-pressed') === 'true')?.dataset.filter;
    const saved = { filter, scrollY: window.scrollY, project: new URL(card.href).pathname };
    history.replaceState({ ...history.state, portfolioReturn: saved }, '');
    try {
      sessionStorage.setItem(returnKey, JSON.stringify(saved));
    } catch {
      // Browser history can still restore the homepage when storage is unavailable.
    }
  });

  window.addEventListener('pageshow', event => {
    const returned = event.persisted || performance.getEntriesByType('navigation')[0]?.type === 'back_forward';
    let saved = returned ? history.state?.portfolioReturn : null;
    try {
      const pending = JSON.parse(sessionStorage.getItem(returnKey));
      if (pending?.returning) {
        saved = pending;
        sessionStorage.removeItem(returnKey);
      }
    } catch {
      // Fall back to the saved history entry.
    }
    if (!saved) return;
    if (filters.some(option => option.dataset.filter === saved.filter)) applyFilter(saved.filter);
    requestAnimationFrame(() => window.scrollTo({ top: saved.scrollY, behavior: 'instant' }));
  });
}

const backButton = document.querySelector('.back-button');
if (backButton && document.referrer) {
  const home = new URL(backButton.href);
  const previous = new URL(document.referrer);
  const homepagePath = url => url.pathname.replace(/\/index(?:\.html)?$/, '/');
  const isHomepage = url => url.origin === home.origin && homepagePath(url) === homepagePath(home);
  if (isHomepage(previous)) {
    const arrivalHistoryLength = history.length;
    backButton.addEventListener('click', event => {
      if (!isRegularClick(event) || history.length < 2) return;
      const navigation = window.navigation;
      const previousHome = navigation?.entries().slice(0, navigation.currentEntry.index)
        .findLast(entry => entry.url && isHomepage(new URL(entry.url)));
      try {
        const saved = JSON.parse(sessionStorage.getItem(returnKey));
        const projectPath = path => path.replace(/\.html$/, '');
        if (saved && projectPath(saved.project) === projectPath(location.pathname)) {
          sessionStorage.setItem(returnKey, JSON.stringify({ ...saved, returning: true }));
        }
      } catch {
        // The native back action also works without session storage.
      }
      event.preventDefault();
      if (previousHome) {
        history.go(previousHome.index - navigation.currentEntry.index);
      } else {
        history.go(-1 - Math.max(0, history.length - arrivalHistoryLength));
      }
    });
  }
}

const slideshow = document.querySelector('.case-slideshow');
if (slideshow) {
  const track = slideshow.querySelector('.slideshow-track');
  const slides = [...track.children];
  let current = 0;
  function moveSlide(offset) {
    current = (current + offset + slides.length) % slides.length;
    track.style.transform = `translateX(-${current * 100}%)`;
    slides.forEach((slide, index) => slide.setAttribute('aria-hidden', String(index !== current)));
    slideshow.querySelector('.slide-status').textContent = `Slide ${current + 1} of ${slides.length}`;
  }
  slideshow.querySelector('.slide-prev').addEventListener('click', () => moveSlide(-1));
  slideshow.querySelector('.slide-next').addEventListener('click', () => moveSlide(1));
  const pause = slideshow.querySelector('.slide-toggle');
  const viewport = slideshow.querySelector('.slideshow-viewport');
  let swipeStart;
  viewport.addEventListener('pointerdown', event => {
    if (event.isPrimary && event.pointerType === 'touch') {
      swipeStart = { x: event.clientX, y: event.clientY };
    }
  });
  viewport.addEventListener('pointerup', event => {
    if (!event.isPrimary || !swipeStart) return;
    const dx = event.clientX - swipeStart.x;
    const dy = event.clientY - swipeStart.y;
    swipeStart = undefined;
    if (Math.abs(dx) >= 40 && Math.abs(dx) > Math.abs(dy)) {
      moveSlide(dx < 0 ? 1 : -1);
      updateAutoplay();
    }
  });
  viewport.addEventListener('pointercancel', () => { swipeStart = undefined; });
  let paused = reduceMotion.matches;
  let timer;
  function updateAutoplay() {
    clearInterval(timer);
    pause.setAttribute('aria-pressed', String(paused));
    pause.textContent = paused ? 'Resume autoplay' : 'Pause autoplay';
    if (!paused && !slideshow.matches(':hover, :focus-within') && !document.hidden) {
      timer = setInterval(() => moveSlide(1), 3000);
    }
  }
  pause.addEventListener('click', () => {
    paused = !paused;
    updateAutoplay();
  });
  for (const event of ['mouseenter', 'mouseleave', 'focusin', 'focusout']) {
    slideshow.addEventListener(event, () => setTimeout(updateAutoplay, 0));
  }
  document.addEventListener('visibilitychange', updateAutoplay);
  moveSlide(0);
  updateAutoplay();
}
