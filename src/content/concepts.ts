/**
 * Planning concepts and historical references shown on the "Planning History & Concepts" page.
 *
 * Three kinds of content are kept strictly separate:
 *   - 'concept'  : general planning/economics ideas (no claims about any specific institution)
 *   - 'verified' : historical references checked against an archival or published source
 *   - 'pending'  : real historical documents identified for the project but not yet verified
 *                  against the original; summaries must not include quotations.
 * Everything that happens to "Westbridge University" in the game is fiction.
 *
 * To add verified archival material later, append to HISTORICAL_SOURCES with status 'verified'
 * and fill in `citation` and `excerpts`. No engine changes are needed.
 */

export interface Concept {
  id: string;
  title: string;
  body: string;
  inGame: string;
}

export const CONCEPTS: Concept[] = [
  {
    id: 'path-dependence',
    title: 'Path dependence',
    body: 'Early choices shape the set of options available later, because investments, habits and expectations accumulate around them. Outcomes depend on the sequence of decisions, not only on present conditions.',
    inGame: 'Garages, lots and entitlements raise Institutional Inertia, which raises the cost and backlash of later reforms.',
  },
  {
    id: 'lock-in',
    title: 'Institutional lock-in',
    body: 'Once a benefit has a constituency, removing it is politically costlier than never granting it. Long-lived infrastructure and debt add financial lock-in on top of political lock-in.',
    inGame: 'Revoking a program costs more the longer it has been active. Garage bonds run for 20 years.',
  },
  {
    id: 'induced-demand',
    title: 'Induced travel demand',
    body: 'Adding capacity lowers the effective cost of driving and parking, which gradually attracts additional trips. The response is partial and unfolds over years rather than instantly.',
    inGame: 'Spare capacity builds an induced-demand stock (40% per turn toward 35% of the surplus) and raises automobile dependence.',
  },
  {
    id: 'pricing',
    title: 'Parking pricing',
    body: 'Parking is rarely free to provide; when it is underpriced, demand exceeds supply and the shortfall is rationed by search, queues or privilege. Prices manage demand and recover costs, with distributional consequences.',
    inGame: 'Demand falls exponentially with price. Exempt users (privileges) do not respond to price at all.',
  },
  {
    id: 'tdm',
    title: 'Transportation demand management (TDM)',
    body: 'Policies that change how, when, or whether people travel — transit passes, shuttles, bicycle facilities, carpooling, parking cash-out — rather than expanding supply.',
    inGame: 'TDM programs cut car demand, carry recurring costs, and grow more effective as they mature.',
  },
  {
    id: 'land-opportunity',
    title: 'Land opportunity cost',
    body: 'Land used for parking cannot simultaneously host classrooms, housing or open space. In dense cities, the opportunity cost of parking land can exceed its construction cost.',
    inGame: 'The university needs more academic land as it grows. Parking on vacant parcels pushes new buildings onto greens, then into shortfall.',
  },
  {
    id: 'town-gown',
    title: 'University–community relationships',
    body: 'Universities in cities depend on their neighbors, and vice versa. Spillover parking, traffic and campus expansion are recurring sources of friction; shared facilities and transit can ease it.',
    inGame: 'Shortages spill onto neighborhood streets; garages add traffic; shared parking and shuttles help.',
  },
  {
    id: 'objectives',
    title: 'Financial vs. sustainability objectives',
    body: 'Parking can be a revenue source, a subsidized employee benefit, or a lever for climate goals. These purposes often conflict, and institutions frequently pursue all three at once.',
    inGame: 'Endings reward coherent strategies. Maximizing revenue, supply, or sustainability each produces a different legacy.',
  },
];

export interface FurtherReading {
  citation: string;
  note: string;
}

/** General planning literature (real, widely cited works) relevant to the concepts above. */
export const FURTHER_READING: FurtherReading[] = [
  { citation: 'Shoup, D. (2005). The High Cost of Free Parking. Chicago: Planners Press.', note: 'Parking pricing, minimum requirements, and parking cash-out.' },
  { citation: 'Duranton, G., & Turner, M. A. (2011). The Fundamental Law of Road Congestion: Evidence from US Cities. American Economic Review, 101(6).', note: 'Empirical evidence on induced travel demand.' },
  { citation: 'David, P. A. (1985). Clio and the Economics of QWERTY. American Economic Review, 75(2).', note: 'A classic statement of path dependence.' },
];

export type SourceStatus = 'verified' | 'pending';

export interface HistoricalSource {
  id: string;
  title: string;
  institution: string;
  year: number;
  status: SourceStatus;
  /** Plain-language summary. For 'pending' sources, no quotations and no page references. */
  summary: string;
  citation?: string;
  archive?: string;
  excerpts?: { text: string; page?: string }[];
  relatedConcepts: string[];
}

export const HISTORICAL_SOURCES: HistoricalSource[] = [
  {
    id: 'martin-plan-1948',
    title: 'Campus development plan of 1948 (commonly referred to as the “Martin Plan”)',
    institution: 'University of Pennsylvania',
    year: 1948,
    status: 'pending',
    summary:
      'Identified by this project as a planning document that discussed the difficulty of providing campus parking, the cost of acquiring land for it, and the role of the city in addressing parking problems. Full citation, archival location, and verified excerpts are to be added after review of the original document.',
    relatedConcepts: ['land-opportunity', 'town-gown', 'pricing'],
  },
];
