export default function HowToPlay() {
  return (
    <div className="page">
      <div className="page-inner prose">
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
        <h3>Saving</h3>
        <p>The game autosaves to this browser after every step. Use <em>Continue</em> on the title screen to resume. The same seed and decisions always produce the same history.</p>
      </div>
    </div>
  );
}
