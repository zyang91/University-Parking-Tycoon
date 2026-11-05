import { eraFor } from './eras';
import { hashPick } from './rng';
import { academicShortfall } from './simulation';
import { capacity, countParcels } from './state';
import { l } from './text';
import type { GameState, L } from './types';

export interface Briefing {
  year: number;
  eraName: L;
  eraTheme: L;
  president: L;
  message: L;
  crisis: { title: L; text: L; severity: 'high' | 'medium' | 'low' };
}

const MESSAGES: Record<string, L[]> = {
  postwar: [
    l(
      'The war is over, the GI Bill is generous, and every veteran on the faculty appears to have purchased a Packard. Please find somewhere to put them.',
      '战争结束了，《退伍军人法案》很慷慨，教职工里的每位老兵似乎都买了一辆帕卡德。请给它们找个地方停。',
    ),
    l(
      'Our founders built this campus for scholars on foot. I am told the scholars now arrive in sedans. Adapt accordingly, but tastefully.',
      '我们的创校者为步行的学者建造了这座校园。我听说学者们现在都开轿车来。请相应调整，但要有品位。',
    ),
    l(
      'The Trustees have asked whether the quadrangle is “strictly necessary.” I have asked them to wait for your recommendation.',
      '校董们问我，中央草坪是否“绝对必要”。我请他们等你的建议。',
    ),
  ],
  expansion: [
    l(
      'Enrollment is growing, faculty are driving, and the Board of Trustees has discovered that asphalt is cheaper than institutional compromise.',
      '招生在增长，教职工在开车，而校董会发现：沥青比机构内部的妥协便宜。',
    ),
    l(
      'The city calls it renewal. The neighbors call it something else. The Board calls it an opportunity. I call it your problem.',
      '市政府称之为更新，邻居们另有说法，校董会称之为机遇。我称之为你的问题。',
    ),
    l(
      'We are building a modern university for the motor age. Some have asked whether the university should be for the motor age. Those people do not sit on the Board.',
      '我们正在为汽车时代建设一所现代大学。有人问，大学是否应该为汽车时代服务。这些人都不在校董会里。',
    ),
  ],
  institutional: [
    l(
      'Parking is no longer a problem; it is a department. Departments, as you know, are forever.',
      '停车已经不再是一个问题，而是一个部门。而部门，你知道的，是永恒的。',
    ),
    l(
      'The faculty handbook now has a chapter on parking. It is longer than the chapter on tenure.',
      '教职工手册里现在有一章专讲停车，比讲终身教职的那一章还长。',
    ),
    l(
      'Our peer institutions have commissioned master plans. I would like ours to be thicker.',
      '兄弟院校都委托编制了总体规划。我希望我们的更厚一些。',
    ),
  ],
  reform: [
    l(
      'We have pledged to be a leader in sustainability. We have also pledged that nobody will lose their parking space. Please reconcile these by Thursday.',
      '我们承诺成为可持续发展的引领者，也承诺不会让任何人失去车位。请在周四之前把这两件事协调好。',
    ),
    l(
      'Our students want bike lanes, our faculty want garages, and our donors want their names on both.',
      '学生要自行车道，教职工要停车楼，捐赠人要把名字刻在两者上。',
    ),
    l(
      'The Transportation Demand Management plan has been well received by everyone who has not read it.',
      '《交通需求管理规划》受到了所有没读过它的人的一致好评。',
    ),
  ],
  modern: [
    l(
      'Half the staff works from home on Mondays, the garages are paid for until 2040, and the climate pledge is due in 2030. Good luck.',
      '周一有一半员工在家办公，停车楼的贷款要还到2040年，气候承诺的期限是2030年。祝你好运。',
    ),
    l(
      'This is the final review period. History will judge us. Fortunately, history is written by a committee.',
      '这是最后一个评估期。历史将评判我们。幸运的是，历史是由委员会撰写的。',
    ),
  ],
};

export function getBriefing(s: GameState): Briefing {
  const era = eraFor(s.year);
  const cap = capacity(s);
  const shortage = s.demand > 0 ? (s.demand - cap) / s.demand : 0;
  const vacancy = cap > 0 ? (cap - s.demand) / cap : 0;
  const worstGarage = s.parcels.filter((p) => p.type === 'garage').reduce((m, p) => Math.min(m, p.condition), 100);
  let crisis: Briefing['crisis'];
  if (s.cash < 0) {
    const debtK = Math.round(-s.cash / 1000);
    const debtW = Math.round(-s.cash / 10000);
    crisis = {
      title: l('Budget Deficit', '预算赤字'),
      text: l(
        `The department owes $${debtK}k and pays 4% interest. The CFO has begun attending your meetings.`,
        `部门负债$${debtW}万，需支付4%的利息。首席财务官已经开始列席你的会议。`,
      ),
      severity: 'high',
    };
  } else if (shortage > 0.15) {
    const gap = Math.round(s.demand - cap);
    crisis = {
      title: l('Parking Shortage', '停车短缺'),
      text: l(
        `Roughly ${gap} more cars than spaces. Commuters circle the block; neighbors circle the wagons.`,
        `车辆比车位多出约${gap}辆。通勤者绕着街区找车位，邻居们则围成一圈严阵以待。`,
      ),
      severity: 'high',
    };
  } else if (s.ind.neighborhood < 35) {
    crisis = {
      title: l('Town–Gown Conflict', '校社冲突'),
      text: l('Community meetings now require a larger venue and a mediator.', '社区会议现在需要更大的场地和一位调解员。'),
      severity: 'high',
    };
  } else if (worstGarage < 40 && countParcels(s, 'garage') > 0) {
    crisis = {
      title: l('Crumbling Concrete', '混凝土剥落'),
      text: l(
        'A garage is shedding concrete. Its capacity is reduced and its maintenance doubled.',
        '一座停车楼正在掉混凝土块。它的容量下降，维护费翻倍。',
      ),
      severity: 'medium',
    };
  } else if (academicShortfall(s) > 0) {
    crisis = {
      title: l('Academic Space Shortage', '教学空间不足'),
      text: l(
        'Departments need buildings, and the only flat land left is covered in cars.',
        '各院系需要楼，而仅剩的平地上停满了车。',
      ),
      severity: 'medium',
    };
  } else if (vacancy > 0.2) {
    const v = Math.round(vacancy * 100);
    crisis = {
      title: l('Empty Spaces', '车位空置'),
      text: l(
        `${v}% of spaces sit empty, maintained at considerable expense for cars that may never come.`,
        `${v}%的车位空着，花大价钱为可能永远不会来的车维护着。`,
      ),
      severity: 'medium',
    };
  } else if (s.ind.faculty < 35) {
    crisis = {
      title: l('Faculty Unrest', '教职工不满'),
      text: l(
        'The Faculty Senate has scheduled an emergency meeting about the previous emergency meeting.',
        '教授评议会召开紧急会议，讨论上一次紧急会议。',
      ),
      severity: 'medium',
    };
  } else if (s.ind.sustainability < 30 && s.year >= 1990) {
    crisis = {
      title: l('Climate Pressure', '气候压力'),
      text: l(
        'Student climate activists have staged a die-in across three parking stalls.',
        '学生气候活动人士横躺在三个车位上，上演了一场“装死抗议”。',
      ),
      severity: 'medium',
    };
  } else if (shortage > 0.05) {
    crisis = {
      title: l('Tight Parking', '车位紧张'),
      text: l(
        'Lots fill by 9:15 a.m. Latecomers have begun to blame the curriculum.',
        '停车场上午9:15就满了。迟到的人开始怪罪课程安排。',
      ),
      severity: 'low',
    };
  } else {
    crisis = {
      title: l('Relative Calm', '相对平静'),
      text: l('Nothing is on fire. The Board finds this suspicious.', '一切风平浪静。校董会觉得这很可疑。'),
      severity: 'low',
    };
  }
  return {
    year: s.year,
    eraName: era.name,
    eraTheme: era.theme,
    president: era.president,
    message: hashPick(MESSAGES[era.id], `${s.seed}-${s.year}-msg`),
    crisis,
  };
}
