# University Parking Tycoon

*Eighty Years of Parking Problems. Zero Satisfied Stakeholders.*

A satirical, turn-based campus planning simulation. You are the Vice President for Parking, Transportation, and Strategic Complaints at **Westbridge University** (fictional), managing parking policy from 1948 to 2025. Every parking solution creates another parking problem.

It runs entirely in the browser: no backend, no accounts, no external services. Saves go to `localStorage`.

## Quick start

```bash
npm install
npm run dev        # local development server
npm test           # simulation engine test suite (Vitest)
npm run build      # type-check + static production build in dist/
npm run preview    # serve the built site locally
npm run balance    # autoplay archetypal strategies and print their endings
```

## Deployment

The build is a static site with relative asset paths (`base: './'`), so `dist/` works at a domain root or a sub-path.

- **GitHub Pages:** `.github/workflows/deploy.yml` tests, builds, and deploys on pushes to `main`. In the repository settings, set *Pages → Source* to *GitHub Actions*.
- **Cloudflare Pages:** build command `npm run build`, output directory `dist`.

## How a turn works

1. **Presidential briefing**: the year, era, a satirical presidential message, and the main crisis.
2. **Policy decisions**: up to 3 actions (one pricing decision per turn) across Pricing, Infrastructure, Demand Management, and Administration. 20 policies plus reversals ("End program", "Revoke privileges").
3. **Random event**: one of 33 era-specific, condition-aware events with 2–3 responses.
4. **Simulation update**: five years of demand, finances, politics, path dependence, garage aging and debt.
5. **Historical record**: an auto-generated entry appended to the institutional history.

The game ends in 2025 (16 turns; the last is 2023–2025) with an ending, a graded evaluation, a timeline, and an account of how early decisions shaped the outcome. Endings include *The Asphalt Empire*, *The Transit Utopia*, *The Fiscal Administrator*, *The Committee Enthusiast*, *The Accidental Urbanist*, *The Perfect Administrator*, *The Town–Gown Cold War*, *The Receivership*, and *The Muddler Through*.

## Simulation assumptions

All values are illustrative gameplay parameters in constant game dollars, not historical data.

- **Land**: 20 parcels × 5 units = 100 units. Lots hold 250 spaces, garages 800. The university needs `round(8 · popIndex^0.45)` academic parcels; growth takes vacant land, then greens, then becomes a shortfall.
- **Demand**: `K · popIndex · carShare(a) · priceFactor · (1 − alt) · demandModifier + induced`
  - `carShare(a) = 0.25 + 0.6·a/100`, where `a` is automobile dependence.
  - `priceFactor = x·e^{e} + (1−x)·e^{−e(p−100)/100}`, with elasticity `e = 0.55 − 0.3·a/100` (+0.15 with differentiated pricing). `x` is the exempt share (free faculty or administrator parking). Demand always falls as price rises.
  - `alt` covers regional transit quality and TDM programs, whose effect grows up to 60% as they mature. It is bounded to [−0.2, 0.6].
  - Induced demand moves 40% per turn toward 35% of spare capacity, so it is gradual rather than one-for-one.
  - `K` is calibrated so 1948 demand is 620.
- **Finance (annual)**: revenue = occupied paid spaces × price × compliance (88%, or 100% with enforcement). Costs are operations ($18/space), maintenance (lots $6k; garages $28k, doubled below 40% condition), program costs, debt service, and 4% interest on negative reserves. Construction is a capital cost charged to reserves; garages are partly bond-financed over 20 years.
- **Politics**: each stakeholder index drifts 35% per turn toward a target set by current conditions (shortage, price, spillover, programs, green space). One-time shocks from actions and committees fade.
- **Path dependence**: inertia rises with garages, lots, and entitlements, and decays slowly (faster with TDM). It scales the cost and backlash of conversions, price increases, and revocations. Cancelling programs costs more the longer they have run. Automobile dependence rises with abundant cheap parking and falls with scarcity, pricing, and alternatives.
- **Randomness**: one seeded PRNG (mulberry32) stored in the game state. The same seed and the same decisions reproduce the same game exactly, including after save/load.

## Code layout

```
src/engine/       Pure TypeScript simulation (no React)
  types.ts        State, policy, event, and report types
  eras.ts         Historical periods and era parameters
  state.ts        Initial state, constants, helpers (capacity, effects)
  policies.ts     Policy definitions and availability rules
  events.ts       33 satirical events
  simulation.ts   Turn engine: submitPolicies → resolveEvent → nextTurn
  briefing.ts     Presidential briefings and crisis detection
  endings.ts      Ending classification and evaluation
  save.ts         Versioned localStorage save/load with validation
  rng.ts          Seeded PRNG
src/content/      Planning concepts and historical-source registry
src/components/   React UI (map, desk, dashboard, views)
tests/            Vitest suite for the engine
scripts/          Balance autoplay script
```

## Historical content policy

The **Concepts** page labels every item as one of: *verified historical reference*, *historical reference (verification pending)*, *general planning concept*, or *fictional simulation*. Westbridge University and all in-game events are fictional and do not describe the University of Pennsylvania or any real institution.

The University of Pennsylvania's 1948 campus plan (the "Martin Plan") is listed as **verification pending**, with a summary and no quotations. To add verified archival material, append entries to `HISTORICAL_SOURCES` in `src/content/concepts.ts` with `status: 'verified'`, a `citation`, and `excerpts`. The engine does not need to change.

## Known limitations

- Designed desktop-first. Below 1100px the columns stack and stay usable, but it is not tuned for phones.
- Build actions place structures automatically on the first eligible parcel; players do not choose sites.
- The modern era (2020–2025) has a single, shortened turn.
- Balance has been checked with scripted strategies (`npm run balance`), not extensive human playtesting.
