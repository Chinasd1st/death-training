// 闪光：参考 MV 中的棱镜光晕（彩虹放射光束 + 中心辉光 + 曝光过度），不是手电筒
import { C } from '../data/schedule';
import { rng } from '../lib/rng';

const RAY = [C.cyan, C.magenta, C.lime, C.violet, '#FFFFFF', '#FFD21E', '#6FA8FF', C.cyan, '#FFFFFF'];

/** 闪光包络：瞬间峰值后指数衰减（a = 距闪光的秒数，已量化） */
export const flashEnv = (a: number, decay = 6.5) => (a < 0 ? 0 : Math.exp(-a * decay));

/**
 * @param k   强度 0–1
 * @param exposure 曝光（整屏白）占比
 */
export function prismFlash(
  ctx: CanvasRenderingContext2D, W: number, H: number,
  cx: number, cy: number, k: number, seed: number, exposure = 0.85,
): void {
  if (k <= 0.004) return;
  const r = rng(seed * 131 + 7);
  const R = Math.hypot(W, H);
  ctx.save();
  ctx.globalCompositeOperation = 'lighter';

  // 放射光束：细楔形，颜色沿光束衰减
  const n = 26;
  for (let i = 0; i < n; i++) {
    const a = r() * Math.PI * 2;
    const spread = 0.006 + r() * 0.04;
    const len = R * (0.35 + r() * 0.75);
    const col = RAY[Math.floor(r() * RAY.length)];
    const g = ctx.createLinearGradient(cx, cy, cx + Math.cos(a) * len, cy + Math.sin(a) * len);
    g.addColorStop(0, hexA(col, 0.75 * k));
    g.addColorStop(0.35, hexA(col, 0.35 * k));
    g.addColorStop(1, hexA(col, 0));
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.moveTo(cx, cy);
    ctx.lineTo(cx + Math.cos(a - spread) * len, cy + Math.sin(a - spread) * len);
    ctx.lineTo(cx + Math.cos(a + spread) * len, cy + Math.sin(a + spread) * len);
    ctx.closePath();
    ctx.fill();
  }

  // 棱镜色散环
  for (const [col, rr] of [[C.cyan, 0.16], [C.magenta, 0.2], [C.lime, 0.24]] as const) {
    const g = ctx.createRadialGradient(cx, cy, R * rr * 0.6, cx, cy, R * rr);
    g.addColorStop(0, hexA(col, 0));
    g.addColorStop(0.7, hexA(col, 0.18 * k));
    g.addColorStop(1, hexA(col, 0));
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, W, H);
  }

  // 中心辉光
  const b = ctx.createRadialGradient(cx, cy, 0, cx, cy, R * 0.32);
  b.addColorStop(0, `rgba(255,255,255,${0.95 * k})`);
  b.addColorStop(0.4, `rgba(220,235,255,${0.4 * k})`);
  b.addColorStop(1, 'rgba(255,255,255,0)');
  ctx.fillStyle = b;
  ctx.fillRect(0, 0, W, H);

  // 小四芒闪点
  ctx.fillStyle = `rgba(255,255,255,${k})`;
  for (let i = 0; i < 5; i++) {
    const x = cx + (r() - 0.5) * W * 0.6, y = cy + (r() - 0.5) * H * 0.6, s = (6 + r() * 16) * (W / 1000 + 0.4);
    ctx.beginPath();
    ctx.moveTo(x, y - s); ctx.quadraticCurveTo(x, y, x + s, y); ctx.quadraticCurveTo(x, y, x, y + s);
    ctx.quadraticCurveTo(x, y, x - s, y); ctx.quadraticCurveTo(x, y, x, y - s); ctx.fill();
  }

  // 曝光过度
  ctx.globalCompositeOperation = 'source-over';
  const e = exposure * k * k;
  if (e > 0.004) { ctx.fillStyle = `rgba(248,246,238,${e})`; ctx.fillRect(0, 0, W, H); }
  ctx.restore();
}

function hexA(hex: string, a: number): string {
  const n = parseInt(hex.slice(1), 16);
  return `rgba(${(n >> 16) & 255},${(n >> 8) & 255},${n & 255},${Math.max(0, Math.min(1, a)).toFixed(3)})`;
}
