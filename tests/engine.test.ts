import { describe, expect, it } from 'vitest';
import {
  addCommitment,
  annualFinancials,
  C,
  capacity,
  classifyEnding,
  cloneState,
  computeDemand,
  countParcels,
  createInitialState,
  deserialize,
  EVENTS,
  eligibleEvents,
  getEvent,
  getPolicy,
  loadGame,
  playTurn,
  policyBlocker,
  POLICIES,
  priceFactor,
  resolveEvent,
  saveGame,
  serialize,
  submitPolicies,
  totalTurns,
  type GameState,
  type StorageLike,
} from '../src/engine';

function memoryStorage(): StorageLike & { data: Record<string, string> } {
  const data: Record<string, string> = {};
  return {
    data,
    getItem: (k) => (k in data ? data[k] : null),
    setItem: (k, v) => { data[k] = v; },
    removeItem: (k) => { delete data[k]; },
  };
}

function assertValid(s: GameState) {
  const nums = [s.cash, s.price, s.demand, s.popIndex, s.transitQuality, s.inducedDemand, s.lastNetRevenue, ...Object.values(s.ind)];
  for (const n of nums) expect(Number.isFinite(n)).toBe(true);
  for (const v of Object.values(s.ind)) {
    expect(v).toBeGreaterThanOrEqual(0);
    expect(v).toBeLessThanOrEqual(100);
  }
  expect(s.price).toBeGreaterThanOrEqual(0);
  expect(s.demand).toBeGreaterThanOrEqual(0);
  expect(capacity(s)).toBeGreaterThanOrEqual(0);
}

function playFull(seed: number, strategy: (s: GameState) => string[], choice = 0): GameState {
  let s = createInitialState(seed);
  let guard = 0;
  while (s.phase !== 'ended' && guard++ < 40) {
    const wanted = strategy(s);
    const actions: string[] = [];
    for (const id of wanted) {
      const p = getPolicy(id);
      if (p && !policyBlocker(s, p, actions)) actions.push(id);
    }
    s = playTurn(s, actions, choice);
    assertValid(s);
  }
  return s;
}

describe('1. state initialization', () => {
  it('creates the specified 1948 starting conditions', () => {
    const s = createInitialState(123);
    expect(s.year).toBe(1948);
    expect(capacity(s)).toBe(500);
    expect(s.demand).toBe(620);
    expect(s.price).toBe(100);
    expect(s.cash).toBe(2_000_000);
    expect(s.ind).toEqual({ faculty: 60, students: 55, neighborhood: 65, sustainability: 50, autoDependence: 45, inertia: 20 });
    expect(s.parcels.length * C.LAND_UNITS_PER_PARCEL).toBe(100);
    expect(s.phase).toBe('briefing');
    expect(s.stats).toHaveLength(1);
  });
  it('calibrates the demand model to 620 spaces at the start', () => {
    expect(computeDemand(createInitialState(1))).toBe(620);
  });
});

describe('2. parking price effects on demand', () => {
  it('demand strictly decreases as price rises, all else equal', () => {
    const s = createInitialState(1);
    let prev = Infinity;
    for (const p of [0, 50, 100, 150, 250, 400]) {
      const t = cloneState(s);
      t.price = p;
      const d = computeDemand(t);
      expect(d).toBeLessThan(prev);
      prev = d;
    }
    expect(priceFactor(s, 200)).toBeLessThan(priceFactor(s, 100));
  });
  it('a price increase action lowers next-turn demand relative to no action', () => {
    const base = playTurn(createInitialState(9), [], 0);
    const priced = playTurn(createInitialState(9), ['price_up_50'], 0);
    expect(priced.price).toBe(150);
    expect(priced.demand).toBeLessThan(base.demand);
  });
});

describe('3. capacity and occupancy constraints', () => {
  it('occupancy never exceeds capacity', () => {
    const s = playFull(5, () => ['price_down']);
    for (const snap of s.stats) {
      expect(snap.occupied).toBeLessThanOrEqual(snap.capacity);
      expect(snap.occupied).toBeLessThanOrEqual(snap.demand);
    }
  });
  it('revenue is based on occupied paid spaces, not total demand', () => {
    const s = createInitialState(1);
    s.demand = 10_000;
    const f = annualFinancials(s, 10_000, 5);
    expect(f.permitRevenue).toBeLessThanOrEqual(capacity(s) * s.price);
  });
});

describe('4. infrastructure construction and spending', () => {
  it('building a lot adds spaces, consumes land, and spends cash', () => {
    const s0 = createInitialState(2);
    const s1 = submitPolicies(s0, ['build_lot']);
    expect(capacity(s1)).toBe(capacity(s0) + C.LOT_SPACES);
    expect(countParcels(s1, 'vacant')).toBe(countParcels(s0, 'vacant') - 1);
    expect(s1.cash).toBe(s0.cash - getPolicy('build_lot')!.cost(s0));
  });
  it('building a garage creates debt service and is not counted as revenue', () => {
    let s = createInitialState(2);
    for (let i = 0; i < 2; i++) s = playTurn(s, [], 0); // reach 1958
    const before = cloneState(s);
    const after = submitPolicies(s, ['build_garage']);
    expect(countParcels(after, 'garage')).toBe(countParcels(before, 'garage') + 1);
    expect(after.debts.length).toBe(before.debts.length + 1);
    expect(after.cash).toBeLessThan(before.cash);
    const f = annualFinancials(after, after.demand, 5);
    expect(f.debtService).toBeGreaterThan(0);
  });
});

describe('5. recurring operating costs', () => {
  it('commitments add recurring program costs every turn', () => {
    const s = createInitialState(3);
    const without = annualFinancials(s, 620, 5);
    addCommitment(s, 'transitSubsidy');
    addCommitment(s, 'shuttle');
    const withPrograms = annualFinancials(s, 620, 5);
    expect(withPrograms.programCost).toBeGreaterThan(0);
    expect(withPrograms.net).toBe(without.net - withPrograms.programCost);
  });
  it('garages incur maintenance; degraded garages cost double', () => {
    const s = createInitialState(3);
    s.parcels[0].type = 'garage';
    const healthy = annualFinancials(s, 620, 5).maintenanceCost;
    s.parcels[0].condition = 20;
    expect(annualFinancials(s, 620, 5).maintenanceCost).toBe(healthy + C.GARAGE_MAINTENANCE);
  });
});

describe('6. stakeholder satisfaction bounds', () => {
  it('indicators stay within 0–100 under extreme strategies', () => {
    playFull(11, () => ['price_up_50', 'enforcement', 'admin_reserved']);
    playFull(12, () => ['faculty_privileges', 'committee', 'price_down']);
    const s = createInitialState(1);
    s.ind.faculty = 99;
    const t = submitPolicies(s, ['faculty_privileges']);
    expect(t.ind.faculty).toBeLessThanOrEqual(100);
  });
});

describe('7. path dependence accumulation and reversal', () => {
  it('garage building accumulates inertia and makes conversion costlier', () => {
    const asphalt = playFull(4, (s) => ['build_garage', 'build_lot', 'faculty_privileges']);
    const lean = playFull(4, () => ['transit_subsidy', 'shuttle']);
    expect(asphalt.ind.inertia).toBeGreaterThan(lean.ind.inertia + 20);
    const conv = getPolicy('convert_green')!;
    const a = cloneState(lean);
    const b = cloneState(lean);
    a.ind.inertia = 10;
    b.ind.inertia = 80;
    expect(conv.cost(b)).toBeGreaterThan(conv.cost(a));
  });
  it('reform remains possible: conversion is still available at maximum inertia', () => {
    const s = createInitialState(4);
    s.ind.inertia = 100;
    expect(policyBlocker(s, getPolicy('convert_academic')!, [])).toBeNull();
    const t = submitPolicies(s, ['convert_academic']);
    expect(t.ind.inertia).toBeLessThan(100);
  });
  it('revoking an old entitlement hurts more than revoking a new one', () => {
    let s = createInitialState(6);
    s = playTurn(s, ['faculty_privileges'], 0);
    const young = submitPolicies(cloneState(s), ['end_facultyPrivileges']);
    let old = s;
    for (let i = 0; i < 4; i++) old = playTurn(old, [], 0);
    const oldPre = cloneState(old);
    const oldRevoked = submitPolicies(old, ['end_facultyPrivileges']);
    const youngDrop = s.ind.faculty - young.ind.faculty;
    const oldDrop = oldPre.ind.faculty - oldRevoked.ind.faculty;
    expect(oldDrop).toBeGreaterThan(youngDrop);
  });
});

describe('8. era-specific policy availability', () => {
  it('garages, bike lanes, and cash-out unlock in later eras', () => {
    const s = createInitialState(1);
    expect(policyBlocker(s, getPolicy('build_garage')!, [])).toMatch(/Unlocks/);
    expect(policyBlocker(s, getPolicy('bike_infra')!, [])).toMatch(/Unlocks/);
    expect(policyBlocker(s, getPolicy('cash_out')!, [])).toMatch(/Unlocks/);
    s.year = 2003;
    expect(policyBlocker(s, getPolicy('cash_out')!, [])).toBeNull();
    expect(policyBlocker(s, getPolicy('bike_infra')!, [])).toBeNull();
  });
  it('enforces the three-action limit and one pricing decision per turn', () => {
    const s = createInitialState(1);
    expect(policyBlocker(s, getPolicy('price_up_25')!, ['price_up_10'])).toMatch(/pricing/);
    expect(policyBlocker(s, getPolicy('committee')!, ['build_lot', 'transit_subsidy', 'price_up_10'])).toMatch(/limit/);
  });
  it('defines at least 10 policies and 25 events with valid eras', () => {
    expect(POLICIES.filter((p) => !p.id.startsWith('end_')).length).toBeGreaterThanOrEqual(10);
    expect(EVENTS.length).toBeGreaterThanOrEqual(25);
    for (const e of EVENTS) {
      expect(e.choices.length).toBeGreaterThanOrEqual(2);
      expect(e.choices.length).toBeLessThanOrEqual(3);
      expect(e.eras.length).toBeGreaterThan(0);
    }
  });
});

describe('9. event conditions and outcome application', () => {
  it('conditional events only appear when their conditions hold', () => {
    const s = createInitialState(1);
    expect(eligibleEvents(s).some((e) => e.id === 'committee_review')).toBe(false);
    s.counters.committees = 2;
    expect(eligibleEvents(s).some((e) => e.id === 'committee_review')).toBe(true);
    // Modern-era events never appear in 1948.
    expect(eligibleEvents(s).some((e) => e.id === 'remote_work')).toBe(false);
  });
  it('applies the chosen outcome and marks the event used', () => {
    const s = submitPolicies(createInitialState(7), []);
    s.pendingEventId = 'tailfins';
    const r = resolveEvent(s, 1);
    expect(r.flags.compactStalls).toBe(true);
    expect(r.usedEvents).toContain('tailfins');
    expect(r.history[0].event?.title).toBe(getEvent('tailfins')!.title);
  });
  it('falls back to an available choice when the chosen one is blocked', () => {
    const s = submitPolicies(createInitialState(7), []);
    s.pendingEventId = 'historic'; // choice 2 requires year >= 1970
    const r = resolveEvent(s, 2);
    expect(r.usedEvents).toContain('historic');
    assertValid(r);
  });
  it('every event choice can be applied without producing invalid state', () => {
    for (const e of EVENTS) {
      e.choices.forEach((c) => {
        const s = createInitialState(1);
        s.year = 2003;
        s.counters.committees = 2;
        if (c.unavailable?.(s)) return;
        const frag = c.apply(s);
        expect(typeof frag).toBe('string');
        assertValid(s);
      });
    }
  });
});

describe('10. deterministic simulation', () => {
  it('same seed and decisions produce identical games', () => {
    const strat = (s: GameState) => (s.turn % 2 === 0 ? ['price_up_10', 'build_lot'] : ['transit_subsidy', 'committee']);
    const a = playFull(2024, strat, 1);
    const b = playFull(2024, strat, 1);
    expect(JSON.stringify(a)).toBe(JSON.stringify(b));
  });
  it('different seeds draw different event sequences', () => {
    const seq = (seed: number) => playFull(seed, () => []).usedEvents.join(',');
    const seqs = new Set([1, 2, 3, 4, 5].map(seq));
    expect(seqs.size).toBeGreaterThan(1);
  });
  it('runs from 1948 to 2025 in the expected number of turns', () => {
    const s = playFull(77, () => []);
    expect(s.year).toBe(2025);
    expect(s.phase).toBe('ended');
    expect(s.history).toHaveLength(totalTurns());
    expect(s.history.at(-1)!.endYear).toBe(2025);
  });
});

describe('11. save/load consistency', () => {
  it('round-trips a mid-game state exactly', () => {
    const storage = memoryStorage();
    let s = createInitialState(31);
    s = playTurn(s, ['build_lot', 'price_up_10'], 1);
    s = submitPolicies(s, ['transit_subsidy']);
    expect(saveGame(storage, s)).toBe(true);
    const loaded = loadGame(storage);
    expect(loaded.ok).toBe(true);
    if (loaded.ok) {
      expect(loaded.state).toEqual(s);
      // Continuing from the loaded game matches continuing from the original.
      expect(JSON.stringify(resolveEvent(loaded.state, 0))).toBe(JSON.stringify(resolveEvent(s, 0)));
    }
  });
  it('rejects corrupted, incompatible, and missing saves safely', () => {
    expect(deserialize(null).ok).toBe(false);
    expect(deserialize('{not json').ok).toBe(false);
    const good = JSON.parse(serialize(createInitialState(1)));
    expect(deserialize(JSON.stringify({ ...good, version: 999 }))).toMatchObject({ ok: false, reason: 'incompatible' });
    const bad = { ...good, state: { ...good.state, cash: 'lots' } };
    expect(deserialize(JSON.stringify(bad))).toMatchObject({ ok: false, reason: 'corrupt' });
    const outOfRange = { ...good, state: { ...good.state, ind: { ...good.state.ind, faculty: 400 } } };
    expect(deserialize(JSON.stringify(outOfRange)).ok).toBe(false);
  });
  it('handles a throwing storage backend', () => {
    const broken: StorageLike = {
      getItem: () => { throw new Error('denied'); },
      setItem: () => { throw new Error('denied'); },
      removeItem: () => {},
    };
    expect(saveGame(broken, createInitialState(1))).toBe(false);
    expect(loadGame(broken).ok).toBe(false);
  });
});

describe('12. end-game classification', () => {
  it('classifies endings from state, not randomness', () => {
    const base = createInitialState(1);
    const committee = cloneState(base);
    committee.counters.committees = 8;
    expect(classifyEnding(committee).id).toBe('committee');

    const broke = cloneState(base);
    broke.cash = -5_000_000;
    expect(classifyEnding(broke).id).toBe('receivership');

    const transit = cloneState(base);
    transit.ind.autoDependence = 25;
    transit.ind.sustainability = 80;
    for (const id of ['transitSubsidy', 'shuttle', 'bikeInfra'] as const) addCommitment(transit, id);
    expect(classifyEnding(transit).id).toBe('transit');

    const asphalt = cloneState(base);
    asphalt.parcels.slice(0, 4).forEach((p) => (p.type = 'garage'));
    asphalt.ind.autoDependence = 80;
    expect(classifyEnding(asphalt).id).toBe('asphalt');

    const rich = cloneState(base);
    rich.cash = 9_000_000;
    expect(classifyEnding(rich).id).toBe('fiscal');

    expect(classifyEnding(base).id).toBe('perfect');
  });
  it('distinct strategies reach distinct endings', () => {
    const asphalt = playFull(1, (s) => ['build_garage', s.price < 260 ? 'price_up_25' : '', 'build_lot', 'renovate']);
    const transit = playFull(1, (s) => ['transit_subsidy', 'shuttle', 'bike_infra', 'cash_out', 'carpool', s.price < 250 ? 'price_up_25' : '']);
    const committees = playFull(1, () => ['committee']);
    const ids = new Set([asphalt, transit, committees].map((s) => classifyEnding(s).id));
    expect(ids.size).toBe(3);
  });
});
