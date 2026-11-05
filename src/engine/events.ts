/**
 * Random event definitions. All events are fictional and describe Westbridge University only.
 * Each choice mutates a draft state and returns a past-tense fragment completing the sentence
 * "…the university ___." / “……校方___。”
 */
import { addCommitment, applyEffects, capacity, countParcels, findParcel, hasCommitment, landCost, removeCommitment, setParcel } from './state';
import { l } from './text';
import type { EventDef, GameState, L } from './types';

const fx = applyEffects;

function shortageRatio(s: GameState): number {
  return s.demand > 0 ? Math.max(0, s.demand - capacity(s)) / s.demand : 0;
}
function vacancyRatio(s: GameState): number {
  const cap = capacity(s);
  return cap > 0 ? Math.max(0, cap - s.demand) / cap : 0;
}
const parkingParcels = (s: GameState) => countParcels(s, 'lot') + countParcels(s, 'garage');

function freeGarage(s: GameState, name: L): boolean {
  const p = findParcel(s, ['vacant', 'lot']);
  if (!p) return false;
  setParcel(p, 'garage', s.year, name);
  s.counters.garagesBuilt++;
  return true;
}

const NO_GARAGE_LAND = l('No land left for a garage', '已无可建停车楼的土地');
const NO_LOTS = l('No surface lots left', '已无地面停车场');

export const EVENTS: EventDef[] = [
  // ------------------------------------------------------------------ Postwar
  {
    id: 'gi_surge',
    title: l('The Veterans Enrollment Surge', '退伍军人入学潮'),
    eras: ['postwar'],
    description: () =>
      l(
        'Enrollment has exploded with returning veterans, many of whom learned to drive in places considerably more dangerous than the faculty lot. Quonset huts are appearing on every lawn.',
        '退伍军人涌入校园，入学人数暴涨。他们中许多人学开车的地方比教职工停车场危险得多。每一片草坪上都冒出了活动板房。',
      ),
    choices: [
      {
        label: l('Pave the athletic field “temporarily”', '“临时”铺平运动场'),
        detail: l('+250 spaces for a few years. Students −3.', '几年内+250个车位。学生 −3。'),
        apply: (s) => {
          fx(s, { popIndexMult: 1.05, bonusCapacity: 250, students: -3, autoDependence: 1 });
          return l(
            'paved the athletic field as a temporary measure, a phrase it would come to use often',
            '将运动场铺成停车场作为“临时措施”——这个说法日后会被反复使用',
          );
        },
      },
      {
        label: l('Negotiate extra streetcar service', '争取增开有轨电车'),
        detail: l('−$30k. Regional transit improves.', '−$3万。区域公交改善。'),
        apply: (s) => {
          fx(s, { popIndexMult: 1.05, cash: -30000, transitQuality: 4, students: 2 });
          return l('negotiated additional streetcar service with the transit company', '与电车公司谈妥了增开班次');
        },
      },
      {
        label: l('Assume the surge is temporary', '假定入学潮只是暂时的'),
        detail: l('Free. Probably wrong.', '免费。大概率是错的。'),
        apply: (s) => {
          fx(s, { popIndexMult: 1.06, faculty: -2 });
          return l('assumed the enrollment surge was temporary', '认定入学潮只是暂时现象');
        },
      },
    ],
  },
  {
    id: 'streetcar',
    title: l('The Streetcar Question', '有轨电车之问'),
    eras: ['postwar', 'expansion'],
    description: () =>
      l(
        'The transit company proposes replacing the Westbridge Avenue streetcar with modern buses. A trustee suggests the tracks could be paved over for parking, “which is basically the same thing.”',
        '公交公司提议用现代公共汽车取代西桥大道上的有轨电车。一位校董建议把轨道铺平用来停车，“反正基本上是一回事”。',
      ),
    choices: [
      {
        label: l('Lobby to keep the streetcar', '游说保留有轨电车'),
        detail: l('−$80k. Transit quality +8. Neighbors +2.', '−$8万。公交质量 +8。邻里 +2。'),
        apply: (s) => {
          fx(s, { cash: -80000, transitQuality: 8, neighborhood: 2 });
          return l('lobbied, expensively, to keep the streetcar running', '花大价钱游说，保住了有轨电车');
        },
      },
      {
        label: l('Welcome the modern buses', '欢迎现代公交车'),
        detail: l('Transit −5. Car dependence +2.', '公交 −5。汽车依赖 +2。'),
        apply: (s) => {
          fx(s, { transitQuality: -5, autoDependence: 2 });
          return l('welcomed the new buses with a ribbon-cutting nobody rode to', '为新公交车举办了剪彩仪式——没人是坐公交来的');
        },
      },
      {
        label: l('Request the right-of-way for parking', '申请把电车路权改作停车'),
        detail: l('+200 temporary spaces. Transit −10. Car dependence +4.', '+200个临时车位。公交 −10。汽车依赖 +4。'),
        apply: (s) => {
          fx(s, { transitQuality: -10, autoDependence: 4, faculty: 2, bonusCapacity: 200 });
          return l('requested the abandoned streetcar right-of-way for parking', '申请将废弃的电车路权用于停车');
        },
      },
    ],
  },
  {
    id: 'tailfins',
    title: l('The Tailfin Problem', '尾鳍难题'),
    eras: ['postwar', 'expansion'],
    description: () =>
      l(
        'Automobiles are getting longer each model year. The 1948 stalls no longer accommodate a Dean’s sedan, and three professors have been trapped in their cars since Tuesday.',
        '汽车一年比一年长。1948年划的车位已经停不下院长的轿车，三位教授从周二起就被困在车里出不来。',
      ),
    choices: [
      {
        label: l('Restripe for larger cars', '按大车重新划线'),
        detail: l('−$30k. Capacity −8% permanently. Faculty +3.', '−$3万。容量永久 −8%。教职工 +3。'),
        apply: (s) => {
          fx(s, { cash: -30000, faculty: 3, flags: { wideStalls: true } });
          return l('restriped every lot for larger automobiles, losing spaces to chrome', '按大型轿车重新划线，车位让给了镀铬车身');
        },
      },
      {
        label: l('Mandate compact-car stalls', '强制设立小型车位'),
        detail: l('Capacity +5%. Faculty −4.', '容量 +5%。教职工 −4。'),
        apply: (s) => {
          fx(s, { faculty: -4, sustainability: 1, flags: { compactStalls: true } });
          return l(
            'designated compact-only stalls, which were immediately occupied by station wagons',
            '划定了小型车专用位，随即被旅行车占满',
          );
        },
      },
      {
        label: l('Let the fenders sort it out', '让保险杠自己解决'),
        detail: l('Faculty −2. Neighbors −2.', '教职工 −2。邻里 −2。'),
        apply: (s) => {
          fx(s, { faculty: -2, neighborhood: -2 });
          return l('allowed the fenders to sort it out', '任由保险杠们自行协商');
        },
      },
    ],
  },
  {
    id: 'snow',
    title: l('The Great Blizzard', '大暴雪'),
    eras: ['postwar', 'expansion', 'institutional'],
    condition: (s) => parkingParcels(s) >= 2,
    description: (s) =>
      l(
        `A blizzard has buried ${parkingParcels(s)} parking facilities. The Provost has asked whether snow counts as a parking violation.`,
        `一场暴风雪掩埋了${parkingParcels(s)}处停车设施。教务长询问：积雪算不算违章停车？`,
      ),
    choices: [
      {
        label: l('Hire a private plow fleet', '雇用私人铲雪车队'),
        detail: l('−$60k. Faculty +3.', '−$6万。教职工 +3。'),
        apply: (s) => {
          fx(s, { cash: -60000, faculty: 3 });
          return l('hired a private plow fleet at emergency rates', '按紧急费率雇了一支私人铲雪车队');
        },
      },
      {
        label: l('Let it melt', '等它自己化'),
        detail: l('Faculty −4. Students −2.', '教职工 −4。学生 −2。'),
        apply: (s) => {
          fx(s, { faculty: -4, students: -2 });
          return l('let the snow melt in accordance with natural law', '依照自然规律，等待积雪融化');
        },
      },
      {
        label: l('Offer course credit for shoveling', '铲雪可抵课程学分'),
        detail: l('Students −4. Faculty +1. The Registrar objects.', '学生 −4。教职工 +1。教务注册处表示反对。'),
        apply: (s) => {
          fx(s, { students: -4, faculty: 1 });
          return l('offered course credit for shoveling, over the objections of the Registrar', '不顾教务注册处反对，给铲雪的学生计学分');
        },
      },
    ],
  },
  {
    id: 'nobel',
    title: l('The Nobel Laureate Parking Crisis', '诺贝尔奖得主停车危机'),
    eras: ['postwar', 'expansion', 'institutional', 'reform'],
    description: () =>
      l(
        'A newly decorated Nobel laureate informs the Provost that discoveries of this magnitude require an exclusive parking space within forty feet of the laboratory door. The laboratory door is in the middle of a quad.',
        '一位新科诺贝尔奖得主告知教务长：如此量级的发现，需要一个距实验室门口不超过四十英尺的专属车位。而实验室的门位于一片草坪中央。',
      ),
    choices: [
      {
        label: l('Grant a reserved space', '批给专属车位'),
        detail: l('Faculty +4. Students −2. Inertia +2.', '教职工 +4。学生 −2。惯性 +2。'),
        apply: (s) => {
          fx(s, { faculty: 4, students: -2, inertia: 2, flags: { laureateSpace: true } });
          return l(
            'granted the laureate a reserved space, immediately requested by eleven other laureates-in-waiting',
            '给获奖者批了专属车位，另外十一位“准获奖者”随即提出同样要求',
          );
        },
      },
      {
        label: l('Name a bicycle rack in their honor', '以其名字命名一个自行车架'),
        detail: l('Faculty −3. Sustainability +2.', '教职工 −3。可持续性 +2。'),
        apply: (s) => {
          fx(s, { faculty: -3, sustainability: 2, students: 1 });
          return l('named a bicycle rack in the laureate’s honor', '以获奖者的名字命名了一个自行车架');
        },
      },
      {
        label: l('Refer it to the committee', '提交委员会讨论'),
        detail: l('−$10k. Faculty +1. Inertia +1.', '−$1万。教职工 +1。惯性 +1。'),
        apply: (s) => {
          fx(s, { cash: -10000, faculty: 1, inertia: 1 });
          s.counters.committees++;
          return l('referred the laureate’s request to a newly formed subcommittee', '把获奖者的要求转交给一个新成立的小组委员会');
        },
      },
    ],
  },
  {
    id: 'committee_review',
    title: l('The Committee to Review the Committee', '审查委员会的委员会'),
    eras: ['postwar', 'expansion', 'institutional', 'reform', 'modern'],
    condition: (s) => s.counters.committees >= 1,
    weight: (s) => 0.6 + s.counters.committees * 0.4,
    description: (s) =>
      l(
        `After ${s.counters.committees * 18} months of deliberation, Parking Advisory Committee No. ${s.counters.committees} has issued its final recommendation: the creation of a new advisory committee to review its work.`,
        `经过${s.counters.committees * 18}个月的审议，第${s.counters.committees}届停车咨询委员会发布了最终建议：成立一个新的咨询委员会来审查它的工作。`,
      ),
    choices: [
      {
        label: l('Create the review committee', '成立审查委员会'),
        detail: l('−$20k. Faculty +2. Inertia +3.', '−$2万。教职工 +2。惯性 +3。'),
        apply: (s) => {
          fx(s, { cash: -20000, faculty: 2, inertia: 3 });
          s.counters.committees++;
          return l('created a committee to review the committee', '成立了一个审查委员会的委员会');
        },
      },
      {
        label: l('Dissolve the original committee', '解散原委员会'),
        detail: l('Inertia −4. Faculty −2.', '惯性 −4。教职工 −2。'),
        apply: (s) => {
          fx(s, { inertia: -4, faculty: -2 });
          return l('dissolved the committee, which formally objected through a committee', '解散了该委员会——它通过一个委员会正式提出了抗议');
        },
      },
      {
        label: l('Merge both into a Task Force', '合并为专项工作组'),
        detail: l('−$10k. Inertia +1. Sounds decisive.', '−$1万。惯性 +1。听起来很果断。'),
        apply: (s) => {
          fx(s, { cash: -10000, inertia: 1, faculty: 1, students: 1 });
          return l('merged both bodies into a Strategic Mobility Task Force', '把两个机构合并为“战略出行专项工作组”');
        },
      },
    ],
  },
  {
    id: 'neighborhood_rebellion',
    title: l('The Neighborhood Parking Rebellion', '社区停车大起义'),
    eras: ['postwar', 'expansion', 'institutional', 'reform'],
    condition: (s) => shortageRatio(s) > 0.05 || s.ind.neighborhood < 50,
    weight: (s) => 1 + shortageRatio(s) * 6,
    description: () =>
      l(
        'Residents of the adjacent blocks have placed lawn chairs in every curbside space, citing “university commuters” and “a historic right to sit near our own houses.” The local paper has a photograph.',
        '相邻街区的居民在每一个路边车位上都摆了一把草坪椅，理由是“大学通勤者”以及“在自家门口坐着的历史权利”。本地报纸登了照片。',
      ),
    choices: [
      {
        label: l('Fund a residential permit district', '资助设立居民停车许可区'),
        detail: l(
          '−$150k. Neighbors +8. Spillover damage reduced permanently. Faculty −3.',
          '−$15万。邻里 +8。永久减轻溢出停车的影响。教职工 −3。',
        ),
        apply: (s) => {
          fx(s, { cash: -150000, neighborhood: 8, faculty: -3, flags: { residentialPermits: true } });
          return l('co-funded a residential permit parking district with the city', '与市政府合资设立了居民停车许可区');
        },
      },
      {
        label: l('Establish a community benefits fund', '设立社区利益基金'),
        detail: l('−$250k. Neighbors +12 (fades).', '−$25万。邻里 +12（会逐渐消退）。'),
        apply: (s) => {
          fx(s, { cash: -250000, neighborhood: 12 });
          return l('established a community benefits fund and a very large check', '设立了社区利益基金，并开出一张非常大的支票');
        },
      },
      {
        label: l('Issue a statement about shared public streets', '发表声明：街道属于公众'),
        detail: l('Neighbors −8.', '邻里 −8。'),
        apply: (s) => {
          fx(s, { neighborhood: -8 });
          return l('issued a statement reminding residents that streets are public', '发表声明提醒居民：街道是公共的');
        },
      },
    ],
  },

  // ------------------------------------------------------------------ Expansion
  {
    id: 'urban_renewal',
    title: l('The Redevelopment Authority’s Generous Offer', '再开发局的慷慨提议'),
    eras: ['expansion'],
    condition: (s) => !s.flags.annexLot,
    description: () =>
      l(
        'The city’s Redevelopment Authority offers to clear two adjacent blocks of rowhouses for a 400-space university lot, describing the blocks as “underutilized,” a term residents did not use.',
        '市再开发局提出拆除两个相邻街区的联排住宅，为大学建一个400车位的停车场，并称这些街区“未被充分利用”——居民们可不这么说。',
      ),
    choices: [
      {
        label: l('Accept the cleared land', '接受清拆后的土地'),
        detail: l('+400 spaces permanently. Neighbors −15. Inertia +5.', '永久+400个车位。邻里 −15。惯性 +5。'),
        apply: (s) => {
          fx(s, { neighborhood: -15, inertia: 5, autoDependence: 3, faculty: 4, sustainability: -3, flags: { annexLot: true } });
          return l(
            'accepted cleared land for a 400-space annex lot, beginning a long memory in the neighborhood',
            '接受清拆土地，建成400车位的附属停车场——社区从此记住了这件事，记了很久',
          );
        },
      },
      {
        label: l('Propose mixed housing instead', '改为提议建混合住房'),
        detail: l('−$200k. Neighbors +8.', '−$20万。邻里 +8。'),
        apply: (s) => {
          fx(s, { cash: -200000, neighborhood: 8, students: 2 });
          return l('proposed and partly funded mixed-income housing instead of parking', '提议并部分出资建设混合收入住房，而不是停车场');
        },
      },
      {
        label: l('Decline politely', '礼貌拒绝'),
        detail: l('Neighbors +4. Faculty −2.', '邻里 +4。教职工 −2。'),
        apply: (s) => {
          fx(s, { neighborhood: 4, faculty: -2 });
          return l('declined the land', '谢绝了这块土地');
        },
      },
    ],
  },
  {
    id: 'sit_in',
    title: l('The Sit-In at Lot B', 'B停车场静坐事件'),
    eras: ['expansion'],
    description: () =>
      l(
        'Student activists have occupied the Parking Office, demanding an end to the war, an end to the draft, and an end to the $5 late fee. Negotiators note the third demand is the only one within your authority.',
        '学生活动人士占领了停车办公室，要求结束战争、废除征兵、取消5美元滞纳金。谈判人员指出，只有第三项在你的职权范围内。',
      ),
    choices: [
      {
        label: l('Negotiate and abolish the late fee', '谈判并取消滞纳金'),
        detail: l('Students +7. Faculty −2. −$20k.', '学生 +7。教职工 −2。−$2万。'),
        apply: (s) => {
          fx(s, { students: 7, faculty: -2, cash: -20000 });
          return l('negotiated with the occupiers and abolished the late fee', '与占领者谈判，并取消了滞纳金');
        },
      },
      {
        label: l('Form a joint student–faculty committee', '成立师生联合委员会'),
        detail: l('Students +2. Inertia +2.', '学生 +2。惯性 +2。'),
        apply: (s) => {
          fx(s, { students: 2, inertia: 2 });
          s.counters.committees++;
          return l('formed a joint student–faculty parking committee', '成立了师生联合停车委员会');
        },
      },
      {
        label: l('Wait them out', '耗到他们离开'),
        detail: l('Students −8. Neighbors −2.', '学生 −8。邻里 −2。'),
        apply: (s) => {
          fx(s, { students: -8, neighborhood: -2 });
          return l('waited out the sit-in, which ended when finals began', '一直耗着，静坐在期末考试开始时自行结束');
        },
      },
    ],
  },
  {
    id: 'oil_crisis',
    title: l('The Gasoline Line Seminar', '加油排队研讨课'),
    eras: ['expansion'],
    condition: (s) => s.year >= 1968,
    description: () =>
      l(
        'An oil embargo has produced gasoline lines long enough that the Economics Department has begun teaching a seminar in one. Commuters are suddenly curious about alternatives.',
        '石油禁运导致加油站排起长龙，长到经济系干脆在队伍里开了一门研讨课。通勤者突然对替代方案产生了兴趣。',
      ),
    choices: [
      {
        label: l('Launch carpool matching', '推出拼车匹配'),
        detail: l('Adds Carpool Incentives. Sustainability +2.', '新增拼车激励。可持续性 +2。'),
        apply: (s) => {
          addCommitment(s, 'carpool');
          fx(s, { sustainability: 2, autoDependence: -2, demandModifierMult: 0.97 });
          return l('launched a carpool matching service', '推出了拼车匹配服务');
        },
      },
      {
        label: l('Reserve fuel for the presidential fleet', '为校长车队预留燃油'),
        detail: l('Students −3. Faculty +1.', '学生 −3。教职工 +1。'),
        apply: (s) => {
          fx(s, { students: -3, faculty: 1 });
          return l('reserved gasoline for the presidential motor pool', '为校长车队预留了汽油');
        },
      },
      {
        label: l('Declare it a teachable moment', '宣布这是一次教育契机'),
        detail: l('Students +2. Car dependence −1.', '学生 +2。汽车依赖 −1。'),
        apply: (s) => {
          fx(s, { students: 2, autoDependence: -1 });
          return l('declared the crisis a teachable moment', '宣布这场危机是一次难得的教育契机');
        },
      },
    ],
  },
  {
    id: 'federal_grant',
    title: l('The Federal Mass Transit Grant', '联邦公共交通拨款'),
    eras: ['expansion', 'reform'],
    description: () =>
      l(
        'A federal agency offers matching funds for campus transit. The grant officer notes, with visible reluctance, that “transit” has occasionally been interpreted to include structured parking near a bus stop.',
        '一家联邦机构为校园交通提供配套资金。项目官员不太情愿地提到，“交通”偶尔也被解释为包括公交站附近的停车楼。',
      ),
    choices: [
      {
        label: l('Start a funded shuttle', '用拨款开通班车'),
        detail: l('Adds University Shuttle. +$150k. Transit +4.', '新增校园班车。+$15万。公交 +4。'),
        apply: (s) => {
          addCommitment(s, 'shuttle');
          fx(s, { cash: 150000, transitQuality: 4, students: 3 });
          return l('used federal funds to start a shuttle network', '用联邦资金开通了班车网络');
        },
      },
      {
        label: l('Interpret creatively (“park-and-ride”)', '创造性解读（“停车换乘”）'),
        detail: l('+$300k. Car dependence +2. Sustainability −2.', '+$30万。汽车依赖 +2。可持续性 −2。'),
        apply: (s) => {
          fx(s, { cash: 300000, autoDependence: 2, sustainability: -2, inertia: 2 });
          return l(
            'interpreted the transit grant as a park-and-ride lot near a bus stop',
            '把公交拨款解读为在公交站旁建一个停车换乘场',
          );
        },
      },
      {
        label: l('Decline the paperwork', '嫌手续麻烦而放弃'),
        detail: l('Nothing happens. Inertia +1.', '什么都没发生。惯性 +1。'),
        apply: (s) => {
          fx(s, { inertia: 1 });
          return l('declined the grant on account of the paperwork', '因手续繁琐放弃了这笔拨款');
        },
      },
    ],
  },
  {
    id: 'historic',
    title: l('The Historic Preservation Objection', '历史保护异议'),
    eras: ['expansion', 'institutional', 'reform'],
    description: () =>
      l(
        'Planners propose replacing the 1890s Carriage House—where, legend says, the university’s first automobile was refused entry—with a parking lot. The Preservation Society has chained itself to the hayloft.',
        '规划人员提议把建于1890年代的马车房改建成停车场——传说学校的第一辆汽车就曾在这里被拒之门外。历史保护协会的成员已经把自己锁在了草料阁楼上。',
      ),
    choices: [
      {
        label: l('Preserve it', '保留它'),
        detail: l('−$60k. Neighbors +4. Faculty −2.', '−$6万。邻里 +4。教职工 −2。'),
        apply: (s) => {
          fx(s, { cash: -60000, neighborhood: 4, faculty: -2 });
          return l('preserved the Carriage House', '保留了马车房');
        },
      },
      {
        label: l('Demolish for “temporary” parking', '拆除改作“临时”停车'),
        detail: l('+200 temporary spaces. Neighbors −6. Inertia +2.', '+200个临时车位。邻里 −6。惯性 +2。'),
        apply: (s) => {
          fx(s, { bonusCapacity: 200, neighborhood: -6, students: -2, inertia: 2, sustainability: -2 });
          return l('demolished the Carriage House for parking described as temporary', '拆除马车房，用于号称“临时”的停车');
        },
      },
      {
        label: l('Adapt it as a bicycle hub', '改造为自行车中心'),
        detail: l('−$90k. Adds Bicycle Network. Sustainability +3.', '−$9万。新增自行车网络。可持续性 +3。'),
        unavailable: (s) => (s.year < 1970 ? l('Bicycles are not yet fashionable', '自行车还没流行起来') : null),
        apply: (s) => {
          fx(s, { cash: -90000, sustainability: 3, students: 3 });
          addCommitment(s, 'bikeInfra');
          return l(
            'converted the Carriage House into a bicycle hub, restoring its original transportation purpose',
            '把马车房改造成自行车中心，让它重新回归交通用途',
          );
        },
      },
    ],
  },
  {
    id: 'faculty_senate',
    title: l('The Faculty Senate Emergency Resolution', '教授评议会紧急决议'),
    eras: ['expansion', 'institutional', 'reform'],
    condition: (s) => s.price > 120 || shortageRatio(s) > 0.1,
    weight: 1.5,
    description: () =>
      l(
        'In an emergency session, the Faculty Senate has resolved 47–3 that affordable, proximate parking is “essential to academic freedom.” The three dissenters bike.',
        '教授评议会在紧急会议上以47比3通过决议：价格合理、距离便利的停车“是学术自由的必要条件”。那三位反对者骑自行车上班。',
      ),
    choices: [
      {
        label: l('Cut prices 10% as a gesture', '降价10%以示诚意'),
        detail: l('Price −10%. Faculty +6.', '价格 −10%。教职工 +6。'),
        apply: (s) => {
          fx(s, { priceMult: 0.9, faculty: 6, sustainability: -1 });
          return l('trimmed permit prices as a gesture of collegiality', '下调停车证价格，以示同僚之谊');
        },
      },
      {
        label: l('Refer it to the Advisory Committee', '提交咨询委员会'),
        detail: l('Faculty +2. Inertia +2.', '教职工 +2。惯性 +2。'),
        apply: (s) => {
          fx(s, { faculty: 2, inertia: 2 });
          s.counters.committees++;
          return l('referred the resolution to the Parking Advisory Committee', '将决议转交停车咨询委员会');
        },
      },
      {
        label: l('Note that tenure protects speech, not parking', '指出终身教职保护的是言论，不是停车'),
        detail: l('Faculty −5. Students +2. Inertia −2.', '教职工 −5。学生 +2。惯性 −2。'),
        apply: (s) => {
          fx(s, { faculty: -5, students: 2, inertia: -2 });
          return l('noted that tenure protects speech rather than parking', '指出终身教职保护的是言论而非停车');
        },
      },
    ],
  },
  {
    id: 'donor',
    title: l('The Alumni Donor Ultimatum', '校友捐赠人的最后通牒'),
    eras: ['expansion', 'institutional', 'reform'],
    description: () =>
      l(
        'A wealthy alumnus offers to fund a new science building on one condition: a convenient garage bearing his name, so that future generations remember him every time they look for a space.',
        '一位富有的校友愿意出资建一座新的科学楼，条件只有一个：配一座以他命名的便利停车楼，好让后人每次找车位时都想起他。',
      ),
    choices: [
      {
        label: l('Accept: building and garage', '接受：大楼和停车楼一起建'),
        detail: l(
          'Free 800-space garage, +$500k. Car dependence +3. Inertia +6.',
          '免费获得800车位停车楼，+$50万。汽车依赖 +3。惯性 +6。',
        ),
        unavailable: (s) => (findParcel(s, ['vacant', 'lot']) ? null : NO_GARAGE_LAND),
        apply: (s) => {
          freeGarage(s, l('The Donor’s Garage', '捐赠人停车楼'));
          s.counters.donorGarages++;
          fx(s, { cash: 500000, autoDependence: 3, inertia: 6, sustainability: -4, faculty: 4, neighborhood: -2 });
          return l('accepted the gift, garage included', '接受了这份捐赠，连同停车楼');
        },
      },
      {
        label: l('Counter-offer a transit endowment', '反提议设立公交基金'),
        detail: l('+$250k. Adds Transit Subsidy. Faculty −1.', '+$25万。新增公交补贴。教职工 −1。'),
        apply: (s) => {
          addCommitment(s, 'transitSubsidy');
          fx(s, { cash: 250000, faculty: -1, students: 3, sustainability: 2 });
          return l(
            'persuaded the donor to endow transit passes instead, after several lunches',
            '经过好几顿午餐，说服捐赠人改为捐资设立公交卡基金',
          );
        },
      },
      {
        label: l('Decline the gift', '拒绝捐赠'),
        detail: l('Faculty −3. Neighbors +2.', '教职工 −3。邻里 +2。'),
        apply: (s) => {
          fx(s, { faculty: -3, neighborhood: 2 });
          return l('declined the gift, to the horror of the Development Office', '拒绝了这份捐赠，校友发展办公室为之震惊');
        },
      },
    ],
  },
  {
    id: 'garage_empty',
    title: l('The Garage That Nobody Uses', '没人用的停车楼'),
    eras: ['expansion', 'institutional', 'reform', 'modern'],
    condition: (s) => countParcels(s, 'garage') >= 1 && vacancyRatio(s) > 0.08,
    weight: 2,
    description: () =>
      l(
        'The newest garage is 40% vacant. A consultant’s report concludes that it is “inconveniently located,” “difficult to find,” and “architecturally hostile.” The consultant’s invoice was conveniently located.',
        '最新的停车楼空置了40%。顾问报告的结论是：它“位置不便”“难以找到”“建筑上充满敌意”。而顾问的发票倒是很容易找到。',
      ),
    choices: [
      {
        label: l('Discount permits to fill it', '打折促销填满它'),
        detail: l('Price −5%. Car dependence +2. Faculty +2.', '价格 −5%。汽车依赖 +2。教职工 +2。'),
        apply: (s) => {
          fx(s, { priceMult: 0.95, autoDependence: 2, faculty: 2 });
          return l('discounted permits to fill the vacant garage', '打折出售停车证，试图填满空置的停车楼');
        },
      },
      {
        label: l('Rent the top deck for events', '出租顶层办活动'),
        detail: l('+$150k. Neighbors −2.', '+$15万。邻里 −2。'),
        apply: (s) => {
          fx(s, { cash: 150000, neighborhood: -2, students: 1 });
          return l('rented the empty top deck for weddings and food trucks', '把空着的顶层租给婚礼和餐车');
        },
      },
      {
        label: l('Rebrand it the “Innovation Garage”', '更名为“创新停车楼”'),
        detail: l('−$25k. Nothing else changes.', '−$2.5万。其他一切照旧。'),
        apply: (s) => {
          fx(s, { cash: -25000 });
          return l('rebranded the facility the Innovation Garage', '将这座设施更名为“创新停车楼”');
        },
      },
    ],
  },
  {
    id: 'budget_office',
    title: l('The Budget Office Discovers Parking Revenue', '预算办公室发现了停车收入'),
    eras: ['expansion', 'institutional', 'reform', 'modern'],
    condition: (s) => s.cash > 1_500_000,
    weight: (s) => (s.cash > 3_000_000 ? 2.5 : 1),
    description: (s) =>
      l(
        `The Budget Office has noticed the Parking Department’s reserves of $${Math.round(s.cash / 1000).toLocaleString()}k and proposes using them to fix the library roof, the athletics deficit, and “other strategic priorities.”`,
        `预算办公室注意到停车部门有$${Math.round(s.cash / 10000).toLocaleString()}万的储备金，提议用它来修图书馆屋顶、填补体育部门赤字，以及“其他战略优先事项”。`,
      ),
    choices: [
      {
        label: l('Allow the sweep', '同意划拨'),
        detail: l('Lose 35% of reserves. Faculty +3.', '损失35%储备金。教职工 +3。'),
        apply: (s) => {
          fx(s, { cash: -Math.round(s.cash * 0.35), faculty: 3, students: 2 });
          return l('surrendered a third of its reserves to the general fund', '把三分之一的储备金交给了学校总基金');
        },
      },
      {
        label: l('Create a dedicated mobility fund', '设立出行专项基金'),
        detail: l('−$150k. Sustainability +3. Students +2. Inertia −2.', '−$15万。可持续性 +3。学生 +2。惯性 −2。'),
        apply: (s) => {
          fx(s, { cash: -150000, sustainability: 3, students: 2, inertia: -2 });
          return l('ring-fenced its reserves in a dedicated mobility fund', '把储备金圈进出行专项基金');
        },
      },
      {
        label: l('Cite an obscure 1952 bylaw', '援引一条1952年的冷门章程'),
        detail: l('Keeps the money. Faculty −2. Inertia +2.', '保住资金。教职工 −2。惯性 +2。'),
        apply: (s) => {
          fx(s, { faculty: -2, inertia: 2 });
          return l('cited an obscure bylaw and kept the money', '援引一条冷门章程，保住了这笔钱');
        },
      },
    ],
  },
  {
    id: 'transit_crisis',
    title: l('The Transit Agency Funding Crisis', '公交机构资金危机'),
    eras: ['expansion', 'institutional', 'modern'],
    description: () =>
      l(
        'The regional transit agency announces service cuts, fare increases, and a new strategic plan titled “Doing Less With Less.” Former riders are reportedly shopping for cars.',
        '区域公交机构宣布削减服务、提高票价，并发布了题为《用更少做更少》的新战略规划。据报道，原来的乘客正在看车。',
      ),
    choices: [
      {
        label: l('Contribute to save key routes', '出资保住关键线路'),
        detail: l('−$400k. Transit −5 (instead of −15). Neighbors +2.', '−$40万。公交 −5（而非 −15）。邻里 +2。'),
        apply: (s) => {
          fx(s, { cash: -400000, transitQuality: -5, students: 3, neighborhood: 2 });
          return l('contributed to preserve the routes serving campus', '出资保住了服务校园的公交线路');
        },
      },
      {
        label: l('Lobby the state legislature', '游说州议会'),
        detail: l('−$40k. Transit −10.', '−$4万。公交 −10。'),
        apply: (s) => {
          fx(s, { cash: -40000, transitQuality: -10 });
          return l('lobbied the legislature, which thanked it for its input', '游说州议会，议会感谢了它的意见');
        },
      },
      {
        label: l('Accept the cuts', '接受削减'),
        detail: l('Transit −15. Car dependence +3.', '公交 −15。汽车依赖 +3。'),
        apply: (s) => {
          fx(s, { transitQuality: -15, autoDependence: 3 });
          return l('accepted the service cuts as beyond its control', '以“超出控制范围”为由接受了服务削减');
        },
      },
    ],
  },

  // ------------------------------------------------------------------ Institutionalization
  {
    id: 'mainframe',
    title: l('The Mainframe Permit System', '大型机停车证系统'),
    eras: ['institutional'],
    description: () =>
      l(
        'Information Services offers to computerize the permit system. The demonstration printed 4,000 permits for a single Assistant Dean.',
        '信息服务部门提出将停车证系统电脑化。演示时，系统为一位助理院长打印了4000张停车证。',
      ),
    choices: [
      {
        label: l('Computerize', '电脑化'),
        detail: l('−$120k. Enforcement-level compliance. Faculty −1.', '−$12万。缴费率达到执法水平。教职工 −1。'),
        apply: (s) => {
          fx(s, { cash: -120000, faculty: -1 });
          addCommitment(s, 'enforcement');
          return l('computerized the permit system, eventually', '最终把停车证系统电脑化了');
        },
      },
      {
        label: l('Keep the index cards', '继续用索引卡'),
        detail: l('Faculty +1. Inertia +2.', '教职工 +1。惯性 +2。'),
        apply: (s) => {
          fx(s, { faculty: 1, inertia: 2 });
          return l('retained its index-card permit system on grounds of reliability', '以“可靠”为由保留了索引卡停车证系统');
        },
      },
    ],
  },
  {
    id: 'lottery',
    title: l('The Parking Permit Lottery Scandal', '停车证摇号丑闻'),
    eras: ['institutional', 'reform', 'modern'],
    condition: (s) => hasCommitment(s, 'adminReserved') || hasCommitment(s, 'facultyPrivileges') || s.flags.laureateSpace === true,
    weight: 2,
    description: () =>
      l(
        'Graduate students have discovered that the permit “lottery” has never once been won by a senior administrator, because senior administrators were never entered—they were simply exempt.',
        '研究生们发现，停车证“摇号”从来没有高级行政人员中签过——因为他们根本没参加摇号，直接被豁免了。',
      ),
    choices: [
      {
        label: l('End administrator exemptions', '取消行政人员豁免'),
        detail: l('Removes reserved spaces. Students +8. Faculty +1.', '取消专用车位。学生 +8。教职工 +1。'),
        apply: (s) => {
          removeCommitment(s, 'adminReserved');
          fx(s, { students: 8, faculty: 1, inertia: -2 });
          return l('ended administrator exemptions from the lottery', '取消了行政人员的摇号豁免');
        },
      },
      {
        label: l('Create a Lottery Integrity Committee', '成立摇号公正委员会'),
        detail: l('Students +2. Inertia +2.', '学生 +2。惯性 +2。'),
        apply: (s) => {
          fx(s, { students: 2, inertia: 2 });
          s.counters.committees++;
          return l(
            'appointed a Lottery Integrity Committee, chaired by an exempt administrator',
            '成立了摇号公正委员会，由一位享受豁免的行政人员担任主席',
          );
        },
      },
      {
        label: l('Deny everything', '全盘否认'),
        detail: l('Students −8.', '学生 −8。'),
        apply: (s) => {
          fx(s, { students: -8 });
          return l('denied the existence of any lottery', '否认存在任何摇号');
        },
      },
    ],
  },
  {
    id: 'freedom_petition',
    title: l('The Academic Freedom Parking Petition', '学术自由停车请愿'),
    eras: ['institutional', 'reform'],
    condition: (s) => s.price >= 150,
    weight: 1.5,
    description: (s) =>
      l(
        `Two hundred faculty have signed a petition arguing that $${s.price} annual permits “restrict scholarly independence.” Footnotes cite Locke, Mill, and a 1971 Buick owner’s manual.`,
        `两百名教职员工联署请愿，认为每年$${s.price}的停车证“限制了学术独立”。脚注引用了洛克、密尔和一本1971年别克车主手册。`,
      ),
    choices: [
      {
        label: l('Introduce an “academic freedom discount”', '推出“学术自由折扣”'),
        detail: l('Price −15%. Faculty +6.', '价格 −15%。教职工 +6。'),
        apply: (s) => {
          fx(s, { priceMult: 0.85, faculty: 6, sustainability: -2 });
          return l('introduced an academic freedom discount', '推出了学术自由折扣');
        },
      },
      {
        label: l('Offer commuter benefits instead', '改为提供通勤福利'),
        detail: l('Adds Transit Subsidy. −$30k. Faculty +2.', '新增公交补贴。−$3万。教职工 +2。'),
        apply: (s) => {
          addCommitment(s, 'transitSubsidy');
          fx(s, { cash: -30000, faculty: 2, students: 3 });
          return l('offered expanded commuter benefits in place of a discount', '以扩大通勤福利代替折扣');
        },
      },
      {
        label: l('Publish the parking budget', '公开停车预算'),
        detail: l('Faculty −3. Inertia −3. Transparency!', '教职工 −3。惯性 −3。信息公开！'),
        apply: (s) => {
          fx(s, { faculty: -3, inertia: -3, students: 1 });
          return l('published the full parking budget, which nobody read past page two', '公开了完整的停车预算，没人读过第二页');
        },
      },
    ],
  },
  {
    id: 'stadium',
    title: l('The Game-Day Parking Gambit', '比赛日停车博弈'),
    eras: ['institutional', 'reform'],
    description: () =>
      l(
        'Athletics wants every campus space on six Saturdays a year for tailgating. They offer money, enthusiasm, and a vague promise about the band.',
        '体育部门希望每年有六个周六占用全校所有车位举办车尾派对。他们提供了钱、热情，以及一个关于乐队的模糊承诺。',
      ),
    choices: [
      {
        label: l('Lease the lots to Athletics', '把停车场租给体育部门'),
        detail: l('+$200k. Neighbors −5. Students +2.', '+$20万。邻里 −5。学生 +2。'),
        apply: (s) => {
          fx(s, { cash: 200000, neighborhood: -5, students: 2 });
          return l('leased its lots for game days', '在比赛日出租了停车场');
        },
      },
      {
        label: l('Run game-day shuttles instead', '改为开行比赛日班车'),
        detail: l('+$100k. Neighbors +1. Requires a shuttle.', '+$10万。邻里 +1。需要已有校园班车。'),
        unavailable: (s) => (hasCommitment(s, 'shuttle') ? null : l('Requires the University Shuttle', '需要先开通校园班车')),
        apply: (s) => {
          fx(s, { cash: 100000, neighborhood: 1, students: 2 });
          return l('ran game-day shuttles from remote lots', '从远端停车场开行比赛日班车');
        },
      },
      {
        label: l('Refuse', '拒绝'),
        detail: l('Students −3. Faculty +1.', '学生 −3。教职工 +1。'),
        apply: (s) => {
          fx(s, { students: -3, faculty: 1 });
          return l('refused, reminding Athletics that Saturday is for research', '拒绝了，并提醒体育部门周六是用来做研究的');
        },
      },
    ],
  },
  {
    id: 'hospital',
    title: l('The Hospital Wants Your Spaces', '医院想要你的车位'),
    eras: ['institutional', 'reform'],
    condition: (s) => !s.flags.hospitalLease,
    description: () =>
      l(
        'The university hospital, which is also somehow a separate corporation, wants 300 of your spaces for patients. It notes that patients are, medically speaking, in a hurry.',
        '大学附属医院（不知为何同时也是一家独立公司）想要你的300个车位给病人用。它指出，从医学角度讲，病人很赶时间。',
      ),
    choices: [
      {
        label: l('Lease 300 spaces to the hospital', '租给医院300个车位'),
        detail: l('+$350k. Capacity −300 permanently. Faculty −4.', '+$35万。容量永久 −300。教职工 −4。'),
        apply: (s) => {
          fx(s, { cash: 350000, faculty: -4, neighborhood: 2, flags: { hospitalLease: true } });
          return l('leased 300 spaces to the hospital', '把300个车位租给了医院');
        },
      },
      {
        label: l('Propose a shared-parking agreement', '提议共享停车协议'),
        detail: l('Adds Shared Parking. Neighbors +2.', '新增共享停车。邻里 +2。'),
        apply: (s) => {
          addCommitment(s, 'sharedParking');
          fx(s, { neighborhood: 2 });
          return l('proposed a shared-parking arrangement with the hospital', '向医院提议共享停车安排');
        },
      },
      {
        label: l('Refuse', '拒绝'),
        detail: l('Neighbors −4 as patients park on streets.', '病人只能停在街上，邻里 −4。'),
        apply: (s) => {
          fx(s, { neighborhood: -4 });
          return l('refused the hospital’s request', '拒绝了医院的请求');
        },
      },
    ],
  },
  {
    id: 'enrollment',
    title: l('The Strategic Enrollment Initiative', '战略招生计划'),
    eras: ['institutional', 'reform'],
    description: () =>
      l(
        'The Admissions Office has exceeded its targets by 9%, an achievement it is celebrating and you are calculating.',
        '招生办超额完成目标9%。他们在庆祝，你在算账。',
      ),
    choices: [
      {
        label: l('Give new students transit passes', '给新生发公交卡'),
        detail: l('−$40k. Adds Transit Subsidy.', '−$4万。新增公交补贴。'),
        apply: (s) => {
          fx(s, { popIndexMult: 1.04, cash: -40000, students: 3 });
          addCommitment(s, 'transitSubsidy');
          return l('issued transit passes to the incoming class', '为新生发放了公交卡');
        },
      },
      {
        label: l('Require first-years to live on campus', '要求一年级新生住校'),
        detail: l('−$200k. Car dependence −3. Neighbors +2.', '−$20万。汽车依赖 −3。邻里 +2。'),
        apply: (s) => {
          fx(s, { popIndexMult: 1.04, cash: -200000, autoDependence: -3, neighborhood: 2 });
          return l('required first-year students to live on campus', '要求一年级新生住在校内');
        },
      },
      {
        label: l('Sell them permits', '卖给他们停车证'),
        detail: l('+$60k. Car dependence +2.', '+$6万。汽车依赖 +2。'),
        apply: (s) => {
          fx(s, { popIndexMult: 1.04, cash: 60000, autoDependence: 2, students: 1 });
          return l('sold permits to the incoming class', '向新生出售了停车证');
        },
      },
    ],
  },

  // ------------------------------------------------------------------ Reform
  {
    id: 'sustainable_garage',
    title: l('The Sustainable Parking Garage', '可持续停车楼'),
    eras: ['reform', 'modern'],
    description: () =>
      l(
        'Facilities proposes an 800-space garage as the centerpiece of the Climate Action Plan. It will have solar panels on the roof, a rain garden at the exit, and 800 cars in between.',
        '后勤部门提议把一座800车位的停车楼作为《气候行动计划》的核心项目。楼顶有太阳能板，出口有雨水花园，中间是800辆车。',
      ),
    choices: [
      {
        label: l('Build it (with solar panels!)', '建！（有太阳能板！）'),
        detail: l(
          'Free garage via green bonds; 20-yr debt. Sustainability +1. Car dependence +3.',
          '用绿色债券免费建成停车楼；负债20年。可持续性 +1。汽车依赖 +3。',
        ),
        unavailable: (s) => (findParcel(s, ['vacant', 'lot']) ? null : NO_GARAGE_LAND),
        apply: (s) => {
          freeGarage(s, l('The Sustainable Garage', '可持续停车楼'));
          s.debts.push({ label: l('Green bonds', '绿色债券'), annualPayment: Math.round(45000 * landCost(s) ** 0.6), turnsRemaining: 4 });
          fx(s, { sustainability: 1, autoDependence: 3, inertia: 6, faculty: 4 });
          return l('built a sustainable parking garage, with solar panels', '建成了一座带太阳能板的可持续停车楼');
        },
      },
      {
        label: l('Build the bike hub and rain garden only', '只建自行车中心和雨水花园'),
        detail: l('−$150k. Sustainability +4. Faculty −2.', '−$15万。可持续性 +4。教职工 −2。'),
        apply: (s) => {
          fx(s, { cash: -150000, sustainability: 4, faculty: -2, students: 2 });
          return l(
            'built the rain garden and bike hub, but not the garage between them',
            '建了雨水花园和自行车中心，但没建夹在中间的停车楼',
          );
        },
      },
      {
        label: l('Shelve it', '搁置'),
        detail: l('Faculty −2. Inertia −1.', '教职工 −2。惯性 −1。'),
        apply: (s) => {
          fx(s, { faculty: -2, inertia: -1 });
          return l('shelved the sustainable garage', '搁置了可持续停车楼项目');
        },
      },
    ],
  },
  {
    id: 'sustainability_office',
    title: l('The Sustainability Office Strikes Back', '可持续发展办公室的反击'),
    eras: ['reform', 'modern'],
    condition: (s) => parkingParcels(s) >= 1,
    description: () =>
      l(
        'The Sustainability Office requests removal of 250 spaces for bioswales, pollinator meadows, and a contemplative stormwater feature. The proposal includes a 3D rendering with no cars and many smiling ducks.',
        '可持续发展办公室要求拆除250个车位，改建生态洼地、传粉者草甸和一处“冥想式雨水景观”。方案附有一张3D效果图：没有车，只有许多微笑的鸭子。',
      ),
    choices: [
      {
        label: l('Approve: convert a lot to green', '批准：把停车场改成绿地'),
        detail: l('Removes a surface lot (free). Sustainability +6. Faculty −4.', '免费拆除一个地面停车场。可持续性 +6。教职工 −4。'),
        unavailable: (s) => (countParcels(s, 'lot') > 0 ? null : NO_LOTS),
        apply: (s) => {
          const p = findParcel(s, ['lot'])!;
          setParcel(p, 'green', s.year);
          s.counters.conversionsToGreen++;
          fx(s, { sustainability: 6, faculty: -4, students: 3, neighborhood: 3, inertia: -3 });
          return l('replaced a surface lot with a pollinator meadow', '把一个地面停车场换成了传粉者草甸');
        },
      },
      {
        label: l('Counter with green roofs on garages', '反提议给停车楼加屋顶绿化'),
        detail: l('−$250k. Sustainability +3.', '−$25万。可持续性 +3。'),
        apply: (s) => {
          fx(s, { cash: -250000, sustainability: 3 });
          return l('installed green roofs atop its garages', '在停车楼顶上铺了屋顶绿化');
        },
      },
      {
        label: l('Decline', '拒绝'),
        detail: l('Sustainability −3. Students −3.', '可持续性 −3。学生 −3。'),
        apply: (s) => {
          fx(s, { sustainability: -3, students: -3 });
          return l('declined to remove any spaces', '拒绝拆除任何车位');
        },
      },
    ],
  },
  {
    id: 'ev',
    title: l('The Electric Vehicle Charging Mandate', '电动车充电桩指令'),
    eras: ['reform', 'modern'],
    description: () =>
      l(
        'The Climate Task Force wants EV chargers in every facility. The Transportation Office notes that an electric car stuck in traffic is still in traffic.',
        '气候工作组希望每个停车设施都装上电动车充电桩。交通办公室指出：堵在路上的电动车，依然是堵在路上。',
      ),
    choices: [
      {
        label: l('Install chargers everywhere', '全面安装充电桩'),
        detail: l('−$200k. Sustainability +4. Car dependence +1.', '−$20万。可持续性 +4。汽车依赖 +1。'),
        apply: (s) => {
          fx(s, { cash: -200000, sustainability: 4, faculty: 2, autoDependence: 1 });
          return l('installed EV chargers across all facilities', '在所有设施安装了电动车充电桩');
        },
      },
      {
        label: l('Install one, ceremonially', '象征性装一个'),
        detail: l('−$15k. A ribbon is cut.', '−$1.5万。剪了个彩。'),
        apply: (s) => {
          fx(s, { cash: -15000, sustainability: 0.5 });
          return l('installed a single ceremonial EV charger', '象征性地安装了一个充电桩');
        },
      },
      {
        label: l('Invest the money in transit instead', '把钱投到公交上'),
        detail: l('Adds Transit Subsidy. Faculty −2.', '新增公交补贴。教职工 −2。'),
        apply: (s) => {
          addCommitment(s, 'transitSubsidy');
          fx(s, { faculty: -2, sustainability: 2 });
          return l('redirected the charger budget to transit passes', '把充电桩预算转用于公交卡');
        },
      },
    ],
  },
  {
    id: 'rideshare',
    title: l('The Curb Wars', '路缘争夺战'),
    eras: ['reform', 'modern'],
    description: () =>
      l(
        'Ride-hailing companies are double-parking along every campus curb. Delivery robots are now competing for the same space and appear to be winning.',
        '网约车在校园每一段路缘都并排停车。送货机器人也在争夺同一片空间，而且似乎占了上风。',
      ),
    choices: [
      {
        label: l('Charge for pickup zones', '对上下客区收费'),
        detail: l('+$80k. Neighbors +2.', '+$8万。邻里 +2。'),
        apply: (s) => {
          fx(s, { cash: 80000, neighborhood: 2, demandModifierMult: 0.98 });
          return l('established paid pickup zones for ride-hailing', '为网约车设立了收费上下客区');
        },
      },
      {
        label: l('Ban ride-hailing on campus', '禁止网约车进校'),
        detail: l('Students −4. Car dependence +1.', '学生 −4。汽车依赖 +1。'),
        apply: (s) => {
          fx(s, { students: -4, autoDependence: 1 });
          return l('banned ride-hailing pickups on campus', '禁止网约车在校内接客');
        },
      },
      {
        label: l('Ignore it', '置之不理'),
        detail: l('Neighbors −4. Demand −3%.', '邻里 −4。需求 −3%。'),
        apply: (s) => {
          fx(s, { neighborhood: -4, demandModifierMult: 0.97 });
          return l('ignored the curb conflict', '对路缘冲突置之不理');
        },
      },
    ],
  },
  {
    id: 'climate_plan',
    title: l('The Carbon Neutrality Pledge', '碳中和承诺'),
    eras: ['reform', 'modern'],
    condition: (s) => !s.flags.climatePlan,
    description: () =>
      l(
        'The Board will announce a carbon neutrality pledge at a gala. Staff want to know whether commuting emissions “count,” given that they are, technically, the largest number.',
        '校董会将在晚宴上宣布碳中和承诺。工作人员想知道通勤排放“算不算”——毕竟从技术上讲，它是最大的那个数字。',
      ),
    choices: [
      {
        label: l('Count commuting emissions', '计入通勤排放'),
        detail: l('−$100k. Sustainability +5. Inertia −4. Faculty −2.', '−$10万。可持续性 +5。惯性 −4。教职工 −2。'),
        apply: (s) => {
          fx(s, { cash: -100000, sustainability: 5, inertia: -4, faculty: -2, flags: { climatePlan: true } });
          return l('adopted a climate plan that counted commuting emissions', '通过了一份计入通勤排放的气候计划');
        },
      },
      {
        label: l('Exclude commuting (“Scope 3”)', '不计通勤（“范围三”）'),
        detail: l('Sustainability +1. Students −4.', '可持续性 +1。学生 −4。'),
        apply: (s) => {
          fx(s, { sustainability: 1, students: -4 });
          return l('adopted a climate plan that politely ignored commuting', '通过了一份礼貌地无视通勤的气候计划');
        },
      },
      {
        label: l('Form a Climate Committee', '成立气候委员会'),
        detail: l('Inertia +2. Students +1.', '惯性 +2。学生 +1。'),
        apply: (s) => {
          fx(s, { inertia: 2, students: 1 });
          s.counters.committees++;
          return l('formed a committee to define carbon neutrality', '成立了一个委员会来定义碳中和');
        },
      },
    ],
  },
  {
    id: 'president_space',
    title: l('The President’s Reserved Space', '校长的专属车位'),
    eras: ['institutional', 'reform', 'modern'],
    description: (s) =>
      s.year >= 2000
        ? l(
            'Shortly after announcing the university’s sustainable commuting commitment, the President requests a private, covered, heated parking space adjacent to College Hall “for security reasons.”',
            '在宣布学校的可持续通勤承诺后不久，校长“出于安全考虑”，要求在学院楼旁设一个私人的、有顶棚、带供暖的车位。',
          )
        : l(
            'The President requests a private, covered, heated parking space adjacent to College Hall “for security reasons.”',
            '校长“出于安全考虑”，要求在学院楼旁设一个私人的、有顶棚、带供暖的车位。',
          ),
    choices: [
      {
        label: l('Grant it quietly', '悄悄批准'),
        detail: l('Students −5. Sustainability −2.', '学生 −5。可持续性 −2。'),
        apply: (s) => {
          fx(s, { students: -5, sustainability: -2, faculty: -2, inertia: 1 });
          return l('quietly granted the President a heated space', '悄悄给校长批了一个带供暖的车位');
        },
      },
      {
        label: l('Arrange a transit photo-op', '安排一次乘公交的摆拍'),
        detail: l('Students +4. Sustainability +2. Requires transit or shuttle.', '学生 +4。可持续性 +2。需要已有公交补贴或班车。'),
        unavailable: (s) =>
          hasCommitment(s, 'transitSubsidy') || hasCommitment(s, 'shuttle')
            ? null
            : l('Requires a transit or shuttle program', '需要先有公交补贴或班车项目'),
        apply: (s) => {
          fx(s, { students: 4, sustainability: 2, autoDependence: -1 });
          return l('arranged for the President to be photographed on the shuttle, once', '安排校长在班车上拍了一次照——就一次');
        },
      },
      {
        label: l('Install an EV charger with a plaque', '装一个带铭牌的充电桩'),
        detail: l('−$30k. Students +1.', '−$3万。学生 +1。'),
        apply: (s) => {
          fx(s, { cash: -30000, students: 1, sustainability: 1 });
          return l('installed an EV charger bearing the President’s name', '安装了一个刻着校长名字的充电桩');
        },
      },
    ],
  },
  {
    id: 'parking_app',
    title: l('There’s an App for That', '有个App能解决'),
    eras: ['reform', 'modern'],
    description: () =>
      l(
        'A startup founded by two alumni offers a parking app with dynamic pricing, real-time occupancy, and a gamified loyalty program called “Parkour.”',
        '两位校友创办的初创公司推出一款停车App：动态定价、实时车位占用，还有一个名叫“停酷”的游戏化积分计划。',
      ),
    choices: [
      {
        label: l('Adopt app with dynamic pricing', '采用App并实行动态定价'),
        detail: l(
          '−$120k. Adds Differentiated Permits. Price +10%. Faculty −4.',
          '−$12万。新增差异化停车证。价格 +10%。教职工 −4。',
        ),
        apply: (s) => {
          fx(s, { cash: -120000, priceMult: 1.1, faculty: -4, students: 1 });
          addCommitment(s, 'differentiatedPricing');
          return l('adopted a dynamic-pricing parking app', '采用了一款动态定价的停车App');
        },
      },
      {
        label: l('Adopt app without pricing changes', '采用App但不改价'),
        detail: l('−$80k. Students +2. Faculty −2 (bugs).', '−$8万。学生 +2。教职工 −2（有bug）。'),
        apply: (s) => {
          fx(s, { cash: -80000, students: 2, faculty: -2 });
          return l('adopted a parking app that mostly displays a loading spinner', '采用了一款大部分时间都在转圈加载的停车App');
        },
      },
      {
        label: l('Stick with paper hangtags', '坚持用纸质挂牌'),
        detail: l('Students −2. Inertia +1.', '学生 −2。惯性 +1。'),
        apply: (s) => {
          fx(s, { students: -2, inertia: 1 });
          return l('kept the paper hangtags', '继续使用纸质挂牌');
        },
      },
    ],
  },

  // ------------------------------------------------------------------ Modern
  {
    id: 'remote_work',
    title: l('The Remote Work Revolution', '远程办公革命'),
    eras: ['modern'],
    weight: 3,
    description: (s) =>
      l(
        `Hybrid schedules have cut weekday commuting by roughly a fifth. The ${countParcels(s, 'garage')} garages now host mostly pigeons on Mondays and Fridays, while Tuesdays remain a bloodbath.`,
        `混合办公让工作日通勤减少了大约五分之一。周一和周五，${countParcels(s, 'garage')}座停车楼里主要住着鸽子；而周二依然是一场混战。`,
      ),
    choices: [
      {
        label: l('Convert a lot to lab space', '把停车场改成实验室'),
        detail: l('Free conversion of a lot. Faculty −2. Inertia −3.', '免费改造一个停车场。教职工 −2。惯性 −3。'),
        unavailable: (s) => (countParcels(s, 'lot') > 0 ? null : NO_LOTS),
        apply: (s) => {
          fx(s, { demandModifierMult: 0.8 });
          const p = findParcel(s, ['lot'])!;
          setParcel(p, 'academic', s.year, l('the Hybrid Futures Lab', '混合未来实验室'));
          s.counters.conversionsToAcademic++;
          fx(s, { faculty: -2, inertia: -3, sustainability: 2 });
          return l('converted an underused lot into laboratory space', '把一个利用率低的停车场改成了实验室');
        },
      },
      {
        label: l('Introduce daily permits', '推出按日停车证'),
        detail: l('Adds Differentiated Permits. Students +3.', '新增差异化停车证。学生 +3。'),
        apply: (s) => {
          fx(s, { demandModifierMult: 0.8, students: 3, faculty: 1 });
          addCommitment(s, 'differentiatedPricing');
          return l('introduced daily and flexible permits', '推出了按日和弹性停车证');
        },
      },
      {
        label: l('Keep everything “just in case”', '全部保留“以防万一”'),
        detail: l('Faculty +2. Inertia +3.', '教职工 +2。惯性 +3。'),
        apply: (s) => {
          fx(s, { demandModifierMult: 0.82, faculty: 2, inertia: 3 });
          return l('kept every space, just in case', '以防万一，保留了每一个车位');
        },
      },
    ],
  },
  {
    id: 'av_consultant',
    title: l('The Autonomous Vehicle Consultant', '自动驾驶顾问'),
    eras: ['reform', 'modern'],
    description: () =>
      l(
        'A consultant presents 140 slides proving that autonomous vehicles will eliminate parking demand by 2030. The same firm produced a 2015 report proving they would eliminate it by 2020.',
        '一位顾问用140页幻灯片证明，自动驾驶汽车将在2030年前消灭停车需求。同一家公司在2015年也出过一份报告，证明这件事会在2020年前发生。',
      ),
    choices: [
      {
        label: l('Commission an “AV-ready” garage study', '委托开展“自动驾驶就绪”停车楼研究'),
        detail: l('−$120k. Inertia −1.', '−$12万。惯性 −1。'),
        apply: (s) => {
          fx(s, { cash: -120000, inertia: -1 });
          return l('commissioned an autonomous-vehicle readiness study', '委托开展了自动驾驶就绪研究');
        },
      },
      {
        label: l('Ask for the 2015 refund', '要求退还2015年的咨询费'),
        detail: l('Faculty +1. Students +1.', '教职工 +1。学生 +1。'),
        apply: (s) => {
          fx(s, { faculty: 1, students: 1 });
          return l('requested a refund for the previous forecast', '要求退还上一次预测的费用');
        },
      },
    ],
  },
  {
    id: 'endowment_tax',
    title: l('The Structural Budget Gap', '结构性预算缺口'),
    eras: ['modern'],
    description: () =>
      l(
        'Rising costs and new federal taxes have opened a structural gap. The CFO asks every unit to “find efficiencies,” and looks meaningfully at the Parking Department.',
        '成本上升和新的联邦税收造成了结构性缺口。首席财务官要求每个部门“挖掘效率”，并意味深长地看向停车部门。',
      ),
    choices: [
      {
        label: l('Raise permit prices 15%', '停车证涨价15%'),
        detail: l('Price +15%. Faculty −5.', '价格 +15%。教职工 −5。'),
        apply: (s) => {
          fx(s, { priceMult: 1.15, faculty: -5, sustainability: 1 });
          return l('raised permit prices to close the gap', '提高停车证价格来填补缺口');
        },
      },
      {
        label: l('Defer garage maintenance', '推迟停车楼维护'),
        detail: l('+$300k now. All garages −30 condition.', '立即+$30万。所有停车楼状况 −30。'),
        apply: (s) => {
          for (const p of s.parcels) if (p.type === 'garage') p.condition = Math.max(0, p.condition - 30);
          fx(s, { cash: 300000 });
          return l(
            'deferred garage maintenance, a loan from the future at excellent rates',
            '推迟了停车楼维护——向未来借了一笔利率极佳的贷款',
          );
        },
      },
      {
        label: l('Contribute from reserves', '从储备金中出资'),
        detail: l('−$500k. Faculty +2.', '−$50万。教职工 +2。'),
        apply: (s) => {
          fx(s, { cash: -500000, faculty: 2 });
          return l('contributed its reserves to the central budget', '把储备金贡献给了学校中央预算');
        },
      },
    ],
  },
];

export function getEvent(id: string): EventDef | undefined {
  return EVENTS.find((e) => e.id === id);
}
