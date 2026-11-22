import { approach } from '../lib/ease';

export interface ScrollState { y: number; sy: number; v: number }

/** 平滑滚动状态：sy 为指数逼近后的滚动位置，v 为平滑速度（px/s） */
export function createScroll(): ScrollState & { update(dt: number): void } {
  const s = {
    y: window.scrollY, sy: window.scrollY, v: 0,
    update(dt: number) {
      const prev = s.sy;
      s.y = window.scrollY;
      s.sy = approach(s.sy, s.y, 11, dt);
      const raw = dt > 0 ? (s.sy - prev) / dt : 0;
      s.v = approach(s.v, raw, 8, dt);
    },
  };
  return s;
}
