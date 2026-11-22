// 04 收尾：每周三 14:35 + 下一次的日期；页脚显示数据口径与实时时钟
import type { Model } from '../model';
import { SCHOOL, TRAINING } from '../data/schedule';
import { fmtShort, fmtDate, fmtClock, weekday, pad } from '../lib/time';
import { h } from '../ui/dom';
import type { Section } from './next';

export function createOutro(m0: Model): Section {
  const el = h('section', 'sec s-outro');
  el.innerHTML = `
    <div class="oc" data-reveal>
      <svg class="oc-star" viewBox="0 0 200 200" aria-hidden="true"><path d="M100 0 Q110 90 200 100 Q110 110 100 200 Q90 110 0 100 Q90 90 100 0Z"/></svg>
      <div class="o1">${TRAINING.dayLabel}</div>
      <div class="o2">14:35</div>
      <div class="o3"></div>
    </div>
    <footer class="ft">
      <span>${SCHOOL.full} · ${TRAINING.name}</span>
      <span>时间按北京时间（UTC+8）计算 · <b class="ft-clock"></b></span>
      <span class="ft-credit">设计风格部分参考 初星学园「Luna say maybe」(HATSUBOSHI GAKUEN - Luna say maybe) Official Music Video · 本站为非官方学生作品，与原作无关</span>
      <a href="#top" class="ft-top">回到顶部 ↑</a>
    </footer>`;
  let lastNo = -1;
  function update(m: Model): void {
    if (m.next.no !== lastNo) {
      lastNo = m.next.no;
      el.querySelector('.o3')!.textContent = `下次 ${fmtShort(m.next.start)} · ${m.next.subject} · 第 ${pad(m.next.no)} 次`;
    }
    el.querySelector('.ft-clock')!.textContent = `${fmtDate(m.now)} ${weekday(m.now)} ${fmtClock(m.now)}`;
  }
  update(m0);
  return { el, update };
}
