// 开场（全程三拍一，每 125ms 出一张画）：
//  黑场点阵 → 棱镜闪光 → 圆形字块「死亡限时训练」弹出（丝带在字块间穿插）→ 闪光 → 6 张闪回快切 → 大闪光 + 四芒星开孔切入主页
import { C, HEI, NUM, SCHOOL, TRAINING } from '../data/schedule';
import { drawFrame, starPath, chip, type FrameInfo, type FrameKind } from './frames';
import { Ambient } from './ribbons';
import { prismFlash, flashEnv } from './flash';
import { range, outExpo, inOutExpo, spring, DRAWING, beatOf } from '../lib/ease';
import { pad } from '../lib/time';

export interface SplashOpts {
  canvas: HTMLCanvasElement;
  info: FrameInfo;
  onReveal: () => void;
  onDone: () => void;
}

const B = DRAWING;
const T = { flash1: 3 * B, flash2: 11 * B, cutsEnd: 17 * B, end: 24 * B };
const CUTS: FrameKind[] = ['checker', 'glyph', 'calendar', 'sparkle', 'number', 'band'];
const TITLE = [...'死亡限时训练'];

export function runSplash(o: SplashOpts): void {
  const cv = o.canvas;
  const ctx = cv.getContext('2d')!;
  const scene = document.createElement('canvas');
  const sctx = scene.getContext('2d')!;
  let W = 0, H = 0, dpr = 1;
  const amb = new Ambient({ seed: 11, streamers: [0.25, 0.5], maxStreamers: 7, stripes: null, shardRate: 14, sparkleRate: 8 });

  function resize(): void {
    dpr = Math.min(2, window.devicePixelRatio || 1);
    W = window.innerWidth; H = window.innerHeight;
    for (const c of [cv, scene]) { c.width = Math.round(W * dpr); c.height = Math.round(H * dpr); }
    cv.style.width = `${W}px`; cv.style.height = `${H}px`;
    amb.resize(W, H);
  }

  /** 黑场：胶片点阵逐拍长出 */
  function black(t: number): void {
    ctx.fillStyle = C.ink; ctx.fillRect(0, 0, W, H);
    const n = Math.round(t / B) + 1;
    const d = Math.max(6, Math.min(W, H) * 0.014);
    ctx.fillStyle = C.cream;
    for (let i = 0; i < n * 6; i++) {
      const k = [1, 1, 0.5, 1, 1, 1, 0.5, 0.3][i % 8];
      ctx.beginPath(); ctx.arc(W * 0.08 + i * d * 2.1, H * 0.5, (d * k) / 2, 0, Math.PI * 2); ctx.fill();
    }
  }

  /** 圆形字块画面；丝带在字块前后穿插 */
  function chips(c: CanvasRenderingContext2D, t: number): void {
    c.fillStyle = C.blue; c.fillRect(0, 0, W, H);
    c.fillStyle = C.blueDeep;
    const step = Math.min(W, H) * 0.44;
    for (let y = -step / 2; y < H + step; y += step)
      for (let x = -step / 2; x < W + step; x += step) { c.beginPath(); c.arc(x, y, step * 0.38, 0, Math.PI * 2); c.fill(); }
    const lt = t - T.flash1;
    amb.drawStreamers(c, t, 'back');
    const s = Math.min(H * 0.12, W * 0.14, 110);
    const x = W / 2 - s / 2, y0 = H / 2 - (s * TITLE.length) / 2;
    c.fillStyle = C.cream; c.fillRect(W / 2 - 2, 0, 4, H * outExpo(range(lt, 0, 0.5)));
    TITLE.forEach((ch, i) => {
      const p = spring(lt - i * B, 260, 15);
      if (p <= 0) return;
      const cx = x + s / 2, cy = y0 + i * s + s / 2;
      c.save(); c.translate(cx, cy); c.scale(p, p); c.translate(-cx, -cy);
      chip(c, x, y0 + i * s, s, ch, i % 2 === 1, i === 0);
      c.restore();
    });
    const sp = outExpo(range(lt, 2 * B, 6 * B));
    if (sp > 0) {
      c.save(); c.globalAlpha = sp;
      c.fillStyle = C.cream; c.textBaseline = 'middle';
      c.font = `900 ${Math.round(s * 0.26)}px ${HEI}`; c.textAlign = 'right';
      const lx = x - s * 0.5 - (1 - sp) * 60;
      c.fillText(SCHOOL.full, lx, H / 2 - s * 0.35);
      c.font = `700 ${Math.round(s * 0.3)}px ${NUM}`;
      c.fillText(`${TRAINING.dayLabel} ${TRAINING.timeLabel}`, lx, H / 2 + s * 0.35);
      c.textAlign = 'left';
      const rx = x + s * 1.5 + (1 - sp) * 60;
      c.fillText(`No.${pad(o.info.no)}`, rx, H / 2 - s * 0.35);
      c.font = `900 ${Math.round(s * 0.26)}px ${HEI}`;
      c.fillText(`下次 · ${o.info.subject}`, rx, H / 2 + s * 0.35);
      c.restore();
    }
    amb.drawStreamers(c, t, 'front');
    amb.drawShards(c, t);
    const lb = H * 0.11 * outExpo(range(lt, 0, 3 * B));
    c.fillStyle = C.ink; c.fillRect(0, 0, W, lb); c.fillRect(0, H - lb, W, lb);
  }

  let start = 0;
  let lastBeat = -1;
  let revealed = false;

  const skip = () => {
    const t = (performance.now() - start) / 1000;
    if (t < T.cutsEnd - B) start = performance.now() - (T.cutsEnd - B) * 1000;
  };
  window.addEventListener('pointerdown', skip, { passive: true });
  window.addEventListener('keydown', skip);
  window.addEventListener('resize', resize);
  resize();
  amb.prime(0, 3);

  function frame(now: number): void {
    const beat = beatOf(now - start);
    if (beat !== lastBeat) {
      lastBeat = beat;
      const t = beat * B;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      amb.update(t);

      if (t < T.flash1) {
        black(t);
      } else if (t < T.flash2) {
        chips(ctx, t);
        prismFlash(ctx, W, H, W / 2, H / 2, flashEnv(t - T.flash1), 1, 0.9);
      } else if (t < T.cutsEnd) {
        const k = Math.min(CUTS.length - 1, Math.round((t - T.flash2) / B));
        drawFrame(ctx, W, H, CUTS[k], o.info, k + 1);
        const f = t === T.flash2 ? 1 : k % 2 === 0 ? 0.55 : 0;
        prismFlash(ctx, W, H, W * (0.3 + 0.4 * ((k * 37) % 10) / 10), H * 0.45, f, 10 + k, 0.6);
        if (k === CUTS.length - 1) { sctx.setTransform(dpr, 0, 0, dpr, 0, 0); drawFrame(sctx, W, H, CUTS[k], o.info, k + 1); }
      } else {
        if (!revealed) {
          revealed = true;
          window.removeEventListener('pointerdown', skip);
          window.removeEventListener('keydown', skip);
          o.onReveal();
        }
        ctx.clearRect(0, 0, W, H);
        const q = inOutExpo(range(t, T.cutsEnd, T.end - 2 * B));
        if (q < 1) {
          ctx.drawImage(scene, 0, 0, W, H);
          ctx.globalCompositeOperation = 'destination-out';
          starPath(ctx, W / 2, H / 2, Math.hypot(W, H) * 1.9 * q, q * 0.7, 0.1);
          ctx.fill();
          ctx.globalCompositeOperation = 'source-over';
        }
        prismFlash(ctx, W, H, W / 2, H / 2, flashEnv(t - T.cutsEnd, 5), 99, 1);
        if (t >= T.end) {
          ctx.clearRect(0, 0, W, H);
          window.removeEventListener('resize', resize);
          o.onDone();
          return;
        }
      }
    }
    requestAnimationFrame(frame);
  }
  requestAnimationFrame((n) => { start = n; frame(n); });
}
