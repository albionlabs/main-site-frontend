# Albion Issuance Platform — Design Context Brief

*Input for a first-principles UX/UI rethink of the Albion issuance site (`platform.albionlabs.org`, this repository). Everything below describes what exists today (July 2026). Treat the current UI as evidence of what the product must do, not as a template to preserve.*

---

## 1. The Albion ecosystem — three sites, one funnel

Albion turns real oil & gas royalty streams into on-chain income tokens. Three products cover the lifecycle, and **this redesign is for the middle one**:

1. **Albion Intelligence** (`albion.intelligence` — origination, top of funnel). A professional "origination desk" for analysts: screeners over 1.9M wells / 21k fields / 38k operators (the *Survey* for North American onshore, the *Atlas* for global fields), NPV valuation workspaces, a Kanban dealflow board, an AI assistant ("Ask Scout"). This is where future tokens are found and underwritten. Dark, dense, Bloomberg-adjacent.
2. **Albion Issuance** (this repo — primary market). Where investors learn what a royalty token is, buy newly released tokens with USDC on Base, track their holdings, and claim monthly USDC payouts. The most consumer-facing surface in the family: it must onboard people who have never held a royalty *or* used a wallet.
3. **Albion DEX** (`albion.dex` — secondary market). Trading venue for the same tokens: orderbook, market/limit orders, price charts, decline curves, live WTI ticker, auctions, portfolio. Ships a **locked, CI-enforced v2.0 design system** (see §6) and is the most designed artifact in the family.

Users will cross these boundaries — buy on Issuance, trade on DEX; an asset's diligence story originates in Intelligence. Today the Issuance site looks like a different company (light, black/white/cyan, sharp-cornered) while the other two share a coherent dark navy + gold language. **A first-principles redesign should resolve this: the goal is one recognizable Albion, with the Issuance site as its approachable front door.**

## 2. What the issuance product is

An investor buys a token (e.g. `ALB-WR1-R1` — "Wressle-1 4.5% Royalty Stream, Release 1") with USDC on Base. Each month the underlying field's actual revenue is distributed pro-rata; holders claim USDC on the site. These are income instruments backed by legal royalty agreements, with finite lives that end as the field depletes — not speculative crypto. The DEX's headline captures the family's pitch: *"Own a share of the barrels, not the operator."*

**Business reality that should shape design decisions:**

- Early pilot stage: **one live asset** (Wressle-1, onshore UK, operated by Egdon Resources) with two token releases; more planned. The UI is architected for a marketplace of many assets, but today's catalog is nearly empty — "browse marketplace" currently over-promises.
- Low minimum (~$1 messaging; default purchase input $5,000), aimed at crypto-native retail plus institutionally-minded investors.
- **Trust is the scarcest resource.** Users put real money into an unfamiliar asset class, an unfamiliar company, and crypto rails. The genuine differentiator is radical transparency: on-chain payouts, published production and revenue data, legal documents. Design should make transparency *legible*, not just available. (The sister sites already treat provenance as a first-class UI concept — see §6.)
- Regulatory posture: hard geo-block page, an explicit "I am not a German resident" checkbox at purchase, dense legal/disclosure pages, KYC-related terms. Brand aims for regulated-adjacent seriousness, not degen DeFi.

## 3. Who uses it

1. **Crypto-native income seekers** — fluent with wallets/Base/USDC; evaluate this like a yield product. Want trustworthy return numbers, payout history, supply and depletion mechanics, fast claiming. These users will also use the DEX, so continuity of data presentation (yield formats, decline curves, monospace numerals) matters.
2. **Traditional investors curious about RWAs** — need onboarding for everything: getting USDC on Base, gas ETH, wallet connection, what "claiming" means. The Support FAQ is almost entirely these mechanics — evidence of real friction. This audience exists *only* on the issuance site; the sister products don't serve them. This is the site's distinctive design problem.
3. **Energy companies** evaluating Albion as a fundraising channel (the About page pitches "80–90% lower fees than investment banks, non-dilutive, days not months").

## 4. Core user journeys

### A. Discover → Evaluate → Buy
1. **Home** (`/`): hero ("Institutional Grade Energy DeFi"), platform stats, auto-playing featured-token carousel, 3-step How It Works, trust badges, CTA. Buying can start straight from the carousel.
2. **Assets** (`/assets`): cards grouped by energy field — hero photo, location, operator, expected remaining barrels (BOE), last payment, per-token list with return % and Buy buttons. Sold-out assets behind a toggle.
3. **Asset detail** (`/assets/[id]`): the densest page. Hero header with status badge; five tabs (Overview, Production Data, Received Revenue, Gallery, Documents); then per-token cards (supply minted/max, monthly IRR-based return, payout history, Buy / Track-in-Wallet / History / Returns-Estimator). Four modals on top (returns estimator, payout chart, lightbox, map).
4. **Purchase** (modal): amount input with %-of-balance quick-sets → terms + residency checkboxes → two-signature flow (USDC approval, then deposit) with live states: checking allowance → awaiting approval → submitting → confirming (2 confirmations) → success. Errors get retry; RPC rate-limits trigger multi-second backoff.

### B. Track → Claim (the recurring monthly loop — where retained users live)
5. **Portfolio** (wallet-gated): stat cards (Total Invested / Total Earned / Unclaimed / Active Assets); Holdings tab with a dense 7-metric card per token (tokens held, invested, payouts to date, next payout date, capital returned %, unrecovered capital, depletion %); Performance and Allocation tabs (charts). Hand-editable cost basis for secondary purchases (localStorage); CSV export.
6. **Claims** (wallet-gated): stat cards, a prominent **Claim All**, per-token claim cards, collapsible stats, paginated history with block-explorer links. Claiming is multi-step and possibly multi-transaction (two orderbook contract generations), with live button states; post-claim indexing can lag ~60s, briefly showing stale "unclaimed" amounts.
7. **Payout email alerts**: signature-verified wallet↔email linking, surfaced on Portfolio and Claims.

### C. Learn & trust
8. **About** (vision, investor/company value props, leadership logos), **Support** (FAQ on gas/USDC/claiming/wallet-tracking + Telegram/email), **Legal** (four text-heavy tabs) and **per-token terms** pages, **Blocked** (dead-end geo-block page, no recourse).

### D. Cross-site journeys (currently unsupported, worth designing for)
- "I want to sell" / "what's my token worth now?" → hand-off to the DEX.
- "Show me the diligence behind this asset" → the Intelligence product's data (production curves, provenance-scored figures) is the natural evidence base for the asset detail page's trust story.
- New releases originate upstream; the "future releases" email capture is the current, bolted-on answer.

## 5. Data & system constraints the design must respect

- **Wallet gating**: Portfolio and Claims require a connected wallet; everything else is public. Wallet connect lives in the sticky header (address truncated when connected).
- **Blockchain latency and multi-signature flows are unavoidable**: purchases take 2 signatures, claims several; confirmations take seconds-to-minutes. Transaction state machines must remain first-class UI citizens — never a frozen button.
- **Data comes from many fragile sources**: on-chain reads, GraphQL subgraphs with fallbacks, an IPFS gateway, server endpoints (content-addressed claims bundle, cached event scans). Partial failure is normal; the current pattern preserves stale data behind an orange "unable to refresh" banner with Retry. **Loading, empty, partial-failure, and stale states are core states, not edge cases.**
- **Quantitative content the UI must communicate well**: supply (minted vs max), estimated returns (IRR-based "current" vs "fully diluted" — a nuance users likely don't grasp), payout amounts/dates, cumulative earnings vs invested ("capital returned %"), depletion, production (BOE/day, uptime), revenue actual-vs-projected.
- **Tech stack**: SvelteKit + Svelte 5 + TypeScript + Tailwind, chart.js, lucide-svelte available (barely used), Vercel. Homegrown component library (`src/lib/components`). Note the family divergence: the DEX drives Tailwind from a locked `tokens.ts`; Intelligence uses pure CSS custom properties with no Tailwind. Any shared system should be expressible as a token file.

## 6. Design language across the family — the raw material for coherence

### What the issuance site looks like today (the outlier)
White background, black text; cyan `#08bccc` primary and navy `#283c84` secondary; light-gray `#f8f4f4` surfaces; Figtree everywhere with heavy uppercase + letterspacing; flat, sharp-cornered (`rounded-none` default), 1–2px solid borders, minimal shadows, no gradients, Unicode symbols instead of an icon set. Decent accessibility baseline (focus rings, focus traps, ARIA, keyboard-navigable tabs) — preserve or improve. Mobile-first with 480/640/768/1024 breakpoints.

### What the sister sites share (a deliberate, converged system)
The DEX (locked v2.0, CI-enforced tokens) and Intelligence (Phase 53 token consolidation) independently arrived at near-identical languages:

- **Surfaces**: very dark navy elevation ramps — page `#080e1a`/`#070d18`, cards `#0d1526`/`#0b1322`, elevated `#132040`, hover `#101a30`; borders `#1a2d5a`/`#1a2740`. Depth from elevation steps, not shadows (`--card-shadow: none` on Intelligence).
- **Accent discipline — the 60/30/10 rule** (explicit in Intelligence's design docs): ~60% navy surfaces, ~30% slate text/borders, ~10% **gold `#d4a853`** reserved for primary actions and active states. Semantic signals (green ≈ `#4ade80`/`#5fae84` for gains/producing, red ≈ `#f87171`/`#c76a5a` for losses, amber for risk) live *outside* the gold budget — they carry meaning, not brand.
- **Typography**: **Inter Tight** for UI/display (600–700, tight tracking) + **IBM Plex Mono for every numeral, price, ticker, and table** — the "terminal" register that makes data feel precise. Small, dense scales (11–26px on Intelligence; 9.5–11px uppercase mono eyebrow labels with 0.12–0.2em tracking on both).
- **Shape & rhythm**: modest radii (4–8px; pills at 999px), 4px spacing grid, dense tables (13px body / 12px headers, snug cell padding).
- **Motion**: restrained and purposeful — 150–250ms transitions, staggered table-row entrances (25ms steps), 600ms score-number tweens, slow ambient effects (2.5s pulse "breathing," gold-glow, 24s orb drift). Named, tokenized keyframes; the DEX CI-gates unauthorized `animate-pulse` uses.
- **Dark-first**: DEX defaults dark with a light fallback; Intelligence is dark-only.

### Shared communication motifs worth carrying into the issuance redesign
These are how the family *explains things*, and most transfer directly to the issuance site's trust problem:

- **Scorecards** (Intelligence's signature): a large monospace number + delta badge + 60×20 sparkline + a "how is this computed?" methodology link. Directly reusable for returns, depletion, capital-returned — and the methodology link pattern is exactly what the unexplained IRR figures need.
- **Provenance/tier badges**: per-figure source badges (GOV / OPR / AI-high / ESTIMATE…) with confidence and freshness tooltips. "Every number tells you where it came from" is the family's deepest trust motif — the issuance site claims transparency but doesn't yet *show* provenance.
- **KPI strips, decline curves, sensitivity matrices** (DEX asset pages): compact 5-column stat rows above charts; Arps decline curves as the canonical "this asset depletes" visual — the honest way to teach finite asset life before purchase.
- **Live market context**: the DEX's persistent WTI oil-price ticker (mono, green/red delta) anchors everything to a real commodity.
- **Eyebrow labels**: all-caps mono category labels ("PRODUCTION ROYALTIES, ON-CHAIN") over large sentence-case headlines.
- **Copy tone**: data-forward, verb-led, no hype. Headlines like *"Own a share of the barrels, not the operator"* and *"Find the assets worth buying — and the people to call"*; CTAs like "Start exploring →"; empty states that give a reason and a next step ("No markets yet — markets will appear once audited. Check the pipeline above.").
- **Status chips with leading dots** (● producing / ● shut-in / ● abandoned), consistent hydrocarbon and lifecycle color coding across sites.

### Design tension to resolve deliberately
The sister sites are dense, dark, analyst-grade tools. The issuance site is the family's **front door for novices** — it must carry the same brand authority and data-seriousness without the intimidation. The interesting first-principles question is not "copy the DEX skin?" but: *what does the navy/gold, mono-numeral, provenance-driven Albion language look like when optimized for comprehension, warmth, and first purchase rather than for screening density?* (More whitespace, larger type, progressive disclosure, narrative explanation — same tokens, different register.) Convergence on the shared palette/typography is strongly indicated; wholesale adoption of terminal density is not.

## 7. Known UX problems on the issuance site (from code review)

1. **Asset detail carries too much**: 5 tabs + 4 modals + token grid on one page; evaluation ("should I buy?") and monitoring ("how is my asset doing?") are mixed together.
2. **The buy decision lacks a guided narrative**: IRR figures ("current" vs "fully diluted", a returns-estimator modal) appear with no explanation of royalty depletion mechanics. The single most important comprehension task — "what am I buying and what will I get back?" — is served by scattered, unexplained numbers.
3. **Portfolio holding cards show 7 metrics in a row** — the emotional headline ("you've earned $X, next payout ~date") drowns in accounting detail.
4. **Claims has intrinsic async pain**: multi-transaction flows, up-to-60s indexer lag showing stale unclaimed amounts. Needs calm, honest progress design rather than mutating button labels.
5. **Onboarding gap**: the FAQ shows users struggle with prerequisites (USDC on Base, gas ETH) *before* they can buy; the purchase widget just fails validation on insufficient balance instead of helping users get funded.
6. **Empty-marketplace problem**: one asset, frequent sell-outs; browse-grid patterns feel hollow; sold-out and future-release states are bolted on.
7. **Cost-basis editing** is hidden behind an edit icon and localStorage-fragile — and becomes more important once DEX trading makes secondary purchases common.
8. **Mobile**: truncated addresses, tables that don't scroll well, dense grids compressed rather than rethought.
9. **No shared brand**: cyan/white Figtree here vs navy/gold Inter Tight everywhere else; trust is asserted (logo walls, badges) rather than demonstrated (provenance, methodology, live data) as the sister sites do.
10. **Geo-blocked users hit a dead end** — no explanation, waitlist, or path back.

## 8. What the redesign should optimize for

1. **Comprehension before conversion**: a first-time visitor should grasp "real oil field → monthly revenue → my wallet" in one screen, and understand depletion/finite life *before* buying (the decline curve is the honest hero visual).
2. **Trust demonstrated, not asserted**: adopt the family's provenance/methodology motifs — sourced figures, "how is this computed?" links, on-chain claim receipts — as the spine of the asset story.
3. **The monthly ritual**: for holders the product is "check payout → claim → feel good." Make that loop rewarding and effortless, with honest handling of blockchain wait states.
4. **Two-speed audience**: progressive disclosure so crypto-natives aren't hand-held and novices aren't jargon-blasted; treat funding prerequisites (USDC, gas) as part of the purchase journey, not a support article.
5. **One Albion**: converge on the shared token system (navy surfaces, gold-accent discipline, Inter Tight + IBM Plex Mono numerals, semantic signal colors, eyebrow labels, tokenized motion) in a lighter, more spacious, more narrative register appropriate to a consumer front door — and design the seams to the DEX (sell/trade hand-offs) and to Intelligence-grade asset data.
6. **Scale-ready but honest today**: an IA that works with 1–3 assets now and 30 later.

**Non-negotiables:** wallet-gated portfolio/claims; geo-blocking, residency checkbox, and disclosure surfaces; multi-step transaction state feedback; transaction costs shown before execution; validated token amounts; keep or exceed the current accessibility baseline (focus management, ARIA, keyboard navigation). If brand direction is contested, the DEX's locked `tokens.ts` is the canonical reference system to extend, not fork.
