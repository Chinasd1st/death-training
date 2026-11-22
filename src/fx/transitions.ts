// 段落切换转场（按拍、只画在该段落可见区域内、不遮挡内容太久）：
//  bars  三色横条（品红 / 荧光绿 / 青）依次斜向刷过
//  tiles 平铺方块沿对角线依次翻出又翻回
//  glyph 超大汉字从中心放大穿过屏幕
import { C, HEI } from '../data/schedule';
import { DRAWING as B, inOutExpo, inExpo, range } from '../lib/ease';
import { hash } from '../lib/rng';
import { ox } from './frames';
import { prismFlash, flashEnv } from './flash';

export type TrKind = 'bars' | 'tiles' | 'glyph';
interface Tr { el: HTMLElement; kind: TrKind; glyph: string; t0: number; dur: number; seed: number }

export class Transitions {
  private list: Tr[] = [];
  private n = 0;

  get active(): boolean { return this.list.length > 0; }

  play(el: HTMLElement, kind: TrKind, glyph: string, t: number): void {
    const dur = kind === 'tiles' ? 13 * B : kind === 'bars' ? 11 * B : 9 * B;
    this.list.push({ el, kind, glyph: glyph || '训', t0: t, dur, seed: ++this.n });
  }

  draw(ctx: CanvasRenderingContext2D, t: number, W: number, H: number): void {
    this.list = this.list.filter((x) => t - x.t0 <= x.dur);
    for (const tr of this.list) {
      const r = tr.el.getBoundingClientRect();
      const x0 = Math.max(0, r.left), y0 = Math.max(0, r.top);
      const x1 = Math.min(W, r.right), y1 = Math.min(H, r.bottom);
      if (x1 <= x0 || y1 <= y0) continue;
      const a = t - tr.t0;
      ctx.save();
      ctx.beginPath(); ctx.rect(x0, y0, x1 - x0, y1 - y0); ctx.clip();
      if (tr.kind === 'bars') this.bars(ctx, a, x0, y0, x1, y1);
      else if (tr.kind === 'tiles') this.tiles(ctx, a, x0, y0, x1, y1, tr.seed);
      else this.glyph(ctx, a, x0, y0, x1, y1, tr.glyph, tr.seed, W, H);
      ctx.restore();
    }
  }

  private bars(ctx: CanvasRenderingContext2D, a: number, x0: number, y0: number, x1: number, y1: number): void {
    const w = x1 - x0, h = y1 - y0;
    const bh = Math.min(h * 0.22, 190);
    const L = Math.hypot(w, h) * 1.15;
    ctx.save();
    ctx.translate((x0 + x1) / 2, (y0 + y1) / 2);
    ctx.rotate(-0.12);
    [C.magenta, C.lime, C.cyan].forEach((c, i) => {
      const p = inOutExpo(range(a, i * B, i * B + 7 * B));
      if (p <= 0 || p >= 1) return;
      const left = -1.5 * L + p * 2 * L;
      const y = (i - 1) * bh * 1.04;
      ctx.fillStyle = c;
      ctx.fillRect(left, y - bh / 2, L, bh);
      ctx.fillStyle = C.ink;
      ctx.fillRect(left + L - bh * 0.3, y - bh / 2, bh * 0.12, bh);
    });
    ctx.restore();
  }

  private tiles(ctx: CanvasRenderingContext2D, a: number, x0: number, y0: number, x1: number, y1: number, seed: number): void {
    const cell = Math.max(56, Math.min(window.innerWidth, window.innerHeight) / 7);
    const cols = Math.ceil((x1 - x0) / cell), rows = Math.ceil((y1 - y0) / cell);
    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        const local = (a - (c + r) * 0.35 * B) / (4 * B);
        if (local <= 0 || local >= 1) continue;
        const s = Math.sin(Math.PI * local);
        const k = hash(seed * 1000 + r * 37 + c);
        ctx.save();
        ctx.translate(x0 + c * cell + cell / 2, y0 + r * cell + cell / 2);
        ctx.scale(1, s);
        ctx.fillStyle = k < 0.45 ? C.cream : k < 0.8 ? C.blueDeep : C.ink;
        ctx.fillRect(-cell / 2 - 0.5, -cell / 2 - 0.5, cell + 1, cell + 1);
        if (k > 0.2 && k < 0.45) ox(ctx, 0, 0, cell * 0.22, k < 0.32, C.blue, cell * 0.06);
        ctx.restore();
      }
    }
  }

  private glyph(
    ctx: CanvasRenderingContext2D, a: number, x0: number, y0: number, x1: number, y1: number,
    ch: string, seed: number, W: number, H: number,
  ): void {
    const cx = (x0 + x1) / 2, cy = (y0 + y1) / 2;
    const m = Math.min(W, H);
    const size = m * (0.5 + 6.5 * inExpo(range(a, 0, 8 * B)));
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.font = `900 ${Math.round(size)}px ${HEI}`;
    ctx.fillStyle = C.ink;
    ctx.fillText(ch, cx + size * 0.03, cy + size * 0.03);
    ctx.fillStyle = C.cream;
    ctx.fillText(ch, cx, cy);
    prismFlash(ctx, W, H, cx, cy, flashEnv(a, 9) * 0.6, seed, 0.2);
  }
}
