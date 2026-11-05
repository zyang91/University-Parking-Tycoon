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
import { concatL, joinL, l } from './text';
import type { EventDef, FinancialBreakdown, GameState, HistoryEntry, L } from './types';

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

const HALL_NAMES: L[] = [
  l('Hargrove Hall', '哈格罗夫楼'),
  l('the Whitcombe Laboratories', '惠特科姆实验室'),
  l('Delacroix Hall', '德拉克鲁瓦楼'),
  l('the Center for Interdisciplinary Synergy', '跨学科协同中心'),
  l('Bramwell Library Annex', '布拉姆韦尔图书馆附楼'),
  l('the Ostrander Institute', '奥斯特兰德研究所'),
  l('Quill Hall', '奎尔楼'),
  l('the Halvorsen Life Sciences Building', '哈尔沃森生命科学楼'),
  l('Fenwick Hall', '芬威克楼'),
  l('the Center for Advanced Studies of Studies', '研究之研究高等中心'),
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
      s.turnNotes.push(l(`${p.name.en} could not proceed: ${reason.en}.`, `${p.name.zh}未能实施：${reason.zh}。`));
      continue;
    }
    const cost = p.cost(s);
    if (cost > 0 && s.cash + C.CREDIT_LINE < cost) {
      s.turnNotes.push(l(`${p.name.en} was abandoned for lack of funds.`, `${p.name.zh}因资金不足而放弃。`));
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
    eventRecord = { id: ev.id, title: ev.title, choice: frag };
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
        s.turnNotes.push(l(`With no vacant land left, ${hall.en} was built on a campus green.`, `由于没有空地，${hall.zh}建在了校园草坪上。`));
      } else {
        s.turnNotes.push(l(`The university built ${hall.en} on vacant land.`, `学校在空地上建起了${hall.zh}。`));
      }
    }
  }
  const shortfall = academicShortfall(s);
  if (shortfall > 0) {
    s.counters.academicShortfallTurns++;
    s.turnNotes.push(
      l(
        `Academic space shortfall: ${shortfall} parcel${shortfall > 1 ? 's' : ''}. Departments are holding seminars in the parking office.`,
        `教学用地缺口：${shortfall}块地。各院系只好在停车办公室里上研讨课。`,
      ),
    );
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
      if (was >= 40 && p.condition < 40) {
        s.turnNotes.push(
          l(
            `${p.name?.en ?? 'A garage'} has deteriorated; capacity reduced and maintenance doubled.`,
            `${p.name?.zh ?? '一座停车楼'}已经老化：容量下降，维护费翻倍。`,
          ),
        );
      }
    }
  }
  for (const d of s.debts) d.turnsRemaining--;
  s.debts = s.debts.filter((d) => d.turnsRemaining > 0);
  // Temporary capacity arrangements expire.
  s.bonusCapacity = Math.round(s.bonusCapacity * 0.5);
  if (s.bonusCapacity < 10) s.bonusCapacity = 0;

  // 9. Outcome notes.
  if (shortageRatio > 0.05) {
    const gap = Math.round(demand - cap);
    s.turnNotes.push(
      l(
        `Parking shortage: ${gap} more cars than spaces.${spill > 0.1 ? ' Neighborhood streets absorbed the overflow.' : ''}`,
        `停车短缺：车辆比车位多${gap}辆。${spill > 0.1 ? '多出来的车停进了周边社区的街道。' : ''}`,
      ),
    );
  } else if (vacancyRatio > 0.2) {
    const v = Math.round(vacancyRatio * 100);
    s.turnNotes.push(
      l(
        `${v}% of spaces sat empty, generating maintenance costs and induced demand.`,
        `${v}%的车位空置，既产生维护成本，又诱发新的需求。`,
      ),
    );
  }
  if (s.cash < 0) {
    s.turnNotes.push(l('Cash reserves are negative; the department is borrowing at 4% interest.', '现金储备为负，部门正以4%的利率借款。'));
  }

  // 10. History and advance.
  const endYear = Math.min(END_YEAR, startYear + years);
  const historyText = composeHistory(s, startYear, endYear, eventRecord, { shortageRatio, vacancyRatio, occupied, cap });
  s.history.push({
    year: startYear,
    endYear,
    era: era.id,
    text: historyText,
    actions: [...s.pendingActions],
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

const CLOSERS: L[] = [
  l('The Board characterized the outcome as a temporary response to long-term demand.', '校董会称这一结果是应对长期需求的临时举措。'),
  l('A follow-up study was commissioned.', '校方又委托了一项后续研究。'),
  l('The Faculty Senate reserved the right to be upset later.', '教授评议会保留日后不满的权利。'),
  l('The Planning Department filed a memorandum that nobody read.', '规划部门提交了一份没人读的备忘录。'),
  l('The Parking Office described the period as "operationally eventful."', '停车办公室称这一时期“运营上颇为多事”。'),
  l('The student newspaper ran a cartoon that the administration pretended not to see.', '学生报刊登了一幅漫画，校方假装没看见。'),
  l('Trustees praised the decision without asking what it was.', '校董们对这项决定赞不绝口，却没人问它是什么。'),
];

function composeHistory(
  s: GameState,
  start: number,
  end: number,
  eventRecord: HistoryEntry['event'],
  o: { shortageRatio: number; vacancyRatio: number; occupied: number; cap: number },
): L {
  const parts: L[] = [];
  if (s.turnLog.length > 0) {
    const acts = joinL(s.turnLog);
    parts.push(l(`The administration ${acts.en}.`, `校方${acts.zh}。`));
  } else {
    parts.push(l('The administration took no formal action, citing the need for further study.', '校方以“需要进一步研究”为由，未采取任何正式行动。'));
  }
  if (eventRecord) {
    parts.push(
      l(
        `Confronted with "${eventRecord.title.en}", the university ${eventRecord.choice.en}.`,
        `面对“${eventRecord.title.zh}”，校方${eventRecord.choice.zh}。`,
      ),
    );
  }
  if (o.shortageRatio > 0.15) {
    const pct = Math.round(o.shortageRatio * 100);
    parts.push(
      l(
        `Demand exceeded supply by ${pct}%, and commuters colonized the surrounding streets.`,
        `需求超出供给${pct}%，通勤者占领了周边街道。`,
      ),
    );
  } else if (o.vacancyRatio > 0.25) {
    const pct = Math.round(o.vacancyRatio * 100);
    parts.push(
      l(
        `Roughly ${pct}% of spaces stood empty, a fact the Board attributed to "future growth."`,
        `约${pct}%的车位空置，校董会将其归因于“未来增长”。`,
      ),
    );
  } else {
    const occ = o.cap > 0 ? Math.round((o.occupied / o.cap) * 100) : 0;
    parts.push(l(`Occupancy stood near ${occ}%.`, `车位占用率约为${occ}%。`));
  }
  parts.push(hashPick(CLOSERS, `${s.seed}-${start}`));
  const body = concatL(parts, ' ', '');
  return l(`${start}–${end} — ${body.en}`, `${start}–${end}年 —— ${body.zh}`);
}
