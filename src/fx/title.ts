// 标题层：把标题字形画进 canvas，使丝带能“穿插”文字（一段压上、一段钻下），粗色条只出现在笔画内部。
//  · 支持 HTML-in-Canvas（<canvas layoutsubtree> + drawElementImage）的浏览器：直接把真实 DOM 画进来
//  · 其他浏览器：用 Canvas 2D fillText 按 DOM 的位置与字体逐字绘制
// 合成顺序（单张 canvas）：字形 → source-atop 色条（只留在笔画里）→ destination-over 下层丝带（钻到字后）→ 上层丝带 + 彩纸
// DOM 占位文字始终保留（透明），保证布局、选择与无障碍
import { C } from '../data/schedule';
import { spring } from '../lib/ease';
import { rng } from '../lib/rng';
import type { Ambient, Box } from './ribbons';

type DrawEl = (el: Element, dx: number, dy: number, dw: number, dh: number) => void;

interface LineRect { x: number; y: number; w: number; h: number; clipY: number; clipH: number }

export interface TitleLayer {
  readonly mode: 'html-in-canvas' | 'canvas-text';
  canvas: HTMLCanvasElement;
  layout(): void;
  intro(t: number): void;
  glitch(t: number): void;
  box(): Box;
  render(t: number, amb: Ambient): void;
}

export function mountTitle(host: HTMLElement, ht: HTMLElement): TitleLayer {
  const lines = Array.from(ht.querySelectorAll<HTMLElement>('.ht-line[data-glyph]'));
  const spans = lines.map((l) => l.firstElementChild as HTMLElement);

  const canvas = document.createElement('canvas');
  canvas.className = 'hero-canvas';
  const ctx = canvas.getContext('2d')!;

  const params = new URLSearchParams(location.search);
  const canHIC = !params.has('dom') && typeof (ctx as unknown as { drawElementImage?: DrawEl }).drawElementImage === 'function';

  let clones: HTMLElement[] = [];
  if (canHIC) {
    canvas.setAttribute('layoutsubtree', '');
    const src = document.createElement('div');
    src.className = 'ht-src';
    clones = lines.map((l) => {
      const c = l.cloneNode(true) as HTMLElement;
      src.appendChild(c);
      return c.firstElementChild as HTMLElement;
    });
    canvas.appendChild(src);
    // 可访问的是 canvas 子树里的副本；占位行对读屏隐藏
    lines.forEach((l) => l.setAttribute('aria-hidden', 'true'));
  } else {
    canvas.setAttribute('aria-hidden', 'true');
  }
  host.appendChild(canvas);
  if (canHIC) (canvas as unknown as { requestPaint?: () => void }).requestPaint?.();

  let dpr = 1, W = 0, H = 0;
  let rects: LineRect[] = [];
  let fonts: { font: string; ls: number; base: number; text: string }[] = [];
  let introT = Infinity, glitchT = -1, glitchSeed = 1;
  let hicFails = 0;
  let mode: TitleLayer['mode'] = canHIC ? 'html-in-canvas' : 'canvas-text';

  function layout(): void {
    dpr = Math.min(2, window.devicePixelRatio || 1);
    W = host.clientWidth; H = host.clientHeight;
    canvas.width = Math.round(W * dpr); canvas.height = Math.round(H * dpr);
    rects = spans.map((s, i) => {
      const l = lines[i];
      return {
        x: ht.offsetLeft + s.offsetLeft, y: ht.offsetTop + s.offsetTop, w: s.offsetWidth, h: s.offsetHeight,
        clipY: ht.offsetTop + l.offsetTop, clipH: l.offsetHeight,
      };
    });
    fonts = spans.map((s) => {
      const cs = getComputedStyle(s);
      const size = parseFloat(cs.fontSize);
      const lh = parseFloat(cs.lineHeight) || size * 1.2;
      const font = `${cs.fontWeight} ${cs.fontSize} ${cs.fontFamily}`;
      ctx.font = font;
      const m = ctx.measureText('死亡限');
      const asc = m.fontBoundingBoxAscent || size * 0.88;
      const desc = m.fontBoundingBoxDescent || size * 0.12;
      return { font, ls: parseFloat(cs.letterSpacing) || 0, base: (lh - (asc + desc)) / 2 + asc, text: s.textContent ?? '' };
    });
  }

  function drawLineText(i: number, x: number, y: number): void {
    const f = fonts[i];
    ctx.font = f.font;
    ctx.fillStyle = C.cream;
    ctx.textBaseline = 'alphabetic';
    let cx = x;
    for (const ch of f.text) { ctx.fillText(ch, cx, y + f.base); cx += ctx.measureText(ch).width + f.ls; }
  }

  function drawLine(i: number, x: number, y: number): void {
    if (mode === 'html-in-canvas') {
      const r = rects[i];
      ctx.save();
      ctx.setTransform(1, 0, 0, 1, 0, 0);
      try {
        (ctx as unknown as { drawElementImage: DrawEl }).drawElementImage(clones[i], x * dpr, y * dpr, r.w * dpr, r.h * dpr);
        hicFails = 0;
        ctx.restore();
        return;
      } catch {
        ctx.restore();
        // 首次 paint 前还没有快照：这一拍用文字顶上；连续失败则永久回退
        if (++hicFails > 40) mode = 'canvas-text';
      }
    }
    drawLineText(i, x, y);
  }

  function renderGlyphs(t: number): void {
    const ga = t - glitchT;
    const glitching = glitchT >= 0 && ga >= 0 && ga < 0.25;
    const gr = rng(glitchSeed);
    rects.forEach((r, i) => {
      const p = spring(t - introT - i * 0.125, 190, 14);
      if (p <= 0) return;
      const dy = (1 - p) * r.clipH * 1.05;
      ctx.save();
      ctx.beginPath(); ctx.rect(r.x - 40, r.clipY, r.w + 80, r.clipH); ctx.clip();
      if (glitching && i > 0) {
        const strips = 6, amp = (ga < 0.125 ? 1 : 0.45) * Math.min(42, r.h * 0.16);
        for (let k = 0; k < strips; k++) {
          const sy = r.clipY + (r.clipH / strips) * k;
          ctx.save(); ctx.beginPath(); ctx.rect(0, sy, W, r.clipH / strips + 1); ctx.clip();
          drawLine(i, r.x + (gr() - 0.5) * 2 * amp, r.y + dy);
          ctx.restore();
        }
      } else {
        drawLine(i, r.x, r.y + dy);
      }
      ctx.restore();
    });
  }

  return {
    get mode() { return mode; },
    canvas,
    layout,
    intro(t) { introT = t; },
    glitch(t) { glitchT = t; glitchSeed++; },
    box() {
      if (rects.length < 3) return { x: 0, y: 0, w: W, h: H };
      const a = rects[1], b = rects[2];
      const x = Math.min(a.x, b.x), y = a.clipY;
      return { x, y, w: Math.max(a.x + a.w, b.x + b.w) - x, h: b.clipY + b.clipH - y };
    },
    render(t, amb) {
      ctx.setTransform(1, 0, 0, 1, 0, 0);
      ctx.globalCompositeOperation = 'source-over';
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      renderGlyphs(t);
      ctx.globalCompositeOperation = 'source-atop';
      amb.drawStripes(ctx, t);
      ctx.globalCompositeOperation = 'destination-over';
      amb.drawStreamers(ctx, t, 'back');
      ctx.globalCompositeOperation = 'source-over';
      amb.drawStreamers(ctx, t, 'front');
      amb.drawShards(ctx, t);
    },
  };
}
