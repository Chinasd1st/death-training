// 非线性缓动 / 物理弹簧 / 三拍一（统一节拍）
export const clamp = (x: number, a = 0, b = 1) => Math.min(b, Math.max(a, x));
export const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
export const range = (t: number, a: number, b: number) => clamp((t - a) / (b - a));

export const outExpo = (t: number) => (t >= 1 ? 1 : 1 - Math.pow(2, -10 * t));
export const inExpo = (t: number) => (t <= 0 ? 0 : Math.pow(2, 10 * t - 10));
export const inOutExpo = (t: number) =>
  t <= 0 ? 0 : t >= 1 ? 1 : t < 0.5 ? Math.pow(2, 20 * t - 10) / 2 : (2 - Math.pow(2, -20 * t + 10)) / 2;
export const outQuart = (t: number) => 1 - Math.pow(1 - t, 4);

/** 欠阻尼弹簧解析解，t 单位秒，0→1（带过冲） */
export function spring(t: number, k = 170, c = 13, m = 1): number {
  if (t <= 0) return 0;
  const w0 = Math.sqrt(k / m);
  const z = c / (2 * Math.sqrt(k * m));
  if (z < 1) {
    const wd = w0 * Math.sqrt(1 - z * z);
    return 1 - Math.exp(-z * w0 * t) * (Math.cos(wd * t) + ((z * w0) / wd) * Math.sin(wd * t));
  }
  return 1 - Math.exp(-w0 * t) * (1 + w0 * t);
}

/**
 * 全站统一节拍：24fps 上的“三拍一” = 每张画停留 3 帧 = 125ms（每秒 8 张）。
 * 开场、闪回、标题、丝带、彩纸、色带、数字滚轮、显现动画全部按这个节拍出画；
 * 只有跟随手指/滚轮的位移保持连续，避免滚动发粘。
 */
export const DRAWING = 3 / 24;
export const DRAWING_MS = DRAWING * 1000;
export const onThrees = (t: number) => Math.floor(t / DRAWING) * DRAWING;
export const beatOf = (ms: number) => Math.floor(ms / DRAWING_MS);

export const approach = (cur: number, target: number, rate: number, dt: number) =>
  cur + (target - cur) * (1 - Math.exp(-rate * dt));

/** 把任意曲线导出为 CSS linear()；stepped=true 时按三拍一量化（与 JS 节拍一致） */
export function toLinear(fn: (sec: number) => number, duration: number, stepped: boolean): string {
  const pts: string[] = [];
  if (stepped) {
    const n = Math.ceil(duration / DRAWING);
    for (let i = 0; i < n; i++) {
      const v = (i === 0 ? 0 : fn(i * DRAWING)).toFixed(4);
      const a = ((i * DRAWING) / duration) * 100;
      const b = Math.min(100, (((i + 1) * DRAWING) / duration) * 100);
      pts.push(`${v} ${a.toFixed(2)}%`, `${v} ${b.toFixed(2)}%`);
    }
  } else {
    const N = 48;
    for (let i = 0; i <= N; i++) pts.push(`${fn((i / N) * duration).toFixed(4)} ${((i / N) * 100).toFixed(2)}%`);
  }
  pts.push('1 100%');
  return `linear(${pts.join(', ')})`;
}

export function installEaseVars(): void {
  if (!CSS.supports('transition-timing-function', 'linear(0, 0.5 50%, 1)')) return;
  const root = document.documentElement.style;
  const sp = (k: number, c: number) => (s: number) => spring(s, k, c);
  const ex = (d: number) => (s: number) => inOutExpo(s / d);
  const ox = (d: number) => (s: number) => outExpo(s / d);
  // 每个变量与实际使用的时长一一对应，保证每一步正好 125ms
  root.setProperty('--st-spring-085', toLinear(sp(170, 13), 0.875, true));   // 数字滚轮 .875s
  root.setProperty('--st-spring-110', toLinear(sp(120, 14), 1.125, true));   // 显现 1.125s
  root.setProperty('--st-expo-125', toLinear(ex(1.25), 1.25, true));         // 色带入场 1.25s
  root.setProperty('--st-expo-100', toLinear(ox(1), 1, true));               // 杂项 1s
  root.setProperty('--st-expo-050', toLinear(ox(0.5), 0.5, true));           // 淡入 .5s
}
