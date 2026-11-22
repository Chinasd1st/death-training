import { EXAMS, type Exam } from './data/schedule';
import { span, type Span } from './lib/time';
import { upcoming, sessions, session, type Session } from './lib/training';

export interface ExamView extends Exam { left: Span }

export interface Model {
  now: number;
  next: Session;
  /** 上一场（用于周进度条） */
  prev: Session;
  live: boolean;
  left: Span;
  /** 本周期进度 0–1：上一场结束 → 下一场开始；进行中时为场内进度 */
  progress: number;
  /** 接下来的训练（与考试无关，持续排下去） */
  seq: Session[];
  /** 未到的考试：高二在前 */
  exams: ExamView[];
  done: Exam[];
}

export function buildModel(now: number): Model {
  const { session: next, live } = upcoming(now);
  const prev = session(next.index - 1);
  const target = live ? next.end : next.start;
  const progress = live
    ? (now - next.start) / (next.end - next.start)
    : (now - prev.end) / (next.start - prev.end);

  const exams = EXAMS.filter((e) => e.time > now)
    .sort((a, b) => (a.grade === b.grade ? a.time - b.time : a.grade === '高二' ? -1 : 1))
    .map((e) => ({ ...e, left: span(e.time - now) }));
  const done = EXAMS.filter((e) => e.time <= now).sort((a, b) => b.time - a.time);

  return {
    now, next, prev, live,
    left: span(target - now),
    progress: Math.min(1, Math.max(0, progress)),
    seq: sessions(next.index, 12),
    exams, done,
  };
}
