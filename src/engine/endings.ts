import { TDM_COMMITMENTS } from './policies';
import { capacity, countParcels, hasCommitment } from './state';
import type { Ending, GameState } from './types';

export const ENDINGS: Record<string, Omit<Ending, 'explanation'>> = {
  receivership: {
    id: 'receivership',
    title: 'The Receivership',
    summary: 'The Parking Department is now administered by the Office of the Comptroller, who has also taken your parking space.',
  },
  committee: {
    id: 'committee',
    title: 'The Committee Enthusiast',
    summary: 'After eighty years and an uncountable number of committees, the institution has achieved procedural excellence.',
  },
  asphalt: {
    id: 'asphalt',
    title: 'The Asphalt Empire',
    summary: 'You successfully transformed an educational institution into a parking operator with an attached university.',
  },
  transit: {
    id: 'transit',
    title: 'The Transit Utopia',
    summary: 'The campus has become less automobile-dependent. Several senior professors have refused to acknowledge this achievement.',
  },
  urbanist: {
    id: 'urbanist',
    title: 'The Accidental Urbanist',
    summary: 'Your parking restrictions unexpectedly encouraged a more walkable and transit-oriented university.',
  },
  fiscal: {
    id: 'fiscal',
    title: 'The Fiscal Administrator',
    summary: 'Parking revenues are excellent. Nobody remembers why the university originally created a parking department.',
  },
  townGown: {
    id: 'townGown',
    title: 'The Town–Gown Cold War',
    summary: 'The neighborhood association has a longer institutional memory than the university, and it remembers you specifically.',
  },
  perfect: {
    id: 'perfect',
    title: 'The Perfect Administrator',
    summary: 'You solved almost nothing, offended almost nobody, and received an award for outstanding institutional leadership.',
  },
  muddler: {
    id: 'muddler',
    title: 'The Muddler Through',
    summary: 'Eighty years of incremental decisions produced a campus no one designed and everyone complains about. In other words: a real university.',
  },
};

export interface Evaluation {
  ending: Ending;
  grades: { label: string; grade: string; score: number; note: string }[];
  overall: number;
  overallGrade: string;
  influences: string[];
}

function grade(score: number): string {
  if (score >= 85) return 'A';
  if (score >= 72) return 'B';
  if (score >= 58) return 'C';
  if (score >= 45) return 'D';
  return 'F';
}

/** Classify the final state into an ending. Conditions are checked in priority order. */
export function classifyEnding(s: GameState): Ending {
  const garages = countParcels(s, 'garage');
  const lots = countParcels(s, 'lot');
  const tdm = TDM_COMMITMENTS.filter((id) => hasCommitment(s, id)).length;
  const { faculty, students, neighborhood, sustainability, autoDependence } = s.ind;
  const pick = (id: keyof typeof ENDINGS, explanation: string): Ending => ({ ...ENDINGS[id], explanation });

  if (s.cash < -750_000) {
    return pick('receivership', `Cash reserves ended at −$${Math.round(-s.cash / 1000)}k.`);
  }
  if (s.counters.committees >= 6) {
    return pick('committee', `You convened ${s.counters.committees} committees and related bodies.`);
  }
  if ((garages >= 3 || garages + lots >= 7) && autoDependence >= 60) {
    return pick('asphalt', `${garages} garages and ${lots} surface lots; automobile dependence ${Math.round(autoDependence)}/100.`);
  }
  if (autoDependence <= 35 && sustainability >= 65 && tdm >= 3) {
    return pick('transit', `${tdm} alternative-transportation programs; automobile dependence fell to ${Math.round(autoDependence)}/100.`);
  }
  const restricted = s.price >= 140 || s.counters.conversionsToAcademic + s.counters.conversionsToGreen >= 1;
  if (autoDependence <= 42 && tdm <= 2 && garages <= 1 && restricted) {
    return pick('urbanist', `Limited supply and few programs, yet automobile dependence ended at ${Math.round(autoDependence)}/100.`);
  }
  if (s.cash >= 6_000_000 || (s.lastNetRevenue >= 400_000 && s.price >= 200)) {
    return pick('fiscal', `Reserves of $${(s.cash / 1e6).toFixed(1)}M and annual net revenue of $${Math.round(s.lastNetRevenue / 1000)}k.`);
  }
  if (neighborhood < 30) {
    return pick('townGown', `Neighborhood relations ended at ${Math.round(neighborhood)}/100.`);
  }
  if ([faculty, students, neighborhood].every((v) => v >= 48 && v <= 80) && s.cash >= 0) {
    return pick('perfect', 'Every stakeholder ended between mildly content and moderately annoyed.');
  }
  return pick('muddler', 'No single strategy dominated your tenure.');
}

export function evaluate(s: GameState): Evaluation {
  const ending = classifyEnding(s);
  const cap = capacity(s);
  const shortage = s.demand > 0 ? Math.max(0, s.demand - cap) / s.demand : 0;
  const vacancy = cap > 0 ? Math.max(0, cap - s.demand) / cap : 0;
  const finScore = Math.max(0, Math.min(100, 50 + s.cash / 100_000 + s.lastNetRevenue / 10_000));
  const fitScore = Math.max(0, 100 - shortage * 200 - vacancy * 120);
  const politics = (s.ind.faculty + s.ind.students + s.ind.neighborhood) / 3;
  const academic = s.counters.academicShortfallTurns;
  const landScore = Math.max(0, 100 - academic * 12);
  const grades = [
    { label: 'Financial stewardship', score: finScore, note: `Reserves $${(s.cash / 1e6).toFixed(2)}M` },
    { label: 'Supply–demand fit', score: fitScore, note: `${Math.round(shortage * 100)}% short / ${Math.round(vacancy * 100)}% vacant` },
    { label: 'Stakeholder relations', score: politics, note: `Faculty ${Math.round(s.ind.faculty)}, students ${Math.round(s.ind.students)}, neighbors ${Math.round(s.ind.neighborhood)}` },
    { label: 'Sustainability', score: s.ind.sustainability, note: `Automobile dependence ${Math.round(s.ind.autoDependence)}` },
    { label: 'Land for the academic mission', score: landScore, note: `${academic} turn${academic === 1 ? '' : 's'} with an academic space shortfall` },
  ].map((g) => ({ ...g, score: Math.round(g.score), grade: grade(g.score) }));
  const overall = Math.round(grades.reduce((a, g) => a + g.score, 0) / grades.length);
  return { ending, grades, overall, overallGrade: grade(overall), influences: influences(s) };
}

/** Narrative account of how early decisions shaped late outcomes. */
export function influences(s: GameState): string[] {
  const out: string[] = [];
  const early = s.history.filter((h) => h.year < 1980);
  const earlyText = early.map((h) => h.text).join(' ');
  const firstGarage = s.parcels.filter((p) => p.type === 'garage').sort((a, b) => a.since - b.since)[0];
  if (firstGarage && firstGarage.since < 1980) {
    out.push(`The ${firstGarage.name ?? 'first garage'} (${firstGarage.since}) set expectations of on-campus parking that later administrations inherited along with its maintenance bills.`);
  }
  if (s.flags.annexLot) out.push('Accepting cleared rowhouse land in the urban-renewal era left a lasting deficit in neighborhood trust.');
  if (hasCommitment(s, 'facultyPrivileges')) {
    const c = s.commitments.find((x) => x.id === 'facultyPrivileges')!;
    out.push(`Free faculty parking, granted in ${c.since}, was never revoked; by 2025 it was simply "how things are."`);
  } else if (s.history.some((h) => h.text.includes('revoked faculty parking'))) {
    out.push('Revoking faculty privileges proved costly, but it opened the way to pricing reform.');
  }
  const transit = s.commitments.find((x) => x.id === 'transitSubsidy');
  if (transit && transit.since < 1990) out.push(`The transit subsidy begun in ${transit.since} matured into an institutional habit, lowering parking demand for decades.`);
  if (s.counters.conversionsToAcademic + s.counters.conversionsToGreen > 0) {
    out.push(`${s.counters.conversionsToAcademic + s.counters.conversionsToGreen} parking facilities were converted to other uses, each one costlier as inertia accumulated.`);
  }
  if (s.counters.academicShortfallTurns > 0) out.push(`Parking occupied land the academic mission later needed: ${s.counters.academicShortfallTurns} review periods ended with an academic space shortfall.`);
  if (s.ind.inertia >= 60) out.push(`Institutional inertia ended at ${Math.round(s.ind.inertia)}/100: reversing course had become expensive.`);
  if (s.ind.inertia <= 20) out.push('Inertia stayed low, leaving future administrations unusually free to change direction.');
  if (out.length === 0 && earlyText) out.push('Early decisions were modest, and their influence diffuse — which is its own kind of legacy.');
  return out;
}
