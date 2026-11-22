// 间奏段：MV 式歌词呈现 —— 横排胶囊字块、白色大字歌词（个别字染色）、黑块遮挡故障、点列；背后是裁切的超大「14:35」
import type { Model } from '../model';
import { cnNum } from '../lib/time';
import { hash } from '../lib/rng';
import { h, chipsHTML } from '../ui/dom';
import type { Section } from './next';

export interface Lyric extends Section { tick(beat: number): void }

type Part = [string, string?];
const line = (parts: Part[]) =>
  parts.map(([s, cls]) => [...s].map((ch) => `<span class="${cls ?? ''}">${ch}</span>`).join('')).join('');

export function createLyric(m0: Model): Lyric {
  const el = h('section', 'sec s-lyric');
  el.id = 'lyric';
  el.dataset.tr = 'glyph';
  el.dataset.trg = '三';
  el.innerHTML = `
    <div class="giant g-time" aria-hidden="true">14:35</div>
    <div class="ly-wrap">
      <div class="capsule" data-reveal></div>
      <p class="lyric ly1" data-reveal style="--i:1"></p>
      <p class="lyric ly2" data-reveal style="--i:2"></p>
      <div class="ly-dots" data-reveal style="--i:3" aria-hidden="true"><i></i><i></i><i></i><i class="s"></i><i></i><i></i><i class="xs"></i><i class="xs"></i></div>
    </div>`;
  const cap = el.querySelector('.capsule') as HTMLElement;
  const ly1 = el.querySelector('.ly1') as HTMLElement;
  const ly2 = el.querySelector('.ly2') as HTMLElement;
  let spans: HTMLElement[] = [];
  let blocked: HTMLElement[] = [];
  let visible = false;
  new IntersectionObserver((es) => { visible = es[0].isIntersecting; }).observe(el);

  let lastNo = -1;
  function update(m: Model): void {
    if (m.next.no === lastNo) return;
    lastNo = m.next.no;
    const s = m.next;
    const chars = [...`下次是${s.subject}`];
    cap.innerHTML = chipsHTML(chars, chars.map((_, i) => (i === 3 ? 'now' : 'base')));
    cap.setAttribute('aria-label', `下次是${s.subject}`);
    ly1.innerHTML = line([['每周'], ['三', 'hl y'], ['，十四点三十五分']]);
    ly2.innerHTML = line([[`第${cnNum(s.no)}次 · `], [s.subject, 'hl l'], [' · 九十分钟']]);
    spans = Array.from(el.querySelectorAll<HTMLElement>('.lyric span'));
    blocked = [];
  }
  update(m0);

  return {
    el, update,
    tick(beat) {
      blocked.forEach((b) => b.classList.remove('blk'));
      blocked = [];
      if (!visible || !spans.length || beat % 24 >= 4) return;
      const n = 1 + Math.floor(hash(beat + 3) * 3);
      for (let k = 0; k < n; k++) {
        const sp = spans[Math.floor(hash(beat * 7 + k * 13) * spans.length)];
        sp.classList.add('blk');
        blocked.push(sp);
      }
    },
  };
}
