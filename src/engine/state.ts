import { eraFor, START_YEAR } from './eras';
import { normalizeSeed } from './rng';
import type {
  Commitment,
  CommitmentId,
  Effects,
  GameState,
  L,
  Parcel,
  ParcelType,
  Snapshot,
} from './types';

// v2: all generated text is stored bilingually ({ en, zh }).
export const SAVE_VERSION = 2;

/** Gameplay constants (illustrative, in constant game dollars). */
export const C = {
  LOT_SPACES: 250,
  GARAGE_SPACES: 800,
  SHARED_SPACES: 300,
  ADMIN_RESERVED_SPACES: 40,
  LAND_UNITS_PER_PARCEL: 5,
  INITIAL_DEMAND: 620,
  INITIAL_AUTO_DEP: 45,
  BASE_PRICE: 100,
  OPEX_PER_SPACE: 18,
  LOT_MAINTENANCE: 6000,
  GARAGE_MAINTENANCE: 28000,
  GARAGE_DECAY_PER_TURN: 12,
  CREDIT_LINE: 1_000_000,
  INTEREST_RATE: 0.04,
};

/** Initial campus layout: 5 columns x 4 rows = 20 parcels x 5 land units = 100 units. */
const INITIAL_LAYOUT: ParcelType[] = [
  'vacant', 'academic', 'academic', 'green', 'vacant',
  'lot', 'academic', 'green', 'academic', 'vacant',
  'vacant', 'academic', 'green', 'academic', 'lot',
  'vacant', 'green', 'academic', 'academic', 'vacant',
];

export function createInitialState(seedInput: number | string): GameState {
  const seed = normalizeSeed(seedInput);
  const parcels: Parcel[] = INITIAL_LAYOUT.map((type, id) => ({
    id,
    type,
    since: type === 'academic' ? 1900 : START_YEAR,
    condition: 100,
  }));
  const state: GameState = {
    version: SAVE_VERSION,
    seed,
    rngState: seed,
    year: START_YEAR,
    turn: 0,
    phase: 'briefing',
    parcels,
    price: C.BASE_PRICE,
    cash: 2_000_000,
    popIndex: 1,
    transitQuality: 70,
    demandModifier: 1,
    inducedDemand: 0,
    bonusCapacity: 0,
    ind: {
      faculty: 60,
      students: 55,
      neighborhood: 65,
      sustainability: 50,
      autoDependence: C.INITIAL_AUTO_DEP,
      inertia: 20,
    },
    commitments: [],
    debts: [],
    counters: {
      lotsBuilt: 0,
      garagesBuilt: 0,
      conversionsToAcademic: 0,
      conversionsToGreen: 0,
      committees: 0,
      priceIncreases: 0,
      priceCuts: 0,
      tdmAdopted: 0,
      programsTerminated: 0,
      donorGarages: 0,
      academicBuildingsAdded: 0,
      academicShortfallTurns: 0,
    },
    flags: {},
    usedEvents: [],
    demand: C.INITIAL_DEMAND,
    lastNetRevenue: 0,
    lastFinancials: null,
    pendingActions: [],
    pendingEventId: null,
    turnNotes: [],
    turnLog: [],
    history: [],
    stats: [],
    lastReport: null,
  };
  state.stats.push(snapshot(state));
  return state;
}

export function clamp(v: number, lo = 0, hi = 100): number {
  if (!Number.isFinite(v)) return lo;
  return Math.max(lo, Math.min(hi, v));
}

export function countParcels(s: GameState, type: ParcelType): number {
  return s.parcels.filter((p) => p.type === type).length;
}

export function hasCommitment(s: GameState, id: CommitmentId): boolean {
  return s.commitments.some((c) => c.id === id);
}

export function getCommitment(s: GameState, id: CommitmentId): Commitment | undefined {
  return s.commitments.find((c) => c.id === id);
}

export function addCommitment(s: GameState, id: CommitmentId): void {
  if (!hasCommitment(s, id)) s.commitments.push({ id, since: s.year, turnsActive: 0 });
}

export function removeCommitment(s: GameState, id: CommitmentId): void {
  s.commitments = s.commitments.filter((c) => c.id !== id);
}

/** Effective capacity in spaces, after degraded garages and reserved spaces. */
export function capacity(s: GameState): number {
  let cap = 0;
  for (const p of s.parcels) {
    if (p.type === 'lot') cap += C.LOT_SPACES;
    if (p.type === 'garage') cap += C.GARAGE_SPACES * (p.condition < 40 ? 0.8 : 1);
  }
  if (s.flags.wideStalls) cap *= 0.92;
  if (s.flags.compactStalls) cap *= 1.05;
  if (s.flags.annexLot) cap += 400;
  if (s.flags.hospitalLease) cap -= 300;
  if (hasCommitment(s, 'sharedParking')) cap += C.SHARED_SPACES;
  if (hasCommitment(s, 'adminReserved')) cap -= C.ADMIN_RESERVED_SPACES;
  cap += s.bonusCapacity;
  return Math.max(0, Math.round(cap));
}

/** Share of parkers who pay nothing (faculty privileges, reserved spaces). */
export function exemptShare(s: GameState): number {
  let share = 0;
  if (hasCommitment(s, 'facultyPrivileges')) share += 0.3;
  if (hasCommitment(s, 'adminReserved')) share += 0.03;
  return Math.min(0.6, share);
}

export function academicLand(s: GameState): number {
  return countParcels(s, 'vacant') * C.LAND_UNITS_PER_PARCEL;
}

export function landCost(s: GameState): number {
  return eraFor(s.year).landCost;
}

export function snapshot(s: GameState): Snapshot {
  const cap = capacity(s);
  return {
    year: s.year,
    capacity: cap,
    demand: Math.round(s.demand),
    occupied: Math.round(Math.min(cap, s.demand)),
    price: Math.round(s.price),
    cash: Math.round(s.cash),
    netRevenue: Math.round(s.lastNetRevenue),
    faculty: Math.round(s.ind.faculty),
    students: Math.round(s.ind.students),
    neighborhood: Math.round(s.ind.neighborhood),
    sustainability: Math.round(s.ind.sustainability),
    autoDependence: Math.round(s.ind.autoDependence),
    inertia: Math.round(s.ind.inertia),
    academicLand: academicLand(s),
  };
}

/** Apply a declarative effect bundle with bounds checking. Mutates `s`. */
export function applyEffects(s: GameState, e: Effects): void {
  if (e.cash) s.cash += e.cash;
  const keys = ['faculty', 'students', 'neighborhood', 'sustainability', 'autoDependence', 'inertia'] as const;
  for (const k of keys) {
    const d = e[k];
    if (d) s.ind[k] = clamp(s.ind[k] + d);
  }
  if (e.transitQuality) s.transitQuality = clamp(s.transitQuality + e.transitQuality);
  if (e.popIndexMult) s.popIndex = Math.max(0.2, s.popIndex * e.popIndexMult);
  if (e.demandModifierMult) s.demandModifier = clamp(s.demandModifier * e.demandModifierMult, 0.3, 1.5);
  if (e.bonusCapacity) s.bonusCapacity = Math.max(0, s.bonusCapacity + e.bonusCapacity);
  if (e.priceMult) s.price = clamp(Math.round(s.price * e.priceMult), 0, 5000);
  if (e.flags) Object.assign(s.flags, e.flags);
  if (e.note) s.turnNotes.push(e.note);
}

/** Pick the first parcel of the given types (in preference order). */
export function findParcel(s: GameState, types: ParcelType[]): Parcel | undefined {
  for (const t of types) {
    const p = s.parcels.find((x) => x.type === t);
    if (p) return p;
  }
  return undefined;
}

export function setParcel(p: Parcel, type: ParcelType, year: number, name?: L): void {
  p.type = type;
  p.since = year;
  p.condition = 100;
  p.name = name;
}

/** Deep clone; game state is plain JSON data. */
export function cloneState(s: GameState): GameState {
  return JSON.parse(JSON.stringify(s)) as GameState;
}

/** Inertia multiplier applied to the political and financial cost of reversing car-oriented policy. */
export function inertiaMultiplier(s: GameState): number {
  return 1 + s.ind.inertia / 100;
}
