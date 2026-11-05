// Autoplay a few archetypal strategies and print outcomes (balance sanity check).
import { createInitialState, playTurn, evaluate, policyBlocker, getPolicy, capacity, countParcels } from '../src/engine';
import type { GameState } from '../src/engine';

type Strat = (s: GameState) => string[];
function pick(s: GameState, wish: string[]): string[] {
  const out: string[] = [];
  for (const id of wish) { const p = getPolicy(id); if (p && !policyBlocker(s, p, out)) out.push(id); if (out.length >= 3) break; }
  return out;
}
const strategies: Record<string, Strat> = {
  nothing: () => [],
  asphalt: (s) => pick(s, ['faculty_privileges', 'build_garage', 'build_lot', 'renovate', 'committee']),
  transit: (s) => pick(s, ['transit_subsidy', 'shuttle', 'bike_infra', 'cash_out', 'carpool', s.price < 250 ? 'price_up_25' : '', s.year > 1980 && countParcels(s,'lot') > 1 ? 'convert_green' : '']),
  pricing: (s) => pick(s, [s.price < 400 ? 'price_up_25' : '', 'enforcement', 'differentiated', 'shared_parking', 'renovate']),
  asphaltPriced: (s) => pick(s, ['build_garage', s.price < 260 ? 'price_up_25' : '', 'build_lot', 'renovate']),
  urbanist: (s) => pick(s, [s.price < 300 ? 'price_up_25' : '', 'convert_academic', 'enforcement']),
  committee: (s) => pick(s, ['committee']),
  balanced: (s) => pick(s, [capacity(s) < s.demand * 0.92 ? (s.year >= 1958 ? 'build_garage' : 'build_lot') : '', s.price < 220 ? 'price_up_10' : '', 'transit_subsidy', 'enforcement', 'shuttle', 'renovate']),
};
for (const seed of [1, 42]) for (const [name, strat] of Object.entries(strategies)) {
  let s = createInitialState(seed);
  while (s.phase !== 'ended') s = playTurn(s, strat(s), seed % 3);
  const ev = evaluate(s);
  const r = (n: number) => Math.round(n);
  console.log(`${seed} ${name.padEnd(9)} end=${ev.ending.title.en.padEnd(28)} cash=${r(s.cash/1000)}k net=${r(s.lastNetRevenue/1000)}k cap=${capacity(s)} dem=${r(s.demand)} price=${s.price} F=${r(s.ind.faculty)} S=${r(s.ind.students)} N=${r(s.ind.neighborhood)} Sus=${r(s.ind.sustainability)} A=${r(s.ind.autoDependence)} I=${r(s.ind.inertia)} gar=${countParcels(s,'garage')} lot=${countParcels(s,'lot')} grade=${ev.overallGrade}`);
}
