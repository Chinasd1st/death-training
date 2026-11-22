// 小工具：DOM 构建、圆形字块、O× 纹、月历
import { DAY, dayStart, local, WEEK_HEAD, fmtShort } from '../lib/time';
import { sessionOn } from '../lib/training';
import { EXAMS } from '../data/schedule';

export function h(tag: string, cls = '', html = ''): HTMLElement {
  const el = document.createElement(tag);
  if (cls) el.className = cls;
  if (html) el.innerHTML = html;
  return el;
}

export type ChipState = 'base' | 'now' | 'past';

export function chipsHTML(chars: string[], states: ChipState[] = []): string {
  return chars.map((c, i) => `<span class="chip ${i % 2 ? 'alt' : ''} ${states[i] ?? 'base'}"><span>${c}</span></span>`).join('');
}

/** 从本周一排到 end 所在周，标出今天、训练日、考试日 */
export function calendarHTML(now: number, end: number): string {
  const today = dayStart(now);
  const wd = (local(now).wd + 6) % 7;
  const start = today - wd * DAY;
  const last = dayStart(end);
  const rows = Math.ceil((Math.floor((last - start) / DAY) + 1) / 7);
  const examDays = new Map(EXAMS.map((e) => [dayStart(e.time), e]));
  let s = WEEK_HEAD.map((d, i) => `<span class="ch${i === 2 ? ' wed' : ''}">${d}</span>`).join('');
  for (let i = 0; i < rows * 7; i++) {
    const t = start + i * DAY;
    const p = local(t + DAY / 2);
    const cls = ['cd'];
    let label = String(p.d);
    const ex = examDays.get(t);
    const tr = sessionOn(t);
    if (t < today) cls.push('past');
    if (t === today) cls.push('today');
    if (t > last) cls.push('after');
    if (tr && t >= today) { cls.push('train'); label = tr.subject[0]; }
    if (ex && t >= today) { cls.push(t === last ? 'exam' : 'exam2'); label = ex.short === '学考' ? '学' : ex.short === '首考' ? '首' : '考'; }
    if (p.d === 1 && cls.length === 1) label = `${p.mo}月`;
    s += `<span class="${cls.join(' ')}" title="${fmtShort(t)}">${label}</span>`;
  }
  return `<div class="cal" style="--rows:${rows}">${s}</div>`;
}

/** 电路纹（深色面板底纹） */
export const CIRCUIT = `url("data:image/svg+xml,${encodeURIComponent(
  "<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 120 120' fill='none' stroke='#F4F1E6' stroke-opacity='.16' stroke-width='2'><path d='M0 24H34V58H70V96H120M20 120V82H48M88 0V36H120M58 0V20M104 58H120M0 98H18'/><circle cx='34' cy='24' r='3.5'/><circle cx='70' cy='58' r='3.5'/><circle cx='48' cy='82' r='3.5'/><circle cx='88' cy='36' r='3.5'/><circle cx='58' cy='20' r='3.5'/><circle cx='104' cy='58' r='3.5'/><circle cx='18' cy='98' r='3.5'/></svg>",
)}")`;

/** 黄绿链条纹（段落分隔） */
export const CHAIN = `url("data:image/svg+xml,${encodeURIComponent(
  "<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 64 24'><rect x='3' y='5' width='36' height='14' rx='7' fill='none' stroke='#C8FF1E' stroke-width='4'/><rect x='35' y='10' width='28' height='4' rx='2' fill='#C8FF1E'/></svg>",
)}")`;

/** O× 竖条纹（下次训练卡片右侧） */
export const OX_COLUMN = `url("data:image/svg+xml,${encodeURIComponent(
  '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 200"><circle cx="50" cy="50" r="24" fill="none" stroke="#F4F1E6" stroke-width="9"/><path d="M27 127 L73 173 M73 127 L27 173" stroke="#F4F1E6" stroke-width="9"/></svg>',
)}")`;
