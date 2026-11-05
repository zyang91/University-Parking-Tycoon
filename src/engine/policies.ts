import {
  addCommitment,
  applyEffects,
  C,
  countParcels,
  findParcel,
  getCommitment,
  hasCommitment,
  inertiaMultiplier,
  landCost,
  removeCommitment,
  setParcel,
} from './state';
import type { CommitmentId, GameState, PolicyCategory, PolicyDef } from './types';
import { hashPick } from './rng';

export const MAX_ACTIONS_PER_TURN = 3;

export const CATEGORY_LABELS: Record<PolicyCategory, string> = {
  pricing: 'Parking Pricing',
  infrastructure: 'Infrastructure',
  tdm: 'Demand Management',
  administrative: 'Administration',
};

export const COMMITMENT_LABELS: Record<CommitmentId, string> = {
  transitSubsidy: 'Transit Subsidy',
  bikeInfra: 'Bicycle Network',
  shuttle: 'University Shuttle',
  carpool: 'Carpool Incentives',
  cashOut: 'Parking Cash-Out',
  facultyPrivileges: 'Faculty Parking Privileges',
  adminReserved: 'Reserved Administrator Spaces',
  enforcement: 'Parking Enforcement',
  sharedParking: 'Shared Parking Agreement',
  differentiatedPricing: 'Differentiated Permits',
};

/** Commitments that count as alternative-transportation (TDM) programs. */
export const TDM_COMMITMENTS: CommitmentId[] = ['transitSubsidy', 'bikeInfra', 'shuttle', 'carpool', 'cashOut'];

/** Annual recurring cost of each commitment, in game dollars. */
export function commitmentAnnualCost(s: GameState, id: CommitmentId): number {
  const p = s.popIndex;
  switch (id) {
    case 'transitSubsidy': return Math.round(12000 * p);
    case 'bikeInfra': return 5000;
    case 'shuttle': return Math.round(10000 * p);
    case 'carpool': return Math.round(3000 * p);
    case 'cashOut': return Math.round(16000 * p);
    case 'enforcement': return 12000;
    case 'sharedParking': return 18000;
    default: return 0;
  }
}

const GARAGE_NAMES = [
  'Pemberton Memorial Garage', 'Thornbury Parking Pavilion', 'The Ashcroft Deck', 'Founders Garage',
  'Alumni Commons Garage', 'Heritage Structure', 'The Innovation Garage', 'Provost Row Deck',
  'Centennial Garage', 'The Excellence Garage',
];

function priceAnger(s: GameState, pct: number): number {
  // Faculty anger rises with price changes, car dependence, and institutional inertia.
  return (pct / 5) * (0.6 + s.ind.autoDependence / 100) * inertiaMultiplier(s);
}

function pricingPolicy(id: string, pct: number, name: string, flavor: string): PolicyDef {
  return {
    id,
    name,
    category: 'pricing',
    description: `Raise annual permit prices by ${pct}%. Lowers demand and raises revenue per space.`,
    flavor,
    minYear: 1948,
    tags: [
      { label: 'Revenue ↑', tone: 'good' },
      { label: 'Demand ↓', tone: 'good' },
      { label: 'Faculty ↓', tone: 'bad' },
    ],
    cost: () => 0,
    apply: (s) => {
      const anger = priceAnger(s, pct);
      s.price = Math.round(s.price * (1 + pct / 100));
      applyEffects(s, {
        faculty: -anger,
        students: -pct / 10,
        neighborhood: -pct / 25,
        sustainability: pct / 10,
      });
      s.counters.priceIncreases++;
      return `raised permit prices by ${pct}% to $${s.price}`;
    },
  };
}

function landPolicyCost(s: GameState, base: number): number {
  return Math.round(base * landCost(s));
}

/** Garage construction costs scale with land/construction costs, less than one-for-one. */
export function garageUpfront(s: GameState): number {
  return Math.round(300000 * landCost(s) ** 0.6);
}
export function garageDebt(s: GameState): number {
  return Math.round(40000 * landCost(s) ** 0.6);
}

function convertCost(s: GameState, kind: 'academic' | 'green'): number {
  const fromGarage = countParcels(s, 'lot') === 0;
  const base = fromGarage ? 520000 : kind === 'academic' ? 110000 : 80000;
  return Math.round(base * inertiaMultiplier(s));
}

function conversionAnger(s: GameState): number {
  return 3 + s.ind.inertia / 8 + s.ind.autoDependence / 20;
}

function tdmPolicy(
  id: string,
  commitment: CommitmentId,
  name: string,
  minYear: number,
  upfront: number,
  description: string,
  flavor: string,
  fx: Parameters<typeof applyEffects>[1],
  fragment: string,
): PolicyDef {
  return {
    id,
    name,
    category: 'tdm',
    description,
    flavor,
    minYear,
    tags: [
      { label: 'Demand ↓', tone: 'good' },
      { label: 'Sustainability ↑', tone: 'good' },
      { label: 'Recurring cost', tone: 'bad' },
    ],
    cost: () => upfront,
    recurring: (s) => commitmentAnnualCost(s, commitment),
    unavailable: (s) => (hasCommitment(s, commitment) ? 'Already active' : null),
    apply: (s) => {
      addCommitment(s, commitment);
      applyEffects(s, fx);
      s.counters.tdmAdopted++;
      return fragment;
    },
  };
}

/** Political cost of ending an established program grows with its age (institutional legacy). */
function terminationPolicy(id: CommitmentId): PolicyDef {
  const label = COMMITMENT_LABELS[id];
  const isTdm = TDM_COMMITMENTS.includes(id);
  return {
    id: `end_${id}`,
    name: id === 'facultyPrivileges' ? 'Revoke Faculty Privileges' : `End ${label}`,
    category: id === 'facultyPrivileges' || id === 'adminReserved' || id === 'enforcement' || id === 'sharedParking'
      ? 'administrative'
      : isTdm ? 'tdm' : 'pricing',
    description: id === 'facultyPrivileges'
      ? 'Return free faculty parking to the paid permit system. Entitlements are easier to grant than to revoke.'
      : `Terminate the ${label.toLowerCase()} program. Saves its recurring cost; constituents will notice.`,
    flavor: 'Every program has a constituency, especially after it has been around for a while.',
    minYear: 1948,
    tags: [{ label: 'Saves money', tone: 'good' }, { label: 'Backlash', tone: 'bad' }],
    cost: () => 0,
    unavailable: (s) => (hasCommitment(s, id) ? null : 'Not active'),
    apply: (s) => {
      const c = getCommitment(s, id);
      const legacy = c ? c.turnsActive : 0;
      removeCommitment(s, id);
      s.counters.programsTerminated++;
      if (id === 'facultyPrivileges') {
        applyEffects(s, {
          faculty: -(10 + s.ind.inertia / 4 + legacy * 1.5),
          students: 3,
          inertia: -6,
          autoDependence: -2,
        });
        return `revoked faculty parking privileges after ${legacy * 5} years, prompting a Faculty Senate resolution of unusual length`;
      }
      if (isTdm) {
        applyEffects(s, {
          students: -(4 + legacy * 1.5),
          faculty: -(1 + legacy * 0.5),
          sustainability: -4,
          autoDependence: 2 + legacy * 0.5,
          inertia: 2,
        });
        return `ended the ${label.toLowerCase()} program, which riders had come to regard as a natural right`;
      }
      if (id === 'adminReserved') {
        applyEffects(s, { students: 2, faculty: 2, cash: -50000 });
        return 'eliminated reserved administrator spaces; several vice provosts discovered walking';
      }
      if (id === 'enforcement') {
        applyEffects(s, { students: 3, neighborhood: -3 });
        return 'disbanded parking enforcement, to the delight of creative parkers everywhere';
      }
      if (id === 'sharedParking') {
        applyEffects(s, { neighborhood: -3 });
        return 'ended the shared parking agreement with the hospital next door';
      }
      applyEffects(s, { students: -2 });
      return `ended ${label.toLowerCase()}`;
    },
  };
}

export const POLICIES: PolicyDef[] = [
  // ---------------- Pricing ----------------
  pricingPolicy('price_up_10', 10, 'Modest Price Increase (+10%)', 'An adjustment so small that only every single permit holder will notice.'),
  pricingPolicy('price_up_25', 25, 'Substantial Increase (+25%)', 'The Budget Office calls it "market alignment." The faculty call it something else.'),
  pricingPolicy('price_up_50', 50, 'Aggressive Increase (+50%)', 'Bold. Visionary. Possibly career-limiting.'),
  {
    id: 'price_down',
    name: 'Reduce Prices (−20%)',
    category: 'pricing',
    description: 'Cut permit prices by 20%. Popular immediately, expensive forever.',
    flavor: 'Nobody has ever been fired for making parking cheaper. Yet.',
    minYear: 1948,
    tags: [{ label: 'Faculty ↑', tone: 'good' }, { label: 'Demand ↑', tone: 'bad' }, { label: 'Revenue ↓', tone: 'bad' }],
    cost: () => 0,
    unavailable: (s) => (s.price <= 20 ? 'Prices are already nearly free' : null),
    apply: (s) => {
      s.price = Math.max(0, Math.round(s.price * 0.8));
      applyEffects(s, { faculty: 5, students: 3, sustainability: -3, autoDependence: 2 });
      s.counters.priceCuts++;
      return `reduced permit prices to $${s.price}`;
    },
  },
  {
    id: 'differentiated',
    name: 'Differentiated Permit Pricing',
    category: 'pricing',
    description: 'Tier prices by location, time of day, and salary band. More revenue per space and more responsive demand.',
    flavor: 'The permit price schedule now requires its own 40-page handbook.',
    minYear: 1980,
    tags: [{ label: 'Revenue ↑', tone: 'good' }, { label: 'Students ↑', tone: 'good' }, { label: 'Complexity', tone: 'neutral' }],
    cost: () => 60000,
    unavailable: (s) => (hasCommitment(s, 'differentiatedPricing') ? 'Already adopted' : null),
    apply: (s) => {
      addCommitment(s, 'differentiatedPricing');
      applyEffects(s, { students: 4, faculty: -2, sustainability: 2 });
      return 'introduced differentiated permit pricing, with a tier for every grievance';
    },
  },

  // ---------------- Infrastructure ----------------
  {
    id: 'build_lot',
    name: 'Construct Surface Lot',
    category: 'infrastructure',
    description: `Pave a parcel for ${C.LOT_SPACES} spaces. Cheap, quick, and permanent in ways no one intends.`,
    flavor: 'Asphalt: the most flexible land use, as long as you never want to use the land for anything else.',
    minYear: 1948,
    tags: [{ label: `+${C.LOT_SPACES} spaces`, tone: 'good' }, { label: 'Uses land', tone: 'bad' }, { label: 'Car dependence ↑', tone: 'bad' }],
    cost: (s) => landPolicyCost(s, 120000),
    unavailable: (s) => (findParcel(s, ['vacant', 'green']) ? null : 'No vacant or green land left'),
    apply: (s) => {
      const p = findParcel(s, ['vacant', 'green'])!;
      const wasGreen = p.type === 'green';
      setParcel(p, 'lot', s.year);
      applyEffects(s, {
        faculty: 3,
        autoDependence: 1.5,
        inertia: 2,
        sustainability: wasGreen ? -6 : -2,
        students: wasGreen ? -3 : 0,
        neighborhood: -1,
      });
      s.counters.lotsBuilt++;
      return wasGreen ? 'paved a campus green for a new surface lot' : 'built a new surface lot on vacant land';
    },
  },
  {
    id: 'build_garage',
    name: 'Construct Parking Garage',
    category: 'infrastructure',
    description: `A ${C.GARAGE_SPACES}-space structure on vacant land or atop an existing lot. Partly bond-financed: 20 years of debt service.`,
    flavor: 'A monument to the belief that demand is a fixed quantity.',
    minYear: 1958,
    tags: [{ label: `+${C.GARAGE_SPACES} spaces`, tone: 'good' }, { label: 'Debt 20 yrs', tone: 'bad' }, { label: 'Lock-in ↑', tone: 'bad' }],
    cost: (s) => garageUpfront(s),
    recurring: (s) => garageDebt(s) + C.GARAGE_MAINTENANCE,
    unavailable: (s) => (findParcel(s, ['vacant', 'lot']) ? null : 'No vacant land or surface lot to build on'),
    apply: (s) => {
      const p = findParcel(s, ['vacant', 'lot'])!;
      const onLot = p.type === 'lot';
      const name = hashPick(GARAGE_NAMES, `${s.seed}-${s.year}-${s.counters.garagesBuilt}`);
      setParcel(p, 'garage', s.year, name);
      s.debts.push({ label: `${name} bonds`, annualPayment: garageDebt(s), turnsRemaining: 4 });
      applyEffects(s, { faculty: 6, autoDependence: 4, inertia: 7, sustainability: -5, neighborhood: -3 });
      s.counters.garagesBuilt++;
      return onLot
        ? `decked over a surface lot to create the ${name}`
        : `built the ${name} on vacant land`;
    },
  },
  {
    id: 'convert_academic',
    name: 'Convert Parking to Academic Space',
    category: 'infrastructure',
    description: 'Replace a lot (or, failing that, a garage) with an academic building. The Provost contributes toward land value. Cost and backlash rise with institutional inertia.',
    flavor: 'Bold claim: universities are for learning.',
    minYear: 1948,
    tags: [{ label: 'Academic land ↑', tone: 'good' }, { label: 'Provost grant', tone: 'good' }, { label: 'Faculty ↓', tone: 'bad' }],
    cost: (s) => convertCost(s, 'academic'),
    unavailable: (s) => (findParcel(s, ['lot', 'garage']) ? null : 'No parking left to convert'),
    apply: (s) => {
      const p = findParcel(s, ['lot', 'garage'])!;
      const wasGarage = p.type === 'garage';
      setParcel(p, 'academic', s.year);
      applyEffects(s, {
        faculty: -conversionAnger(s) + 3, // they like buildings, dislike walking
        students: 2,
        inertia: -5,
        autoDependence: -2,
        sustainability: 3,
        cash: Math.round(220000 * landCost(s)),
      });
      s.counters.conversionsToAcademic++;
      return wasGarage
        ? 'demolished a parking garage to build classrooms, a decision several trustees described as "brave"'
        : 'converted a surface lot into an academic building';
    },
  },
  {
    id: 'convert_green',
    name: 'Convert Parking to Green Space',
    category: 'infrastructure',
    description: 'Replace a lot (or garage) with a quad, rain garden, or similar. Neighbors and students approve. Inertia raises the cost.',
    flavor: 'The grass is always greener where the parking used to be.',
    minYear: 1948,
    tags: [{ label: 'Sustainability ↑', tone: 'good' }, { label: 'Neighbors ↑', tone: 'good' }, { label: 'Faculty ↓', tone: 'bad' }],
    cost: (s) => convertCost(s, 'green'),
    unavailable: (s) => (findParcel(s, ['lot', 'garage']) ? null : 'No parking left to convert'),
    apply: (s) => {
      const p = findParcel(s, ['lot', 'garage'])!;
      const wasGarage = p.type === 'garage';
      setParcel(p, 'green', s.year);
      applyEffects(s, {
        faculty: -conversionAnger(s),
        students: 4,
        neighborhood: 4,
        sustainability: 7,
        inertia: -5,
        autoDependence: -2,
      });
      s.counters.conversionsToGreen++;
      return wasGarage ? 'replaced a garage with a public green' : 'converted a surface lot into green space';
    },
  },
  {
    id: 'renovate',
    name: 'Renovate Garages',
    category: 'infrastructure',
    description: 'Restore all aging garages to full condition. Garages below 40% condition lose 20% of capacity and cost twice as much to maintain.',
    flavor: 'Concrete is forever. Concrete maintenance is also forever.',
    minYear: 1958,
    tags: [{ label: 'Restores capacity', tone: 'good' }, { label: 'Reinvests in cars', tone: 'neutral' }],
    cost: (s) => {
      const n = s.parcels.filter((p) => p.type === 'garage' && p.condition < 90).length;
      return Math.round(n * 160000 * landCost(s) ** 0.5);
    },
    unavailable: (s) =>
      s.parcels.some((p) => p.type === 'garage' && p.condition < 90) ? null : 'No garages need renovation',
    apply: (s) => {
      let n = 0;
      for (const p of s.parcels) if (p.type === 'garage' && p.condition < 90) { p.condition = 100; n++; }
      applyEffects(s, { faculty: 1, inertia: 1 });
      return `renovated ${n} aging garage${n === 1 ? '' : 's'}`;
    },
  },

  // ---------------- Transportation Demand Management ----------------
  tdmPolicy(
    'transit_subsidy', 'transitSubsidy', 'Transit Subsidy Program', 1948, 20000,
    'Subsidize fares on regional transit. Effectiveness depends on regional transit quality, and grows as the program matures.',
    'Paying people not to park: cheaper than building spaces, harder to name after donors.',
    { students: 6, faculty: 1, sustainability: 4, inertia: -2 },
    'launched a transit fare subsidy for faculty, staff, and students',
  ),
  tdmPolicy(
    'bike_infra', 'bikeInfra', 'Expand Bicycle Infrastructure', 1970, 120000,
    'Bike lanes, racks, and showers. Small recurring cost; effect grows in later eras.',
    'The Dean of Engineering has requested a covered rack for his recumbent.',
    { students: 4, sustainability: 4, neighborhood: 1 },
    'built a campus bicycle network',
  ),
  tdmPolicy(
    'shuttle', 'shuttle', 'University Shuttle', 1958, 100000,
    'Shuttle buses from remote lots and nearby neighborhoods. Reduces demand and spillover.',
    'Route 1 serves the Medical School. Route 2 serves the Dean’s preferred coffee shop.',
    { students: 4, neighborhood: 2, sustainability: 2 },
    'established a university shuttle service',
  ),
  tdmPolicy(
    'carpool', 'carpool', 'Carpool Incentives', 1973, 15000,
    'Discounted permits and preferred spaces for carpools. Cheap, modest effect.',
    'A matching service pairs colleagues who would rather walk than share a car.',
    { faculty: 1, sustainability: 2 },
    'introduced carpool incentives',
  ),
  tdmPolicy(
    'cash_out', 'cashOut', 'Parking Cash-Out & Flexible Commuting', 1995, 30000,
    'Pay employees who give up their permit. Strongly reduces demand, especially when parking is priced.',
    'Faculty are delighted to learn they can be paid for not doing something.',
    { faculty: 3, students: 2, sustainability: 4 },
    'adopted parking cash-out and flexible commuting benefits',
  ),

  // ---------------- Administrative ----------------
  {
    id: 'committee',
    name: 'Parking Advisory Committee',
    category: 'administrative',
    description: 'Temporary political relief for all stakeholders. Accomplishes very little. Diminishing returns.',
    flavor: 'The committee will report back in eighteen months with a recommendation to continue studying.',
    minYear: 1948,
    tags: [{ label: 'Politics ↑ (short)', tone: 'good' }, { label: 'Inertia ↑', tone: 'bad' }],
    cost: () => 40000,
    apply: (s) => {
      const fatigue = 1 / (1 + s.counters.committees * 0.35);
      applyEffects(s, {
        faculty: 5 * fatigue,
        students: 3 * fatigue,
        neighborhood: 4 * fatigue,
        inertia: 2,
      });
      s.counters.committees++;
      const ordinal = s.counters.committees;
      return `established Parking Advisory Committee No. ${ordinal}`;
    },
  },
  {
    id: 'faculty_privileges',
    name: 'Grant Faculty Parking Privileges',
    category: 'administrative',
    description: 'Free reserved parking for tenured faculty. Very popular. Removes ~30% of parkers from paying. Very hard to reverse later.',
    flavor: 'A benefit is temporary until the second year, after which it is a tradition.',
    minYear: 1948,
    tags: [{ label: 'Faculty ↑↑', tone: 'good' }, { label: 'Revenue ↓', tone: 'bad' }, { label: 'Lock-in ↑', tone: 'bad' }],
    cost: () => 0,
    unavailable: (s) => (hasCommitment(s, 'facultyPrivileges') ? 'Already granted' : null),
    apply: (s) => {
      addCommitment(s, 'facultyPrivileges');
      applyEffects(s, { faculty: 12, students: -4, autoDependence: 3, inertia: 6 });
      return 'granted free parking privileges to tenured faculty';
    },
  },
  {
    id: 'admin_reserved',
    name: 'Reserve Spaces for Senior Administrators',
    category: 'administrative',
    description: `Reserve ${C.ADMIN_RESERVED_SPACES} prime spaces. The Board, appreciative, releases discretionary funds.`,
    flavor: 'Leadership requires proximity. Specifically, proximity to the building entrance.',
    minYear: 1948,
    tags: [{ label: '+$120k', tone: 'good' }, { label: 'Students ↓', tone: 'bad' }, { label: `−${C.ADMIN_RESERVED_SPACES} spaces`, tone: 'bad' }],
    cost: () => 0,
    unavailable: (s) => (hasCommitment(s, 'adminReserved') ? 'Already reserved' : null),
    apply: (s) => {
      addCommitment(s, 'adminReserved');
      applyEffects(s, { cash: 120000, students: -3, faculty: -2, inertia: 2 });
      return 'reserved prime spaces for senior administrators';
    },
  },
  {
    id: 'enforcement',
    name: 'Parking Enforcement',
    category: 'administrative',
    description: 'Hire enforcement officers. Improves permit compliance (+12% revenue) and reduces illegal neighborhood parking.',
    flavor: 'The new officers are efficient, tireless, and have ticketed the President twice.',
    minYear: 1953,
    tags: [{ label: 'Revenue ↑', tone: 'good' }, { label: 'Neighbors ↑', tone: 'good' }, { label: 'Students ↓', tone: 'bad' }],
    cost: () => 30000,
    recurring: (s) => commitmentAnnualCost(s, 'enforcement'),
    unavailable: (s) => (hasCommitment(s, 'enforcement') ? 'Already active' : null),
    apply: (s) => {
      addCommitment(s, 'enforcement');
      applyEffects(s, { students: -4, faculty: -2, neighborhood: 3 });
      return 'hired a parking enforcement unit';
    },
  },
  {
    id: 'shared_parking',
    name: 'Shared Parking Agreement',
    category: 'administrative',
    description: `Lease ${C.SHARED_SPACES} off-peak spaces from the neighboring hospital and church. Capacity without construction.`,
    flavor: 'The church lot is available every day except Sunday, Christmas, and Easter, and during funerals.',
    minYear: 1963,
    tags: [{ label: `+${C.SHARED_SPACES} spaces`, tone: 'good' }, { label: 'No new land', tone: 'good' }, { label: 'Lease cost', tone: 'bad' }],
    cost: () => 25000,
    recurring: (s) => commitmentAnnualCost(s, 'sharedParking'),
    unavailable: (s) => (hasCommitment(s, 'sharedParking') ? 'Already active' : null),
    apply: (s) => {
      addCommitment(s, 'sharedParking');
      applyEffects(s, { neighborhood: 3, faculty: 1 });
      return 'negotiated a shared parking agreement with neighboring institutions';
    },
  },

  // ---------------- Reversals ----------------
  terminationPolicy('facultyPrivileges'),
  terminationPolicy('transitSubsidy'),
  terminationPolicy('shuttle'),
  terminationPolicy('bikeInfra'),
  terminationPolicy('carpool'),
  terminationPolicy('cashOut'),
  terminationPolicy('adminReserved'),
  terminationPolicy('enforcement'),
  terminationPolicy('sharedParking'),
];

export function getPolicy(id: string): PolicyDef | undefined {
  return POLICIES.find((p) => p.id === id);
}

export function isEraAvailable(p: PolicyDef, year: number): boolean {
  return year >= p.minYear && (p.maxYear === undefined || year <= p.maxYear);
}

export function isReversal(p: PolicyDef): boolean {
  return p.id.startsWith('end_');
}

/**
 * Why the policy cannot be selected right now, given the actions already queued this turn.
 * Returns null when it can be chosen.
 */
export function policyBlocker(s: GameState, p: PolicyDef, queued: string[]): string | null {
  if (!isEraAvailable(p, s.year)) return `Unlocks in ${p.minYear}`;
  if (queued.includes(p.id)) return 'Already selected';
  if (queued.length >= MAX_ACTIONS_PER_TURN) return 'Action limit reached';
  if (p.category === 'pricing' && !isReversal(p) && queued.some((q) => getPolicy(q)?.category === 'pricing' && !q.startsWith('end_'))) {
    return 'One pricing decision per turn';
  }
  const reason = p.unavailable?.(s);
  if (reason) return reason;
  const queuedCost = queued.reduce((sum, q) => sum + (getPolicy(q)?.cost(s) ?? 0), 0);
  const cost = p.cost(s);
  if (cost > 0 && s.cash + C.CREDIT_LINE - queuedCost < cost) return 'Insufficient funds (incl. credit line)';
  return null;
}
