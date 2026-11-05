// Core type definitions for the University Parking Tycoon simulation.
// All simulation logic lives in src/engine and is independent of React.

export type EraId = 'postwar' | 'expansion' | 'institutional' | 'reform' | 'modern';

export type ParcelType = 'academic' | 'lot' | 'garage' | 'green' | 'vacant';

export interface Parcel {
  id: number;
  type: ParcelType;
  /** Year the current use was established (for map labels and garage age). */
  since: number;
  /** Structural condition 0–100; only meaningful for garages. */
  condition: number;
  /** Optional display name (garages get named after donors, naturally). */
  name?: string;
}

export type CommitmentId =
  | 'transitSubsidy'
  | 'bikeInfra'
  | 'shuttle'
  | 'carpool'
  | 'cashOut'
  | 'facultyPrivileges'
  | 'adminReserved'
  | 'enforcement'
  | 'sharedParking'
  | 'differentiatedPricing';

export interface Commitment {
  id: CommitmentId;
  since: number;
  /** Turns this commitment has been active; builds legacy / entitlement. */
  turnsActive: number;
}

export interface Debt {
  label: string;
  annualPayment: number;
  turnsRemaining: number;
}

/** Numeric indicators shown on the dashboard. 0–100 scales unless noted. */
export interface Indicators {
  faculty: number;
  students: number;
  neighborhood: number;
  sustainability: number;
  autoDependence: number;
  inertia: number;
}

export interface Snapshot {
  year: number;
  capacity: number;
  demand: number;
  occupied: number;
  price: number;
  cash: number;
  netRevenue: number;
  faculty: number;
  students: number;
  neighborhood: number;
  sustainability: number;
  autoDependence: number;
  inertia: number;
  academicLand: number;
}

export interface HistoryEntry {
  year: number;
  endYear: number;
  era: EraId;
  text: string;
  actions: string[];
  event?: { title: string; choice: string };
  tags: string[];
}

export interface Counters {
  lotsBuilt: number;
  garagesBuilt: number;
  conversionsToAcademic: number;
  conversionsToGreen: number;
  committees: number;
  priceIncreases: number;
  priceCuts: number;
  tdmAdopted: number;
  programsTerminated: number;
  donorGarages: number;
  academicBuildingsAdded: number;
  academicShortfallTurns: number;
}

export type Phase = 'briefing' | 'event' | 'report' | 'ended';

export interface TurnReport {
  year: number;
  endYear: number;
  before: Snapshot;
  after: Snapshot;
  notes: string[];
  historyText: string;
  annual: FinancialBreakdown;
}

export interface FinancialBreakdown {
  permitRevenue: number;
  operatingCost: number;
  maintenanceCost: number;
  programCost: number;
  debtService: number;
  interest: number;
  net: number;
  years: number;
}

export interface GameState {
  version: number;
  seed: number;
  rngState: number;
  year: number;
  turn: number;
  phase: Phase;

  parcels: Parcel[];
  price: number;
  cash: number;
  /** University population index, 1.0 in 1948. */
  popIndex: number;
  /** Regional transit quality 0–100 (outside the university's direct control). */
  transitQuality: number;
  /** Persistent multiplicative modifier on commuting demand (e.g. hybrid work). */
  demandModifier: number;
  /** Gradual induced-demand stock, in spaces. */
  inducedDemand: number;
  /** Extra capacity from temporary arrangements (events). */
  bonusCapacity: number;

  ind: Indicators;
  commitments: Commitment[];
  debts: Debt[];
  counters: Counters;
  flags: Record<string, boolean>;
  usedEvents: string[];

  /** Latest computed values, so the dashboard can show them between turns. */
  demand: number;
  lastNetRevenue: number;
  lastFinancials: FinancialBreakdown | null;

  /** Actions chosen this turn (ids), applied when the turn is submitted. */
  pendingActions: string[];
  pendingEventId: string | null;
  turnNotes: string[];
  /** Text fragments describing this turn's decisions, for the history log. */
  turnLog: string[];

  history: HistoryEntry[];
  stats: Snapshot[];
  lastReport: TurnReport | null;
}

/** Declarative effect bundle used by policies and events. */
export interface Effects {
  cash?: number;
  faculty?: number;
  students?: number;
  neighborhood?: number;
  sustainability?: number;
  autoDependence?: number;
  inertia?: number;
  transitQuality?: number;
  popIndexMult?: number;
  demandModifierMult?: number;
  bonusCapacity?: number;
  priceMult?: number;
  flags?: Record<string, boolean>;
  note?: string;
}

export type PolicyCategory = 'pricing' | 'infrastructure' | 'tdm' | 'administrative';

export interface PolicyTag {
  label: string;
  tone: 'good' | 'bad' | 'neutral';
}

export interface PolicyDef {
  id: string;
  name: string;
  category: PolicyCategory;
  description: string;
  /** Short satirical flavor line. */
  flavor: string;
  minYear: number;
  maxYear?: number;
  tags: PolicyTag[];
  /** Upfront cost given the current state (0 if free). */
  cost: (s: GameState) => number;
  /** Recurring annual cost description, if any. */
  recurring?: (s: GameState) => number;
  /** Returns a reason string if unavailable, or null if available. */
  unavailable?: (s: GameState) => string | null;
  /** Mutates a draft state; returns a past-tense history fragment. */
  apply: (s: GameState) => string;
}

export interface EventChoice {
  label: string;
  detail: string;
  /** Mutates a draft state; returns a past-tense history fragment. */
  apply: (s: GameState) => string;
  /** Optional requirement for this choice. Returns reason if unavailable. */
  unavailable?: (s: GameState) => string | null;
}

export interface EventDef {
  id: string;
  title: string;
  eras: EraId[];
  description: (s: GameState) => string;
  condition?: (s: GameState) => boolean;
  /** Relative selection weight (default 1). */
  weight?: number | ((s: GameState) => number);
  choices: EventChoice[];
}

export interface EraDef {
  id: EraId;
  name: string;
  start: number;
  end: number;
  theme: string;
  /** University population growth multiplier per five-year turn. */
  growth: number;
  /** Cultural drift in automobile dependence per turn. */
  autoDrift: number;
  /** Real land/construction cost multiplier. */
  landCost: number;
  president: string;
  /** Drift in regional transit quality per turn. */
  transitDrift: number;
}

export interface Ending {
  id: string;
  title: string;
  summary: string;
  explanation: string;
}
