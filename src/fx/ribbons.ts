// 环境丝带：随机生成的点缀，不爆炸。参考 MV：
//  · 细长飘带缓慢斜穿画面，沿长度方向扭转（宽度随翻面变化、正反面异色），与文字一段压上、一段钻下（穿插）
//  · 粗色条只在字形笔画内部显示（MV 里“全心全霊”字里的彩色条）
//  · 稀疏彩纸碎片缓慢飘落
// 所有状态都由 (t - 出生时间) 解析求出，配合三拍一的量化时间使用
import { C } from '../data/schedule';
import { rng } from '../lib/rng';

export interface Box { x: number; y: number; w: number; h: number }

interface Streamer {
  born: number; ox: number; oy: number; dx: number; dy: number;
  amp: number; freq: number; phase: number; sway: number;
  speed: number; len: number; total: number; w: number;
  twist: number; twistK: number; twistV: number;
  weaveK: number; weavePh: number; front: string; back: string;
}
interface Stripe {
  born: number; life: number; cx: number; cy: number; ang: number;
  vx: number; vy: number; bars: { off: number; th: number; color: string; len: number }[];
}
interface Shard {
  born: number; x: number; y: number; vx: number; vy: number;
  s: number; rot: number; vr: number; sway: number; ph: number; color: string; life: number;
}

const FACES: [string, string, number][] = [
  [C.cream, '#BFC2EE', 5],
  [C.cyan, '#1C93B8', 3],
  [C.violet, '#4C34C9', 2],
  [C.lime, '#86AE12', 1],
  [C.magenta, '#A90E47', 1],
];
const STRIPES = [C.cyan, C.cyan, C.lime, C.magenta, '#FFD21E', C.blue, C.violet];
const SHARDS = [C.cyan, C.cream, C.violet, C.cyan, C.cream, C.lime, C.magenta];

function pickFace(r: () => number): [string, string] {
  const tot = FACES.reduce((a, f) => a + f[2], 0);
  let x = r() * tot;
  for (const f of FACES) { x -= f[2]; if (x <= 0) return [f[0], f[1]]; }
  return [FACES[0][0], FACES[0][1]];
}

export interface AmbientOpts {
  seed: number;
  streamers: [number, number];   // 生成间隔范围（秒）
  maxStreamers: number;
  stripes: [number, number] | null;
  shardRate: number;             // 每秒生成彩纸数
}

export class Ambient {
  private r: () => number;
  private s: Streamer[] = [];
  private st: Stripe[] = [];
  private sh: Shard[] = [];
  private nextS = 0;
  private nextSt = 0;
  private shardAcc = 0;
  private lastT = -1;
  W = 0; H = 0; scale = 1;
  /** 粗色条的活动范围（通常是标题包围盒） */
  stripeBox: Box | null = null;

  constructor(private o: AmbientOpts) { this.r = rng(o.seed); }

  resize(W: number, H: number): void { this.W = W; this.H = H; this.scale = Math.min(W, H) / 1000; }

  /** 预先放几条在画面中，避免开场空白 */
  prime(t: number, n: number): void {
    for (let i = 0; i < n; i++) this.spawnStreamer(t - (0.6 + this.r() * 2.2));
    for (let i = 0; i < this.o.shardRate * 4; i++) this.spawnShard(t - this.r() * 5);
  }

  /** 手动加几条（点击标题时） */
  add(t: number, n: number): void { for (let i = 0; i < n; i++) this.spawnStreamer(t - this.r() * 0.3); }

  update(t: number): void {
    const dt = this.lastT < 0 ? 0 : Math.max(0, t - this.lastT);
    this.lastT = t;
    const [a, b] = this.o.streamers;
    if (t >= this.nextS) {
      if (this.s.length < this.o.maxStreamers) this.spawnStreamer(t);
      this.nextS = t + a + this.r() * (b - a);
    }
    if (this.o.stripes && this.stripeBox && t >= this.nextSt) {
      this.spawnStripe(t);
      const [c, d] = this.o.stripes;
      this.nextSt = t + c + this.r() * (d - c);
    }
    this.shardAcc += dt * this.o.shardRate;
    while (this.shardAcc >= 1) { this.spawnShard(t); this.shardAcc--; }

    this.s = this.s.filter((x) => (t - x.born) * x.speed - x.len < x.total);
    this.st = this.st.filter((x) => t - x.born < x.life);
    this.sh = this.sh.filter((x) => t - x.born < x.life);
  }

  private spawnStreamer(t: number): void {
    const r = this.r, W = this.W, H = this.H, sc = this.scale;
    // 主要方向：斜向下（MV 中飘带多为从上方斜落 / 横穿）
    const ang = (r() < 0.5 ? 0.35 : Math.PI - 0.35) + (r() - 0.5) * 0.7;
    const dx = Math.cos(ang), dy = Math.sin(ang);
    const diag = Math.hypot(W, H);
    // 起点：沿方向反推到画面外
    const px = W * (0.1 + r() * 0.8), py = H * (0.1 + r() * 0.8);
    const back = diag * 0.6;
    const [front, backc] = pickFace(r);
    this.s.push({
      born: t, ox: px - dx * back, oy: py - dy * back, dx, dy,
      amp: (30 + r() * 90) * sc, freq: (2.2 + r() * 3) / diag * Math.PI * 2, phase: r() * 6.28, sway: 0.6 + r() * 1.2,
      speed: (140 + r() * 220) * sc * (W < 700 ? 1.4 : 1), len: diag * (0.18 + r() * 0.22), total: diag * 1.25,
      w: (3 + r() * 6) * sc * (W < 700 ? 1.5 : 1),
      twist: r() * 6.28, twistK: (3 + r() * 6) / diag * Math.PI * 2, twistV: (r() - 0.5) * 3,
      weaveK: (2 + r() * 3) / diag * Math.PI * 2, weavePh: r() * 6.28,
      front, back: backc,
    });
  }

  private spawnStripe(t: number): void {
    const r = this.r, b = this.stripeBox!, sc = this.scale;
    const ang = -0.45 + (r() - 0.5) * 0.5 + (r() < 0.25 ? Math.PI / 2 : 0);
    const n = 1 + Math.floor(r() * 3);
    const color = STRIPES[Math.floor(r() * STRIPES.length)];
    const bars = Array.from({ length: n }, (_, i) => ({
      off: i * (16 + r() * 22) * sc * 1.6,
      th: (10 + r() * 22) * sc * 1.6,
      color: i === 0 ? color : STRIPES[Math.floor(r() * STRIPES.length)],
      len: (b.w * (0.12 + r() * 0.3)),
    }));
    const sp = (40 + r() * 80) * sc;
    this.st.push({
      born: t, life: 1.1 + r() * 1.9,
      cx: b.x + b.w * r(), cy: b.y + b.h * (0.15 + r() * 0.8), ang,
      vx: Math.cos(ang) * sp, vy: Math.sin(ang) * sp, bars,
    });
  }

  private spawnShard(t: number): void {
    const r = this.r, sc = this.scale;
    this.sh.push({
      born: t, x: r() * this.W, y: -20 - r() * this.H * 0.2,
      vx: (r() - 0.5) * 30 * sc, vy: (30 + r() * 60) * sc,
      s: (3 + r() * 6) * Math.max(0.7, sc), rot: r() * 6.3, vr: (r() - 0.5) * 3,
      sway: (10 + r() * 40) * sc, ph: r() * 6.3,
      color: SHARDS[Math.floor(r() * SHARDS.length)], life: 12 + r() * 10,
    });
  }

  /** layer：back = 钻到文字下面的段落；front = 压在文字上面的段落；all = 全部 */
  drawStreamers(ctx: CanvasRenderingContext2D, t: number, layer: 'back' | 'front' | 'all'): void {
    const N = 34;
    for (const s of this.s) {
      const a = t - s.born;
      const head = a * s.speed, tail = head - s.len;
      const pts: { x: number; y: number; nx: number; ny: number; u: number }[] = [];
      for (let i = 0; i <= N; i++) {
        const u = tail + (head - tail) * (i / N);
        const off = Math.sin(u * s.freq + s.phase + a * s.sway) * s.amp;
        const x = s.ox + s.dx * u - s.dy * off;
        const y = s.oy + s.dy * u + s.dx * off;
        pts.push({ x, y, nx: 0, ny: 0, u });
      }
      for (let i = 0; i < pts.length; i++) {
        const p = pts[Math.min(pts.length - 1, i + 1)], q = pts[Math.max(0, i - 1)];
        let tx = p.x - q.x, ty = p.y - q.y;
        const L = Math.hypot(tx, ty) || 1; tx /= L; ty /= L;
        pts[i].nx = -ty; pts[i].ny = tx;
      }
      for (let i = 0; i < N; i++) {
        const p0 = pts[i], p1 = pts[i + 1];
        const um = (p0.u + p1.u) / 2;
        const isFront = Math.sin(um * s.weaveK + s.weavePh) > -0.2;
        if (layer === 'front' && !isFront) continue;
        if (layer === 'back' && isFront) continue;
        const c0 = Math.cos(s.twist + p0.u * s.twistK + a * s.twistV);
        const c1 = Math.cos(s.twist + p1.u * s.twistK + a * s.twistV);
        const taper = (k: number) => Math.min(1, k / 3, (N - k) / 3);
        const w0 = s.w * (0.18 + 0.82 * Math.abs(c0)) * taper(i), w1 = s.w * (0.18 + 0.82 * Math.abs(c1)) * taper(i + 1);
        ctx.fillStyle = c0 + c1 >= 0 ? s.front : s.back;
        ctx.beginPath();
        ctx.moveTo(p0.x + p0.nx * w0, p0.y + p0.ny * w0);
        ctx.lineTo(p1.x + p1.nx * w1, p1.y + p1.ny * w1);
        ctx.lineTo(p1.x - p1.nx * w1, p1.y - p1.ny * w1);
        ctx.lineTo(p0.x - p0.nx * w0, p0.y - p0.ny * w0);
        ctx.closePath();
        ctx.fill();
      }
    }
  }

  /** 粗色条：调用方负责 source-atop 合成到字形上 */
  drawStripes(ctx: CanvasRenderingContext2D, t: number): void {
    for (const s of this.st) {
      const a = t - s.born;
      const vis = Math.min(1, a / 0.25, (s.life - a) / 0.25);
      if (vis <= 0) continue;
      ctx.save();
      ctx.translate(s.cx + s.vx * a, s.cy + s.vy * a);
      ctx.rotate(s.ang);
      for (const b of s.bars) {
        ctx.fillStyle = b.color;
        ctx.fillRect(-b.len / 2, b.off - b.th / 2, b.len * vis, b.th);
      }
      ctx.restore();
    }
  }

  drawShards(ctx: CanvasRenderingContext2D, t: number): void {
    for (const s of this.sh) {
      const a = t - s.born;
      const x = s.x + s.vx * a + Math.sin(a * 1.3 + s.ph) * s.sway;
      const y = s.y + s.vy * a;
      if (y > this.H + 30) continue;
      ctx.save();
      ctx.translate(x, y);
      ctx.rotate(s.rot + s.vr * a);
      ctx.scale(1, 0.35 + 0.65 * Math.abs(Math.cos(a * 2 + s.ph)));
      ctx.fillStyle = s.color;
      ctx.beginPath(); ctx.moveTo(0, -s.s); ctx.lineTo(s.s * 0.8, s.s * 0.6); ctx.lineTo(-s.s * 0.7, s.s * 0.3); ctx.closePath(); ctx.fill();
      ctx.restore();
    }
  }
}
