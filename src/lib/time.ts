// 时间工具：全部按 Asia/Shanghai（UTC+8，无夏令时），与访问者设备时区无关
const OFFSET_MS = 8 * 3600_000;
export const DAY = 86400_000;
const WD = ['日', '一', '二', '三', '四', '五', '六'];

export const pad = (n: number, w = 2): string => String(n).padStart(w, '0');

/** UTC+8 本地时间字符串 → 时间戳 */
export const at = (local: string): number => Date.parse(`${local}+08:00`);

/** ?now= 调试参数；不带时区时按 UTC+8 */
export function parseNow(raw: string | null): number | null {
  if (!raw) return null;
  let s = raw.trim().replace(' ', 'T');
  if (/^\d{4}-\d{2}-\d{2}$/.test(s)) s += 'T00:00';
  if (/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(s)) s += ':00';
  if (!/([zZ]|[+-]\d{2}:?\d{2})$/.test(s)) s += '+08:00';
  const t = Date.parse(s);
  return Number.isNaN(t) ? null : t;
}

export interface LocalParts { y: number; mo: number; d: number; h: number; mi: number; s: number; wd: number }

export function local(t: number): LocalParts {
  const d = new Date(t + OFFSET_MS);
  return {
    y: d.getUTCFullYear(), mo: d.getUTCMonth() + 1, d: d.getUTCDate(),
    h: d.getUTCHours(), mi: d.getUTCMinutes(), s: d.getUTCSeconds(), wd: d.getUTCDay(),
  };
}

/** UTC+8 当日 0 点 */
export const dayStart = (t: number): number => Math.floor((t + OFFSET_MS) / DAY) * DAY - OFFSET_MS;

export const fmtDate = (t: number) => { const p = local(t); return `${p.y}.${pad(p.mo)}.${pad(p.d)}`; };
export const fmtShort = (t: number) => { const p = local(t); return `${pad(p.mo)}.${pad(p.d)}`; };
export const fmtTime = (t: number) => { const p = local(t); return `${pad(p.h)}:${pad(p.mi)}`; };
export const fmtClock = (t: number) => { const p = local(t); return `${pad(p.h)}:${pad(p.mi)}:${pad(p.s)}`; };
export const weekday = (t: number) => `周${WD[local(t).wd]}`;
export const WEEK_HEAD = ['一', '二', '三', '四', '五', '六', '日'];

export interface Span { d: number; h: number; m: number; s: number; total: number }

/** 剩余时长（秒级，向下取整） */
export function span(ms: number): Span {
  const total = Math.max(0, Math.floor(ms / 1000));
  return {
    d: Math.floor(total / 86400),
    h: Math.floor((total % 86400) / 3600),
    m: Math.floor((total % 3600) / 60),
    s: total % 60,
    total,
  };
}

/** 相差的自然日（UTC+8） */
export const daysBetween = (a: number, b: number) => Math.round((dayStart(b) - dayStart(a)) / DAY);

const CN = '零一二三四五六七八九';
export function cnNum(n: number): string {
  if (n < 10) return CN[n];
  if (n < 20) return '十' + (n % 10 ? CN[n % 10] : '');
  if (n < 100) return CN[Math.floor(n / 10)] + '十' + (n % 10 ? CN[n % 10] : '');
  return String(n);
}
