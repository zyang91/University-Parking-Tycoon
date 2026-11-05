import { useI18n } from '../i18n/I18nContext';

function English() {
  return (
    <>
      <h2>How to Play</h2>
      <p>
        You are the Vice President for Parking, Transportation, and Strategic Complaints at Westbridge University.
        Starting in 1948, each turn covers a five-year review period (the last one ends in 2025). Your goal is not to
        maximize parking — it is to leave behind a coherent institution. Every parking solution creates another parking problem.
      </p>
      <h3>Each turn</h3>
      <ol>
        <li><strong>Briefing.</strong> Read the President’s message and the current crisis.</li>
        <li><strong>Policy decisions.</strong> Choose up to <strong>3 actions</strong> across Pricing, Infrastructure, Demand Management and Administration. One pricing decision per turn. Choosing nothing is allowed (and popular).</li>
        <li><strong>Event.</strong> A memo arrives. Pick one of two or three responses (keys <kbd>1</kbd>–<kbd>3</kbd>).</li>
        <li><strong>Review.</strong> See the five-year results: demand, finances, stakeholders, and what changed.</li>
        <li><strong>History.</strong> A record of your decisions is added to the Institutional History.</li>
      </ol>
      <h3>Key mechanics</h3>
      <ul>
        <li><strong>Demand</strong> grows with enrollment and automobile dependence, falls with price, transit quality and TDM programs. Spare capacity slowly induces more demand.</li>
        <li><strong>Shortages</strong> push cars onto neighborhood streets and anger faculty. <strong>Surpluses</strong> cost money and breed car dependence.</li>
        <li><strong>Land</strong> is finite: 20 parcels. The university needs more academic buildings as it grows; parking on vacant land pushes buildings onto greens and eventually into shortfall.</li>
        <li><strong>Commitments</strong> (programs, privileges, leases) have recurring costs and become harder to end the longer they last. Garages carry 20 years of bond payments and decay without renovation.</li>
        <li><strong>Institutional inertia</strong> rises with car infrastructure and entitlements, making conversions, price increases and revocations costlier. Reform is always possible — just not cheap.</li>
        <li><strong>Stakeholder satisfaction</strong> drifts toward what current conditions justify. Committees and gestures give temporary bumps that fade.</li>
        <li><strong>Cash</strong> can dip to −$1M on credit at 4% interest. Construction spending is capital, not operating revenue.</li>
      </ul>
      <h3>Endings</h3>
      <p>In 2025 you receive an administrative evaluation and one of several endings — determined by what you actually built, priced, funded and promised, not by chance.</p>
      <h3>Saving and settings</h3>
      <p>
        The game autosaves to this browser after every step. Use <em>Continue</em> on the title screen to resume. The same seed
        and decisions always produce the same history. Open <em>Settings</em> (gear icon) to switch between English and Chinese at any time.
      </p>
    </>
  );
}

function Chinese() {
  return (
    <>
      <h2>玩法说明</h2>
      <p>
        你是西桥大学负责停车、交通与战略性投诉的副校长。游戏从1948年开始，每回合为一个五年评估期（最后一个评估期截至2025年）。
        你的目标不是让车位最大化，而是留下一所前后一致、运转有序的大学。每一个停车解决方案，都会制造出另一个停车问题。
      </p>
      <h3>每个回合</h3>
      <ol>
        <li><strong>简报。</strong>阅读校长的讲话和当前危机。</li>
        <li><strong>政策决策。</strong>在定价、基础设施、需求管理和行政管理四类中，最多选择<strong>3项行动</strong>。每回合只能做一项定价决策。什么都不选也可以（而且很受欢迎）。</li>
        <li><strong>事件。</strong>一份备忘录送到。从两到三个应对方案中选择一个（按键 <kbd>1</kbd>–<kbd>3</kbd>）。</li>
        <li><strong>评估。</strong>查看五年结果：需求、财务、利益相关方，以及发生了哪些变化。</li>
        <li><strong>历史。</strong>你的决策会被记入“校史档案”。</li>
      </ol>
      <h3>核心机制</h3>
      <ul>
        <li><strong>需求</strong>随招生规模和汽车依赖度上升，随价格、公交质量和需求管理项目下降。闲置容量会慢慢诱发更多需求。</li>
        <li><strong>车位短缺</strong>会把车挤到社区街道上，并激怒教职工。<strong>车位过剩</strong>既花钱，又助长汽车依赖。</li>
        <li><strong>土地</strong>是有限的：共20块。大学扩张需要更多教学楼；在空地上停车，会迫使新楼建到绿地上，最终出现用地缺口。</li>
        <li><strong>承诺</strong>（项目、特权、租约）有持续性成本，运行得越久越难取消。停车楼背负20年的债券还款，不翻修就会老化。</li>
        <li><strong>制度惯性</strong>随汽车基础设施和特权福利上升，让改造、涨价和取消福利的代价更高。改革永远可能——只是不便宜。</li>
        <li><strong>利益相关方满意度</strong>会逐步趋向当前条件所决定的水平。委员会和姿态性举措只能带来会逐渐消退的短期提升。</li>
        <li><strong>现金</strong>可以以4%的利率透支到−100万美元。建设支出属于资本性支出，不是运营收入。</li>
      </ul>
      <h3>结局</h3>
      <p>2025年，你将收到一份行政评估和多种结局之一——结局取决于你实际建了什么、定了什么价、资助了什么、承诺了什么，而不是运气。</p>
      <h3>存档与设置</h3>
      <p>
        游戏每一步都会自动保存在本浏览器中。在标题画面点击<em>继续游戏</em>即可恢复。相同的种子和决策总会产生相同的历史。
        随时点击<em>设置</em>（齿轮图标）即可在中文和英文之间切换。
      </p>
    </>
  );
}

export default function HowToPlay() {
  const { lang } = useI18n();
  return (
    <div className="page">
      <div className="page-inner prose">{lang === 'zh' ? <Chinese /> : <English />}</div>
    </div>
  );
}
