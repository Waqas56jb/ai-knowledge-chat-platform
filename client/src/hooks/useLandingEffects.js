import { useEffect } from 'react';
import { LP_HERO } from '../data/config';
/* Minimum hero-loader display time (a visual transition, not simulated latency). */
const wait = ms => new Promise(r => setTimeout(r, ms));

const LABELS = ['01 — Collect', '02 — Ask', '03 — Verify'];
const TYPED = ['Your sources point to two things. Write down your objective and walk-away point before the call ', '<span class="l-cn">1</span>', ', and link any discount above 10% to a longer contract or a smaller scope ', '<span class="l-cn">2</span>', '.'];

/**
 * All landing motion in one place: preloader, typed answer, nav/progress/parallax on scroll,
 * sticky steps, scroll reveals, counters, card spotlight, hero tilt, magnetic buttons and the custom cursor.
 * Any failure reveals the page at once (CSS also has a failsafe keyed on html.l-js-ok).
 */
export default function useLandingEffects(rootRef, { seen, markSeen }) {
  useEffect(() => {
    const root = rootRef.current; if (!root) return undefined;
    const $ = s => root.querySelector(s), $$ = s => [...root.querySelectorAll(s)];
    const B = document.body, offs = [];
    const on = (el, ev, fn, o) => { if (!el) return; el.addEventListener(ev, fn, o); offs.push(() => el.removeEventListener(ev, fn, o)); };
    const timers = [];
    const later = (fn, ms) => timers.push(setTimeout(fn, ms));
    let alive = true, raf = 0, io = null;

    const forceReady = () => {
      const ld = $('#l-loader'); ld && ld.classList.add('l-done'); // hidden, not removed: React owns the node
      B.classList.remove('l-loading'); B.classList.add('l-ready');
      $$('.l-rv, .l-rv-img').forEach(el => el.classList.add('l-in'));
      $$('#l-hcard .l-cite').forEach(c => c.classList.add('l-on'));
      markSeen();
    };

    try {
      const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
      const fine = matchMedia('(hover: hover) and (pointer: fine)').matches;

      /* typed answer in the hero card */
      const typeAnswer = () => {
        const el = $('#l-typed'); if (!el) return;
        const cites = $$('#l-hcard .l-cite');
        if (reduce) { el.innerHTML = TYPED.join(''); cites.forEach(c => c.classList.add('l-on')); return; }
        let html = '', pi = 0, ci = 0;
        const tick = () => {
          if (!alive) return;
          if (pi >= TYPED.length) { el.innerHTML = html; cites.forEach((c, i) => later(() => c.classList.add('l-on'), 200 + i * 220)); return; }
          const p = TYPED[pi];
          if (p.startsWith('<')) { html += p; pi++; } else { html += p[ci++]; if (ci >= p.length) { pi++; ci = 0; } }
          el.innerHTML = html + '<span class="l-caret"></span>';
          later(tick, 14 + Math.random() * 22);
        };
        tick();
      };

      /* preloader only on the first landing visit of the session */
      let started = false;
      const start = () => {
        if (started || !alive) return; started = true; markSeen();
        const ld = $('#l-loader'); if (ld) ld.classList.add('l-done');
        B.classList.remove('l-loading'); B.classList.add('l-ready');
        later(typeAnswer, reduce || seen ? 300 : 1300);
      };
      if (seen) start();
      else {
        B.classList.add('l-loading');
        const img = new Image(); img.src = LP_HERO;
        Promise.all([wait(reduce ? 0 : 1700), new Promise(r => { img.onload = img.onerror = r; })]).then(start);
        later(start, 3500);
      }

      /* scroll: nav state, progress, parallax, sticky steps */
      const nav = $('#l-nav'), prog = $('#l-progress'), heroBg = $('#l-heroBg'), bandBg = $('#l-bandBg'), band = $('.l-band');
      const steps = $$('.l-step'), imgs = $$('#l-howMedia img'), lbl = $('#l-howLbl'), fill = $('#l-stepFill'), stepsBox = $('#l-steps');
      let cur = 0, lastY = 0, ticking = false;
      const updateSteps = () => {
        const mid = innerHeight * 0.55; let idx = 0;
        steps.forEach((s, i) => { if (s.getBoundingClientRect().top < mid) idx = i; });
        if (idx !== cur) { cur = idx; steps.forEach((s, i) => s.classList.toggle('l-on', i <= idx)); imgs.forEach((im, i) => im.classList.toggle('l-on', i === idx)); lbl.textContent = LABELS[idx]; }
        const r = stepsBox.getBoundingClientRect();
        fill.style.height = `${Math.max(0, Math.min(1, (mid - r.top) / (r.height - 40))) * (r.height - 20)}px`;
      };
      const onScroll = () => {
        ticking = false; if (!alive) return;
        const y = scrollY, h = document.documentElement.scrollHeight - innerHeight;
        nav.classList.toggle('l-scrolled', y > 30);
        nav.classList.toggle('l-hide', y > lastY && y > 600 && !B.classList.contains('l-menu-open'));
        lastY = y;
        prog.style.transform = `scaleX(${h > 0 ? y / h : 0})`;
        if (!reduce) {
          if (y < innerHeight * 1.2) heroBg.style.translate = `0 ${y * 0.25}px`;
          const r = band.getBoundingClientRect();
          if (r.bottom > 0 && r.top < innerHeight) bandBg.style.transform = `translate3d(0,${(r.top + r.height / 2 - innerHeight / 2) * -0.18}px,0)`;
        }
        updateSteps();
      };
      on(window, 'scroll', () => { if (!ticking) { ticking = true; requestAnimationFrame(onScroll); } }, { passive: true });
      on(window, 'resize', onScroll);

      /* reveal + counters */
      const countUp = el => {
        const end = +el.dataset.count, t0 = performance.now();
        if (reduce || end === 0) { el.textContent = end; return; }
        const step = t => { if (!alive) return; const k = Math.min(1, (t - t0) / 1600); el.textContent = Math.round(end * (1 - Math.pow(1 - k, 4))); if (k < 1) requestAnimationFrame(step); };
        requestAnimationFrame(step);
      };
      if ('IntersectionObserver' in window) {
        io = new IntersectionObserver(es => es.forEach(e => {
          if (!e.isIntersecting) return;
          e.target.classList.add('l-in');
          later(() => { e.target.style.transitionDelay = '0s'; }, 1600); // stagger only on entry, not on hover
          e.target.querySelectorAll('[data-count]').forEach(countUp);
          io.unobserve(e.target);
        }), { threshold: 0.15, rootMargin: '0px 0px -8% 0px' });
        $$('.l-rv, .l-rv-img').forEach(el => io.observe(el));
      } else { $$('.l-rv, .l-rv-img').forEach(el => el.classList.add('l-in')); $$('[data-count]').forEach(countUp); }

      /* card spotlight */
      $$('.l-card').forEach(c => on(c, 'pointermove', e => { const r = c.getBoundingClientRect(); c.style.setProperty('--mx', `${e.clientX - r.left}px`); c.style.setProperty('--my', `${e.clientY - r.top}px`); }));

      if (fine && !reduce) {
        const hc = $('#l-hcard'), hero = $('.l-hero');
        on(hero, 'pointermove', e => { const x = e.clientX / innerWidth - 0.5, y = e.clientY / innerHeight - 0.5; hc.style.transform = `perspective(1200px) rotateY(${x * 8}deg) rotateX(${-y * 8}deg)`; heroBg.style.backgroundPosition = `calc(50% + ${x * -24}px) calc(60% + ${y * -16}px)`; });
        on(hero, 'pointerleave', () => { hc.style.transform = ''; });
        $$('.l-magnetic').forEach(b => {
          on(b, 'pointermove', e => { const r = b.getBoundingClientRect(); b.style.transform = `translate(${(e.clientX - r.left - r.width / 2) * 0.22}px,${(e.clientY - r.top - r.height / 2) * 0.3}px)`; });
          on(b, 'pointerleave', () => { b.style.transform = ''; });
        });
        const dot = $('.l-cursor'), ring = $('.l-cursor-ring');
        let mx = -100, my = -100, rx = -100, ry = -100;
        on(window, 'pointermove', e => { mx = e.clientX; my = e.clientY; dot.style.transform = `translate3d(${mx}px,${my}px,0)`; });
        const loop = () => { rx += (mx - rx) * 0.16; ry += (my - ry) * 0.16; ring.style.transform = `translate3d(${rx}px,${ry}px,0)`; raf = requestAnimationFrame(loop); };
        loop();
        on(document, 'pointerover', e => ring.classList.toggle('l-hot', !!e.target.closest('a,button,.l-card,.l-src')));
      }

      onScroll();
    } catch (e) {
      console.error('Landing intro failed, showing page without it:', e);
      forceReady();
    }
    document.documentElement.classList.add('l-js-ok');

    return () => {
      alive = false; offs.forEach(f => f()); timers.forEach(clearTimeout); io && io.disconnect(); cancelAnimationFrame(raf);
      B.classList.remove('l-loading', 'l-ready', 'l-menu-open'); B.style.overflow = '';
    };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps
}
