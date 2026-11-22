import '@fontsource-variable/noto-sans-sc';
import '@fontsource/barlow-condensed/600.css';
import '@fontsource/barlow-condensed/700.css';
import './styles/tokens.css';
import './styles/base.css';
import './styles/hero.css';
import './styles/sections.css';
import './styles/extra.css';

import { buildModel } from './model';
import { GLYPHS, HEI, NUM } from './data/schedule';
import { parseNow } from './lib/time';
import { installEaseVars, beatOf, DRAWING, clamp } from './lib/ease';
import { Ambient } from './fx/ribbons';
import { runSplash } from './fx/splash';
import { Transitions, type TrKind } from './fx/transitions';
import { createHero } from './sections/hero';
import { createNext } from './sections/next';
import { createTrack } from './sections/track';
import { createLyric } from './sections/lyric';
import { createExams } from './sections/exams';
import { createOutro } from './sections/outro';
import { createScroll } from './ui/scroll';
import { OX_COLUMN, CIRCUIT, CHAIN, h } from './ui/dom';

installEaseVars();
const rootStyle = document.documentElement.style;
rootStyle.setProperty('--ox', OX_COLUMN);
rootStyle.setProperty('--circuit', CIRCUIT);
rootStyle.setProperty('--chain', CHAIN);

const params = new URLSearchParams(location.search);
const offset = (parseNow(params.get('now')) ?? Date.now()) - Date.now();
const clock = () => Date.now() + offset;
const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
const skipSplash = params.has('skip') || reduced;

let model = buildModel(clock());

// ---- 页面 ----
const app = document.getElementById('app')!;
const hero = createHero(model);
const next = createNext(model);
const track = createTrack(model);
const lyric = createLyric(model);
const exams = createExams(model);
const outro = createOutro(model);
const chainDiv = () => { const d = h('div', 'chain-div'); d.setAttribute('aria-hidden', 'true'); return d; };
app.append(hero.el, chainDiv(), next.el, track.el, lyric.el, exams.el, chainDiv(), outro.el);

const io = new IntersectionObserver(
  (es) => es.forEach((e) => { if (e.isIntersecting) { e.target.classList.add('in'); io.unobserve(e.target); } }),
  { threshold: 0.18, rootMargin: '0px 0px -8% 0px' },
);
const observeReveals = () => document.querySelectorAll('[data-reveal]:not(.in)').forEach((n) => io.observe(n));
observeReveals();

// ---- 全页环境丝带：back 画布在内容之下（被卡片遮住 = 钻过去），front 画布在内容之上 ----
const fxBack = document.getElementById('fx-back') as HTMLCanvasElement;
const fxFront = document.getElementById('fx') as HTMLCanvasElement;
const bctx = fxBack.getContext('2d')!;
const fctx = fxFront.getContext('2d')!;
const mobile = () => window.innerWidth < 760;
const page = new Ambient({
  seed: 23, streamers: [1.6, 3.4], maxStreamers: mobile() ? 3 : 5, stripes: null,
  shardRate: mobile() ? 3 : 6, sparkleRate: mobile() ? 1.2 : 2.4,
});
let fxDpr = 1;
function sizeFx(): void {
  fxDpr = Math.min(2, window.devicePixelRatio || 1);
  for (const c of [fxBack, fxFront]) {
    c.width = Math.round(window.innerWidth * fxDpr);
    c.height = Math.round(window.innerHeight * fxDpr);
    c.style.width = `${window.innerWidth}px`;
    c.style.height = `${window.innerHeight}px`;
  }
  page.resize(window.innerWidth, window.innerHeight);
}

let splashing = true;
function resizeAll(): void {
  hero.resize();
  track.resize();
  if (!splashing) sizeFx();
}
let rz = 0;
window.addEventListener('resize', () => { cancelAnimationFrame(rz); rz = requestAnimationFrame(resizeAll); });

// ---- 段落转场 ----
const trans = new Transitions();
let pageT0 = 0;
const pageTime = () => beatOf(performance.now() - pageT0) * DRAWING;
const trIO = new IntersectionObserver(
  (es) => es.forEach((e) => {
    if (!e.isIntersecting || splashing || reduced) return;
    if (e.intersectionRect.height < window.innerHeight * 0.35 && e.intersectionRatio < 0.3) return;
    const el = e.target as HTMLElement;
    trans.play(el, el.dataset.tr as TrKind, el.dataset.trg ?? '', pageTime());
    trIO.unobserve(el);
  }),
  { threshold: [0.1, 0.2, 0.3, 0.4, 0.6] },
);
document.querySelectorAll<HTMLElement>('[data-tr]').forEach((n) => trIO.observe(n));

// ---- 主循环 ----
const scroll = createScroll();
let last = performance.now();
let lastSec = -1;
let lastBeat = -1;
let backDirty = false, frontDirty = false;

function loop(now: number): void {
  const dt = Math.min(0.05, (now - last) / 1000);
  last = now;
  scroll.update(dt);

  const sec = Math.floor(clock() / 1000);
  if (sec !== lastSec) {
    lastSec = sec;
    model = buildModel(clock());
    hero.update(model); next.update(model); track.update(model); lyric.update(model); exams.update(model); outro.update(model);
    observeReveals();
  }

  hero.tick(now, dt, scroll);
  track.tick(dt, scroll);
  exams.tick();

  if (!splashing) {
    const beat = beatOf(now - pageT0);
    if (beat !== lastBeat) {
      lastBeat = beat;
      const t = beat * DRAWING;
      const W = window.innerWidth, H = window.innerHeight;
      lyric.tick(beat);
      page.update(t);
      // 首屏由标题层自己画丝带；离开首屏后全页丝带按拍出现
      const vis = clamp((scroll.y - H * 0.55) / (H * 0.3));
      const alpha = Math.round(vis * 4) / 4;

      if (alpha > 0 || backDirty) {
        bctx.setTransform(1, 0, 0, 1, 0, 0);
        bctx.clearRect(0, 0, fxBack.width, fxBack.height);
        if (alpha > 0) {
          bctx.setTransform(fxDpr, 0, 0, fxDpr, 0, 0);
          bctx.globalAlpha = alpha;
          page.drawStreamers(bctx, t, 'back');
          bctx.globalAlpha = 1;
        }
        backDirty = alpha > 0;
      }
      if (alpha > 0 || trans.active || frontDirty) {
        fctx.setTransform(1, 0, 0, 1, 0, 0);
        fctx.clearRect(0, 0, fxFront.width, fxFront.height);
        fctx.setTransform(fxDpr, 0, 0, fxDpr, 0, 0);
        if (alpha > 0) {
          fctx.globalAlpha = alpha;
          page.drawStreamers(fctx, t, 'front');
          page.drawShards(fctx, t);
          fctx.globalAlpha = 1;
        }
        trans.draw(fctx, t, W, H);
        frontDirty = alpha > 0 || trans.active;
      }
    }
  }
  requestAnimationFrame(loop);
}

// ---- 启动 ----
async function boot(): Promise<void> {
  const wait = (ms: number) => new Promise((r) => setTimeout(r, ms));
  await Promise.race([
    Promise.all([
      document.fonts.load(`900 64px ${HEI}`, GLYPHS),
      document.fonts.load(`700 64px ${HEI}`, GLYPHS),
      document.fonts.load(`700 64px ${NUM}`, '0123456789No.:—WEDATHX'),
    ]).then(() => document.fonts.ready),
    wait(3500),
  ]);
  resizeAll();
  requestAnimationFrame(loop);

  const reveal = () => {
    document.body.classList.remove('is-splash');
    document.body.classList.add('is-ready');
    hero.intro();
  };
  const done = () => {
    splashing = false;
    sizeFx();
    pageT0 = performance.now();
    page.prime(0, mobile() ? 1 : 2);
  };

  if (skipSplash) { reveal(); done(); return; }
  fxFront.width = fxFront.width; // 清空
  document.body.classList.add('is-playing');
  runSplash({
    canvas: fxFront,
    info: { subject: model.next.subject, no: model.next.no, days: model.left.d, hours: model.left.h, now: model.now },
    onReveal: reveal,
    onDone: done,
  });
}
boot();
