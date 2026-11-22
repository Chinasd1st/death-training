// 机械 / 界面小部件（参考 MV 的 OFF 开关、电池、旋钮、深色方块阵列），全部绑定真实数据：
//  开关 = 是否进行中；电池 = 本周期进度；旋钮 = 本轮第几次；方块阵列 = 剩余小时（7 行 × 24 格）/ 进行中剩余分钟（6 × 15）
import type { Model } from '../model';
import { TRAINING } from '../data/schedule';
import { cnNum } from '../lib/time';
import { h } from './dom';

export interface Gadgets { el: HTMLElement; update(m: Model): void }

function dialSVG(): string {
  let labels = '';
  TRAINING.cycle.forEach((s, i) => {
    const a = ((-90 + i * 60) * Math.PI) / 180;
    const x = 60 + Math.cos(a) * 42, y = 60 + Math.sin(a) * 42;
    labels += `<g class="dl" data-i="${i}"><circle cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" r="11"/><text x="${x.toFixed(1)}" y="${y.toFixed(1)}">${s[0]}</text></g>`;
  });
  return `<svg class="dial" viewBox="0 0 120 120" aria-hidden="true">
    <circle cx="60" cy="60" r="57" class="d-ring"/>
    <circle cx="60" cy="60" r="27" class="d-dash"/>
    ${labels}
    <g class="needle"><line x1="60" y1="60" x2="60" y2="32"/><circle cx="60" cy="60" r="8"/></g>
  </svg>`;
}

export function createGadgets(): Gadgets {
  const el = h('div', 'gz-row cut');
  el.innerHTML = `
    <div class="gz gz-sw"><span class="gz-k">LIVE</span><div class="sw"><b>ON</b><b>OFF</b><i></i></div><span class="gz-c"></span></div>
    <div class="gz gz-bat"><span class="gz-k">CYCLE</span><div class="bat">${'<i></i>'.repeat(10)}</div><span class="gz-c"></span></div>
    <div class="gz gz-dial"><span class="gz-k">ROUND</span>${dialSVG()}<span class="gz-c"></span></div>
    <div class="gz gz-mx"><span class="gz-k"></span><div class="mx"></div><span class="gz-c"></span></div>`;

  const sw = el.querySelector('.gz-sw') as HTMLElement;
  const bat = Array.from(el.querySelectorAll<HTMLElement>('.bat i'));
  const needle = el.querySelector('.needle') as SVGGElement;
  const dls = Array.from(el.querySelectorAll<SVGGElement>('.dl'));
  const mx = el.querySelector('.mx') as HTMLElement;
  const cap = (sel: string) => el.querySelector(`${sel} .gz-c`) as HTMLElement;
  let mxKey = '';
  let batN = -1;
  let pos = -1;

  return {
    el,
    update(m) {
      const s = m.next;
      sw.classList.toggle('is-on', m.live);
      cap('.gz-sw').textContent = m.live ? '进行中' : '未开始';

      const n = Math.round(m.progress * 10);
      if (n !== batN) { batN = n; bat.forEach((b, i) => b.classList.toggle('on', i < n)); }
      cap('.gz-bat').textContent = `${m.live ? '本场' : '本周期'} ${Math.round(m.progress * 100)}%`;

      if (s.pos !== pos) {
        pos = s.pos;
        needle.style.setProperty('--a', `${(s.pos - 1) * 60}deg`);
        dls.forEach((d, i) => d.classList.toggle('on', i === s.pos - 1));
        cap('.gz-dial').textContent = `第${cnNum(s.round)}轮 ${s.pos}/6`;
      }

      const total = m.live ? 90 : 168;
      const rem = m.live
        ? Math.max(0, Math.ceil((s.end - m.now) / 60000))
        : Math.max(0, Math.min(168, Math.ceil((s.start - m.now) / 3600000)));
      const key = `${m.live}-${rem}`;
      if (key !== mxKey) {
        mxKey = key;
        mx.style.setProperty('--cols', String(m.live ? 15 : 24));
        let html = '';
        for (let i = 0; i < total; i++) html += `<i class="${i < rem ? (i === rem - 1 ? 'on cur' : 'on') : ''}"></i>`;
        mx.innerHTML = html;
        el.querySelector('.gz-mx .gz-k')!.textContent = m.live ? '90 MIN · 1格=1分钟' : '168 H · 1格=1小时';
        cap('.gz-mx').textContent = m.live ? `剩 ${rem} 分钟` : `剩 ${rem} 小时`;
      }
    },
  };
}
