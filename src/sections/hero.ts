// 首屏：左下大字标题（丝带穿插、笔画内色条）+ 每秒闪回一个画面的切角窗口（棱镜闪光切换）+ 两条穿插滚动的色带
// 所有自主动画按三拍一出画；只有跟随滚动的视差保持连续
import type { Model } from '../model';
import { SCHOOL, TRAINING } from '../data/schedule';
import { pad, fmtShort, cnNum } from '../lib/time';
import { approach, outExpo, range, clamp, DRAWING, beatOf } from '../lib/ease';
import { drawFrame, FRAME_KINDS, FRAME_LABEL, type FrameInfo } from '../fx/frames';
import { prismFlash, flashEnv } from '../fx/flash';
import { Ambient } from '../fx/ribbons';
import { mountTitle, type TitleLayer } from '../fx/title';
import { HeroLight } from '../fx/light';
import { h } from '../ui/dom';
import type { ScrollState } from '../ui/scroll';

export interface Hero {
  el: HTMLElement;
  title: TitleLayer;
  intro(): void;
  update(m: Model): void;
  tick(now: number, dt: number, sc: ScrollState): void;
  resize(): void;
}

const ITEM = {
  o: '<i class="bi bi-o"></i>',
  x: '<i class="bi bi-x"></i>',
  coin: '<i class="bi bi-coin"></i>',
  t: (s: string) => `<span class="bi-t">${s}</span>`,
  n: (s: string) => `<span class="bi-n">${s}</span>`,
  dot: '<i class="bi bi-dot"></i><i class="bi bi-dot"></i><i class="bi bi-dot s"></i>',
};

function bandUnit(kind: 'a' | 'b', m: Model): string {
  const s = m.next;
  if (kind === 'a')
    return [ITEM.o, ITEM.x, ITEM.coin, ITEM.coin, ITEM.t(TRAINING.name), ITEM.dot, ITEM.n(`No.${pad(s.no)}`), ITEM.t(s.subject),
      ITEM.x, ITEM.o, ITEM.n(`${fmtShort(s.start)} WED 14:35`), ITEM.coin, ITEM.t('限时九十分钟'), ITEM.dot].join('');
  return [ITEM.t(SCHOOL.full), ITEM.o, ITEM.x, ITEM.o, ITEM.n('DEATH · TRAINING'), ITEM.coin, ITEM.coin, ITEM.coin,
    ITEM.t(`第${cnNum(s.round)}轮 ${s.pos}/6`), ITEM.dot, ITEM.x, ITEM.o].join('');
}

export function createHero(m0: Model): Hero {
  const el = h('section', 'hero');
  el.id = 'top';

  // 光感层：超大字遮罩 + 月亮 + 光斑 + 城市剪影
  const light = new HeroLight();
  el.appendChild(light.canvas);

  // 闪回窗口
  const fw = h('div', 'fw cut');
  const fcv = document.createElement('canvas');
  fw.appendChild(fcv);
  const fcap = h('div', 'fw-cap', '<span class="k">FLASHBACK</span><span class="i">01/08</span><span class="l">字形</span>');
  el.append(fw, fcap);

  // 色带
  const bands = (['a', 'b'] as const).map((k) => {
    const b = h('div', `band band-${k}`);
    const tr = h('div', 'band-track');
    b.appendChild(tr);
    el.appendChild(b);
    return { tr, k, off: 0, half: 0, base: k === 'a' ? 70 : -52, boost: 0 };
  });

  // 标题占位（透明 DOM，负责布局与无障碍；字形由 canvas 绘制）
  const ht = h('div', 'ht');
  ht.innerHTML = `
    <div class="ht-line l0" data-glyph><span>${SCHOOL.full}</span></div>
    <div class="ht-line l1" data-glyph><span>死亡</span></div>
    <div class="ht-line l2" data-glyph><span>限时训练</span></div>`;
  ht.setAttribute('role', 'heading');
  ht.setAttribute('aria-level', '1');
  ht.setAttribute('aria-label', `${SCHOOL.full} 死亡限时训练`);
  el.appendChild(ht);
  const meta = h('div', 'ht-meta');
  el.appendChild(meta);

  const cue = h('a', 'cue', '<span class="cue-t">向下滚动 · 倒计时</span><i class="cue-l"></i>');
  cue.setAttribute('href', '#next');
  el.appendChild(cue);

  const title = mountTitle(el, ht);
  const amb = new Ambient({ seed: 7, streamers: [0.9, 2.2], maxStreamers: 6, stripes: [0.35, 1.1], shardRate: 7, sparkleRate: 4 });

  // ---- 闪回 ----
  const buf = document.createElement('canvas');
  const fctx = fcv.getContext('2d')!;
  const bctx = buf.getContext('2d')!;
  let fwW = 0, fwH = 0, dpr = 1;
  let kindIdx = FRAME_KINDS.length - 1;
  let cutT = -99;
  let cutCount = 0;
  let info: FrameInfo = toInfo(m0);
  let visible = true;
  let started = false;
  let t0 = 0;
  let lastBeat = -1;

  function toInfo(m: Model): FrameInfo {
    return { subject: m.next.subject, no: m.next.no, days: m.left.d, hours: m.left.h, now: m.now };
  }
  function sizeFrames(): void {
    dpr = Math.min(2, window.devicePixelRatio || 1);
    fwW = fw.clientWidth; fwH = fw.clientHeight;
    for (const c of [fcv, buf]) { c.width = Math.max(1, Math.round(fwW * dpr)); c.height = Math.max(1, Math.round(fwH * dpr)); }
    bctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    drawFrame(bctx, fwW, fwH, FRAME_KINDS[kindIdx], info, cutCount + 3);
    light.setFrame(buf);
  }
  function cut(t: number): void {
    kindIdx = (kindIdx + 1) % FRAME_KINDS.length;
    cutCount++;
    cutT = t;
    bctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    drawFrame(bctx, fwW, fwH, FRAME_KINDS[kindIdx], info, cutCount + 3);
    light.setFrame(buf);
    fcap.querySelector('.i')!.textContent = `${pad(kindIdx + 1)}/${pad(FRAME_KINDS.length)}`;
    fcap.querySelector('.l')!.textContent = FRAME_LABEL[FRAME_KINDS[kindIdx]];
    if (cutCount % 2 === 0) title.glitch(t);
  }
  function drawReel(t: number): void {
    const a = t - cutT;
    const z = 1.09 - 0.09 * outExpo(range(a, 0, 0.75));
    fctx.setTransform(1, 0, 0, 1, 0, 0);
    const w = fcv.width, hh = fcv.height;
    fctx.drawImage(buf, (w - w * z) / 2, (hh - hh * z) / 2, w * z, hh * z);
    fctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    prismFlash(fctx, fwW, fwH, fwW * 0.5, fwH * 0.42, flashEnv(a, 9) * 0.9, cutCount, 0.7);
  }

  new IntersectionObserver((es) => { visible = es[0].isIntersecting; }, { threshold: 0 }).observe(el);

  function fillBands(m: Model): void {
    for (const b of bands) {
      const unit = bandUnit(b.k, m);
      b.tr.innerHTML = `<div class="band-seg">${unit.repeat(3)}</div><div class="band-seg" aria-hidden="true">${unit.repeat(3)}</div>`;
      b.half = (b.tr.firstElementChild as HTMLElement).offsetWidth;
    }
  }
  function setMeta(m: Model): void {
    const s = m.next;
    meta.innerHTML =
      `<b class="m-tag">${TRAINING.dayLabel}</b><span class="m-time">${TRAINING.timeLabel}</span>` +
      `<span class="m-next">${m.live ? '进行中' : '下次'} · ${fmtShort(s.start)} ${s.subject} · 第 ${pad(s.no)} 次</span>`;
  }
  setMeta(m0);
  fillBands(m0);

  let lastNo = m0.next.no, lastLive = m0.live;
  ht.addEventListener('pointerdown', () => amb.add((performance.now() - t0) / 1000, 2));

  function resize(): void {
    light.resize(el.clientWidth, el.clientHeight);
    sizeFrames();
    title.layout();
    amb.resize(el.clientWidth, el.clientHeight);
    amb.stripeBox = title.box();
    for (const b of bands) b.half = (b.tr.firstElementChild as HTMLElement).offsetWidth;
  }

  return {
    el, title,
    intro() {
      started = true;
      t0 = performance.now();
      el.classList.add('in');
      resize();
      amb.prime(0, 3);
      title.intro(0);
      cut(0);
    },
    update(m) {
      info = toInfo(m);
      if (m.next.no !== lastNo || m.live !== lastLive) { lastNo = m.next.no; lastLive = m.live; setMeta(m); fillBands(m); }
    },
    resize,
    tick(now, dt, sc) {
      // 跟随滚动：连续
      el.style.setProperty('--p', clamp(sc.sy / window.innerHeight, 0, 1.2).toFixed(4));
      for (const b of bands) {
        b.boost = approach(b.boost, Math.abs(sc.v) * 0.35, 6, dt);
        b.off += (b.base + Math.sign(b.base) * b.boost) * dt;
      }
      if (!started || !visible || document.hidden) return;
      // 自主动画：三拍一
      const beat = beatOf(now - t0);
      if (beat === lastBeat) return;
      lastBeat = beat;
      const t = beat * DRAWING;
      for (const b of bands) {
        if (b.half > 0) {
          const x = ((b.off % b.half) + b.half) % b.half;
          b.tr.style.transform = `translate3d(${(-x).toFixed(1)}px,0,0)`;
        }
      }
      if (t - cutT >= 1) cut(t);
      drawReel(t);
      light.render(t);
      amb.update(t);
      title.render(t, amb);
    },
  };
}
