import { l } from './text';
import type { EraDef, EraId } from './types';

// Game parameters per era. These are illustrative gameplay values, not historical data.
export const ERAS: EraDef[] = [
  {
    id: 'postwar',
    name: l('Postwar Campus', '战后校园'),
    start: 1948,
    end: 1959,
    theme: l('Automobile growth and campus space', '汽车增长与校园空间'),
    growth: 1.12,
    autoDrift: 3,
    landCost: 1.0,
    president: l('President Harold W. Pemberton III', '哈罗德·W·彭伯顿三世校长'),
    transitDrift: -3,
  },
  {
    id: 'expansion',
    name: l('Urban Expansion', '城市扩张'),
    start: 1960,
    end: 1979,
    theme: l('Parking construction and neighborhood conflict', '停车设施建设与社区冲突'),
    growth: 1.13,
    autoDrift: 2.5,
    landCost: 1.4,
    president: l('President Margaret A. Thornbury', '玛格丽特·A·索恩伯里校长'),
    transitDrift: -4,
  },
  {
    id: 'institutional',
    name: l('Institutionalization', '制度化时期'),
    start: 1980,
    end: 1999,
    theme: l('Permits, garages, commuter expectations', '停车证、停车楼与通勤者的期待'),
    growth: 1.06,
    autoDrift: 1.5,
    landCost: 1.9,
    president: l('President Dr. Raymond K. Ashcroft', '雷蒙德·K·阿什克罗夫特校长'),
    transitDrift: 0,
  },
  {
    id: 'reform',
    name: l('Transportation Reform', '交通改革'),
    start: 2000,
    end: 2019,
    theme: l('Transit benefits, TDM, sustainability', '公交补贴、需求管理与可持续发展'),
    growth: 1.04,
    autoDrift: -1,
    landCost: 2.6,
    president: l('President Dr. Elena Vasquez-Whitfield', '埃琳娜·巴斯克斯-惠特菲尔德校长'),
    transitDrift: 2,
  },
  {
    id: 'modern',
    name: l('Modern Campus', '当代校园'),
    start: 2020,
    end: 2025,
    theme: l('Hybrid work, financial pressure, climate commitments', '混合办公、财务压力与气候承诺'),
    growth: 1.01,
    autoDrift: -2,
    landCost: 3.1,
    president: l('President Dr. Jordan Okafor-Lindqvist', '乔丹·奥卡福-林德奎斯特校长'),
    transitDrift: 0,
  },
];

export const START_YEAR = 1948;
export const END_YEAR = 2025;
export const TURN_YEARS = 5;

export function eraFor(year: number): EraDef {
  return ERAS.find((e) => year >= e.start && year <= e.end) ?? ERAS[ERAS.length - 1];
}

export function eraById(id: EraId): EraDef {
  return ERAS.find((e) => e.id === id)!;
}

/** Length of the turn starting in `year` (the final turn is shortened to end in 2025). */
export function turnLength(year: number): number {
  return Math.min(TURN_YEARS, END_YEAR - year);
}

export function totalTurns(): number {
  let n = 0;
  for (let y = START_YEAR; y < END_YEAR; y += TURN_YEARS) n++;
  return n;
}
