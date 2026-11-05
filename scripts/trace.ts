import { createInitialState, playTurn, capacity } from '../src/engine';
let s = createInitialState(Number(process.argv[2] ?? 1));
const acts = (process.argv[3] ?? '').split(',').filter(Boolean);
while (s.phase !== 'ended') {
  s = playTurn(s, acts, 0);
  const f = s.lastFinancials!;
  console.log(s.lastReport!.year, 'cash', Math.round(s.cash/1000), 'cap', capacity(s), 'dem', s.demand, 'rev', f.permitRevenue, 'op', f.operatingCost, 'mt', f.maintenanceCost, 'prog', f.programCost, 'debt', f.debtService, 'int', f.interest, 'A', Math.round(s.ind.autoDependence), 'F', Math.round(s.ind.faculty), 'ev', s.history.at(-1)!.event?.title);
}
