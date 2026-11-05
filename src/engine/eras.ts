import type { EraDef, EraId } from './types';

// Game parameters per era. These are illustrative gameplay values, not historical data.
export const ERAS: EraDef[] = [
  {
    id: 'postwar',
    name: 'Postwar Campus',
    start: 1948,
    end: 1959,
    theme: 'Automobile growth and campus space',
    growth: 1.12,
    autoDrift: 3,
    landCost: 1.0,
    president: 'President Harold W. Pemberton III',
    transitDrift: -3,
  },
  {
    id: 'expansion',
    name: 'Urban Expansion',
    start: 1960,
    end: 1979,
    theme: 'Parking construction and neighborhood conflict',
    growth: 1.13,
    autoDrift: 2.5,
    landCost: 1.4,
    president: 'President Margaret A. Thornbury',
    transitDrift: -4,
  },
  {
    id: 'institutional',
    name: 'Institutionalization',
    start: 1980,
    end: 1999,
    theme: 'Permits, garages, commuter expectations',
    growth: 1.06,
    autoDrift: 1.5,
    landCost: 1.9,
    president: 'President Dr. Raymond K. Ashcroft',
    transitDrift: 0,
  },
  {
    id: 'reform',
    name: 'Transportation Reform',
    start: 2000,
    end: 2019,
    theme: 'Transit benefits, TDM, sustainability',
    growth: 1.04,
    autoDrift: -1,
    landCost: 2.6,
    president: 'President Dr. Elena Vasquez-Whitfield',
    transitDrift: 2,
  },
  {
    id: 'modern',
    name: 'Modern Campus',
    start: 2020,
    end: 2025,
    theme: 'Hybrid work, financial pressure, climate commitments',
    growth: 1.01,
    autoDrift: -2,
    landCost: 3.1,
    president: 'President Dr. Jordan Okafor-Lindqvist',
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
