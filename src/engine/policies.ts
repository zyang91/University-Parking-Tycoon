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
import { l } from './text';
import type { CommitmentId, GameState, L, PolicyCategory, PolicyDef } from './types';
import { hashPick } from './rng';

export const MAX_ACTIONS_PER_TURN = 3;

export const CATEGORY_LABELS: Record<PolicyCategory, L> = {
  pricing: l('Parking Pricing', '停车定价'),
  infrastructure: l('Infrastructure', '基础设施'),
  tdm: l('Demand Management', '需求管理'),
  administrative: l('Administration', '行政管理'),
};

export const COMMITMENT_LABELS: Record<CommitmentId, L> = {
  transitSubsidy: l('Transit Subsidy', '公交补贴'),
  bikeInfra: l('Bicycle Network', '自行车网络'),
  shuttle: l('University Shuttle', '校园班车'),
  carpool: l('Carpool Incentives', '拼车激励'),
  cashOut: l('Parking Cash-Out', '停车现金补偿'),
  facultyPrivileges: l('Faculty Parking Privileges', '教职工停车特权'),
  adminReserved: l('Reserved Administrator Spaces', '行政高管专用车位'),
  enforcement: l('Parking Enforcement', '停车执法'),
  sharedParking: l('Shared Parking Agreement', '共享停车协议'),
  differentiatedPricing: l('Differentiated Permits', '差异化停车证'),
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

const GARAGE_NAMES: L[] = [
  l('Pemberton Memorial Garage', '彭伯顿纪念停车楼'),
  l('Thornbury Parking Pavilion', '索恩伯里停车馆'),
  l('The Ashcroft Deck', '阿什克罗夫特停车平台'),
  l('Founders Garage', '创校者停车楼'),
  l('Alumni Commons Garage', '校友公共停车楼'),
  l('Heritage Structure', '传承停车结构'),
  l('The Innovation Garage', '创新停车楼'),
  l('Provost Row Deck', '教务长街停车平台'),
  l('Centennial Garage', '百年纪念停车楼'),
  l('The Excellence Garage', '卓越停车楼'),
];

const R = {
  active: l('Already active', '已在实施'),
  adopted: l('Already adopted', '已采用'),
  granted: l('Already granted', '已授予'),
  reserved: l('Already reserved', '已预留'),
  notActive: l('Not active', '未实施'),
};

function priceAnger(s: GameState, pct: number): number {
  // Faculty anger rises with price changes, car dependence, and institutional inertia.
  return (pct / 5) * (0.6 + s.ind.autoDependence / 100) * inertiaMultiplier(s);
}

function pricingPolicy(id: string, pct: number, name: L, flavor: L): PolicyDef {
  return {
    id,
    name,
    category: 'pricing',
    description: l(
      `Raise annual permit prices by ${pct}%. Lowers demand and raises revenue per space.`,
      `将年度停车证价格上调${pct}%。降低需求，提高每个车位的收入。`,
    ),
    flavor,
    minYear: 1948,
    tags: [
      { label: l('Revenue ↑', '收入 ↑'), tone: 'good' },
      { label: l('Demand ↓', '需求 ↓'), tone: 'good' },
      { label: l('Faculty ↓', '教职工 ↓'), tone: 'bad' },
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
      return l(
        `raised permit prices by ${pct}% to $${s.price}`,
        `将停车证价格上调${pct}%至$${s.price}`,
      );
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

const TDM_TAGS = [
  { label: l('Demand ↓', '需求 ↓'), tone: 'good' as const },
  { label: l('Sustainability ↑', '可持续性 ↑'), tone: 'good' as const },
  { label: l('Recurring cost', '持续性支出'), tone: 'bad' as const },
];

function tdmPolicy(
  id: string,
  commitment: CommitmentId,
  name: L,
  minYear: number,
  upfront: number,
  description: L,
  flavor: L,
  fx: Parameters<typeof applyEffects>[1],
  fragment: L,
): PolicyDef {
  return {
    id,
    name,
    category: 'tdm',
    description,
    flavor,
    minYear,
    tags: TDM_TAGS,
    cost: () => upfront,
    recurring: (s) => commitmentAnnualCost(s, commitment),
    unavailable: (s) => (hasCommitment(s, commitment) ? R.active : null),
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
    name: id === 'facultyPrivileges' ? l('Revoke Faculty Privileges', '取消教职工停车特权') : l(`End ${label.en}`, `终止${label.zh}`),
    category:
      id === 'facultyPrivileges' || id === 'adminReserved' || id === 'enforcement' || id === 'sharedParking'
        ? 'administrative'
        : isTdm
          ? 'tdm'
          : 'pricing',
    description:
      id === 'facultyPrivileges'
        ? l(
            'Return free faculty parking to the paid permit system. Entitlements are easier to grant than to revoke.',
            '让免费的教职工停车重新纳入付费停车证体系。福利给出去容易，收回来难。',
          )
        : l(
            `Terminate the ${label.en.toLowerCase()} program. Saves its recurring cost; constituents will notice.`,
            `终止${label.zh}项目。可节省持续性支出，但受益者一定会注意到。`,
          ),
    flavor: l(
      'Every program has a constituency, especially after it has been around for a while.',
      '每个项目都有自己的拥护者，尤其是运行了一段时间之后。',
    ),
    minYear: 1948,
    tags: [
      { label: l('Saves money', '节省开支'), tone: 'good' },
      { label: l('Backlash', '引发反弹'), tone: 'bad' },
    ],
    cost: () => 0,
    unavailable: (s) => (hasCommitment(s, id) ? null : R.notActive),
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
        return l(
          `revoked faculty parking privileges after ${legacy * 5} years, prompting a Faculty Senate resolution of unusual length`,
          `在实行${legacy * 5}年后取消了教职工停车特权，引发教授评议会通过了一份长得罕见的决议`,
        );
      }
      if (isTdm) {
        applyEffects(s, {
          students: -(4 + legacy * 1.5),
          faculty: -(1 + legacy * 0.5),
          sustainability: -4,
          autoDependence: 2 + legacy * 0.5,
          inertia: 2,
        });
        return l(
          `ended the ${label.en.toLowerCase()} program, which riders had come to regard as a natural right`,
          `终止了${label.zh}项目——使用者早已将其视为天赋权利`,
        );
      }
      if (id === 'adminReserved') {
        applyEffects(s, { students: 2, faculty: 2, cash: -50000 });
        return l(
          'eliminated reserved administrator spaces; several vice provosts discovered walking',
          '取消了行政高管专用车位，几位副教务长由此发现了步行',
        );
      }
      if (id === 'enforcement') {
        applyEffects(s, { students: 3, neighborhood: -3 });
        return l(
          'disbanded parking enforcement, to the delight of creative parkers everywhere',
          '解散了停车执法队，各路“创意停车者”欢欣鼓舞',
        );
      }
      if (id === 'sharedParking') {
        applyEffects(s, { neighborhood: -3 });
        return l('ended the shared parking agreement with the hospital next door', '终止了与隔壁医院的共享停车协议');
      }
      applyEffects(s, { students: -2 });
      return l(`ended ${label.en.toLowerCase()}`, `终止了${label.zh}`);
    },
  };
}

export const POLICIES: PolicyDef[] = [
  // ---------------- Pricing ----------------
  pricingPolicy(
    'price_up_10', 10,
    l('Modest Price Increase (+10%)', '小幅涨价（+10%）'),
    l('An adjustment so small that only every single permit holder will notice.', '一次微小的调整，小到只有每一位停车证持有人都会注意到。'),
  ),
  pricingPolicy(
    'price_up_25', 25,
    l('Substantial Increase (+25%)', '大幅涨价（+25%）'),
    l('The Budget Office calls it "market alignment." The faculty call it something else.', '预算办公室称之为“与市场接轨”。教职工对它另有称呼。'),
  ),
  pricingPolicy(
    'price_up_50', 50,
    l('Aggressive Increase (+50%)', '激进涨价（+50%）'),
    l('Bold. Visionary. Possibly career-limiting.', '大胆。有远见。可能断送前程。'),
  ),
  {
    id: 'price_down',
    name: l('Reduce Prices (−20%)', '降价（−20%）'),
    category: 'pricing',
    description: l('Cut permit prices by 20%. Popular immediately, expensive forever.', '停车证降价20%。立刻受欢迎，永远很昂贵。'),
    flavor: l('Nobody has ever been fired for making parking cheaper. Yet.', '目前还没有人因为让停车变便宜而被解雇。目前。'),
    minYear: 1948,
    tags: [
      { label: l('Faculty ↑', '教职工 ↑'), tone: 'good' },
      { label: l('Demand ↑', '需求 ↑'), tone: 'bad' },
      { label: l('Revenue ↓', '收入 ↓'), tone: 'bad' },
    ],
    cost: () => 0,
    unavailable: (s) => (s.price <= 20 ? l('Prices are already nearly free', '价格已经接近免费') : null),
    apply: (s) => {
      s.price = Math.max(0, Math.round(s.price * 0.8));
      applyEffects(s, { faculty: 5, students: 3, sustainability: -3, autoDependence: 2 });
      s.counters.priceCuts++;
      return l(`reduced permit prices to $${s.price}`, `将停车证价格降至$${s.price}`);
    },
  },
  {
    id: 'differentiated',
    name: l('Differentiated Permit Pricing', '差异化停车证定价'),
    category: 'pricing',
    description: l(
      'Tier prices by location, time of day, and salary band. More revenue per space and more responsive demand.',
      '按位置、时段和薪资档次分级定价。每个车位收入更高，需求对价格更敏感。',
    ),
    flavor: l('The permit price schedule now requires its own 40-page handbook.', '停车证价目表现在需要一本40页的专属手册。'),
    minYear: 1980,
    tags: [
      { label: l('Revenue ↑', '收入 ↑'), tone: 'good' },
      { label: l('Students ↑', '学生 ↑'), tone: 'good' },
      { label: l('Complexity', '更复杂'), tone: 'neutral' },
    ],
    cost: () => 60000,
    unavailable: (s) => (hasCommitment(s, 'differentiatedPricing') ? R.adopted : null),
    apply: (s) => {
      addCommitment(s, 'differentiatedPricing');
      applyEffects(s, { students: 4, faculty: -2, sustainability: 2 });
      return l(
        'introduced differentiated permit pricing, with a tier for every grievance',
        '推出了差异化停车证定价，每一种不满都有对应的档位',
      );
    },
  },

  // ---------------- Infrastructure ----------------
  {
    id: 'build_lot',
    name: l('Construct Surface Lot', '修建地面停车场'),
    category: 'infrastructure',
    description: l(
      `Pave a parcel for ${C.LOT_SPACES} spaces. Cheap, quick, and permanent in ways no one intends.`,
      `铺设一块地，提供${C.LOT_SPACES}个车位。便宜、快捷，而且会以没人预料的方式变成永久设施。`,
    ),
    flavor: l(
      'Asphalt: the most flexible land use, as long as you never want to use the land for anything else.',
      '沥青：最灵活的土地用途——只要你永远不想把这块地用于别的事情。',
    ),
    minYear: 1948,
    tags: [
      { label: l(`+${C.LOT_SPACES} spaces`, `+${C.LOT_SPACES}个车位`), tone: 'good' },
      { label: l('Uses land', '占用土地'), tone: 'bad' },
      { label: l('Car dependence ↑', '汽车依赖 ↑'), tone: 'bad' },
    ],
    cost: (s) => landPolicyCost(s, 120000),
    unavailable: (s) => (findParcel(s, ['vacant', 'green']) ? null : l('No vacant or green land left', '已无空地或绿地')),
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
      return wasGreen
        ? l('paved a campus green for a new surface lot', '把一块校园草坪铺成了新的地面停车场')
        : l('built a new surface lot on vacant land', '在空地上修建了新的地面停车场');
    },
  },
  {
    id: 'build_garage',
    name: l('Construct Parking Garage', '修建停车楼'),
    category: 'infrastructure',
    description: l(
      `A ${C.GARAGE_SPACES}-space structure on vacant land or atop an existing lot. Partly bond-financed: 20 years of debt service.`,
      `在空地上或现有停车场上方建造${C.GARAGE_SPACES}个车位的停车楼。部分依靠债券融资：需偿债20年。`,
    ),
    flavor: l('A monument to the belief that demand is a fixed quantity.', '一座纪念“需求是固定不变的”这一信念的丰碑。'),
    minYear: 1958,
    tags: [
      { label: l(`+${C.GARAGE_SPACES} spaces`, `+${C.GARAGE_SPACES}个车位`), tone: 'good' },
      { label: l('Debt 20 yrs', '负债20年'), tone: 'bad' },
      { label: l('Lock-in ↑', '锁定效应 ↑'), tone: 'bad' },
    ],
    cost: (s) => garageUpfront(s),
    recurring: (s) => garageDebt(s) + C.GARAGE_MAINTENANCE,
    unavailable: (s) =>
      findParcel(s, ['vacant', 'lot']) ? null : l('No vacant land or surface lot to build on', '没有可供建设的空地或地面停车场'),
    apply: (s) => {
      const p = findParcel(s, ['vacant', 'lot'])!;
      const onLot = p.type === 'lot';
      const name = hashPick(GARAGE_NAMES, `${s.seed}-${s.year}-${s.counters.garagesBuilt}`);
      setParcel(p, 'garage', s.year, name);
      s.debts.push({ label: l(`${name.en} bonds`, `${name.zh}债券`), annualPayment: garageDebt(s), turnsRemaining: 4 });
      applyEffects(s, { faculty: 6, autoDependence: 4, inertia: 7, sustainability: -5, neighborhood: -3 });
      s.counters.garagesBuilt++;
      return onLot
        ? l(`decked over a surface lot to create the ${name.en}`, `在地面停车场上加盖，建成了${name.zh}`)
        : l(`built the ${name.en} on vacant land`, `在空地上建成了${name.zh}`);
    },
  },
  {
    id: 'convert_academic',
    name: l('Convert Parking to Academic Space', '停车用地改为教学用地'),
    category: 'infrastructure',
    description: l(
      'Replace a lot (or, failing that, a garage) with an academic building. The Provost contributes toward land value. Cost and backlash rise with institutional inertia.',
      '将一个停车场（若没有，则拆除一座停车楼）改建为教学楼。教务长会按地价给予拨款。成本和反弹随制度惯性上升。',
    ),
    flavor: l('Bold claim: universities are for learning.', '大胆主张：大学是用来学习的。'),
    minYear: 1948,
    tags: [
      { label: l('Academic land ↑', '教学用地 ↑'), tone: 'good' },
      { label: l('Provost grant', '教务长拨款'), tone: 'good' },
      { label: l('Faculty ↓', '教职工 ↓'), tone: 'bad' },
    ],
    cost: (s) => convertCost(s, 'academic'),
    unavailable: (s) => (findParcel(s, ['lot', 'garage']) ? null : l('No parking left to convert', '已无可改造的停车设施')),
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
        ? l(
            'demolished a parking garage to build classrooms, a decision several trustees described as "brave"',
            '拆除了一座停车楼来建教室——几位校董称这一决定“很勇敢”',
          )
        : l('converted a surface lot into an academic building', '将一个地面停车场改建为教学楼');
    },
  },
  {
    id: 'convert_green',
    name: l('Convert Parking to Green Space', '停车用地改为绿地'),
    category: 'infrastructure',
    description: l(
      'Replace a lot (or garage) with a quad, rain garden, or similar. Neighbors and students approve. Inertia raises the cost.',
      '将停车场（或停车楼）改造为草坪、雨水花园之类。邻里和学生都会赞成。制度惯性会推高成本。',
    ),
    flavor: l('The grass is always greener where the parking used to be.', '曾经停车的地方，草总是更绿。'),
    minYear: 1948,
    tags: [
      { label: l('Sustainability ↑', '可持续性 ↑'), tone: 'good' },
      { label: l('Neighbors ↑', '邻里 ↑'), tone: 'good' },
      { label: l('Faculty ↓', '教职工 ↓'), tone: 'bad' },
    ],
    cost: (s) => convertCost(s, 'green'),
    unavailable: (s) => (findParcel(s, ['lot', 'garage']) ? null : l('No parking left to convert', '已无可改造的停车设施')),
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
      return wasGarage
        ? l('replaced a garage with a public green', '把一座停车楼换成了公共绿地')
        : l('converted a surface lot into green space', '将一个地面停车场改造为绿地');
    },
  },
  {
    id: 'renovate',
    name: l('Renovate Garages', '翻修停车楼'),
    category: 'infrastructure',
    description: l(
      'Restore all aging garages to full condition. Garages below 40% condition lose 20% of capacity and cost twice as much to maintain.',
      '将所有老化的停车楼恢复到完好状态。状况低于40%的停车楼会损失20%容量，维护费翻倍。',
    ),
    flavor: l('Concrete is forever. Concrete maintenance is also forever.', '混凝土是永恒的。混凝土的维护也是。'),
    minYear: 1958,
    tags: [
      { label: l('Restores capacity', '恢复容量'), tone: 'good' },
      { label: l('Reinvests in cars', '继续投资汽车'), tone: 'neutral' },
    ],
    cost: (s) => {
      const n = s.parcels.filter((p) => p.type === 'garage' && p.condition < 90).length;
      return Math.round(n * 160000 * landCost(s) ** 0.5);
    },
    unavailable: (s) =>
      s.parcels.some((p) => p.type === 'garage' && p.condition < 90) ? null : l('No garages need renovation', '没有需要翻修的停车楼'),
    apply: (s) => {
      let n = 0;
      for (const p of s.parcels) if (p.type === 'garage' && p.condition < 90) { p.condition = 100; n++; }
      applyEffects(s, { faculty: 1, inertia: 1 });
      return l(`renovated ${n} aging garage${n === 1 ? '' : 's'}`, `翻修了${n}座老化的停车楼`);
    },
  },

  // ---------------- Transportation Demand Management ----------------
  tdmPolicy(
    'transit_subsidy', 'transitSubsidy', l('Transit Subsidy Program', '公交补贴计划'), 1948, 20000,
    l(
      'Subsidize fares on regional transit. Effectiveness depends on regional transit quality, and grows as the program matures.',
      '补贴区域公共交通票价。效果取决于区域公交质量，并随项目成熟而增强。',
    ),
    l('Paying people not to park: cheaper than building spaces, harder to name after donors.', '花钱让人别来停车：比建车位便宜，但很难以捐赠人的名字命名。'),
    { students: 6, faculty: 1, sustainability: 4, inertia: -2 },
    l('launched a transit fare subsidy for faculty, staff, and students', '为教职工和学生推出了公交票价补贴'),
  ),
  tdmPolicy(
    'bike_infra', 'bikeInfra', l('Expand Bicycle Infrastructure', '扩建自行车设施'), 1970, 120000,
    l('Bike lanes, racks, and showers. Small recurring cost; effect grows in later eras.', '自行车道、停车架和淋浴间。持续成本低，越到后期效果越好。'),
    l('The Dean of Engineering has requested a covered rack for his recumbent.', '工学院院长申请为他的躺式自行车配一个带顶棚的车架。'),
    { students: 4, sustainability: 4, neighborhood: 1 },
    l('built a campus bicycle network', '建成了校园自行车网络'),
  ),
  tdmPolicy(
    'shuttle', 'shuttle', l('University Shuttle', '校园班车'), 1958, 100000,
    l('Shuttle buses from remote lots and nearby neighborhoods. Reduces demand and spillover.', '从远端停车场和周边社区开出的班车。降低需求和溢出停车。'),
    l('Route 1 serves the Medical School. Route 2 serves the Dean’s preferred coffee shop.', '1号线服务医学院。2号线服务院长最爱的咖啡店。'),
    { students: 4, neighborhood: 2, sustainability: 2 },
    l('established a university shuttle service', '开通了校园班车服务'),
  ),
  tdmPolicy(
    'carpool', 'carpool', l('Carpool Incentives', '拼车激励'), 1973, 15000,
    l('Discounted permits and preferred spaces for carpools. Cheap, modest effect.', '为拼车者提供停车证折扣和优先车位。便宜，效果一般。'),
    l('A matching service pairs colleagues who would rather walk than share a car.', '一项匹配服务，专门撮合宁愿走路也不愿同车的同事。'),
    { faculty: 1, sustainability: 2 },
    l('introduced carpool incentives', '推出了拼车激励'),
  ),
  tdmPolicy(
    'cash_out', 'cashOut', l('Parking Cash-Out & Flexible Commuting', '停车现金补偿与弹性通勤'), 1995, 30000,
    l(
      'Pay employees who give up their permit. Strongly reduces demand, especially when parking is priced.',
      '向放弃停车证的员工支付现金。能显著降低需求，在停车收费时尤其有效。',
    ),
    l('Faculty are delighted to learn they can be paid for not doing something.', '教职工欣喜地发现，不做某件事也能拿钱。'),
    { faculty: 3, students: 2, sustainability: 4 },
    l('adopted parking cash-out and flexible commuting benefits', '实行了停车现金补偿和弹性通勤福利'),
  ),

  // ---------------- Administrative ----------------
  {
    id: 'committee',
    name: l('Parking Advisory Committee', '停车咨询委员会'),
    category: 'administrative',
    description: l(
      'Temporary political relief for all stakeholders. Accomplishes very little. Diminishing returns.',
      '为所有利益相关方带来短暂的政治缓解。几乎一事无成。效果递减。',
    ),
    flavor: l(
      'The committee will report back in eighteen months with a recommendation to continue studying.',
      '委员会将在十八个月后提交报告，建议继续研究。',
    ),
    minYear: 1948,
    tags: [
      { label: l('Politics ↑ (short)', '政治支持 ↑（短期）'), tone: 'good' },
      { label: l('Inertia ↑', '惯性 ↑'), tone: 'bad' },
    ],
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
      const n = s.counters.committees;
      return l(`established Parking Advisory Committee No. ${n}`, `成立了第${n}届停车咨询委员会`);
    },
  },
  {
    id: 'faculty_privileges',
    name: l('Grant Faculty Parking Privileges', '授予教职工停车特权'),
    category: 'administrative',
    description: l(
      'Free reserved parking for tenured faculty. Very popular. Removes ~30% of parkers from paying. Very hard to reverse later.',
      '为终身教职员工提供免费专用车位。非常受欢迎。约30%的停车者将不再付费。日后极难收回。',
    ),
    flavor: l('A benefit is temporary until the second year, after which it is a tradition.', '福利在第一年是临时的，第二年起就成了传统。'),
    minYear: 1948,
    tags: [
      { label: l('Faculty ↑↑', '教职工 ↑↑'), tone: 'good' },
      { label: l('Revenue ↓', '收入 ↓'), tone: 'bad' },
      { label: l('Lock-in ↑', '锁定效应 ↑'), tone: 'bad' },
    ],
    cost: () => 0,
    unavailable: (s) => (hasCommitment(s, 'facultyPrivileges') ? R.granted : null),
    apply: (s) => {
      addCommitment(s, 'facultyPrivileges');
      applyEffects(s, { faculty: 12, students: -4, autoDependence: 3, inertia: 6 });
      return l('granted free parking privileges to tenured faculty', '授予终身教职员工免费停车特权');
    },
  },
  {
    id: 'admin_reserved',
    name: l('Reserve Spaces for Senior Administrators', '为高级行政人员预留车位'),
    category: 'administrative',
    description: l(
      `Reserve ${C.ADMIN_RESERVED_SPACES} prime spaces. The Board, appreciative, releases discretionary funds.`,
      `预留${C.ADMIN_RESERVED_SPACES}个黄金车位。心怀感激的校董会会拨出一笔可自由支配的资金。`,
    ),
    flavor: l('Leadership requires proximity. Specifically, proximity to the building entrance.', '领导力需要贴近一线。具体来说，是贴近大楼入口。'),
    minYear: 1948,
    tags: [
      { label: l('+$120k', '+$12万'), tone: 'good' },
      { label: l('Students ↓', '学生 ↓'), tone: 'bad' },
      { label: l(`−${C.ADMIN_RESERVED_SPACES} spaces`, `−${C.ADMIN_RESERVED_SPACES}个车位`), tone: 'bad' },
    ],
    cost: () => 0,
    unavailable: (s) => (hasCommitment(s, 'adminReserved') ? R.reserved : null),
    apply: (s) => {
      addCommitment(s, 'adminReserved');
      applyEffects(s, { cash: 120000, students: -3, faculty: -2, inertia: 2 });
      return l('reserved prime spaces for senior administrators', '为高级行政人员预留了黄金车位');
    },
  },
  {
    id: 'enforcement',
    name: l('Parking Enforcement', '停车执法'),
    category: 'administrative',
    description: l(
      'Hire enforcement officers. Improves permit compliance (+12% revenue) and reduces illegal neighborhood parking.',
      '聘请执法人员。提高停车证缴费率（收入+12%），减少社区内的违章停车。',
    ),
    flavor: l('The new officers are efficient, tireless, and have ticketed the President twice.', '新来的执法员高效、不知疲倦，已经给校长开了两次罚单。'),
    minYear: 1953,
    tags: [
      { label: l('Revenue ↑', '收入 ↑'), tone: 'good' },
      { label: l('Neighbors ↑', '邻里 ↑'), tone: 'good' },
      { label: l('Students ↓', '学生 ↓'), tone: 'bad' },
    ],
    cost: () => 30000,
    recurring: (s) => commitmentAnnualCost(s, 'enforcement'),
    unavailable: (s) => (hasCommitment(s, 'enforcement') ? R.active : null),
    apply: (s) => {
      addCommitment(s, 'enforcement');
      applyEffects(s, { students: -4, faculty: -2, neighborhood: 3 });
      return l('hired a parking enforcement unit', '组建了停车执法队');
    },
  },
  {
    id: 'shared_parking',
    name: l('Shared Parking Agreement', '共享停车协议'),
    category: 'administrative',
    description: l(
      `Lease ${C.SHARED_SPACES} off-peak spaces from the neighboring hospital and church. Capacity without construction.`,
      `向邻近的医院和教堂租用${C.SHARED_SPACES}个错峰车位。不用施工就能增加容量。`,
    ),
    flavor: l(
      'The church lot is available every day except Sunday, Christmas, and Easter, and during funerals.',
      '教堂停车场每天都能用——除了周日、圣诞节、复活节，以及有葬礼的时候。',
    ),
    minYear: 1963,
    tags: [
      { label: l(`+${C.SHARED_SPACES} spaces`, `+${C.SHARED_SPACES}个车位`), tone: 'good' },
      { label: l('No new land', '无需新地'), tone: 'good' },
      { label: l('Lease cost', '租赁费用'), tone: 'bad' },
    ],
    cost: () => 25000,
    recurring: (s) => commitmentAnnualCost(s, 'sharedParking'),
    unavailable: (s) => (hasCommitment(s, 'sharedParking') ? R.active : null),
    apply: (s) => {
      addCommitment(s, 'sharedParking');
      applyEffects(s, { neighborhood: 3, faculty: 1 });
      return l('negotiated a shared parking agreement with neighboring institutions', '与邻近机构谈成了共享停车协议');
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
export function policyBlocker(s: GameState, p: PolicyDef, queued: string[]): L | null {
  if (!isEraAvailable(p, s.year)) return l(`Unlocks in ${p.minYear}`, `${p.minYear}年解锁`);
  if (queued.includes(p.id)) return l('Already selected', '已选择');
  if (queued.length >= MAX_ACTIONS_PER_TURN) return l('Action limit reached', '已达行动上限');
  if (
    p.category === 'pricing' &&
    !isReversal(p) &&
    queued.some((q) => getPolicy(q)?.category === 'pricing' && !q.startsWith('end_'))
  ) {
    return l('One pricing decision per turn', '每回合只能做一项定价决策');
  }
  const reason = p.unavailable?.(s);
  if (reason) return reason;
  const queuedCost = queued.reduce((sum, q) => sum + (getPolicy(q)?.cost(s) ?? 0), 0);
  const cost = p.cost(s);
  if (cost > 0 && s.cash + C.CREDIT_LINE - queuedCost < cost) {
    return l('Insufficient funds (incl. credit line)', '资金不足（含信贷额度）');
  }
  return null;
}
