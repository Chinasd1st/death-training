// 光敏性癫痫警告：splash 之前显示，淡入 → 停留 → 淡出（全部按 125ms 一拍）
// 点击 / 按键可提前继续；也可选择跳过开场动画
import { DRAWING_MS } from '../lib/ease';

export function showWarning(): Promise<'play' | 'skip'> {
  return new Promise((resolve) => {
    const el = document.createElement('div');
    el.className = 'warn';
    el.setAttribute('role', 'alertdialog');
    el.setAttribute('aria-labelledby', 'warn-t');
    el.setAttribute('aria-describedby', 'warn-d');
    el.innerHTML = `
      <div class="warn-box">
        <div class="warn-icon" aria-hidden="true"><svg viewBox="0 0 64 56"><path d="M32 3 L61 53 H3 Z"/><rect x="29" y="18" width="6" height="20"/><rect x="29" y="42" width="6" height="6"/></svg></div>
        <h2 id="warn-t" class="warn-t">光敏性癫痫警告</h2>
        <p class="warn-en">PHOTOSENSITIVE SEIZURE WARNING</p>
        <p id="warn-d" class="warn-d">
          本网站包含快速闪烁的光效、高对比度画面与快速切换的图像。<br>
          极少数人在观看此类画面时可能诱发癫痫发作。<br>
          如您或家人有癫痫病史，请谨慎观看；如出现头晕、视觉异常、抽搐等不适，请立即停止观看。
        </p>
        <div class="warn-btns">
          <button type="button" class="warn-go">继续观看</button>
          <button type="button" class="warn-skip">跳过开场动画</button>
        </div>
        <p class="warn-hint">点击任意处继续</p>
      </div>`;
    document.body.appendChild(el);

    const FADE = 4 * DRAWING_MS;   // 淡入 / 淡出各 0.5s = 4 拍
    const HOLD = 40 * DRAWING_MS;  // 停留 5s 后自动继续
    let done = false;
    let timer = 0;

    const finish = (choice: 'play' | 'skip') => {
      if (done) return;
      done = true;
      clearTimeout(timer);
      window.removeEventListener('keydown', onKey);
      el.classList.remove('in');
      el.classList.add('out');
      window.setTimeout(() => { el.remove(); resolve(choice); }, FADE);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') finish('skip');
      else if (e.key === 'Enter' || e.key === ' ') finish('play');
    };

    el.querySelector('.warn-skip')!.addEventListener('click', (e) => { e.stopPropagation(); finish('skip'); });
    el.querySelector('.warn-go')!.addEventListener('click', (e) => { e.stopPropagation(); finish('play'); });
    el.addEventListener('click', () => finish('play'));
    window.addEventListener('keydown', onKey);

    requestAnimationFrame(() => requestAnimationFrame(() => {
      el.classList.add('in');
      (el.querySelector('.warn-go') as HTMLButtonElement).focus({ preventScroll: true });
    }));
    timer = window.setTimeout(() => finish('play'), FADE + HOLD);
  });
}
