// 01 下次训练：科目大字卡 + 秒级滚轮倒计时 + 机械小部件（开关 / 电池 / 旋钮 / 方块阵列）+ 本轮六格字块
import type { Model } from '../model';
import { TRAINING } from '../data/schedule';
import { pad, fmtDate, fmtTime, weekday, cnNum } from '../lib/time';
import { roller, type Roller } from '../ui/roller';
import { h, chipsHTML, type ChipState } from '../ui/dom';
import { createGadgets } from '../ui/gadgets';

export interface Section { el: HTMLElement; update(m: Model): void }

export function head(no: string, zh: string, en: string): string {
  return `<header class="sh" data-reveal><span class="sh-no">${no}</span><span class="sh-t">${zh}</span><span class="sh-en">${en}</span><i class="sh-rule"></i></header>`;
}

export function createNext(m0: Model): Section {
  const el = h('section', 'sec s-next');
  el.id = 'next';
  el.dataset.tr = 'bars';
  el.innerHTML = `
    <div class="giant g-next" aria-hidden="true">NEXT</div>
    ${head('01', '下次<em>训</em>练', 'NEXT SESSION')}
    <div class="nx">
      <article class="nx-card cut" data-reveal style="--i:1">
        <div class="nx-top"><b class="nx-no"></b><span class="nx-round"></span></div>
        <div class="nx-subj"></div>
        <div class="nx-date"></div>
        <i class="nx-ox" aria-hidden="true"></i>
      </article>
      <div class="nx-right">
        <div class="nx-lbl" data-reveal style="--i:2"></div>
        <div class="cd-row" data-reveal style="--i:3" role="timer" aria-live="off"></div>
        <div class="gz-slot"></div>
        <div class="nx-chips chips-row" data-reveal style="--i:5"></div>
        <p class="nx-note" data-reveal style="--i:6">${TRAINING.dayLabel} ${TRAINING.timeLabel} · 数学 → 英语 → 数学 → 英语 → 数学 → 语文，六周一轮，考试周照常进行。</p>
      </div>
    </div>`;

  const gz = createGadgets();
  gz.el.setAttribute('data-reveal', '');
  gz.el.style.setProperty('--i', '4');
  el.querySelector('.gz-slot')!.replaceWith(gz.el);

  const cd = el.querySelector('.cd-row')!;
  const units: [Roller, string][] = [[roller(2, 'r-d'), '天'], [roller(2), '时'], [roller(2), '分'], [roller(2, 'r-s'), '秒']];
  units.forEach(([r, u]) => {
    const g = h('span', 'cd-g');
    g.append(r.el, h('span', 'cd-u', u));
    cd.appendChild(g);
  });
  const sr = h('span', 'sr-only');
  cd.appendChild(sr);

  let lastKey = '';
  function update(m: Model): void {
    const s = m.next;
    const key = `${s.no}-${m.live}`;
    if (key !== lastKey) {
      lastKey = key;
      el.classList.toggle('is-live', m.live);
      el.querySelector('.nx-no')!.textContent = `第 ${pad(s.no)} 次`;
      el.querySelector('.nx-round')!.textContent = `第${cnNum(s.round)}轮 · ${s.pos}/6`;
      el.querySelector('.nx-subj')!.textContent = s.subject;
      el.querySelector('.nx-date')!.textContent = `${fmtDate(s.start)} ${weekday(s.start)} ${fmtTime(s.start)}–${fmtTime(s.end)}`;
      el.querySelector('.nx-lbl')!.innerHTML = m.live ? '<b>进行中</b> 距结束' : '距开考';
      const states: ChipState[] = TRAINING.cycle.map((_, i) => (i + 1 < s.pos ? 'past' : i + 1 === s.pos ? 'now' : 'base'));
      el.querySelector('.nx-chips')!.innerHTML = chipsHTML(TRAINING.cycle.map((x) => x[0]), states);
    }
    const L = m.left;
    units[0][0].set(L.d); units[1][0].set(L.h); units[2][0].set(L.m); units[3][0].set(L.s);
    cd.classList.toggle('no-day', L.d === 0);
    gz.update(m);
    if (L.s === 0 || !sr.textContent) sr.textContent = `${m.live ? '距结束' : '距开考'} ${L.d} 天 ${L.h} 小时 ${L.m} 分`;
  }
  update(m0);
  return { el, update };
}
