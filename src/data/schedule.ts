import { at } from '../lib/time';

export const SCHOOL = {
  full: '浙江省桐乡市高级中学',
  name: '桐乡市高级中学',
  grade: '高二',
};

export interface Exam {
  id: string;
  name: string;
  short: string;
  /** 参加年级 */
  grade: '高二' | '高三';
  note: string;
  time: number;
  edge: 'start' | 'end';
}

export const EXAMS: Exam[] = [
  {
    id: 'midterm',
    name: '浙江省9+1高中联盟2026-2027学年期中考试',
    short: '9+1联盟期中',
    grade: '高二',
    note: '期中',
    time: at('2026-11-13T11:30:00'),
    edge: 'end',
  },
  {
    id: 'xuekao',
    name: '浙江省普通高中学业水平考试',
    short: '学考',
    grade: '高二',
    note: '高二学考',
    time: at('2027-01-08T14:00:00'),
    edge: 'start',
  },
  {
    id: 'xuankao',
    name: '浙江省普通高校招生选考科目考试',
    short: '首考',
    grade: '高三',
    note: '首考 · 含外语',
    time: at('2027-01-06T08:00:00'),
    edge: 'start',
  },
];

/**
 * 死亡限时训练：每周三 14:35–16:05，与考试无关，持续进行。
 * 锚点 2026-11-18 = 总第 7 次（第二轮第 1 次，数学）。
 */
export const TRAINING = {
  name: '死亡限时训练',
  first: at('2026-11-18T14:35:00'),
  firstNo: 7,
  durationMin: 90,
  cycle: ['数学', '英语', '数学', '英语', '数学', '语文'] as readonly string[],
  dayLabel: '每周三',
  timeLabel: '14:35—16:05',
};

export const C = {
  blue: '#1B12F0',
  blueDeep: '#160BD6',
  blueSoft: '#3A33F5',
  cream: '#F4F1E6',
  paper: '#F8F6EE',
  ink: '#0B0B26',
  lime: '#C8FF1E',
  magenta: '#FF1E6E',
  cyan: '#3AE6FF',
  violet: '#8C6BFF',
};

export const HEI = '"Noto Sans SC Variable", "Noto Sans SC", "PingFang SC", "Microsoft YaHei", sans-serif';
export const NUM = '"Barlow Condensed", "Noto Sans SC Variable", sans-serif';

/** 画布中会用到的全部汉字，用于提前加载字体分片 */
export const GLYPHS =
  '浙江省桐乡市高级中学死亡限时训练每周三数学英语语文第次轮一二三四五六七八九十零日月距下开考结束天时分秒进行中' +
  '学考首考含外语期中联盟已结束本还剩后星芒棋盘色带倒数月历圆点字块字形我们的高二高三九十分钟见滚动查看倒计时';
