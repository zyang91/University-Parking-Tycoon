import { eraFor } from './eras';
import { hashPick } from './rng';
import { academicShortfall } from './simulation';
import { capacity, countParcels } from './state';
import type { GameState } from './types';

export interface Briefing {
  year: number;
  eraName: string;
  eraTheme: string;
  president: string;
  message: string;
  crisis: { title: string; text: string; severity: 'high' | 'medium' | 'low' };
}

const MESSAGES: Record<string, string[]> = {
  postwar: [
    'The war is over, the GI Bill is generous, and every veteran on the faculty appears to have purchased a Packard. Please find somewhere to put them.',
    'Our founders built this campus for scholars on foot. I am told the scholars now arrive in sedans. Adapt accordingly, but tastefully.',
    'The Trustees have asked whether the quadrangle is “strictly necessary.” I have asked them to wait for your recommendation.',
  ],
  expansion: [
    'Enrollment is growing, faculty are driving, and the Board of Trustees has discovered that asphalt is cheaper than institutional compromise.',
    'The city calls it renewal. The neighbors call it something else. The Board calls it an opportunity. I call it your problem.',
    'We are building a modern university for the motor age. Some have asked whether the university should be for the motor age. Those people do not sit on the Board.',
  ],
  institutional: [
    'Parking is no longer a problem; it is a department. Departments, as you know, are forever.',
    'The faculty handbook now has a chapter on parking. It is longer than the chapter on tenure.',
    'Our peer institutions have commissioned master plans. I would like ours to be thicker.',
  ],
  reform: [
    'We have pledged to be a leader in sustainability. We have also pledged that nobody will lose their parking space. Please reconcile these by Thursday.',
    'Our students want bike lanes, our faculty want garages, and our donors want their names on both.',
    'The Transportation Demand Management plan has been well received by everyone who has not read it.',
  ],
  modern: [
    'Half the staff works from home on Mondays, the garages are paid for until 2040, and the climate pledge is due in 2030. Good luck.',
    'This is the final review period. History will judge us. Fortunately, history is written by a committee.',
  ],
};

export function getBriefing(s: GameState): Briefing {
  const era = eraFor(s.year);
  const cap = capacity(s);
  const shortage = s.demand > 0 ? (s.demand - cap) / s.demand : 0;
  const vacancy = cap > 0 ? (cap - s.demand) / cap : 0;
  const worstGarage = s.parcels.filter((p) => p.type === 'garage').reduce((m, p) => Math.min(m, p.condition), 100);
  let crisis: Briefing['crisis'];
  if (s.cash < 0) {
    crisis = { title: 'Budget Deficit', text: `The department owes $${Math.round(-s.cash / 1000)}k and pays 4% interest. The CFO has begun attending your meetings.`, severity: 'high' };
  } else if (shortage > 0.15) {
    crisis = { title: 'Parking Shortage', text: `Roughly ${Math.round(s.demand - cap)} more cars than spaces. Commuters circle the block; neighbors circle the wagons.`, severity: 'high' };
  } else if (s.ind.neighborhood < 35) {
    crisis = { title: 'Town–Gown Conflict', text: 'Community meetings now require a larger venue and a mediator.', severity: 'high' };
  } else if (worstGarage < 40 && countParcels(s, 'garage') > 0) {
    crisis = { title: 'Crumbling Concrete', text: 'A garage is shedding concrete. Its capacity is reduced and its maintenance doubled.', severity: 'medium' };
  } else if (academicShortfall(s) > 0) {
    crisis = { title: 'Academic Space Shortage', text: 'Departments need buildings, and the only flat land left is covered in cars.', severity: 'medium' };
  } else if (vacancy > 0.2) {
    crisis = { title: 'Empty Spaces', text: `${Math.round(vacancy * 100)}% of spaces sit empty, maintained at considerable expense for cars that may never come.`, severity: 'medium' };
  } else if (s.ind.faculty < 35) {
    crisis = { title: 'Faculty Unrest', text: 'The Faculty Senate has scheduled an emergency meeting about the previous emergency meeting.', severity: 'medium' };
  } else if (s.ind.sustainability < 30 && s.year >= 1990) {
    crisis = { title: 'Climate Pressure', text: 'Student climate activists have staged a die-in across three parking stalls.', severity: 'medium' };
  } else if (shortage > 0.05) {
    crisis = { title: 'Tight Parking', text: 'Lots fill by 9:15 a.m. Latecomers have begun to blame the curriculum.', severity: 'low' };
  } else {
    crisis = { title: 'Relative Calm', text: 'Nothing is on fire. The Board finds this suspicious.', severity: 'low' };
  }
  return {
    year: s.year,
    eraName: era.name,
    eraTheme: era.theme,
    president: era.president,
    message: hashPick(MESSAGES[era.id], `${s.seed}-${s.year}-msg`),
    crisis,
  };
}
