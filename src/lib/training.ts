import { TRAINING } from '../data/schedule';
import { DAY, dayStart } from './time';

const WEEK = 7 * DAY;

export interface Session {
  /** 相对锚点的周偏移 */
  index: number;
  /** 总序号 */
  no: number;
  /** 第几轮（6 次一轮） */
  round: number;
  /** 本轮第几次 1–6 */
  pos: number;
  subject: string;
  start: number;
  end: number;
}

export function session(index: number): Session {
  const n = TRAINING.cycle.length;
  const no = TRAINING.firstNo + index;
  const k = (((no - 1) % n) + n) % n;
  const start = TRAINING.first + index * WEEK;
  return {
    index, no,
    round: Math.floor((no - 1) / n) + 1,
    pos: k + 1,
    subject: TRAINING.cycle[k],
    start,
    end: start + TRAINING.durationMin * 60000,
  };
}

/** 下一场（或正在进行的一场） */
export function upcoming(now: number): { session: Session; live: boolean } {
  const k = Math.floor((now - TRAINING.first) / WEEK);
  let s = session(k);
  if (now >= s.end) s = session(k + 1);
  return { session: s, live: now >= s.start && now < s.end };
}

export const sessions = (from: number, n: number): Session[] =>
  Array.from({ length: n }, (_, i) => session(from + i));

/** 某天若是训练日则返回该场（总序号 < 1 的不算） */
export function sessionOn(day: number): Session | null {
  const k = Math.round((dayStart(day) + (14 * 60 + 35) * 60000 - TRAINING.first) / WEEK);
  const s = session(k);
  return s.no >= 1 && dayStart(s.start) === dayStart(day) ? s : null;
}
