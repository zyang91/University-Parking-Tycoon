import { TDM_COMMITMENTS } from './policies';
import { capacity, countParcels, hasCommitment } from './state';
import { l, money } from './text';
import type { Ending, GameState, L } from './types';

export const ENDINGS: Record<string, Omit<Ending, 'explanation'>> = {
  receivership: {
    id: 'receivership',
    title: l('The Receivership', '财务接管'),
    summary: l(
      'The Parking Department is now administered by the Office of the Comptroller, who has also taken your parking space.',
      '停车部门现由审计长办公室接管——审计长顺便也接管了你的车位。',
    ),
  },
  committee: {
    id: 'committee',
    title: l('The Committee Enthusiast', '委员会狂热者'),
    summary: l(
      'After eighty years and an uncountable number of committees, the institution has achieved procedural excellence.',
      '历经八十年和数不清的委员会，这所大学终于在程序上臻于完美。',
    ),
  },
  asphalt: {
    id: 'asphalt',
    title: l('The Asphalt Empire', '沥青帝国'),
    summary: l(
      'You successfully transformed an educational institution into a parking operator with an attached university.',
      '你成功地把一所教育机构改造成了一家附设大学的停车场运营商。',
    ),
  },
  transit: {
    id: 'transit',
    title: l('The Transit Utopia', '公交乌托邦'),
    summary: l(
      'The campus has become less automobile-dependent. Several senior professors have refused to acknowledge this achievement.',
      '校园对汽车的依赖降低了。几位资深教授拒绝承认这一成就。',
    ),
  },
  urbanist: {
    id: 'urbanist',
    title: l('The Accidental Urbanist', '意外的城市主义者'),
    summary: l(
      'Your parking restrictions unexpectedly encouraged a more walkable and transit-oriented university.',
      '你的停车限制意外地造就了一所更适合步行、更以公交为导向的大学。',
    ),
  },
  fiscal: {
    id: 'fiscal',
    title: l('The Fiscal Administrator', '财务管理大师'),
    summary: l(
      'Parking revenues are excellent. Nobody remembers why the university originally created a parking department.',
      '停车收入非常可观。已经没人记得学校当初为什么要设立停车部门。',
    ),
  },
  townGown: {
    id: 'townGown',
    title: l('The Town–Gown Cold War', '校社冷战'),
    summary: l(
      'The neighborhood association has a longer institutional memory than the university, and it remembers you specifically.',
      '社区协会的机构记忆比大学还长，而且它特别记得你。',
    ),
  },
  perfect: {
    id: 'perfect',
    title: l('The Perfect Administrator', '完美管理者'),
    summary: l(
      'You solved almost nothing, offended almost nobody, and received an award for outstanding institutional leadership.',
      '你几乎什么都没解决，也几乎没得罪任何人，并因此荣获“杰出机构领导奖”。',
    ),
  },
  muddler: {
    id: 'muddler',
    title: l('The Muddler Through', '得过且过者'),
    summary: l(
      'Eighty years of incremental decisions produced a campus no one designed and everyone complains about. In other words: a real university.',
      '八十年的渐进式决策造就了一座没人设计过、人人都抱怨的校园。换句话说：一所真正的大学。',
    ),
  },
};

export interface Grade {
  label: L;
  grade: string;
  score: number;
  note: L;
}

export interface Evaluation {
  ending: Ending;
  grades: Grade[];
  overall: number;
  overallGrade: string;
  influences: L[];
}

function grade(score: number): string {
  if (score >= 85) return 'A';
  if (score >= 72) return 'B';
  if (score >= 58) return 'C';
  if (score >= 45) return 'D';
  return 'F';
}

/** Classify the final state into an ending. Conditions are checked in priority order. */
export function classifyEnding(s: GameState): Ending {
  const garages = countParcels(s, 'garage');
  const lots = countParcels(s, 'lot');
  const tdm = TDM_COMMITMENTS.filter((id) => hasCommitment(s, id)).length;
  const { faculty, students, neighborhood, sustainability, autoDependence } = s.ind;
  const a = Math.round(autoDependence);
  const pick = (id: keyof typeof ENDINGS, explanation: L): Ending => ({ ...ENDINGS[id], explanation });

  if (s.cash < -750_000) {
    return pick('receivership', l(`Cash reserves ended at ${money(s.cash, 'en')}.`, `现金储备最终为${money(s.cash, 'zh')}。`));
  }
  if (s.counters.committees >= 6) {
    const n = s.counters.committees;
    return pick('committee', l(`You convened ${n} committees and related bodies.`, `你一共召集了${n}个委员会及类似机构。`));
  }
  if ((garages >= 3 || garages + lots >= 7) && autoDependence >= 60) {
    return pick(
      'asphalt',
      l(
        `${garages} garages and ${lots} surface lots; automobile dependence ${a}/100.`,
        `${garages}座停车楼和${lots}个地面停车场；汽车依赖度${a}/100。`,
      ),
    );
  }
  if (autoDependence <= 35 && sustainability >= 65 && tdm >= 3) {
    return pick(
      'transit',
      l(
        `${tdm} alternative-transportation programs; automobile dependence fell to ${a}/100.`,
        `${tdm}个替代交通项目；汽车依赖度降至${a}/100。`,
      ),
    );
  }
  const restricted = s.price >= 140 || s.counters.conversionsToAcademic + s.counters.conversionsToGreen >= 1;
  const shortage = s.demand > 0 ? Math.max(0, s.demand - capacity(s)) / s.demand : 0;
  if (autoDependence <= 42 && tdm <= 2 && garages <= 1 && restricted && shortage <= 0.35) {
    return pick(
      'urbanist',
      l(
        `Limited supply and few programs, yet automobile dependence ended at ${a}/100.`,
        `车位供给有限、项目也不多，汽车依赖度却最终降到了${a}/100。`,
      ),
    );
  }
  if (s.cash >= 6_000_000 || (s.lastNetRevenue >= 400_000 && s.price >= 200)) {
    return pick(
      'fiscal',
      l(
        `Reserves of ${money(s.cash, 'en')} and annual net revenue of ${money(s.lastNetRevenue, 'en')}.`,
        `储备金${money(s.cash, 'zh')}，年净收入${money(s.lastNetRevenue, 'zh')}。`,
      ),
    );
  }
  if (neighborhood < 30) {
    const n = Math.round(neighborhood);
    return pick('townGown', l(`Neighborhood relations ended at ${n}/100.`, `邻里关系最终为${n}/100。`));
  }
  if ([faculty, students, neighborhood].every((v) => v >= 48 && v <= 80) && s.cash >= 0) {
    return pick(
      'perfect',
      l('Every stakeholder ended between mildly content and moderately annoyed.', '每一方利益相关者最终都处于“略感满意”和“有点恼火”之间。'),
    );
  }
  return pick('muddler', l('No single strategy dominated your tenure.', '你的任期内没有哪一种策略占据主导。'));
}

export function evaluate(s: GameState): Evaluation {
  const ending = classifyEnding(s);
  const cap = capacity(s);
  const shortage = s.demand > 0 ? Math.max(0, s.demand - cap) / s.demand : 0;
  const vacancy = cap > 0 ? Math.max(0, cap - s.demand) / cap : 0;
  const finScore = Math.max(0, Math.min(100, 50 + s.cash / 100_000 + s.lastNetRevenue / 10_000));
  const fitScore = Math.max(0, 100 - shortage * 200 - vacancy * 120);
  const politics = (s.ind.faculty + s.ind.students + s.ind.neighborhood) / 3;
  const academic = s.counters.academicShortfallTurns;
  const landScore = Math.max(0, 100 - academic * 12);
  const r = Math.round;
  const raw: { label: L; score: number; note: L }[] = [
    {
      label: l('Financial stewardship', '财务管理'),
      score: finScore,
      note: l(`Reserves ${money(s.cash, 'en')}`, `储备金${money(s.cash, 'zh')}`),
    },
    {
      label: l('Supply–demand fit', '供需匹配'),
      score: fitScore,
      note: l(`${r(shortage * 100)}% short / ${r(vacancy * 100)}% vacant`, `短缺${r(shortage * 100)}% / 空置${r(vacancy * 100)}%`),
    },
    {
      label: l('Stakeholder relations', '利益相关方关系'),
      score: politics,
      note: l(
        `Faculty ${r(s.ind.faculty)}, students ${r(s.ind.students)}, neighbors ${r(s.ind.neighborhood)}`,
        `教职工${r(s.ind.faculty)}，学生${r(s.ind.students)}，邻里${r(s.ind.neighborhood)}`,
      ),
    },
    {
      label: l('Sustainability', '可持续性'),
      score: s.ind.sustainability,
      note: l(`Automobile dependence ${r(s.ind.autoDependence)}`, `汽车依赖度${r(s.ind.autoDependence)}`),
    },
    {
      label: l('Land for the academic mission', '教学用地保障'),
      score: landScore,
      note: l(
        `${academic} turn${academic === 1 ? '' : 's'} with an academic space shortfall`,
        `${academic}个回合出现教学用地缺口`,
      ),
    },
  ];
  const grades: Grade[] = raw.map((g) => ({ ...g, score: r(g.score), grade: grade(g.score) }));
  const overall = r(grades.reduce((acc, g) => acc + g.score, 0) / grades.length);
  return { ending, grades, overall, overallGrade: grade(overall), influences: influences(s) };
}

/** Narrative account of how early decisions shaped late outcomes. */
export function influences(s: GameState): L[] {
  const out: L[] = [];
  const firstGarage = s.parcels.filter((p) => p.type === 'garage').sort((a, b) => a.since - b.since)[0];
  if (firstGarage && firstGarage.since < 1980) {
    const name = firstGarage.name ?? l('first garage', '第一座停车楼');
    out.push(
      l(
        `The ${name.en} (${firstGarage.since}) set expectations of on-campus parking that later administrations inherited along with its maintenance bills.`,
        `${name.zh}（${firstGarage.since}年）确立了“校内就该有车位”的预期，后来的管理者连同它的维护账单一并继承了下来。`,
      ),
    );
  }
  if (s.flags.annexLot) {
    out.push(
      l(
        'Accepting cleared rowhouse land in the urban-renewal era left a lasting deficit in neighborhood trust.',
        '在城市更新时代接受清拆的联排住宅用地，给社区信任留下了长久的亏空。',
      ),
    );
  }
  const priv = s.commitments.find((x) => x.id === 'facultyPrivileges');
  if (priv) {
    out.push(
      l(
        `Free faculty parking, granted in ${priv.since}, was never revoked; by 2025 it was simply "how things are."`,
        `${priv.since}年授予的教职工免费停车从未被取消；到2025年，它已经成了“向来如此”。`,
      ),
    );
  } else if (s.history.some((h) => h.actions.includes('end_facultyPrivileges'))) {
    out.push(
      l(
        'Revoking faculty privileges proved costly, but it opened the way to pricing reform.',
        '取消教职工特权代价高昂，但为定价改革打开了大门。',
      ),
    );
  }
  const transit = s.commitments.find((x) => x.id === 'transitSubsidy');
  if (transit && transit.since < 1990) {
    out.push(
      l(
        `The transit subsidy begun in ${transit.since} matured into an institutional habit, lowering parking demand for decades.`,
        `始于${transit.since}年的公交补贴逐渐成为一种制度习惯，在几十年间持续压低停车需求。`,
      ),
    );
  }
  const conv = s.counters.conversionsToAcademic + s.counters.conversionsToGreen;
  if (conv > 0) {
    out.push(
      l(
        `${conv} parking ${conv === 1 ? 'facility was' : 'facilities were'} converted to other uses; conversions grow costlier as inertia accumulates.`,
        `共有${conv}处停车设施被改作他用；随着惯性累积，改造的代价越来越高。`,
      ),
    );
  }
  if (s.counters.academicShortfallTurns > 0) {
    const n = s.counters.academicShortfallTurns;
    out.push(
      l(
        `Parking occupied land the academic mission later needed: ${n} review periods ended with an academic space shortfall.`,
        `停车占用了日后教学所需的土地：共有${n}个评估期以教学用地缺口告终。`,
      ),
    );
  }
  const inertia = Math.round(s.ind.inertia);
  if (inertia >= 60) {
    out.push(
      l(
        `Institutional inertia ended at ${inertia}/100: reversing course had become expensive.`,
        `制度惯性最终达到${inertia}/100：改弦更张已经变得非常昂贵。`,
      ),
    );
  }
  if (inertia <= 20) {
    out.push(
      l(
        'Inertia stayed low, leaving future administrations unusually free to change direction.',
        '惯性始终较低，让未来的管理者拥有罕见的转向自由。',
      ),
    );
  }
  if (out.length === 0) {
    out.push(
      l(
        'Early decisions were modest, and their influence diffuse — which is its own kind of legacy.',
        '早期决策都很温和，影响也很分散——这本身也是一种遗产。',
      ),
    );
  }
  return out;
}
