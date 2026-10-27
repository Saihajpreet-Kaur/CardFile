

const $ = (selector, root = document) => root.querySelector(selector);
const $$ = (selector, root = document) => [...root.querySelectorAll(selector)];

const reduceMotion = matchMedia('(prefers-reduced-motion: reduce)').matches;
const finePointer = matchMedia('(pointer: fine)').matches;
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

const THEME_KEY = 'cardfile-theme'; // shared with the app 
const TOKEN_KEY = 'crm_token'; // shared with the app 

function readStorage(key) {
  try {
    return localStorage.getItem(key);
  } catch {
    return null;
  }
}


const signedIn = Boolean(readStorage(TOKEN_KEY));
for (const element of $$('[data-when="guest"]')) element.classList.toggle('hidden', signedIn);
for (const element of $$('[data-when="user"]')) element.classList.toggle('hidden', !signedIn);


$('[data-theme-toggle]').addEventListener('click', () => {
  const dark = document.documentElement.classList.toggle('dark');
  try {
    localStorage.setItem(THEME_KEY, dark ? 'dark' : 'light');
  } catch {
  }
});

const menuButton = $('[data-menu-toggle]');
const mobileMenu = $('[data-mobile-menu]');
const setMenu = (open) => {
  mobileMenu.classList.toggle('hidden', !open);
  menuButton.setAttribute('aria-expanded', String(open));
};
menuButton.addEventListener('click', () => setMenu(mobileMenu.classList.contains('hidden')));
mobileMenu.addEventListener('click', (event) => {
  if (event.target.closest('a')) setMenu(false);
});

const header = $('[data-header]');
const progress = $('[data-progress]');
const floatingCta = $('[data-floating-cta]');
const hero = $('#top');
const ctaSection = $('[data-cta]');
let scrollQueued = false;

function onScroll() {
  scrollQueued = false;
  const y = window.scrollY;
  const maxScroll = document.documentElement.scrollHeight - window.innerHeight;

  header.toggleAttribute('data-scrolled', y > 8);
  progress.style.transform = `scaleX(${maxScroll > 0 ? y / maxScroll : 0})`;

  const pastHero = y > hero.offsetHeight - 120;
  const ctaInView = ctaSection.getBoundingClientRect().top < window.innerHeight - 80;
  floatingCta.toggleAttribute('data-show', pastHero && !ctaInView);
}

window.addEventListener(
  'scroll',
  () => {
    if (scrollQueued) return;
    scrollQueued = true;
    requestAnimationFrame(onScroll);
  },
  { passive: true },
);
onScroll();


const whenVisible = new Map();
const observer =
  'IntersectionObserver' in window
    ? new IntersectionObserver(
        (entries) => {
          for (const entry of entries) {
            if (!entry.isIntersecting) continue;
            observer.unobserve(entry.target);
            whenVisible.get(entry.target)?.();
          }
        },
        { threshold: 0.18, rootMargin: '0px 0px -40px 0px' },
      )
    : null;

function onVisible(element, callback) {
  if (!observer) return callback();
  whenVisible.set(element, callback);
  observer.observe(element);
}

for (const element of $$('.reveal')) {
  onVisible(element, () => element.classList.add('is-visible'));
}

const formatNumber = (value) => value.toLocaleString('en-IN');

function countUp(element) {
  const target = Number(element.dataset.countTo);
  if (reduceMotion || target === 0) {
    element.textContent = formatNumber(target);
    return;
  }
  const duration = 1400;
  const start = performance.now();
  const tick = (now) => {
    const progressRatio = Math.min((now - start) / duration, 1);
    const eased = 1 - (1 - progressRatio) ** 3;
    element.textContent = formatNumber(Math.round(target * eased));
    if (progressRatio < 1) requestAnimationFrame(tick);
  };
  requestAnimationFrame(tick);
}

for (const element of $$('[data-count-to]')) {
  if (!reduceMotion) element.textContent = '0';
  onVisible(element, () => countUp(element));
}


const stage = $('[data-stage]');

if (stage && finePointer && !reduceMotion) {
  const layers = $$('[data-depth]', stage);
  let frame = 0;

  const move = (x, y) => {
    cancelAnimationFrame(frame);
    frame = requestAnimationFrame(() => {
      stage.style.setProperty('--tilt-x', `${(-y * 7).toFixed(2)}deg`);
      stage.style.setProperty('--tilt-y', `${(x * 9).toFixed(2)}deg`);
      for (const layer of layers) {
        const depth = Number(layer.dataset.depth);
        layer.style.translate = `${(x * depth * 36).toFixed(1)}px ${(y * depth * 36).toFixed(1)}px`;
      }
    });
  };

  hero.addEventListener('pointermove', (event) => {
    const rect = stage.getBoundingClientRect();
    const x = Math.max(-1, Math.min(1, (event.clientX - rect.left) / rect.width - 0.5));
    const y = Math.max(-1, Math.min(1, (event.clientY - rect.top) / rect.height - 0.5));
    move(x, y);
  });
  hero.addEventListener('pointerleave', () => move(0, 0));
}


const SEARCHES = [
  { term: 'Meera', initials: 'MI', name: 'Meera Iyer', meta: 'Stellar Edu · Recruiter' },
  { term: 'infosys', initials: 'KS', name: 'Karan Shah', meta: 'Infosys · Engineering Manager' },
  { term: '#vip', initials: 'AR', name: 'Arjun Reddy', meta: 'Flipkart · Sales Head' },
  { term: '98765', initials: 'SJ', name: 'Saanvi Joshi', meta: "+91 98765 00010 · BYJU'S" },
];

async function runTypingDemo() {
  const typed = $('[data-typing]');
  const result = $('[data-search-result]');
  if (!typed || !result) return;

  const show = ({ initials, name, meta }) => {
    $('[data-result-initials]', result).textContent = initials;
    $('[data-result-name]', result).textContent = name;
    $('[data-result-meta]', result).textContent = meta;
    result.removeAttribute('data-hidden');
  };

  await sleep(2600);
  for (let index = 1; ; index = (index + 1) % SEARCHES.length) {
    result.setAttribute('data-hidden', '');
    for (let length = typed.textContent.length; length > 0; length -= 1) {
      typed.textContent = typed.textContent.slice(0, -1);
      await sleep(45);
    }
    await sleep(350);

    const search = SEARCHES[index];
    for (const char of search.term) {
      typed.textContent += char;
      await sleep(110 + Math.random() * 70);
    }
    await sleep(250);
    show(search);
    await sleep(2400);
  }
}

if (!reduceMotion) runTypingDemo();


$('[data-spotlight]')?.addEventListener('pointermove', (event) => {
  const card = event.target.closest('.feature');
  if (!card) return;
  const rect = card.getBoundingClientRect();
  card.style.setProperty('--x', `${event.clientX - rect.left}px`);
  card.style.setProperty('--y', `${event.clientY - rect.top}px`);
});


const apiStatus = $('[data-api-status]');

function formatUptime(seconds) {
  if (seconds < 60) return `${seconds}s`;
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m`;
  return `${Math.floor(seconds / 3600)}h ${Math.floor((seconds % 3600) / 60)}m`;
}

async function checkApi() {
  const started = performance.now();
  try {
    const response = await fetch('/api/health', { cache: 'no-store' });
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    const { data } = await response.json();
    const ms = Math.max(1, Math.round(performance.now() - started));
    apiStatus.dataset.state = 'up';
    $('[data-api-text]', apiStatus).textContent = `API online · ${ms} ms · up ${formatUptime(data.uptimeSeconds)}`;
  } catch {
    apiStatus.dataset.state = 'down';
    $('[data-api-text]', apiStatus).textContent = 'API offline';
  }
}

checkApi();
setInterval(() => {
  if (document.visibilityState === 'visible') checkApi();
}, 60_000);
