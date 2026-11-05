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
 * Citations and excerpts stay in their original language; summaries are bilingual.
 */
import { l, type L } from '../engine';

export interface Concept {
  id: string;
  title: L;
  body: L;
  inGame: L;
}

export const CONCEPTS: Concept[] = [
  {
    id: 'path-dependence',
    title: l('Path dependence', '路径依赖'),
    body: l(
      'Early choices shape the set of options available later, because investments, habits and expectations accumulate around them. Outcomes depend on the sequence of decisions, not only on present conditions.',
      '早期选择会塑造日后可选的方案范围，因为投资、习惯和预期会围绕它们不断累积。结果不仅取决于当下条件，也取决于决策的先后顺序。',
    ),
    inGame: l(
      'Garages, lots and entitlements raise Institutional Inertia, which raises the cost and backlash of later reforms.',
      '停车楼、停车场和特权福利会推高“制度惯性”，从而加大日后改革的成本和阻力。',
    ),
  },
  {
    id: 'lock-in',
    title: l('Institutional lock-in', '制度锁定'),
    body: l(
      'Once a benefit has a constituency, removing it is politically costlier than never granting it. Long-lived infrastructure and debt add financial lock-in on top of political lock-in.',
      '一项福利一旦有了受益群体，取消它的政治代价就会高于从未给予。长寿命的基础设施和债务又在政治锁定之上叠加了财务锁定。',
    ),
    inGame: l(
      'Revoking a program costs more the longer it has been active. Garage bonds run for 20 years.',
      '一个项目运行得越久，取消它的代价越高。停车楼债券期限为20年。',
    ),
  },
  {
    id: 'induced-demand',
    title: l('Induced travel demand', '诱发交通需求'),
    body: l(
      'Adding capacity lowers the effective cost of driving and parking, which gradually attracts additional trips. The response is partial and unfolds over years rather than instantly.',
      '增加容量会降低开车和停车的实际成本，从而逐步吸引更多出行。这种响应是部分的，且需要数年而非即刻显现。',
    ),
    inGame: l(
      'Spare capacity builds an induced-demand stock (40% per turn toward 35% of the surplus) and raises automobile dependence.',
      '闲置容量会形成“诱发需求存量”（每回合向剩余容量的35%靠拢40%），并推高汽车依赖度。',
    ),
  },
  {
    id: 'pricing',
    title: l('Parking pricing', '停车定价'),
    body: l(
      'Parking is rarely free to provide; when it is underpriced, demand exceeds supply and the shortfall is rationed by search, queues or privilege. Prices manage demand and recover costs, with distributional consequences.',
      '提供停车几乎从来都不是免费的；定价过低时，需求超过供给，缺口只能靠找车位、排队或特权来分配。价格既能管理需求、回收成本，也会带来分配上的后果。',
    ),
    inGame: l(
      'Demand falls exponentially with price. Exempt users (privileges) do not respond to price at all.',
      '需求随价格呈指数下降。享受豁免的用户（特权）对价格完全没有反应。',
    ),
  },
  {
    id: 'tdm',
    title: l('Transportation demand management (TDM)', '交通需求管理（TDM）'),
    body: l(
      'Policies that change how, when, or whether people travel — transit passes, shuttles, bicycle facilities, carpooling, parking cash-out — rather than expanding supply.',
      '通过改变人们出行的方式、时间或是否出行来应对需求的政策——如公交卡、班车、自行车设施、拼车、停车现金补偿——而不是扩大供给。',
    ),
    inGame: l(
      'TDM programs cut car demand, carry recurring costs, and grow more effective as they mature.',
      '需求管理项目能减少汽车需求，有持续性成本，并随着项目成熟而效果增强。',
    ),
  },
  {
    id: 'land-opportunity',
    title: l('Land opportunity cost', '土地机会成本'),
    body: l(
      'Land used for parking cannot simultaneously host classrooms, housing or open space. In dense cities, the opportunity cost of parking land can exceed its construction cost.',
      '用于停车的土地无法同时用于教室、住房或开放空间。在高密度城市中，停车用地的机会成本可能超过其建设成本。',
    ),
    inGame: l(
      'The university needs more academic land as it grows. Parking on vacant parcels pushes new buildings onto greens, then into shortfall.',
      '大学扩张需要更多教学用地。把空地用来停车，会迫使新楼建到绿地上，最终出现用地缺口。',
    ),
  },
  {
    id: 'town-gown',
    title: l('University–community relationships', '大学与社区的关系'),
    body: l(
      'Universities in cities depend on their neighbors, and vice versa. Spillover parking, traffic and campus expansion are recurring sources of friction; shared facilities and transit can ease it.',
      '城市中的大学依赖周边社区，反之亦然。溢出停车、交通和校园扩张是反复出现的摩擦来源；共享设施和公共交通可以缓解这些矛盾。',
    ),
    inGame: l(
      'Shortages spill onto neighborhood streets; garages add traffic; shared parking and shuttles help.',
      '车位短缺会溢出到社区街道；停车楼会增加交通量；共享停车和班车有助于缓解。',
    ),
  },
  {
    id: 'objectives',
    title: l('Financial vs. sustainability objectives', '财务目标与可持续目标的冲突'),
    body: l(
      'Parking can be a revenue source, a subsidized employee benefit, or a lever for climate goals. These purposes often conflict, and institutions frequently pursue all three at once.',
      '停车可以是收入来源、受补贴的员工福利，也可以是实现气候目标的杠杆。这些目的经常相互冲突，而机构往往同时追求这三者。',
    ),
    inGame: l(
      'Endings reward coherent strategies. Maximizing revenue, supply, or sustainability each produces a different legacy.',
      '结局奖励前后一致的策略。分别追求收入、供给或可持续性的最大化，会留下截然不同的遗产。',
    ),
  },
];

export interface FurtherReading {
  citation: string;
  note: L;
}

/** General planning literature (real, widely cited works) relevant to the concepts above. */
export const FURTHER_READING: FurtherReading[] = [
  {
    citation: 'Shoup, D. (2005). The High Cost of Free Parking. Chicago: Planners Press.',
    note: l('Parking pricing, minimum requirements, and parking cash-out.', '停车定价、最低配建要求与停车现金补偿。'),
  },
  {
    citation:
      'Duranton, G., & Turner, M. A. (2011). The Fundamental Law of Road Congestion: Evidence from US Cities. American Economic Review, 101(6).',
    note: l('Empirical evidence on induced travel demand.', '关于诱发交通需求的实证研究。'),
  },
  {
    citation: 'David, P. A. (1985). Clio and the Economics of QWERTY. American Economic Review, 75(2).',
    note: l('A classic statement of path dependence.', '路径依赖理论的经典论述。'),
  },
];

export type SourceStatus = 'verified' | 'pending';

export interface HistoricalSource {
  id: string;
  title: L;
  institution: L;
  year: number;
  status: SourceStatus;
  /** Plain-language summary. For 'pending' sources, no quotations and no page references. */
  summary: L;
  citation?: string;
  archive?: string;
  excerpts?: { text: string; page?: string }[];
  relatedConcepts: string[];
}

export const HISTORICAL_SOURCES: HistoricalSource[] = [
  {
    id: 'martin-plan-1948',
    title: l(
      'Campus development plan of 1948 (commonly referred to as the “Martin Plan”)',
      '1948年校园发展规划（通称“马丁规划”）',
    ),
    institution: l('University of Pennsylvania', '宾夕法尼亚大学'),
    year: 1948,
    status: 'pending',
    summary: l(
      'Identified by this project as a planning document that discussed the difficulty of providing campus parking, the cost of acquiring land for it, and the role of the city in addressing parking problems. Full citation, archival location, and verified excerpts are to be added after review of the original document.',
      '本项目将其确认为一份规划文件，内容涉及提供校园停车的困难、为此征地的成本，以及城市在解决停车问题中的作用。完整引文、档案位置和经核实的原文摘录，将在查阅原始文件后补充。',
    ),
    relatedConcepts: ['land-opportunity', 'town-gown', 'pricing'],
  },
];
