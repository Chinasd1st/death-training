// 03 考试：高二学考为主面板，高三首考为参考面板；滚动驱动 -webkit-mask 擦除入场
import type { Model, ExamView } from '../model';
import { pad, fmtDate, fmtTime, weekday, fmtShort } from '../lib/time';
import { inOutExpo, clamp } from '../lib/ease';
import { roller, type Roller } from '../ui/roller';
import { h, calendarHTML } from '../ui/dom';
import { head, type Section } from './next';

export interface Exams extends Section { tick(): void }

export function createExams(m0: Model): Exams {
  const el = h('section', 'sec s-exams');
  el.id = 'exams';
  el.dataset.tr = 'bars';
  el.innerHTML = `<div class="giant g-exam" aria-hidden="true">EXAM</div>${head('03', '<em class="m">考</em>试', 'EXAMS')}<div class="ex-grid"></div><div class="ex-done" data-reveal></div>`;
  const grid = el.querySelector('.ex-grid') as HTMLElement;
  let panels: { e: ExamView; el: HTMLElement; r: Roller[] }[] = [];
  let lastKey = '';

  function build(m: Model): void {
    grid.innerHTML = '';
    panels = m.exams.map((e, i) => {
      const main = i === 0;
      const p = h('article', `ex cut ${main ? 'ex-main' : 'ex-side'}`);
      p.dataset.wipe = '';
      p.innerHTML = `
        <div class="ex-head">
          <span class="ex-tag">${e.grade}${e.grade === '高二' ? ' · 我们的' : ' · 参考'}</span>
          <span class="ex-note">${e.note}</span>
        </div>
        <h3 class="ex-name">${e.name}</h3>
        <div class="ex-cd cd-row"></div>
        <div class="ex-dt">${fmtDate(e.time)} ${weekday(e.time)} ${fmtTime(e.time)} <b>${e.edge === 'start' ? '开考' : '结束'}</b></div>
        ${main ? calendarHTML(m.now, e.time) : ''}`;
      const cd = p.querySelector('.ex-cd')!;
      const rs = [roller(2, 'r-d'), roller(2), roller(2), roller(2, 'r-s')];
      ['天', '时', '分', '秒'].forEach((u, k) => {
        const g = h('span', 'cd-g');
        g.append(rs[k].el, h('span', 'cd-u', u));
        cd.appendChild(g);
      });
      grid.appendChild(p);
      return { e, el: p, r: rs };
    });
    if (!panels.length) grid.innerHTML = '<p class="ex-empty">本阶段考试已全部结束。</p>';
    el.querySelector('.ex-done')!.innerHTML = m.done
      .map((e) => `<span><b>已结束</b>${e.short} · ${fmtShort(e.time)} ${fmtTime(e.time)}</span>`)
      .join('');
  }

  function update(m: Model): void {
    const key = m.exams.map((e) => e.id).join() + '|' + Math.floor(m.now / 86400000);
    if (key !== lastKey) { lastKey = key; build(m); }
    for (const p of panels) {
      const L = m.exams.find((e) => e.id === p.e.id)?.left;
      if (!L) continue;
      p.r[0].set(L.d); p.r[1].set(L.h); p.r[2].set(L.m); p.r[3].set(L.s);
      p.el.setAttribute('aria-label', `${p.e.name} 还有 ${L.d} 天 ${pad(L.h)} 小时`);
    }
  }
  update(m0);

  return {
    el, update,
    tick() {
      const vh = window.innerHeight;
      for (const p of panels) {
        const r = p.el.getBoundingClientRect();
        const t = clamp((vh - r.top) / (vh * 0.8));
        p.el.style.setProperty('--w', inOutExpo(t).toFixed(4));
      }
    },
  };
}
