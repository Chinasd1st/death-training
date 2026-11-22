// 程序化“闪回画面”：全部按 MV 的图形语言绘制（棋盘圆、色带 O×、四芒星、月历、圆形字块…），不使用任何 MV 截图
import { C, HEI, NUM, TRAINING } from '../data/schedule';
import { rng } from '../lib/rng';
import { pad, cnNum, local, dayStart, DAY, WEEK_HEAD } from '../lib/time';
import { sessionOn } from '../lib/training';

type Ctx = CanvasRenderingContext2D;

export interface FrameInfo {
  subject: string;
  no: number;
  days: number;
  hours: number;
  now: number;
}

export const FRAME_KINDS = ['checker', 'band', 'sparkle', 'number', 'calendar', 'dots', 'chips', 'glyph'] as const;
export type FrameKind = (typeof FRAME_KINDS)[number];
export const FRAME_LABEL: Record<FrameKind, string> = {
  checker: '棋盘', band: '色带', sparkle: '星芒', number: '倒数',
  calendar: '月历', dots: '圆点', chips: '字块', glyph: '字形',
};

/* ---------- 基础图元 ---------- */

/** 凹边四芒星 */
export function starPath(ctx: Ctx, cx: number, cy: number, r: number, rot = 0, k = 0.1): void {
  ctx.beginPath();
  for (let i = 0; i < 4; i++) {
    const a = rot + (i * Math.PI) / 2;
    const b = a + Math.PI / 2;
    const px = cx + Math.cos(a) * r, py = cy + Math.sin(a) * r;
    const qx = cx + Math.cos(b) * r, qy = cy + Math.sin(b) * r;
    const mx = cx + Math.cos(a + Math.PI / 4) * r * k, my = cy + Math.sin(a + Math.PI / 4) * r * k;
    if (i === 0) ctx.moveTo(px, py);
    ctx.quadraticCurveTo(mx, my, qx, qy);
  }
  ctx.closePath();
}

export function ox(ctx: Ctx, x: number, y: number, r: number, isX: boolean, color: string, lw: number): void {
  ctx.strokeStyle = color;
  ctx.lineWidth = lw;
  ctx.beginPath();
  if (isX) {
    ctx.moveTo(x - r, y - r); ctx.lineTo(x + r, y + r);
    ctx.moveTo(x + r, y - r); ctx.lineTo(x - r, y + r);
  } else {
    ctx.arc(x, y, r, 0, Math.PI * 2);
  }
  ctx.stroke();
}

export function coin(ctx: Ctx, cx: number, cy: number, rx: number, ry: number, top: string, side: string, edge: string): void {
  ctx.fillStyle = side;
  ctx.beginPath(); ctx.ellipse(cx, cy + ry * 0.6, rx, ry, 0, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = top; ctx.strokeStyle = edge; ctx.lineWidth = Math.max(2, ry * 0.4);
  ctx.beginPath(); ctx.ellipse(cx, cy, rx, ry, 0, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
}

/** MV 圆形字块：方块底 + 圆盘 + 细环 + 字 */
export function chip(ctx: Ctx, x: number, y: number, s: number, ch: string, alt: boolean, hot = false): void {
  const bg = alt ? C.cream : C.blue;
  const disc = hot ? C.magenta : alt ? C.blue : C.cream;
  const fg = hot ? C.cream : alt ? C.cream : C.blue;
  ctx.fillStyle = bg; ctx.fillRect(x, y, s, s);
  ctx.fillStyle = disc;
  ctx.beginPath(); ctx.arc(x + s / 2, y + s / 2, s * 0.44, 0, Math.PI * 2); ctx.fill();
  ctx.strokeStyle = bg; ctx.lineWidth = Math.max(1.5, s * 0.03);
  ctx.beginPath(); ctx.arc(x + s / 2, y + s / 2, s * 0.37, 0, Math.PI * 2); ctx.stroke();
  ctx.fillStyle = fg;
  ctx.font = `900 ${Math.round(s * 0.42)}px ${HEI}`;
  ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  ctx.fillText(ch, x + s / 2, y + s / 2 + s * 0.02);
}

function shard(ctx: Ctx, x: number, y: number, s: number, rot: number, color: string): void {
  ctx.save(); ctx.translate(x, y); ctx.rotate(rot); ctx.fillStyle = color;
  ctx.beginPath(); ctx.moveTo(0, -s); ctx.lineTo(s * 0.8, s * 0.6); ctx.lineTo(-s * 0.7, s * 0.3); ctx.closePath(); ctx.fill();
  ctx.restore();
}

function inkBar(ctx: Ctx, x: number, y: number, len: number, th: number, rot: number, color = C.ink): void {
  ctx.save(); ctx.translate(x, y); ctx.rotate(rot); ctx.fillStyle = color; ctx.fillRect(0, -th / 2, len, th); ctx.restore();
}

function dots(ctx: Ctx, x: number, y: number, d: number, color: string): void {
  const pattern = [1, 1, 1, 0.6, 1, 1, 0.4, 0.4];
  ctx.fillStyle = color;
  let cx = x;
  for (const k of pattern) {
    ctx.beginPath(); ctx.arc(cx, y, (d * k) / 2, 0, Math.PI * 2); ctx.fill();
    cx += d * k + d * 1.1;
  }
}

function deepCircles(ctx: Ctx, w: number, h: number, step: number): void {
  ctx.fillStyle = C.blueDeep;
  for (let y = -step / 2; y < h + step; y += step)
    for (let x = -step / 2; x < w + step; x += step) {
      ctx.beginPath(); ctx.arc(x, y, step * 0.38, 0, Math.PI * 2); ctx.fill();
    }
}

const CONF = [C.cyan, C.cream, C.violet, C.cyan, C.cream, C.violet, C.lime, C.magenta];

/* ---------- 画面 ---------- */

export function drawFrame(ctx: Ctx, w: number, h: number, kind: FrameKind, info: FrameInfo, seed: number): void {
  const r = rng(seed * 7919 + 13);
  const m = Math.min(w, h);
  ctx.save();
  ctx.textAlign = 'left'; ctx.textBaseline = 'alphabetic';

  switch (kind) {
    case 'checker': {
      ctx.fillStyle = C.ink; ctx.fillRect(0, 0, w, h);
      const n = 5, cell = Math.ceil(h / n), cols = Math.ceil(w / cell) + 1;
      const off = (seed % 2) * cell * 0.5;
      for (let y = 0; y < n; y++)
        for (let x = 0; x < cols; x++) {
          const dark = (x + y + seed) % 2 === 0;
          const bg = dark ? C.ink : C.cream, fg = dark ? C.cream : C.ink;
          const px = x * cell - off, py = y * cell;
          ctx.fillStyle = bg; ctx.fillRect(px, py, cell, cell);
          ctx.fillStyle = fg; ctx.beginPath(); ctx.arc(px + cell / 2, py + cell / 2, cell * 0.42, 0, Math.PI * 2); ctx.fill();
          ctx.strokeStyle = bg; ctx.lineWidth = cell * 0.05;
          ctx.beginPath(); ctx.arc(px + cell / 2, py + cell / 2, cell * 0.25, 0, Math.PI * 2); ctx.stroke();
        }
      break;
    }
    case 'band': {
      ctx.fillStyle = C.paper; ctx.fillRect(0, 0, w, h);
      ctx.save();
      ctx.translate(w / 2, h * 0.52); ctx.rotate(-0.05 - (seed % 3) * 0.03);
      const bh = h * 0.26;
      ctx.fillStyle = C.blue; ctx.fillRect(-w, -bh / 2, w * 2, bh);
      let i = 0;
      for (let x = -w * 0.75; x < w * 0.75; x += bh * 0.95, i++) {
        if (x < w * 0.05) ox(ctx, x, 0, bh * 0.26, i % 2 === 1, C.cream, bh * 0.07);
        else coin(ctx, x, -bh * 0.05, bh * 0.42, bh * 0.14, C.cream, C.blueDeep, C.blue);
      }
      ctx.restore();
      inkBar(ctx, w * 0.06, h * 0.2, w * 0.2, h * 0.04, -0.36);
      inkBar(ctx, w * 0.74, h * 0.84, w * 0.2, h * 0.04, -0.36);
      dots(ctx, w * 0.3, h * 0.22, m * 0.022, C.blue);
      ctx.strokeStyle = C.blue; ctx.lineWidth = m * 0.008;
      ctx.beginPath(); ctx.moveTo(w * 0.62, 0); ctx.lineTo(w * 0.62, h * 0.4); ctx.stroke();
      break;
    }
    case 'sparkle': {
      ctx.fillStyle = C.paper; ctx.fillRect(0, 0, w, h);
      const cx = w * (0.36 + r() * 0.1), cy = h * 0.56, R = m * 0.62;
      starPath(ctx, cx, cy, R, 0.02, 0.1);
      ctx.fillStyle = C.blue; ctx.fill();
      ctx.save(); starPath(ctx, cx, cy, R, 0.02, 0.1); ctx.clip();
      for (let i = 0; i < 46; i++)
        shard(ctx, cx + (r() - 0.5) * R * 0.9, cy + (r() - 0.5) * R * 0.9, m * (0.006 + r() * 0.012), r() * 6.3, CONF[Math.floor(r() * CONF.length)]);
      ctx.restore();
      for (const [fx, fy, fs] of [[0.3, 0.42, 0.05], [0.45, 0.66, 0.035]] as const) {
        starPath(ctx, w * fx, h * fy, m * fs, 0, 0.05); ctx.fillStyle = C.cream; ctx.fill();
      }
      starPath(ctx, w * 0.84, h * 0.24, m * 0.2, 0.1, 0.1); ctx.fillStyle = C.blue; ctx.fill();
      inkBar(ctx, w * 0.7, h * 0.78, w * 0.24, h * 0.035, -0.3);
      break;
    }
    case 'number': {
      ctx.fillStyle = C.blue; ctx.fillRect(0, 0, w, h);
      deepCircles(ctx, w, h, m * 0.42);
      const useDays = info.days > 0;
      const val = pad(useDays ? info.days : info.hours);
      ctx.fillStyle = C.cream;
      ctx.font = `900 ${Math.round(m * 0.075)}px ${HEI}`;
      ctx.fillText('距下次训练', w * 0.06, h * 0.16);
      ctx.font = `700 ${Math.round(h * 0.86)}px ${NUM}`;
      const tw = ctx.measureText(val).width;
      ctx.fillText(val, w * 0.06, h * 0.93);
      ctx.font = `900 ${Math.round(h * 0.16)}px ${HEI}`;
      ctx.fillText(useDays ? '天' : '时', w * 0.06 + tw + w * 0.02, h * 0.9);
      ctx.fillStyle = C.cream; ctx.fillRect(w * 0.06, h * 0.21, w * 0.88, Math.max(2, m * 0.006));
      ctx.font = `700 ${Math.round(m * 0.06)}px ${NUM}`; ctx.textAlign = 'right';
      ctx.fillText(`No.${pad(info.no)}`, w * 0.94, h * 0.16);
      break;
    }
    case 'calendar': {
      ctx.fillStyle = C.paper; ctx.fillRect(0, 0, w, h);
      const p = local(info.now);
      const first = Date.parse(`${p.y}-${pad(p.mo)}-01T12:00:00+08:00`);
      const lead = (local(first).wd + 6) % 7;
      const daysIn = new Date(Date.UTC(p.y, p.mo, 0)).getUTCDate();
      const rows = Math.ceil((lead + daysIn) / 7);
      ctx.fillStyle = C.blue; ctx.font = `900 ${Math.round(h * 0.2)}px ${HEI}`;
      ctx.fillText(`${p.mo}月`, w * 0.05, h * 0.24);
      ctx.font = `700 ${Math.round(h * 0.06)}px ${NUM}`; ctx.fillStyle = C.ink;
      ctx.fillText(String(p.y), w * 0.05 + ctx.measureText('0').width * 0, h * 0.32);
      const gx = w * 0.38, gy = h * 0.08, gw = w * 0.57, gh = h * 0.84;
      const cw = gw / 7, chh = gh / (rows + 1);
      ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      ctx.font = `900 ${Math.round(chh * 0.38)}px ${HEI}`;
      WEEK_HEAD.forEach((d, i) => { ctx.fillStyle = i === 2 ? C.blue : 'rgba(11,11,38,.45)'; ctx.fillText(d, gx + cw * (i + 0.5), gy + chh * 0.5); });
      const today = dayStart(info.now);
      for (let d = 1; d <= daysIn; d++) {
        const idx = lead + d - 1, col = idx % 7, row = Math.floor(idx / 7) + 1;
        const x = gx + col * cw, y = gy + row * chh;
        const t = first + (d - 1) * DAY;
        const s = sessionOn(t);
        const isToday = dayStart(t) === today;
        if (s) {
          ctx.fillStyle = C.blue; ctx.fillRect(x + 2, y + 2, cw - 4, chh - 4);
          ctx.fillStyle = C.cream; ctx.font = `900 ${Math.round(chh * 0.44)}px ${HEI}`;
          ctx.fillText(s.subject[0], x + cw / 2, y + chh / 2);
        } else {
          ctx.fillStyle = dayStart(t) < today ? 'rgba(11,11,38,.25)' : C.ink;
          ctx.font = `700 ${Math.round(chh * 0.42)}px ${NUM}`;
          ctx.fillText(String(d), x + cw / 2, y + chh / 2);
        }
        if (isToday) {
          ctx.strokeStyle = C.magenta; ctx.lineWidth = Math.max(2, chh * 0.07);
          ctx.beginPath(); ctx.arc(x + cw / 2, y + chh / 2, Math.min(cw, chh) * 0.44, 0, Math.PI * 2); ctx.stroke();
        }
      }
      ctx.textAlign = 'left'; ctx.textBaseline = 'alphabetic';
      ctx.fillStyle = C.blue; ctx.font = `900 ${Math.round(h * 0.055)}px ${HEI}`;
      ctx.fillText(`每周三 ${TRAINING.timeLabel}`, w * 0.05, h * 0.88);
      break;
    }
    case 'dots': {
      ctx.fillStyle = C.blue; ctx.fillRect(0, 0, w, h);
      const step = m * 0.16, rad = step * 0.36;
      let row = 0;
      for (let y = step * 0.5; y < h + step; y += step * 0.86, row++)
        for (let x = (row % 2 ? step / 2 : 0); x < w + step; x += step) {
          const t = r();
          if (t < 0.16) continue;
          if (t < 0.3) { ctx.strokeStyle = C.cream; ctx.lineWidth = rad * 0.26; ctx.beginPath(); ctx.arc(x, y, rad * 0.86, 0, Math.PI * 2); ctx.stroke(); }
          else { ctx.fillStyle = C.cream; ctx.beginPath(); ctx.arc(x, y, rad, 0, Math.PI * 2); ctx.fill(); }
        }
      ctx.strokeStyle = C.cream; ctx.lineWidth = Math.max(2, m * 0.006);
      ctx.beginPath(); ctx.moveTo(0, h * 0.9); ctx.lineTo(w, h * 0.2); ctx.stroke();
      break;
    }
    case 'chips': {
      ctx.fillStyle = C.paper; ctx.fillRect(0, 0, w, h);
      const chars = [...`${info.subject}第${cnNum(info.no)}次`];
      const lb = h * 0.1;
      const s = Math.min((h - lb * 2) / (chars.length + 0.6), w * 0.14);
      const x = w / 2 - s / 2;
      ctx.fillStyle = C.blue; ctx.fillRect(w / 2 - s * 0.04, 0, s * 0.08, h);
      const y0 = (h - s * chars.length) / 2;
      chars.forEach((ch, i) => chip(ctx, x, y0 + i * s, s, ch, i % 2 === 1, i < info.subject.length && i === 0));
      ctx.fillStyle = C.ink; ctx.fillRect(0, 0, w, lb); ctx.fillRect(0, h - lb, w, lb);
      inkBar(ctx, w * 0.06, h * 0.3, w * 0.22, h * 0.035, -0.3);
      inkBar(ctx, w * 0.72, h * 0.74, w * 0.22, h * 0.035, 0.3);
      dots(ctx, w * 0.68, h * 0.3, m * 0.02, C.blue);
      break;
    }
    case 'glyph': {
      ctx.fillStyle = C.blue; ctx.fillRect(0, 0, w, h);
      const px = w * 0.06, py = h * 0.1, pw = w * 0.66, ph = h * 0.8, c = m * 0.08;
      ctx.fillStyle = C.cream; ctx.beginPath();
      ctx.moveTo(px + c, py); ctx.lineTo(px + pw - c, py); ctx.lineTo(px + pw, py + c); ctx.lineTo(px + pw, py + ph - c);
      ctx.lineTo(px + pw - c, py + ph); ctx.lineTo(px + c, py + ph); ctx.lineTo(px, py + ph - c); ctx.lineTo(px, py + c); ctx.closePath(); ctx.fill();
      ctx.fillStyle = C.blue; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      ctx.font = `900 ${Math.round(ph * 0.82)}px ${HEI}`;
      ctx.fillText(info.subject[0], px + pw / 2, py + ph * 0.53);
      const colX = w * 0.86, cell = h / 6;
      for (let i = 0; i < 6; i++) ox(ctx, colX, cell * (i + 0.5), cell * 0.26, i % 2 === 1, C.cream, cell * 0.07);
      ctx.fillStyle = C.cream; ctx.font = `700 ${Math.round(m * 0.06)}px ${NUM}`; ctx.textAlign = 'right'; ctx.textBaseline = 'alphabetic';
      ctx.fillText(`No.${pad(info.no)}`, w * 0.72, h * 0.97);
      break;
    }
  }
  ctx.restore();
}
