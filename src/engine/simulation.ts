/**
 * Turn engine. Pure functions: each takes a GameState and returns a new one.
 *
 * Turn sequence:
 *   briefing --submitPolicies()--> event --resolveEvent()--> report --nextTurn()--> briefing ... ended
 *
 * DEMAND MODEL (documented):
 *   carShare(a)   = 0.25 + 0.60 · a/100                (a = automobile dependence, 0–100)
 *   e (elasticity)= 0.55 − 0.30 · a/100  (+0.15 with differentiated pricing)
 *   priceTerm(p)  = exp(−e · (p − 100) / 100)          (always decreasing in p)
 *   priceFactor   = x · priceTerm(0) + (1 − x) · priceTerm(p)   (x = exempt share, who park free)
 *   alt           = reduction from transit quality and TDM programs, bounded to [−0.2, 0.6]
 *   demand        = K · popIndex · carShare(a) · priceFactor · (1 − alt) · demandModifier + induced
 *   K is calibrated so 1948 demand = 620 spaces.
 *
 *   Induced demand is a stock that moves 40% per turn toward 35% of spare capacity, so new
 *   supply raises demand gradually rather than one-for-one. Abundant, cheap parking also raises
 *   automobile dependence, which raises carShare in later turns (the slow channel).
 */
import { eraFor, END_YEAR, turnLength } from './eras';
import { getEvent, EVENTS } from './events';
import { commitmentAnnualCost, getPolicy, isEraAvailable, TDM_COMMITMENTS } from './policies';
import { hashPick, nextRandom } from './rng';
import {
  C,
  capacity,
  clamp,
  cloneState,
  countParcels,
  exemptShare,
  findParcel,
  getCommitment,
  hasCommitment,
  setParcel,
  snapshot,
} from './state';
import type { EventDef, FinancialBreakdown, GameState, HistoryEntry } from './types';

const carShare = (a: number) => 0.25 + 0.6 * (a / 100);
const DEMAND_K = 620 / carShare(45);

export function elasticity(s: GameState): number {
  return 0.55 - 0.3 * (s.ind.autoDependence / 100) + (hasCommitment(s, 'differentiatedPricing') ? 0.15 : 0);
}

export function priceFactor(s: GameState, price = s.price): number {
  const e = elasticity(s);
  const term = (p: number) => Math.exp((-e * (p - 100)) / 100);
  const x = exemptShare(s);
  return x * term(0) + (1 - x) * term(price);
}

function legacy(s: GameState, id: Parameters<typeof getCommitment>[1]): number {
  const c = getCommitment(s, id);
  if (!c) return 0;
  return Math.min(1.6, 1 + c.turnsActive * 0.08);
}

/** Fractional reduction in car commuting from alternatives. */
export function alternativesReduction(s: GameState): number {
  const tq = s.transitQuality / 100;
  let alt = 0.25 * (tq - 0.7); // regional transit baseline relative to 1948
  alt += 0.12 * (0.4 + tq) * legacy(s, 'transitSubsidy');
  alt += 0.06 * legacy(s, 'shuttle');
  const bikeEra = s.year >= 2010 ? 0.08 : s.year >= 1990 ? 0.05 : 0.03;
  alt += bikeEra * legacy(s, 'bikeInfra');
  alt += 0.03 * legacy(s, 'carpool');
  if (hasCommitment(s, 'cashOut')) alt += (0.05 + 0.05 * Math.min(1, s.price / 200)) * legacy(s, 'cashOut');
  return clamp(alt, -0.2, 0.6);
}

export function computeDemand(s: GameState): number {
  const d =
    DEMAND_K *
      s.popIndex *
      carShare(s.ind.autoDependence) *
      priceFactor(s) *
      (1 - alternativesReduction(s)) *
      s.demandModifier +
    s.inducedDemand;
  return Math.max(0, Math.round(d));
}

export function annualFinancials(s: GameState, demand: number, years: number): FinancialBreakdown {
  const cap = capacity(s);
  const occupied = Math.min(cap, demand);
  const compliance = hasCommitment(s, 'enforcement') ? 1.0 : 0.88;
  const diff = hasCommitment(s, 'differentiatedPricing') ? 1.08 : 1;
  const permitRevenue = occupied * (1 - exemptShare(s)) * s.price * compliance * diff;
  const operatingCost = cap * C.OPEX_PER_SPACE;
  let maintenanceCost = 0;
  for (const p of s.parcels) {
    if (p.type === 'lot') maintenanceCost += C.LOT_MAINTENANCE;
    if (p.type === 'garage') maintenanceCost += C.GARAGE_MAINTENANCE * (p.condition < 40 ? 2 : 1);
  }
  const programCost = s.commitments.reduce((sum, c) => sum + commitmentAnnualCost(s, c.id), 0);
  const debtService = s.debts.reduce((sum, d) => sum + (d.turnsRemaining > 0 ? d.annualPayment : 0), 0);
  const interest = s.cash < 0 ? -s.cash * C.INTEREST_RATE : 0;
  const net = permitRevenue - operatingCost - maintenanceCost - programCost - debtService - interest;
  const r = Math.round;
  return {
    permitRevenue: r(permitRevenue),
    operatingCost: r(operatingCost),
    maintenanceCost: r(maintenanceCost),
    programCost: r(programCost),
    debtService: r(debtService),
    interest: r(interest),
    net: r(net),
    years,
  };
}

export function academicTarget(s: GameState): number {
  return Math.round(8 * Math.pow(s.popIndex, 0.45));
}

export function academicShortfall(s: GameState): number {
  return Math.max(0, academicTarget(s) - countParcels(s, 'academic'));
}

const HALL_NAMES = [
  'Hargrove Hall', 'the Whitcombe Laboratories', 'Delacroix Hall', 'the Center for Interdisciplinary Synergy',
  'Bramwell Library Annex', 'the Ostrander Institute', 'Quill Hall', 'the Halvorsen Life Sciences Building',
  'Fenwick Hall', 'the Center for Advanced Studies of Studies',
];

// ---------------------------------------------------------------------------
// Phase transitions
// ---------------------------------------------------------------------------

/** Apply the chosen policy actions, then draw the turn's random event. */
export function submitPolicies(prev: GameState, actionIds: string[]): GameState {
  if (prev.phase !== 'briefing') throw new Error(`Cannot submit policies during phase ${prev.phase}`);
  const s = cloneState(prev);
  s.turnNotes = [];
  s.turnLog = [];
  const applied: string[] = [];
  for (const id of actionIds.slice(0, 3)) {
    const p = getPolicy(id);
    if (!p || !isEraAvailable(p, s.year)) continue;
    const reason = p.unavailable?.(s);
    if (reason) {
      s.turnNotes.push(`${p.name} could not proceed: ${reason}.`);
      continue;
    }
    const cost = p.cost(s);
    if (cost > 0 && s.cash + C.CREDIT_LINE < cost) {
      s.turnNotes.push(`${p.name} was abandoned for lack of funds.`);
      continue;
    }
    s.cash -= cost;
    s.turnLog.push(p.apply(s));
    applied.push(id);
  }
  s.pendingActions = applied;
  s.pendingEventId = drawEvent(s);
  s.phase = 'event';
  return s;
}

function eventWeight(e: EventDef, s: GameState): number {
  const w = typeof e.weight === 'function' ? e.weight(s) : e.weight ?? 1;
  return Number.isFinite(w) && w > 0 ? w : 0;
}

export function eligibleEvents(s: GameState): EventDef[] {
  const era = eraFor(s.year).id;
  return EVENTS.filter(
    (e) => e.eras.includes(era) && !s.usedEvents.includes(e.id) && (e.condition ? e.condition(s) : true),
  );
}

/** Weighted draw from eligible events using the seeded RNG. Mutates rngState. */
export function drawEvent(s: GameState): string | null {
  let pool = eligibleEvents(s).filter((e) => eventWeight(e, s) > 0);
  if (pool.length === 0) {
    // Fallback: any unused event whose conditions hold, regardless of era.
    pool = EVENTS.filter((e) => !s.usedEvents.includes(e.id) && (e.condition ? e.condition(s) : true) && !e.eras.includes('modern'));
  }
  if (pool.length === 0) return null;
  const weights = pool.map((e) => Math.max(0.01, eventWeight(e, s)));
  const total = weights.reduce((a, b) => a + b, 0);
  const r = nextRandom(s.rngState);
  s.rngState = r.state;
  let x = r.value * total;
  for (let i = 0; i < pool.length; i++) {
    x -= weights[i];
    if (x <= 0) return pool[i].id;
  }
  return pool[pool.length - 1].id;
}

/** Resolve the pending event with the chosen option, then simulate the period. */
export function resolveEvent(prev: GameState, choiceIndex: number): GameState {
  if (prev.phase !== 'event') throw new Error(`Cannot resolve event during phase ${prev.phase}`);
  const s = cloneState(prev);
  let eventRecord: HistoryEntry['event'];
  const ev = s.pendingEventId ? getEvent(s.pendingEventId) : undefined;
  if (ev) {
    let idx = Math.max(0, Math.min(ev.choices.length - 1, Math.floor(choiceIndex) || 0));
    if (ev.choices[idx].unavailable?.(s)) {
      idx = ev.choices.findIndex((c) => !c.unavailable?.(s));
      if (idx < 0) idx = 0;
    }
    const choice = ev.choices[idx];
    const frag = choice.apply(s);
    s.usedEvents.push(ev.id);
    eventRecord = { title: ev.title, choice: frag };
  }
  return simulatePeriod(s, eventRecord);
}

/** Advance from the report screen to the next briefing (or the end). */
export function nextTurn(prev: GameState): GameState {
  if (prev.phase !== 'report') return prev;
  const s = cloneState(prev);
  s.phase = s.year >= END_YEAR ? 'ended' : 'briefing';
  s.pendingActions = [];
  s.pendingEventId = null;
  return s;
}

/** Convenience for tests and autoplay: run one full turn. */
export function playTurn(s: GameState, actions: string[], eventChoice = 0): GameState {
  return nextTurn(resolveEvent(submitPolicies(s, actions), eventChoice));
}

// ---------------------------------------------------------------------------
// Period simulation
// ---------------------------------------------------------------------------

function simulatePeriod(s: GameState, eventRecord: HistoryEntry['event']): GameState {
  const before = s.stats[s.stats.length - 1];
  const era = eraFor(s.year);
  const years = turnLength(s.year);
  const scale = years / 5;
  const startYear = s.year;

  // 1. Exogenous change: population and regional transit.
  s.popIndex *= Math.pow(era.growth, scale);
  s.transitQuality = clamp(s.transitQuality + era.transitDrift * scale);
  for (const c of s.commitments) c.turnsActive++;

  // 2. Academic growth claims land (opportunity cost of parking).
  if (academicShortfall(s) > 0) {
    const p = findParcel(s, ['vacant', 'green']);
    if (p) {
      const wasGreen = p.type === 'green';
      const hall = hashPick(HALL_NAMES, `${s.seed}-${s.year}-hall`);
      setParcel(p, 'academic', s.year, hall);
      s.counters.academicBuildingsAdded++;
      if (wasGreen) {
        s.ind.sustainability = clamp(s.ind.sustainability - 3);
        s.ind.students = clamp(s.ind.students - 2);
        s.turnNotes.push(`With no vacant land left, ${hall} was built on a campus green.`);
      } else {
        s.turnNotes.push(`The university built ${hall} on vacant land.`);
      }
    }
  }
  const shortfall = academicShortfall(s);
  if (shortfall > 0) {
    s.counters.academicShortfallTurns++;
    s.turnNotes.push(`Academic space shortfall: ${shortfall} parcel${shortfall > 1 ? 's' : ''}. Departments are holding seminars in the parking office.`);
  }

  // 3. Demand, capacity, occupancy.
  const demand = computeDemand(s);
  const cap = capacity(s);
  const occupied = Math.min(cap, demand);
  const shortageRatio = demand > 0 ? Math.max(0, demand - cap) / demand : 0;
  const vacancyRatio = cap > 0 ? Math.max(0, cap - demand) / cap : 0;
  s.demand = demand;

  // Induced demand stock moves gradually toward a share of spare capacity.
  const rawDemand = demand - s.inducedDemand;
  const inducedTarget = 0.35 * Math.max(0, cap - rawDemand);
  s.inducedDemand = Math.max(0, s.inducedDemand + 0.4 * (inducedTarget - s.inducedDemand));

  // 4. Finances.
  const fin = annualFinancials(s, demand, years);
  s.cash += fin.net * years;
  s.lastNetRevenue = fin.net;
  s.lastFinancials = fin;

  // 5. Political equilibrium: indicators drift 35% toward conditions-based targets.
  const ex = exemptShare(s);
  const effPrice = s.price * (1 - ex);
  const priceGap = (effPrice - 100) / 100;
  const a = s.ind.autoDependence;
  const green = countParcels(s, 'green');
  const lots = countParcels(s, 'lot');
  const garages = countParcels(s, 'garage');
  const tdmCount = TDM_COMMITMENTS.filter((id) => hasCommitment(s, id)).length;
  let spillMitigation = 1;
  if (hasCommitment(s, 'enforcement')) spillMitigation -= 0.25;
  if (hasCommitment(s, 'shuttle')) spillMitigation -= 0.2;
  if (s.flags.residentialPermits) spillMitigation -= 0.3;
  const spill = shortageRatio * Math.max(0.2, spillMitigation);

  const facultyTarget =
    63 -
    shortageRatio * 45 -
    Math.min(28, Math.max(0, priceGap) * 12 * (0.5 + a / 100)) +
    Math.max(0, -priceGap) * 8 +
    (hasCommitment(s, 'facultyPrivileges') ? 10 : 0) -
    shortfall * 5 +
    (hasCommitment(s, 'cashOut') ? 3 : 0) +
    (hasCommitment(s, 'transitSubsidy') ? 2 : 0) -
    vacancyRatio * 5;
  const studentTarget =
    55 -
    shortageRatio * 15 -
    Math.max(0, priceGap) * 5 +
    (hasCommitment(s, 'transitSubsidy') ? 8 : 0) +
    (hasCommitment(s, 'bikeInfra') ? 5 : 0) +
    (hasCommitment(s, 'shuttle') ? 5 : 0) +
    (hasCommitment(s, 'cashOut') ? 2 : 0) +
    (hasCommitment(s, 'differentiatedPricing') ? 3 : 0) +
    green * 1.2 -
    (hasCommitment(s, 'facultyPrivileges') ? 4 : 0) -
    (hasCommitment(s, 'adminReserved') ? 3 : 0) -
    (hasCommitment(s, 'enforcement') ? 2 : 0) -
    shortfall * 2;
  const neighborhoodTarget =
    70 -
    spill * 75 -
    garages * 3 -
    lots * 0.5 +
    green * 1 +
    (hasCommitment(s, 'sharedParking') ? 4 : 0) +
    (hasCommitment(s, 'shuttle') ? 3 : 0) +
    (hasCommitment(s, 'transitSubsidy') ? 2 : 0) -
    s.counters.academicBuildingsAdded * 0.8;
  const sustainabilityTarget =
    88 - a * 0.65 + green * 1.5 - (lots + garages * 2) * 1.3 + tdmCount * 4 + (s.flags.climatePlan ? 5 : 0);

  const pull = 0.35 * Math.min(1, scale + 0.2);
  s.ind.faculty = clamp(s.ind.faculty + pull * (facultyTarget - s.ind.faculty));
  s.ind.students = clamp(s.ind.students + pull * (studentTarget - s.ind.students));
  s.ind.neighborhood = clamp(s.ind.neighborhood + pull * (neighborhoodTarget - s.ind.neighborhood));
  s.ind.sustainability = clamp(s.ind.sustainability + pull * (sustainabilityTarget - s.ind.sustainability));

  // 6. Automobile dependence: abundant cheap parking breeds driving; scarcity and TDM reduce it.
  const supplyTerm = cap >= demand ? Math.min(4, (cap / Math.max(1, demand) - 1) * 12) : -Math.min(3, shortageRatio * 8);
  const priceTerm = clamp((100 - effPrice) / 40, -3, 2);
  const tdmTerm =
    (hasCommitment(s, 'transitSubsidy') ? 1.5 * (s.transitQuality / 70) : 0) +
    (hasCommitment(s, 'bikeInfra') ? 1 : 0) +
    (hasCommitment(s, 'shuttle') ? 1 : 0) +
    (hasCommitment(s, 'carpool') ? 0.5 : 0) +
    (hasCommitment(s, 'cashOut') ? 1.5 : 0);
  const rawAuto = (era.autoDrift + supplyTerm + priceTerm - tdmTerm + garages * 0.3) * scale;
  // Soft bounds: change slows as dependence approaches 0 or 100 (habits and holdouts).
  const autoDelta = rawAuto > 0 ? rawAuto * Math.min(1, (100 - a) / 50) : rawAuto * Math.min(1, a / 40);
  s.ind.autoDependence = clamp(s.ind.autoDependence + autoDelta);

  // 7. Institutional inertia: auto infrastructure and entitlements accumulate; it decays otherwise.
  const inertiaDelta =
    (garages * 0.8 +
      lots * 0.25 +
      (hasCommitment(s, 'facultyPrivileges') ? 1.5 : 0) +
      (hasCommitment(s, 'adminReserved') ? 0.5 : 0) -
      1.2 -
      tdmCount * 0.6) *
    scale;
  s.ind.inertia = clamp(s.ind.inertia + inertiaDelta);

  // 8. Aging and debt.
  for (const p of s.parcels) {
    if (p.type === 'garage') {
      const was = p.condition;
      p.condition = clamp(p.condition - C.GARAGE_DECAY_PER_TURN * scale);
      if (was >= 40 && p.condition < 40) s.turnNotes.push(`${p.name ?? 'A garage'} has deteriorated; capacity reduced and maintenance doubled.`);
    }
  }
  for (const d of s.debts) d.turnsRemaining--;
  s.debts = s.debts.filter((d) => d.turnsRemaining > 0);
  // Temporary capacity arrangements expire.
  s.bonusCapacity = Math.round(s.bonusCapacity * 0.5);
  if (s.bonusCapacity < 10) s.bonusCapacity = 0;

  // 9. Outcome notes.
  if (shortageRatio > 0.05) {
    s.turnNotes.push(`Parking shortage: ${Math.round(demand - cap)} more cars than spaces. ${spill > 0.1 ? 'Neighborhood streets absorbed the overflow.' : ''}`.trim());
  } else if (vacancyRatio > 0.2) {
    s.turnNotes.push(`${Math.round(vacancyRatio * 100)}% of spaces sat empty, generating maintenance costs and induced demand.`);
  }
  if (s.cash < 0) s.turnNotes.push('Cash reserves are negative; the department is borrowing at 4% interest.');

  // 10. History and advance.
  const endYear = Math.min(END_YEAR, startYear + years);
  const historyText = composeHistory(s, startYear, endYear, eventRecord, { shortageRatio, vacancyRatio, occupied, cap });
  s.history.push({
    year: startYear,
    endYear,
    era: era.id,
    text: historyText,
    actions: s.pendingActions.map((id) => getPolicy(id)?.name ?? id),
    event: eventRecord,
    tags: tagsFor(s),
  });

  s.year = endYear;
  s.turn++;
  const after = snapshot(s);
  s.stats.push(after);
  s.lastReport = {
    year: startYear,
    endYear,
    before,
    after,
    notes: [...s.turnNotes],
    historyText,
    annual: fin,
  };
  s.phase = 'report';
  return s;
}

function tagsFor(s: GameState): string[] {
  const tags: string[] = [];
  for (const id of s.pendingActions) {
    const p = getPolicy(id);
    if (p) tags.push(p.category);
  }
  return Array.from(new Set(tags));
}

function joinList(items: string[]): string {
  if (items.length === 0) return '';
  if (items.length === 1) return items[0];
  return `${items.slice(0, -1).join(', ')}, and ${items[items.length - 1]}`;
}

const CLOSERS = [
  'The Board characterized the outcome as a temporary response to long-term demand.',
  'A follow-up study was commissioned.',
  'The Faculty Senate reserved the right to be upset later.',
  'The Planning Department filed a memorandum that nobody read.',
  'The Parking Office described the period as "operationally eventful."',
  'The student newspaper ran a cartoon that the administration pretended not to see.',
  'Trustees praised the decision without asking what it was.',
];

function composeHistory(
  s: GameState,
  start: number,
  end: number,
  eventRecord: HistoryEntry['event'],
  o: { shortageRatio: number; vacancyRatio: number; occupied: number; cap: number },
): string {
  const parts: string[] = [];
  if (s.turnLog.length > 0) {
    parts.push(`The administration ${joinList(s.turnLog)}.`);
  } else {
    parts.push('The administration took no formal action, citing the need for further study.');
  }
  if (eventRecord) parts.push(`Confronted with "${eventRecord.title}", the university ${eventRecord.choice}.`);
  if (o.shortageRatio > 0.15) {
    parts.push(`Demand exceeded supply by ${Math.round(o.shortageRatio * 100)}%, and commuters colonized the surrounding streets.`);
  } else if (o.vacancyRatio > 0.25) {
    parts.push(`Roughly ${Math.round(o.vacancyRatio * 100)}% of spaces stood empty, a fact the Board attributed to "future growth."`);
  } else {
    parts.push(`Occupancy stood near ${o.cap > 0 ? Math.round((o.occupied / o.cap) * 100) : 0}%.`);
  }
  parts.push(hashPick(CLOSERS, `${s.seed}-${start}`));
  return `${start}–${end} — ${parts.join(' ')}`;
}
