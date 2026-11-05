/**
 * Random event definitions. All events are fictional and describe Westbridge University only.
 * Each choice mutates a draft state and returns a past-tense fragment completing the sentence
 * "…the university ___."
 */
import { addCommitment, applyEffects, capacity, countParcels, findParcel, hasCommitment, landCost, removeCommitment, setParcel } from './state';
import type { EventDef, GameState } from './types';

const fx = applyEffects;

function shortageRatio(s: GameState): number {
  return s.demand > 0 ? Math.max(0, s.demand - capacity(s)) / s.demand : 0;
}
function vacancyRatio(s: GameState): number {
  const cap = capacity(s);
  return cap > 0 ? Math.max(0, cap - s.demand) / cap : 0;
}
const parkingParcels = (s: GameState) => countParcels(s, 'lot') + countParcels(s, 'garage');

function freeGarage(s: GameState, name: string): boolean {
  const p = findParcel(s, ['vacant', 'lot']);
  if (!p) return false;
  setParcel(p, 'garage', s.year, name);
  s.counters.garagesBuilt++;
  return true;
}

export const EVENTS: EventDef[] = [
  // ------------------------------------------------------------------ Postwar
  {
    id: 'gi_surge',
    title: 'The Veterans Enrollment Surge',
    eras: ['postwar'],
    description: () =>
      'Enrollment has exploded with returning veterans, many of whom learned to drive in places considerably more dangerous than the faculty lot. Quonset huts are appearing on every lawn.',
    choices: [
      {
        label: 'Pave the athletic field “temporarily”',
        detail: '+250 spaces for a few years. Students −3.',
        apply: (s) => { fx(s, { popIndexMult: 1.05, bonusCapacity: 250, students: -3, autoDependence: 1 }); return 'paved the athletic field as a temporary measure, a phrase it would come to use often'; },
      },
      {
        label: 'Negotiate extra streetcar service',
        detail: '−$30k. Regional transit improves.',
        apply: (s) => { fx(s, { popIndexMult: 1.05, cash: -30000, transitQuality: 4, students: 2 }); return 'negotiated additional streetcar service with the transit company'; },
      },
      {
        label: 'Assume the surge is temporary',
        detail: 'Free. Probably wrong.',
        apply: (s) => { fx(s, { popIndexMult: 1.06, faculty: -2 }); return 'assumed the enrollment surge was temporary'; },
      },
    ],
  },
  {
    id: 'streetcar',
    title: 'The Streetcar Question',
    eras: ['postwar', 'expansion'],
    description: () =>
      'The transit company proposes replacing the Westbridge Avenue streetcar with modern buses. A trustee suggests the tracks could be paved over for parking, “which is basically the same thing.”',
    choices: [
      {
        label: 'Lobby to keep the streetcar',
        detail: '−$80k. Transit quality +8. Neighbors +2.',
        apply: (s) => { fx(s, { cash: -80000, transitQuality: 8, neighborhood: 2 }); return 'lobbied, expensively, to keep the streetcar running'; },
      },
      {
        label: 'Welcome the modern buses',
        detail: 'Transit −5. Car dependence +2.',
        apply: (s) => { fx(s, { transitQuality: -5, autoDependence: 2 }); return 'welcomed the new buses with a ribbon-cutting nobody rode to'; },
      },
      {
        label: 'Request the right-of-way for parking',
        detail: '+200 temporary spaces. Transit −10. Car dependence +4.',
        apply: (s) => { fx(s, { transitQuality: -10, autoDependence: 4, faculty: 2, bonusCapacity: 200 }); return 'requested the abandoned streetcar right-of-way for parking'; },
      },
    ],
  },
  {
    id: 'tailfins',
    title: 'The Tailfin Problem',
    eras: ['postwar', 'expansion'],
    description: () =>
      'Automobiles are getting longer each model year. The 1948 stalls no longer accommodate a Dean’s sedan, and three professors have been trapped in their cars since Tuesday.',
    choices: [
      {
        label: 'Restripe for larger cars',
        detail: '−$30k. Capacity −8% permanently. Faculty +3.',
        apply: (s) => { fx(s, { cash: -30000, faculty: 3, flags: { wideStalls: true } }); return 'restriped every lot for larger automobiles, losing spaces to chrome'; },
      },
      {
        label: 'Mandate compact-car stalls',
        detail: 'Capacity +5%. Faculty −4.',
        apply: (s) => { fx(s, { faculty: -4, sustainability: 1, flags: { compactStalls: true } }); return 'designated compact-only stalls, which were immediately occupied by station wagons'; },
      },
      {
        label: 'Let the fenders sort it out',
        detail: 'Faculty −2. Neighbors −2.',
        apply: (s) => { fx(s, { faculty: -2, neighborhood: -2 }); return 'allowed the fenders to sort it out'; },
      },
    ],
  },
  {
    id: 'snow',
    title: 'The Great Blizzard',
    eras: ['postwar', 'expansion', 'institutional'],
    condition: (s) => parkingParcels(s) >= 2,
    description: (s) =>
      `A blizzard has buried ${parkingParcels(s)} parking facilities. The Provost has asked whether snow counts as a parking violation.`,
    choices: [
      {
        label: 'Hire a private plow fleet',
        detail: `−$60k. Faculty +3.`,
        apply: (s) => { fx(s, { cash: -60000, faculty: 3 }); return 'hired a private plow fleet at emergency rates'; },
      },
      {
        label: 'Let it melt',
        detail: 'Faculty −4. Students −2.',
        apply: (s) => { fx(s, { faculty: -4, students: -2 }); return 'let the snow melt in accordance with natural law'; },
      },
      {
        label: 'Offer course credit for shoveling',
        detail: 'Students −4. Faculty +1. The Registrar objects.',
        apply: (s) => { fx(s, { students: -4, faculty: 1 }); return 'offered course credit for shoveling, over the objections of the Registrar'; },
      },
    ],
  },
  {
    id: 'nobel',
    title: 'The Nobel Laureate Parking Crisis',
    eras: ['postwar', 'expansion', 'institutional', 'reform'],
    description: () =>
      'A newly decorated Nobel laureate informs the Provost that discoveries of this magnitude require an exclusive parking space within forty feet of the laboratory door. The laboratory door is in the middle of a quad.',
    choices: [
      {
        label: 'Grant a reserved space',
        detail: 'Faculty +4. Students −2. Inertia +2.',
        apply: (s) => { fx(s, { faculty: 4, students: -2, inertia: 2, flags: { laureateSpace: true } }); return 'granted the laureate a reserved space, immediately requested by eleven other laureates-in-waiting'; },
      },
      {
        label: 'Name a bicycle rack in their honor',
        detail: 'Faculty −3. Sustainability +2.',
        apply: (s) => { fx(s, { faculty: -3, sustainability: 2, students: 1 }); return 'named a bicycle rack in the laureate’s honor'; },
      },
      {
        label: 'Refer it to the committee',
        detail: '−$10k. Faculty +1. Inertia +1.',
        apply: (s) => { fx(s, { cash: -10000, faculty: 1, inertia: 1 }); s.counters.committees++; return 'referred the laureate’s request to a newly formed subcommittee'; },
      },
    ],
  },
  {
    id: 'committee_review',
    title: 'The Committee to Review the Committee',
    eras: ['postwar', 'expansion', 'institutional', 'reform', 'modern'],
    condition: (s) => s.counters.committees >= 1,
    weight: (s) => 0.6 + s.counters.committees * 0.4,
    description: (s) =>
      `After ${s.counters.committees * 18} months of deliberation, Parking Advisory Committee No. ${s.counters.committees} has issued its final recommendation: the creation of a new advisory committee to review its work.`,
    choices: [
      {
        label: 'Create the review committee',
        detail: '−$20k. Faculty +2. Inertia +3.',
        apply: (s) => { fx(s, { cash: -20000, faculty: 2, inertia: 3 }); s.counters.committees++; return 'created a committee to review the committee'; },
      },
      {
        label: 'Dissolve the original committee',
        detail: 'Inertia −4. Faculty −2.',
        apply: (s) => { fx(s, { inertia: -4, faculty: -2 }); return 'dissolved the committee, which formally objected through a committee'; },
      },
      {
        label: 'Merge both into a Task Force',
        detail: '−$10k. Inertia +1. Sounds decisive.',
        apply: (s) => { fx(s, { cash: -10000, inertia: 1, faculty: 1, students: 1 }); return 'merged both bodies into a Strategic Mobility Task Force'; },
      },
    ],
  },
  {
    id: 'neighborhood_rebellion',
    title: 'The Neighborhood Parking Rebellion',
    eras: ['postwar', 'expansion', 'institutional', 'reform'],
    condition: (s) => shortageRatio(s) > 0.05 || s.ind.neighborhood < 50,
    weight: (s) => 1 + shortageRatio(s) * 6,
    description: () =>
      'Residents of the adjacent blocks have placed lawn chairs in every curbside space, citing “university commuters” and “a historic right to sit near our own houses.” The local paper has a photograph.',
    choices: [
      {
        label: 'Fund a residential permit district',
        detail: '−$150k. Neighbors +8. Spillover damage reduced permanently. Faculty −3.',
        apply: (s) => { fx(s, { cash: -150000, neighborhood: 8, faculty: -3, flags: { residentialPermits: true } }); return 'co-funded a residential permit parking district with the city'; },
      },
      {
        label: 'Establish a community benefits fund',
        detail: '−$250k. Neighbors +12 (fades).',
        apply: (s) => { fx(s, { cash: -250000, neighborhood: 12 }); return 'established a community benefits fund and a very large check'; },
      },
      {
        label: 'Issue a statement about shared public streets',
        detail: 'Neighbors −8.',
        apply: (s) => { fx(s, { neighborhood: -8 }); return 'issued a statement reminding residents that streets are public'; },
      },
    ],
  },

  // ------------------------------------------------------------------ Expansion
  {
    id: 'urban_renewal',
    title: 'The Redevelopment Authority’s Generous Offer',
    eras: ['expansion'],
    condition: (s) => !s.flags.annexLot,
    description: () =>
      'The city’s Redevelopment Authority offers to clear two adjacent blocks of rowhouses for a 400-space university lot, describing the blocks as “underutilized,” a term residents did not use.',
    choices: [
      {
        label: 'Accept the cleared land',
        detail: '+400 spaces permanently. Neighbors −15. Inertia +5.',
        apply: (s) => { fx(s, { neighborhood: -15, inertia: 5, autoDependence: 3, faculty: 4, sustainability: -3, flags: { annexLot: true } }); return 'accepted cleared land for a 400-space annex lot, beginning a long memory in the neighborhood'; },
      },
      {
        label: 'Propose mixed housing instead',
        detail: '−$200k. Neighbors +8.',
        apply: (s) => { fx(s, { cash: -200000, neighborhood: 8, students: 2 }); return 'proposed and partly funded mixed-income housing instead of parking'; },
      },
      {
        label: 'Decline politely',
        detail: 'Neighbors +4. Faculty −2.',
        apply: (s) => { fx(s, { neighborhood: 4, faculty: -2 }); return 'declined the land'; },
      },
    ],
  },
  {
    id: 'sit_in',
    title: 'The Sit-In at Lot B',
    eras: ['expansion'],
    description: () =>
      'Student activists have occupied the Parking Office, demanding an end to the war, an end to the draft, and an end to the $5 late fee. Negotiators note the third demand is the only one within your authority.',
    choices: [
      {
        label: 'Negotiate and abolish the late fee',
        detail: 'Students +7. Faculty −2. −$20k.',
        apply: (s) => { fx(s, { students: 7, faculty: -2, cash: -20000 }); return 'negotiated with the occupiers and abolished the late fee'; },
      },
      {
        label: 'Form a joint student–faculty committee',
        detail: 'Students +2. Inertia +2.',
        apply: (s) => { fx(s, { students: 2, inertia: 2 }); s.counters.committees++; return 'formed a joint student–faculty parking committee'; },
      },
      {
        label: 'Wait them out',
        detail: 'Students −8. Neighbors −2.',
        apply: (s) => { fx(s, { students: -8, neighborhood: -2 }); return 'waited out the sit-in, which ended when finals began'; },
      },
    ],
  },
  {
    id: 'oil_crisis',
    title: 'The Gasoline Line Seminar',
    eras: ['expansion'],
    condition: (s) => s.year >= 1968,
    description: () =>
      'An oil embargo has produced gasoline lines long enough that the Economics Department has begun teaching a seminar in one. Commuters are suddenly curious about alternatives.',
    choices: [
      {
        label: 'Launch carpool matching',
        detail: 'Adds Carpool Incentives. Sustainability +2.',
        apply: (s) => { addCommitment(s, 'carpool'); fx(s, { sustainability: 2, autoDependence: -2, demandModifierMult: 0.97 }); return 'launched a carpool matching service'; },
      },
      {
        label: 'Reserve fuel for the presidential fleet',
        detail: 'Students −3. Faculty +1.',
        apply: (s) => { fx(s, { students: -3, faculty: 1 }); return 'reserved gasoline for the presidential motor pool'; },
      },
      {
        label: 'Declare it a teachable moment',
        detail: 'Students +2. Car dependence −1.',
        apply: (s) => { fx(s, { students: 2, autoDependence: -1 }); return 'declared the crisis a teachable moment'; },
      },
    ],
  },
  {
    id: 'federal_grant',
    title: 'The Federal Mass Transit Grant',
    eras: ['expansion', 'reform'],
    description: () =>
      'A federal agency offers matching funds for campus transit. The grant officer notes, with visible reluctance, that “transit” has occasionally been interpreted to include structured parking near a bus stop.',
    choices: [
      {
        label: 'Start a funded shuttle',
        detail: 'Adds University Shuttle. +$150k. Transit +4.',
        apply: (s) => { addCommitment(s, 'shuttle'); fx(s, { cash: 150000, transitQuality: 4, students: 3 }); return 'used federal funds to start a shuttle network'; },
      },
      {
        label: 'Interpret creatively (“park-and-ride”)',
        detail: '+$300k. Car dependence +2. Sustainability −2.',
        apply: (s) => { fx(s, { cash: 300000, autoDependence: 2, sustainability: -2, inertia: 2 }); return 'interpreted the transit grant as a park-and-ride lot near a bus stop'; },
      },
      {
        label: 'Decline the paperwork',
        detail: 'Nothing happens. Inertia +1.',
        apply: (s) => { fx(s, { inertia: 1 }); return 'declined the grant on account of the paperwork'; },
      },
    ],
  },
  {
    id: 'historic',
    title: 'The Historic Preservation Objection',
    eras: ['expansion', 'institutional', 'reform'],
    description: () =>
      'Planners propose replacing the 1890s Carriage House—where, legend says, the university’s first automobile was refused entry—with a parking lot. The Preservation Society has chained itself to the hayloft.',
    choices: [
      {
        label: 'Preserve it',
        detail: '−$60k. Neighbors +4. Faculty −2.',
        apply: (s) => { fx(s, { cash: -60000, neighborhood: 4, faculty: -2 }); return 'preserved the Carriage House'; },
      },
      {
        label: 'Demolish for “temporary” parking',
        detail: '+200 temporary spaces. Neighbors −6. Inertia +2.',
        apply: (s) => { fx(s, { bonusCapacity: 200, neighborhood: -6, students: -2, inertia: 2, sustainability: -2 }); return 'demolished the Carriage House for parking described as temporary'; },
      },
      {
        label: 'Adapt it as a bicycle hub',
        detail: '−$90k. Adds Bicycle Network. Sustainability +3.',
        unavailable: (s) => (s.year < 1970 ? 'Bicycles are not yet fashionable' : null),
        apply: (s) => { fx(s, { cash: -90000, sustainability: 3, students: 3 }); addCommitment(s, 'bikeInfra'); return 'converted the Carriage House into a bicycle hub, restoring its original transportation purpose'; },
      },
    ],
  },
  {
    id: 'faculty_senate',
    title: 'The Faculty Senate Emergency Resolution',
    eras: ['expansion', 'institutional', 'reform'],
    condition: (s) => s.price > 120 || shortageRatio(s) > 0.1,
    weight: 1.5,
    description: () =>
      'In an emergency session, the Faculty Senate has resolved 47–3 that affordable, proximate parking is “essential to academic freedom.” The three dissenters bike.',
    choices: [
      {
        label: 'Cut prices 10% as a gesture',
        detail: 'Price −10%. Faculty +6.',
        apply: (s) => { fx(s, { priceMult: 0.9, faculty: 6, sustainability: -1 }); return 'trimmed permit prices as a gesture of collegiality'; },
      },
      {
        label: 'Refer it to the Advisory Committee',
        detail: 'Faculty +2. Inertia +2.',
        apply: (s) => { fx(s, { faculty: 2, inertia: 2 }); s.counters.committees++; return 'referred the resolution to the Parking Advisory Committee'; },
      },
      {
        label: 'Note that tenure protects speech, not parking',
        detail: 'Faculty −5. Students +2. Inertia −2.',
        apply: (s) => { fx(s, { faculty: -5, students: 2, inertia: -2 }); return 'noted that tenure protects speech rather than parking'; },
      },
    ],
  },
  {
    id: 'donor',
    title: 'The Alumni Donor Ultimatum',
    eras: ['expansion', 'institutional', 'reform'],
    description: () =>
      'A wealthy alumnus offers to fund a new science building on one condition: a convenient garage bearing his name, so that future generations remember him every time they look for a space.',
    choices: [
      {
        label: 'Accept: building and garage',
        detail: 'Free 800-space garage, +$500k. Car dependence +3. Inertia +6.',
        unavailable: (s) => (findParcel(s, ['vacant', 'lot']) ? null : 'No land left for a garage'),
        apply: (s) => {
          freeGarage(s, 'The Donor’s Garage');
          s.counters.donorGarages++;
          fx(s, { cash: 500000, autoDependence: 3, inertia: 6, sustainability: -4, faculty: 4, neighborhood: -2 });
          return 'accepted the gift, garage included';
        },
      },
      {
        label: 'Counter-offer a transit endowment',
        detail: '+$250k. Adds Transit Subsidy. Faculty −1.',
        apply: (s) => { addCommitment(s, 'transitSubsidy'); fx(s, { cash: 250000, faculty: -1, students: 3, sustainability: 2 }); return 'persuaded the donor to endow transit passes instead, after several lunches'; },
      },
      {
        label: 'Decline the gift',
        detail: 'Faculty −3. Neighbors +2.',
        apply: (s) => { fx(s, { faculty: -3, neighborhood: 2 }); return 'declined the gift, to the horror of the Development Office'; },
      },
    ],
  },
  {
    id: 'garage_empty',
    title: 'The Garage That Nobody Uses',
    eras: ['expansion', 'institutional', 'reform', 'modern'],
    condition: (s) => countParcels(s, 'garage') >= 1 && vacancyRatio(s) > 0.08,
    weight: 2,
    description: () =>
      'The newest garage is 40% vacant. A consultant’s report concludes that it is “inconveniently located,” “difficult to find,” and “architecturally hostile.” The consultant’s invoice was conveniently located.',
    choices: [
      {
        label: 'Discount permits to fill it',
        detail: 'Price −5%. Car dependence +2. Faculty +2.',
        apply: (s) => { fx(s, { priceMult: 0.95, autoDependence: 2, faculty: 2 }); return 'discounted permits to fill the vacant garage'; },
      },
      {
        label: 'Rent the top deck for events',
        detail: '+$150k. Neighbors −2.',
        apply: (s) => { fx(s, { cash: 150000, neighborhood: -2, students: 1 }); return 'rented the empty top deck for weddings and food trucks'; },
      },
      {
        label: 'Rebrand it the “Innovation Garage”',
        detail: '−$25k. Nothing else changes.',
        apply: (s) => { fx(s, { cash: -25000 }); return 'rebranded the facility the Innovation Garage'; },
      },
    ],
  },
  {
    id: 'budget_office',
    title: 'The Budget Office Discovers Parking Revenue',
    eras: ['expansion', 'institutional', 'reform', 'modern'],
    condition: (s) => s.cash > 1_500_000,
    weight: (s) => (s.cash > 3_000_000 ? 2.5 : 1),
    description: (s) =>
      `The Budget Office has noticed the Parking Department’s reserves of $${Math.round(s.cash / 1000).toLocaleString()}k and proposes using them to fix the library roof, the athletics deficit, and “other strategic priorities.”`,
    choices: [
      {
        label: 'Allow the sweep',
        detail: 'Lose 35% of reserves. Faculty +3.',
        apply: (s) => { fx(s, { cash: -Math.round(s.cash * 0.35), faculty: 3, students: 2 }); return 'surrendered a third of its reserves to the general fund'; },
      },
      {
        label: 'Create a dedicated mobility fund',
        detail: '−$150k. Sustainability +3. Students +2. Inertia −2.',
        apply: (s) => { fx(s, { cash: -150000, sustainability: 3, students: 2, inertia: -2 }); return 'ring-fenced its reserves in a dedicated mobility fund'; },
      },
      {
        label: 'Cite an obscure 1952 bylaw',
        detail: 'Keeps the money. Faculty −2. Inertia +2.',
        apply: (s) => { fx(s, { faculty: -2, inertia: 2 }); return 'cited an obscure bylaw and kept the money'; },
      },
    ],
  },
  {
    id: 'transit_crisis',
    title: 'The Transit Agency Funding Crisis',
    eras: ['expansion', 'institutional', 'modern'],
    description: () =>
      'The regional transit agency announces service cuts, fare increases, and a new strategic plan titled “Doing Less With Less.” Former riders are reportedly shopping for cars.',
    choices: [
      {
        label: 'Contribute to save key routes',
        detail: '−$400k. Transit −5 (instead of −15). Neighbors +2.',
        apply: (s) => { fx(s, { cash: -400000, transitQuality: -5, students: 3, neighborhood: 2 }); return 'contributed to preserve the routes serving campus'; },
      },
      {
        label: 'Lobby the state legislature',
        detail: '−$40k. Transit −10.',
        apply: (s) => { fx(s, { cash: -40000, transitQuality: -10 }); return 'lobbied the legislature, which thanked it for its input'; },
      },
      {
        label: 'Accept the cuts',
        detail: 'Transit −15. Car dependence +3.',
        apply: (s) => { fx(s, { transitQuality: -15, autoDependence: 3 }); return 'accepted the service cuts as beyond its control'; },
      },
    ],
  },

  // ------------------------------------------------------------------ Institutionalization
  {
    id: 'mainframe',
    title: 'The Mainframe Permit System',
    eras: ['institutional'],
    description: () =>
      'Information Services offers to computerize the permit system. The demonstration printed 4,000 permits for a single Assistant Dean.',
    choices: [
      {
        label: 'Computerize',
        detail: '−$120k. Enforcement-level compliance. Faculty −1.',
        apply: (s) => { fx(s, { cash: -120000, faculty: -1 }); addCommitment(s, 'enforcement'); return 'computerized the permit system, eventually'; },
      },
      {
        label: 'Keep the index cards',
        detail: 'Faculty +1. Inertia +2.',
        apply: (s) => { fx(s, { faculty: 1, inertia: 2 }); return 'retained its index-card permit system on grounds of reliability'; },
      },
    ],
  },
  {
    id: 'lottery',
    title: 'The Parking Permit Lottery Scandal',
    eras: ['institutional', 'reform', 'modern'],
    condition: (s) => hasCommitment(s, 'adminReserved') || hasCommitment(s, 'facultyPrivileges') || s.flags.laureateSpace === true,
    weight: 2,
    description: () =>
      'Graduate students have discovered that the permit “lottery” has never once been won by a senior administrator, because senior administrators were never entered—they were simply exempt.',
    choices: [
      {
        label: 'End administrator exemptions',
        detail: 'Removes reserved spaces. Students +8. Faculty +1.',
        apply: (s) => { removeCommitment(s, 'adminReserved'); fx(s, { students: 8, faculty: 1, inertia: -2 }); return 'ended administrator exemptions from the lottery'; },
      },
      {
        label: 'Create a Lottery Integrity Committee',
        detail: 'Students +2. Inertia +2.',
        apply: (s) => { fx(s, { students: 2, inertia: 2 }); s.counters.committees++; return 'appointed a Lottery Integrity Committee, chaired by an exempt administrator'; },
      },
      {
        label: 'Deny everything',
        detail: 'Students −8.',
        apply: (s) => { fx(s, { students: -8 }); return 'denied the existence of any lottery'; },
      },
    ],
  },
  {
    id: 'freedom_petition',
    title: 'The Academic Freedom Parking Petition',
    eras: ['institutional', 'reform'],
    condition: (s) => s.price >= 150,
    weight: 1.5,
    description: (s) =>
      `Two hundred faculty have signed a petition arguing that $${s.price} annual permits “restrict scholarly independence.” Footnotes cite Locke, Mill, and a 1971 Buick owner’s manual.`,
    choices: [
      {
        label: 'Introduce an “academic freedom discount”',
        detail: 'Price −15%. Faculty +6.',
        apply: (s) => { fx(s, { priceMult: 0.85, faculty: 6, sustainability: -2 }); return 'introduced an academic freedom discount'; },
      },
      {
        label: 'Offer commuter benefits instead',
        detail: 'Adds Transit Subsidy. −$30k. Faculty +2.',
        apply: (s) => { addCommitment(s, 'transitSubsidy'); fx(s, { cash: -30000, faculty: 2, students: 3 }); return 'offered expanded commuter benefits in place of a discount'; },
      },
      {
        label: 'Publish the parking budget',
        detail: 'Faculty −3. Inertia −3. Transparency!',
        apply: (s) => { fx(s, { faculty: -3, inertia: -3, students: 1 }); return 'published the full parking budget, which nobody read past page two'; },
      },
    ],
  },
  {
    id: 'stadium',
    title: 'The Game-Day Parking Gambit',
    eras: ['institutional', 'reform'],
    description: () =>
      'Athletics wants every campus space on six Saturdays a year for tailgating. They offer money, enthusiasm, and a vague promise about the band.',
    choices: [
      {
        label: 'Lease the lots to Athletics',
        detail: '+$200k. Neighbors −5. Students +2.',
        apply: (s) => { fx(s, { cash: 200000, neighborhood: -5, students: 2 }); return 'leased its lots for game days'; },
      },
      {
        label: 'Run game-day shuttles instead',
        detail: '+$100k. Neighbors +1. Requires a shuttle.',
        unavailable: (s) => (hasCommitment(s, 'shuttle') ? null : 'Requires the University Shuttle'),
        apply: (s) => { fx(s, { cash: 100000, neighborhood: 1, students: 2 }); return 'ran game-day shuttles from remote lots'; },
      },
      {
        label: 'Refuse',
        detail: 'Students −3. Faculty +1.',
        apply: (s) => { fx(s, { students: -3, faculty: 1 }); return 'refused, reminding Athletics that Saturday is for research'; },
      },
    ],
  },
  {
    id: 'hospital',
    title: 'The Hospital Wants Your Spaces',
    eras: ['institutional', 'reform'],
    condition: (s) => !s.flags.hospitalLease,
    description: () =>
      'The university hospital, which is also somehow a separate corporation, wants 300 of your spaces for patients. It notes that patients are, medically speaking, in a hurry.',
    choices: [
      {
        label: 'Lease 300 spaces to the hospital',
        detail: '+$350k. Capacity −300 permanently. Faculty −4.',
        apply: (s) => { fx(s, { cash: 350000, faculty: -4, neighborhood: 2, flags: { hospitalLease: true } }); return 'leased 300 spaces to the hospital'; },
      },
      {
        label: 'Propose a shared-parking agreement',
        detail: 'Adds Shared Parking. Neighbors +2.',
        apply: (s) => { addCommitment(s, 'sharedParking'); fx(s, { neighborhood: 2 }); return 'proposed a shared-parking arrangement with the hospital'; },
      },
      {
        label: 'Refuse',
        detail: 'Neighbors −4 as patients park on streets.',
        apply: (s) => { fx(s, { neighborhood: -4 }); return 'refused the hospital’s request'; },
      },
    ],
  },
  {
    id: 'enrollment',
    title: 'The Strategic Enrollment Initiative',
    eras: ['institutional', 'reform'],
    description: () =>
      'The Admissions Office has exceeded its targets by 9%, an achievement it is celebrating and you are calculating.',
    choices: [
      {
        label: 'Give new students transit passes',
        detail: '−$40k. Adds Transit Subsidy.',
        apply: (s) => { fx(s, { popIndexMult: 1.04, cash: -40000, students: 3 }); addCommitment(s, 'transitSubsidy'); return 'issued transit passes to the incoming class'; },
      },
      {
        label: 'Require first-years to live on campus',
        detail: '−$200k. Car dependence −3. Neighbors +2.',
        apply: (s) => { fx(s, { popIndexMult: 1.04, cash: -200000, autoDependence: -3, neighborhood: 2 }); return 'required first-year students to live on campus'; },
      },
      {
        label: 'Sell them permits',
        detail: '+$60k. Car dependence +2.',
        apply: (s) => { fx(s, { popIndexMult: 1.04, cash: 60000, autoDependence: 2, students: 1 }); return 'sold permits to the incoming class'; },
      },
    ],
  },

  // ------------------------------------------------------------------ Reform
  {
    id: 'sustainable_garage',
    title: 'The Sustainable Parking Garage',
    eras: ['reform', 'modern'],
    description: () =>
      'Facilities proposes an 800-space garage as the centerpiece of the Climate Action Plan. It will have solar panels on the roof, a rain garden at the exit, and 800 cars in between.',
    choices: [
      {
        label: 'Build it (with solar panels!)',
        detail: 'Free garage via green bonds; 20-yr debt. Sustainability +1. Car dependence +3.',
        unavailable: (s) => (findParcel(s, ['vacant', 'lot']) ? null : 'No land left for a garage'),
        apply: (s) => {
          freeGarage(s, 'The Sustainable Garage');
          s.debts.push({ label: 'Green bonds', annualPayment: Math.round(45000 * landCost(s) ** 0.6), turnsRemaining: 4 });
          fx(s, { sustainability: 1, autoDependence: 3, inertia: 6, faculty: 4 });
          return 'built a sustainable parking garage, with solar panels';
        },
      },
      {
        label: 'Build the bike hub and rain garden only',
        detail: '−$150k. Sustainability +4. Faculty −2.',
        apply: (s) => { fx(s, { cash: -150000, sustainability: 4, faculty: -2, students: 2 }); return 'built the rain garden and bike hub, but not the garage between them'; },
      },
      {
        label: 'Shelve it',
        detail: 'Faculty −2. Inertia −1.',
        apply: (s) => { fx(s, { faculty: -2, inertia: -1 }); return 'shelved the sustainable garage'; },
      },
    ],
  },
  {
    id: 'sustainability_office',
    title: 'The Sustainability Office Strikes Back',
    eras: ['reform', 'modern'],
    condition: (s) => parkingParcels(s) >= 1,
    description: () =>
      'The Sustainability Office requests removal of 250 spaces for bioswales, pollinator meadows, and a contemplative stormwater feature. The proposal includes a 3D rendering with no cars and many smiling ducks.',
    choices: [
      {
        label: 'Approve: convert a lot to green',
        detail: 'Removes a surface lot (free). Sustainability +6. Faculty −4.',
        unavailable: (s) => (countParcels(s, 'lot') > 0 ? null : 'No surface lots left'),
        apply: (s) => {
          const p = findParcel(s, ['lot'])!;
          setParcel(p, 'green', s.year);
          s.counters.conversionsToGreen++;
          fx(s, { sustainability: 6, faculty: -4, students: 3, neighborhood: 3, inertia: -3 });
          return 'replaced a surface lot with a pollinator meadow';
        },
      },
      {
        label: 'Counter with green roofs on garages',
        detail: '−$250k. Sustainability +3.',
        apply: (s) => { fx(s, { cash: -250000, sustainability: 3 }); return 'installed green roofs atop its garages'; },
      },
      {
        label: 'Decline',
        detail: 'Sustainability −3. Students −3.',
        apply: (s) => { fx(s, { sustainability: -3, students: -3 }); return 'declined to remove any spaces'; },
      },
    ],
  },
  {
    id: 'ev',
    title: 'The Electric Vehicle Charging Mandate',
    eras: ['reform', 'modern'],
    description: () =>
      'The Climate Task Force wants EV chargers in every facility. The Transportation Office notes that an electric car stuck in traffic is still in traffic.',
    choices: [
      {
        label: 'Install chargers everywhere',
        detail: '−$200k. Sustainability +4. Car dependence +1.',
        apply: (s) => { fx(s, { cash: -200000, sustainability: 4, faculty: 2, autoDependence: 1 }); return 'installed EV chargers across all facilities'; },
      },
      {
        label: 'Install one, ceremonially',
        detail: '−$15k. A ribbon is cut.',
        apply: (s) => { fx(s, { cash: -15000, sustainability: 0.5 }); return 'installed a single ceremonial EV charger'; },
      },
      {
        label: 'Invest the money in transit instead',
        detail: 'Adds Transit Subsidy. Faculty −2.',
        apply: (s) => { addCommitment(s, 'transitSubsidy'); fx(s, { faculty: -2, sustainability: 2 }); return 'redirected the charger budget to transit passes'; },
      },
    ],
  },
  {
    id: 'rideshare',
    title: 'The Curb Wars',
    eras: ['reform', 'modern'],
    description: () =>
      'Ride-hailing companies are double-parking along every campus curb. Delivery robots are now competing for the same space and appear to be winning.',
    choices: [
      {
        label: 'Charge for pickup zones',
        detail: '+$80k. Neighbors +2.',
        apply: (s) => { fx(s, { cash: 80000, neighborhood: 2, demandModifierMult: 0.98 }); return 'established paid pickup zones for ride-hailing'; },
      },
      {
        label: 'Ban ride-hailing on campus',
        detail: 'Students −4. Car dependence +1.',
        apply: (s) => { fx(s, { students: -4, autoDependence: 1 }); return 'banned ride-hailing pickups on campus'; },
      },
      {
        label: 'Ignore it',
        detail: 'Neighbors −4. Demand −3%.',
        apply: (s) => { fx(s, { neighborhood: -4, demandModifierMult: 0.97 }); return 'ignored the curb conflict'; },
      },
    ],
  },
  {
    id: 'climate_plan',
    title: 'The Carbon Neutrality Pledge',
    eras: ['reform', 'modern'],
    condition: (s) => !s.flags.climatePlan,
    description: () =>
      'The Board will announce a carbon neutrality pledge at a gala. Staff want to know whether commuting emissions “count,” given that they are, technically, the largest number.',
    choices: [
      {
        label: 'Count commuting emissions',
        detail: '−$100k. Sustainability +5. Inertia −4. Faculty −2.',
        apply: (s) => { fx(s, { cash: -100000, sustainability: 5, inertia: -4, faculty: -2, flags: { climatePlan: true } }); return 'adopted a climate plan that counted commuting emissions'; },
      },
      {
        label: 'Exclude commuting (“Scope 3”)',
        detail: 'Sustainability +1. Students −4.',
        apply: (s) => { fx(s, { sustainability: 1, students: -4 }); return 'adopted a climate plan that politely ignored commuting'; },
      },
      {
        label: 'Form a Climate Committee',
        detail: 'Inertia +2. Students +1.',
        apply: (s) => { fx(s, { inertia: 2, students: 1 }); s.counters.committees++; return 'formed a committee to define carbon neutrality'; },
      },
    ],
  },
  {
    id: 'president_space',
    title: 'The President’s Reserved Space',
    eras: ['institutional', 'reform', 'modern'],
    description: (s) =>
      `${s.year >= 2000 ? 'Shortly after announcing the university’s sustainable commuting commitment, the' : 'The'} President requests a private, covered, heated parking space adjacent to College Hall “for security reasons.”`,
    choices: [
      {
        label: 'Grant it quietly',
        detail: 'Students −5. Sustainability −2.',
        apply: (s) => { fx(s, { students: -5, sustainability: -2, faculty: -2, inertia: 1 }); return 'quietly granted the President a heated space'; },
      },
      {
        label: 'Arrange a transit photo-op',
        detail: 'Students +4. Sustainability +2. Requires transit or shuttle.',
        unavailable: (s) => (hasCommitment(s, 'transitSubsidy') || hasCommitment(s, 'shuttle') ? null : 'Requires a transit or shuttle program'),
        apply: (s) => { fx(s, { students: 4, sustainability: 2, autoDependence: -1 }); return 'arranged for the President to be photographed on the shuttle, once'; },
      },
      {
        label: 'Install an EV charger with a plaque',
        detail: '−$30k. Students +1.',
        apply: (s) => { fx(s, { cash: -30000, students: 1, sustainability: 1 }); return 'installed an EV charger bearing the President’s name'; },
      },
    ],
  },
  {
    id: 'parking_app',
    title: 'There’s an App for That',
    eras: ['reform', 'modern'],
    description: () =>
      'A startup founded by two alumni offers a parking app with dynamic pricing, real-time occupancy, and a gamified loyalty program called “Parkour.”',
    choices: [
      {
        label: 'Adopt app with dynamic pricing',
        detail: '−$120k. Adds Differentiated Permits. Price +10%. Faculty −4.',
        apply: (s) => { fx(s, { cash: -120000, priceMult: 1.1, faculty: -4, students: 1 }); addCommitment(s, 'differentiatedPricing'); return 'adopted a dynamic-pricing parking app'; },
      },
      {
        label: 'Adopt app without pricing changes',
        detail: '−$80k. Students +2. Faculty −2 (bugs).',
        apply: (s) => { fx(s, { cash: -80000, students: 2, faculty: -2 }); return 'adopted a parking app that mostly displays a loading spinner'; },
      },
      {
        label: 'Stick with paper hangtags',
        detail: 'Students −2. Inertia +1.',
        apply: (s) => { fx(s, { students: -2, inertia: 1 }); return 'kept the paper hangtags'; },
      },
    ],
  },

  // ------------------------------------------------------------------ Modern
  {
    id: 'remote_work',
    title: 'The Remote Work Revolution',
    eras: ['modern'],
    weight: 3,
    description: (s) =>
      `Hybrid schedules have cut weekday commuting by roughly a fifth. The ${countParcels(s, 'garage')} garages now host mostly pigeons on Mondays and Fridays, while Tuesdays remain a bloodbath.`,
    choices: [
      {
        label: 'Convert a lot to lab space',
        detail: 'Free conversion of a lot. Faculty −2. Inertia −3.',
        unavailable: (s) => (countParcels(s, 'lot') > 0 ? null : 'No surface lots left'),
        apply: (s) => {
          fx(s, { demandModifierMult: 0.8 });
          const p = findParcel(s, ['lot'])!;
          setParcel(p, 'academic', s.year, 'the Hybrid Futures Lab');
          s.counters.conversionsToAcademic++;
          fx(s, { faculty: -2, inertia: -3, sustainability: 2 });
          return 'converted an underused lot into laboratory space';
        },
      },
      {
        label: 'Introduce daily permits',
        detail: 'Adds Differentiated Permits. Students +3.',
        apply: (s) => { fx(s, { demandModifierMult: 0.8, students: 3, faculty: 1 }); addCommitment(s, 'differentiatedPricing'); return 'introduced daily and flexible permits'; },
      },
      {
        label: 'Keep everything “just in case”',
        detail: 'Faculty +2. Inertia +3.',
        apply: (s) => { fx(s, { demandModifierMult: 0.82, faculty: 2, inertia: 3 }); return 'kept every space, just in case'; },
      },
    ],
  },
  {
    id: 'av_consultant',
    title: 'The Autonomous Vehicle Consultant',
    eras: ['reform', 'modern'],
    description: () =>
      'A consultant presents 140 slides proving that autonomous vehicles will eliminate parking demand by 2030. The same firm produced a 2015 report proving they would eliminate it by 2020.',
    choices: [
      {
        label: 'Commission an “AV-ready” garage study',
        detail: '−$120k. Inertia −1.',
        apply: (s) => { fx(s, { cash: -120000, inertia: -1 }); return 'commissioned an autonomous-vehicle readiness study'; },
      },
      {
        label: 'Ask for the 2015 refund',
        detail: 'Faculty +1. Students +1.',
        apply: (s) => { fx(s, { faculty: 1, students: 1 }); return 'requested a refund for the previous forecast'; },
      },
    ],
  },
  {
    id: 'endowment_tax',
    title: 'The Structural Budget Gap',
    eras: ['modern'],
    description: () =>
      'Rising costs and new federal taxes have opened a structural gap. The CFO asks every unit to “find efficiencies,” and looks meaningfully at the Parking Department.',
    choices: [
      {
        label: 'Raise permit prices 15%',
        detail: 'Price +15%. Faculty −5.',
        apply: (s) => { fx(s, { priceMult: 1.15, faculty: -5, sustainability: 1 }); return 'raised permit prices to close the gap'; },
      },
      {
        label: 'Defer garage maintenance',
        detail: '+$300k now. All garages −30 condition.',
        apply: (s) => { for (const p of s.parcels) if (p.type === 'garage') p.condition = Math.max(0, p.condition - 30); fx(s, { cash: 300000 }); return 'deferred garage maintenance, a loan from the future at excellent rates'; },
      },
      {
        label: 'Contribute from reserves',
        detail: '−$500k. Faculty +2.',
        apply: (s) => { fx(s, { cash: -500000, faculty: 2 }); return 'contributed its reserves to the central budget'; },
      },
    ],
  },
];

export function getEvent(id: string): EventDef | undefined {
  return EVENTS.find((e) => e.id === id);
}
