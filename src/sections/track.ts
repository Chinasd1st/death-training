// 02 训练轨道：纵向滚动驱动的横向轨道（sticky），之后 12 次训练 + 穿插的考试标记
import type { Model } from '../model';
import { EXAMS } from '../data/schedule';
import { pad, fmtShort, weekday, daysBetween, cnNum, dayStart } from '../lib/time';
import { approach, clamp } from '../lib/ease';
import { h } from '../ui/dom';
import { head, type Section } from './next';
import type { ScrollState } from '../ui/scroll';

export interface Track extends Section { tick(dt: number, sc: ScrollState): void; resize(): void }

export function createTrack(m0: Model): Track {
  const el = h('section', 'sec s-track');
  el.id = 'track';
  el.innerHTML = `
    <div class="tr-sticky">
      ${head('02', '训练轨道', 'UPCOMING')}
      <div class="tr-rail" aria-hidden="true"><i class="tr-prog"></i></div>
      <div class="tr-view"><div class="tr-track"></div></div>
      <div class="tr-foot"><span class="tr-count"></span><span class="tr-hint">继续向下滚动 →</span></div>
    </div>`;
  const sticky = el.querySelector('.tr-sticky') as HTMLElement;
  const track = el.querySelector('.tr-track') as HTMLElement;
  const prog = el.querySelector('.tr-prog') as HTMLElement;
  let x = 0, skew = 0, maxX = 0;

  let lastKey = '';
  function render(m: Model): void {
    const key = `${m.next.no}-${dayStart(m.now)}`;
    if (key === lastKey) return;
    lastKey = key;
    const parts: string[] = [];
    const exams = EXAMS.filter((e) => e.time > m.now).sort((a, b) => a.time - b.time);
    let ei = 0;
    m.seq.forEach((s, i) => {
      while (ei < exams.length && exams[ei].time < s.start) {
        const e = exams[ei++];
        parts.push(`<div class="tm ${e.grade === '高二' ? 'mine' : ''}"><b>${e.grade}</b><span>${fmtShort(e.time)} ${e.short}</span></div>`);
      }
      const cls = ['tc', 'cut'];
      if (i === 0) cls.push('is-next');
      if (s.subject === '语文') cls.push('is-yu');
      const dd = daysBetween(m.now, s.start);
      const rel = i === 0 && m.live ? '进行中' : dd === 0 ? '今天' : dd === 1 ? '明天' : `${dd} 天后`;
      parts.push(`
        <article class="${cls.join(' ')}" style="--k:${i % 6}">
          <div class="tc-top"><span class="tc-no">No.${pad(s.no)}</span><span class="tc-r">第${cnNum(s.round)}轮</span></div>
          <div class="tc-s">${s.subject[0]}</div>
          <div class="tc-sub">${s.subject}</div>
          <div class="tc-dt">${fmtShort(s.start)} <small>${weekday(s.start)}</small></div>
          <div class="tc-rel">${rel}</div>
        </article>`);
    });
    track.innerHTML = parts.join('');
    el.querySelector('.tr-count')!.textContent = `接下来 ${m.seq.length} 次 · 至 ${fmtShort(m.seq[m.seq.length - 1].start)}`;
    resize();
  }

  function resize(): void {
    const vw = sticky.clientWidth;
    maxX = Math.max(0, track.scrollWidth - vw + Math.min(96, vw * 0.06));
    el.style.setProperty('--track-h', `${window.innerHeight + maxX}px`);
  }

  render(m0);

  return {
    el,
    update: render,
    resize,
    tick(dt, sc) {
      const r = el.getBoundingClientRect();
      const total = r.height - window.innerHeight;
      const p = total > 0 ? clamp(-r.top / total) : 0;
      x = approach(x, -p * maxX, 9, dt);
      skew = approach(skew, clamp(-sc.v * 0.0016, -5, 5), 7, dt);
      track.style.transform = `translate3d(${x.toFixed(2)}px,0,0) skewX(${skew.toFixed(3)}deg)`;
      prog.style.transform = `scaleX(${(maxX > 0 ? -x / maxX : 0).toFixed(4)})`;
    },
  };
}
