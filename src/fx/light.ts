// 首屏光感层（按拍重绘）：
//  1) 超大裁切字「DEATH」作遮罩：闪回画面从字形里透出来（低对比，深蓝底 + 32% 画面）
//  2) 呼吸的月亮 + 光晕环 + 地平线辉光
//  3) 漂移的虚化光斑
//  4) 几何城市剪影（窗灯按拍闪烁）
import { C, NUM } from '../data/schedule';
import { rng } from '../lib/rng';

interface Bld { x: number; w: number; h: number; cols: number; win: number[] }
interface Bok { x: number; y: number; r: number; vx: number; c: string; a: number; ph: number }

function rgba(hex: string, a: number): string {
  const n = parseInt(hex.slice(1), 16);
  return `rgba(${(n >> 16) & 255},${(n >> 8) & 255},${n & 255},${Math.max(0, Math.min(1, a)).toFixed(3)})`;
}

export class HeroLight {
  readonly canvas = document.createElement('canvas');
  private ctx = this.canvas.getContext('2d')!;
  private word = document.createElement('canvas');
  private wctx = this.word.getContext('2d')!;
  private W = 0; private H = 0; private dpr = 1; private mobile = false;
  private blds: Bld[] = [];
  private boks: Bok[] = [];

  constructor() {
    this.canvas.className = 'hero-light';
    this.canvas.setAttribute('aria-hidden', 'true');
  }

  resize(W: number, H: number): void {
    this.dpr = Math.min(2, window.devicePixelRatio || 1);
    this.W = W; this.H = H; this.mobile = W < 760;
    for (const c of [this.canvas, this.word]) { c.width = Math.max(1, Math.round(W * this.dpr)); c.height = Math.max(1, Math.round(H * this.dpr)); }

    const r = rng(41);
    const k = this.mobile ? 0.7 : 1;
    this.blds = [];
    let x = -10;
    while (x < W + 10) {
      const w = (26 + r() * 70) * k;
      const h = H * (0.05 + r() * 0.15) * (r() < 0.15 ? 1.4 : 1);
      const cols = Math.max(1, Math.floor((w - 8) / 12));
      const rows = Math.max(1, Math.floor((h - 10) / 16));
      this.blds.push({ x, w, h, cols, win: Array.from({ length: Math.min(cols * rows, 48) }, () => r()) });
      x += w + (r() < 0.3 ? 6 + r() * 22 : 0);
    }
    const b = rng(77);
    const cols = [C.cream, C.cyan, C.violet, C.cream];
    this.boks = Array.from({ length: this.mobile ? 7 : 13 }, () => ({
      x: b() * W, y: b() * H * 0.72, r: (16 + b() * 70) * k, vx: (b() - 0.5) * 16,
      c: cols[Math.floor(b() * cols.length)], a: 0.06 + b() * 0.12, ph: b() * 6.28,
    }));
  }

  /** 闪回切换时调用：把当前画面灌进超大字形 */
  setFrame(src: HTMLCanvasElement): void {
    const g = this.wctx, W = this.W, H = this.H, d = this.dpr;
    if (!W) return;
    g.setTransform(1, 0, 0, 1, 0, 0);
    g.globalCompositeOperation = 'source-over';
    g.globalAlpha = 1;
    g.clearRect(0, 0, this.word.width, this.word.height);
    g.setTransform(d, 0, 0, d, 0, 0);
    const fs = this.mobile ? H * 0.6 : H * 1.02;
    g.font = `700 ${Math.round(fs)}px ${NUM}`;
    g.textBaseline = 'alphabetic';
    g.fillStyle = C.blueDeep;
    g.fillText('DEATH', -W * 0.035, this.mobile ? H * 0.72 : H * 0.985);
    if (src.width > 1) {
      const sw = src.width, sh = src.height;
      const s = Math.max(W / sw, H / sh);
      g.globalCompositeOperation = 'source-atop';
      g.globalAlpha = 0.32;
      g.drawImage(src, 0, 0, sw, sh, (W - sw * s) / 2, (H - sh * s) / 2, sw * s, sh * s);
      g.globalAlpha = 1;
      g.globalCompositeOperation = 'source-over';
    }
  }

  render(t: number): void {
    const c = this.ctx, W = this.W, H = this.H;
    c.setTransform(1, 0, 0, 1, 0, 0);
    c.clearRect(0, 0, this.canvas.width, this.canvas.height);
    c.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);

    // 1) 超大字遮罩
    c.drawImage(this.word, 0, 0, W, H);

    // 2) 地平线辉光
    const hz = c.createLinearGradient(0, H * 0.58, 0, H);
    hz.addColorStop(0, rgba(C.cyan, 0));
    hz.addColorStop(0.72, rgba(C.cyan, 0.14));
    hz.addColorStop(1, rgba(C.cream, 0.2));
    c.fillStyle = hz;
    c.fillRect(0, H * 0.58, W, H * 0.42);

    // 月亮
    const mr = this.mobile ? W * 0.2 : Math.min(W, H) * 0.2;
    const mx = this.mobile ? W * 0.84 : W * 0.4;
    const my = this.mobile ? H * 0.07 : H * 0.13;
    const br = 1 + 0.07 * Math.sin(t * 1.7);
    const halo = c.createRadialGradient(mx, my, mr * 0.9, mx, my, mr * 2.8 * br);
    halo.addColorStop(0, 'rgba(214,226,255,.5)');
    halo.addColorStop(0.45, 'rgba(150,170,255,.16)');
    halo.addColorStop(1, 'rgba(150,170,255,0)');
    c.fillStyle = halo;
    c.fillRect(mx - mr * 3, my - mr * 3, mr * 6, mr * 6);
    const disc = c.createRadialGradient(mx - mr * 0.35, my - mr * 0.35, 0, mx, my, mr);
    disc.addColorStop(0, '#FFFFFF');
    disc.addColorStop(0.55, '#E4E8FF');
    disc.addColorStop(1, '#B8C1FF');
    c.fillStyle = disc;
    c.beginPath(); c.arc(mx, my, mr, 0, Math.PI * 2); c.fill();
    c.strokeStyle = 'rgba(244,241,230,.45)';
    c.lineWidth = Math.max(2, mr * 0.02);
    c.beginPath(); c.arc(mx, my, mr * 1.16 * br, 0, Math.PI * 2); c.stroke();

    // 3) 虚化光斑
    for (const b of this.boks) {
      const span = W + 240;
      const x = (((b.x + b.vx * t) % span) + span) % span - 120;
      const y = b.y + Math.sin(t * 0.6 + b.ph) * 18;
      const a = b.a * (0.7 + 0.3 * Math.sin(t * 1.3 + b.ph));
      const g = c.createRadialGradient(x, y, 0, x, y, b.r);
      g.addColorStop(0, rgba(b.c, a));
      g.addColorStop(0.6, rgba(b.c, a * 0.6));
      g.addColorStop(1, rgba(b.c, 0));
      c.fillStyle = g;
      c.beginPath(); c.arc(x, y, b.r, 0, Math.PI * 2); c.fill();
    }

    // 4) 城市剪影
    const beat = Math.round(t * 8);
    c.fillStyle = '#1209BC';
    for (const b of this.blds) c.fillRect(b.x, H - b.h, b.w, b.h + 1);
    c.fillStyle = 'rgba(244,241,230,.55)';
    for (const b of this.blds) {
      b.win.forEach((v, i) => {
        const lit = v < 0.18 || (v > 0.96 && (beat + i) % 6 < 3);
        if (!lit) return;
        const col = i % b.cols, row = Math.floor(i / b.cols);
        const wy = H - b.h + 10 + row * 16;
        if (wy > H - 6) return;
        c.fillRect(b.x + 6 + col * 12, wy, 4, 6);
      });
    }
  }
}
