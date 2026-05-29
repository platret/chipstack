export const meta = {
  name: 'chipstack-casino',
  description: 'Build the 4 ChipStack casino games (slots, blackjack, roulette, video poker) in parallel, then adversarially review payout math',
  phases: [
    { title: 'Build', detail: 'one builder agent per game, parallel' },
    { title: 'Review', detail: 'verify payout math + interface compliance per game' },
  ],
}

const ROOT = '/Users/alex/IdeaProjects/ChipStack'

const SHARED = `
PROJECT: ChipStack — a neon play-money browser arcade. Code lives in ${ROOT}.
FIRST: read ${ROOT}/ARCHITECTURE.md and ${ROOT}/design-system/MASTER.md in full.
Then study these for patterns and the exact APIs you must use:
- ${ROOT}/src/components/GameShell.tsx (wrap your game in <GameShell id="...">)
- ${ROOT}/src/components/ui/ (Button, Card, Dialog, Input, Slider, Tabs, Badge, toast, etc. — USE THESE, do not reinvent)
- ${ROOT}/src/games/tetris/TetrisGame.tsx (layout/overlay/animation patterns)
- ${ROOT}/src/store/wallet.ts, src/lib/rng.ts, src/lib/audio.ts, src/lib/format.ts, src/types/game.ts

HARD RULES (the build enforces strict TS):
- TypeScript strict + verbatimModuleSyntax (use 'import type {...}' for type-only imports)
  + erasableSyntaxOnly: NO enum, NO namespaces, NO TS parameter-properties. Use 'as const'
  objects + union types. noUnusedLocals/noUnusedParameters: zero dead code.
- Import alias '@/...' maps to src/. Default-EXPORT your game component from the exact path given.
- Wallet: import { wallet } from '@/store/wallet' for imperative use (wallet.getBalance(), wallet.bet(n)->boolean, wallet.payout(grossReturn), wallet.add(n)). A WIN pays the GROSS return (stake + winnings). Reject/disable any bet that exceeds balance BEFORE calling wallet.bet. Use useWallet((s)=>s.balance) in components to show balance.
- RNG: import { createRng, randomSeed } from '@/lib/rng'. NEVER use the global Math RNG in game logic — seed with randomSeed() per round/shoe and use the returned generator.
- Audio: import { audio } from '@/lib/audio'; call audio.unlock() on first user action; audio.play(name) with names from the Sfx union (spin, reelStop, cardDeal, cardFlip, chipBet, chipWin, jackpot, lose, click).
- Toast wins: import { toast } from '@/components/ui/toast'. Use formatChips from '@/lib/format' and className 'tnum' for all money/odds numbers. SVG icons only (lucide-react), never emoji.
- Visuals: synthwave neon dark. Use design tokens (bg-card, border-border, text-primary, etc.), helpers .panel/.box-glow/.text-glow, and YOUR game's accent color. Framer Motion for UI; GSAP allowed for flourishes (both installed). Use HTML5 Canvas 2D where the spec says so. Responsive down to ~380px.
- HOUSE EDGE must be real (chips are free; odds should still feel authentic).

SCOPE: write ONLY inside your own src/games/<id>/ folder. Do NOT modify shared files
(components/ui, store, lib, types, routes, App.tsx) — they already route to your default export.
Do NOT run 'npm install' or 'npm run build' (a central typecheck runs after you). Deps available:
react 19, framer-motion, gsap, lucide-react, zustand, radix, tailwind v4.
Write clean, KISS, DRY code. No comments unless genuinely non-obvious.
`

const GAMES = [
  {
    id: 'slots',
    label: 'Neon Reels (slots)',
    path: 'src/games/slots/Slots.tsx',
    spec: `
NEON REELS — 5-reel video slot. Accent gold #fbbf24. GameShell id="slots".
- 5 reels x 3 visible rows. Render reels on an HTML5 Canvas (or polished CSS/GSAP reel strips)
  with a real SPIN animation and STAGGERED stops (each reel stops ~140-180ms after the previous),
  reelStop sound per reel, spin sound on launch.
- Symbol set (~8) with WEIGHTS per reel and a WILD that substitutes. Suggest symbols:
  SEVEN, BAR, BELL, CHERRY, STAR, DIAMOND, CLOVER, WILD — drawn as crisp neon shapes/glyphs
  (SVG or canvas vector), NOT emoji.
- At least 10 fixed paylines (20 ideal) across the 5x3 grid. Win = matching symbols left-aligned
  starting at reel 1 (3,4,5 of a kind), WILD substitutes. Provide a PAYTABLE (multiplier x line-bet
  per symbol per count). Highlight winning lines/cells and total win.
- TARGET RTP ~94% (range 92-96%). Choose weights+paytable to hit it; you may write a throwaway
  node simulation to verify the RTP, then DELETE it. State the achieved RTP in your notes.
- Bet UI: line-bet selector via chip buttons (e.g. 1/5/25/100) and total-bet = line-bet x lines;
  Spin button disabled when total > balance. wallet.bet(total) on spin, wallet.payout(totalWin) on win.
  Scale win sound: jackpot for big (>=20x), chipWin otherwise.`,
  },
  {
    id: 'blackjack',
    label: 'Blackjack 21',
    path: 'src/games/blackjack/Blackjack.tsx',
    spec: `
BLACKJACK 21. Accent emerald #34e2a8. GameShell id="blackjack".
- 6-deck shoe, seeded shuffle (createRng(randomSeed())); reshuffle when shoe < ~25% remaining.
- Rules: dealer stands on all 17 (including soft 17). Blackjack pays 3:2. Actions: Hit, Stand,
  Double Down (first two cards only; doubles wager, exactly one more card), Split (equal-RANK pair
  into two hands, each takes the original wager; split Aces get one card each). Insurance offered when
  dealer upcard is Ace (costs half wager, pays 2:1 if dealer has blackjack).
- Correct hand values with Aces as 1/11 (soft/hard). Bust > 21. Push on equal totals.
- Settle: win 1:1 (gross payout 2x wager), natural blackjack 3:2 (gross 2.5x), push returns wager,
  loss returns 0. Handle each split hand independently.
- Card deal + flip animations (framer-motion/gsap) with cardDeal/cardFlip sounds; chipWin on win, lose on loss.
- Beautiful felt-less neon table: dealer row, player hand(s), action buttons enabled per legal state.
- Bet UI: chip buttons to build the wager + Deal; disable Deal when wager > balance.
  Verify the house edge is the standard ~0.5% from rules (no rule mistakes that flip EV).`,
  },
  {
    id: 'roulette',
    label: 'Roulette',
    path: 'src/games/roulette/Roulette.tsx',
    spec: `
ROULETTE — European single-zero. Accent rose #fb7185. GameShell id="roulette".
- Numbers 0-36, single green 0. RED set = {1,3,5,7,9,12,14,16,18,19,21,23,25,27,30,32,34,36};
  others black; 0 green. Physical wheel order (must use for the animation):
  [0,32,15,19,4,21,2,25,17,34,6,27,13,36,11,30,8,23,10,5,24,16,33,1,20,14,31,9,22,18,29,7,28,12,35,3,26].
- Animated wheel + ball on HTML5 Canvas (rotate wheel, ball decelerates to the result pocket) — or GSAP.
- Full betting board UI: straight (single number), split, street, corner, line(6), column, dozen,
  red/black, odd/even, high(19-36)/low(1-18). Place chips by clicking; chip-denomination selector;
  Clear and Rebet. PAYOUTS (winnings:stake): straight 35:1, split 17:1, street 11:1, corner 8:1,
  line 5:1, column 2:1, dozen 2:1, even-money 1:1. Gross return = stake x (odds+1).
- On Spin: wallet.bet(totalPlaced) (disable spin if total > balance), animate, then settle EVERY bet
  and wallet.payout(sum of winning gross returns). Show the winning number + a results history strip.
- Use seeded RNG to pick the result; the 2.70% house edge is inherent to correct payouts. Verify payouts.`,
  },
  {
    id: 'videopoker',
    label: 'Video Poker (Jacks or Better)',
    path: 'src/games/videopoker/VideoPoker.tsx',
    spec: `
VIDEO POKER — Jacks or Better, 9/6 paytable. Accent cyan #22d3ee. GameShell id="videopoker".
- 52-card deck, seeded shuffle per hand. Bet = 1..5 coins x coin value (coin selector + Bet Max).
- Flow: Deal 5 cards -> player toggles HOLD on any subset -> Draw replaces non-held -> evaluate + pay.
- 9/6 paytable (multiplier per coin, x coins bet): Jacks-or-Better pair 1, Two Pair 2, Three of a Kind 3,
  Straight 4, Flush 6, Full House 9, Four of a Kind 25, Straight Flush 50, Royal Flush 250 — with the
  standard 5-coin Royal bonus = 800/coin (i.e. 4000 at 5 coins). Payout = coinValue * tableMult * coins
  (apply the royal 5-coin bonus). 'Jacks or Better' = a pair of Jacks, Queens, Kings, or Aces only.
- Hand eval MUST be correct: pair(J+), two pair, trips, straight (wheel A-2-3-4-5 and A-high T-J-Q-K-A),
  flush, full house, quads, straight flush, royal flush. Write a throwaway node test of the evaluator on
  known hands, confirm, then DELETE it. State results in notes.
- Card deal/flip + hold toggle animations (framer-motion) with cardDeal/cardFlip sounds; chipWin/jackpot on win.
- Bet UI: coin value chips + coins selector + Bet Max + Deal/Draw; disable Deal when wager > balance.`,
  },
]

const BUILD_SCHEMA = {
  type: 'object',
  additionalProperties: false,
  required: ['files', 'summary', 'houseEdge'],
  properties: {
    files: { type: 'array', items: { type: 'string' }, description: 'absolute paths created/modified' },
    summary: { type: 'string', description: 'what was built + key mechanics' },
    houseEdge: { type: 'string', description: 'achieved RTP / house edge and how verified' },
    notes: { type: 'string', description: 'anything the integrator should know' },
  },
}

const REVIEW_SCHEMA = {
  type: 'object',
  additionalProperties: false,
  required: ['ok', 'payoutMathCorrect', 'issues'],
  properties: {
    ok: { type: 'boolean', description: 'true if production-ready with no blocking issues' },
    payoutMathCorrect: { type: 'boolean' },
    rtpOrEdge: { type: 'string' },
    issues: {
      type: 'array',
      items: {
        type: 'object',
        additionalProperties: false,
        required: ['severity', 'detail'],
        properties: {
          severity: { type: 'string', enum: ['blocker', 'major', 'minor'] },
          detail: { type: 'string' },
          file: { type: 'string' },
        },
      },
    },
  },
}

const results = await pipeline(
  GAMES,
  (g) =>
    agent(`${SHARED}\n\nBUILD THIS GAME:\n${g.spec}\n\nDefault-export the component from ${ROOT}/${g.path}. Replace the placeholder there. Make it genuinely polished and fun, faithful to the spec and the design system.`,
      { label: `build:${g.id}`, phase: 'Build', schema: BUILD_SCHEMA }),
  (build, g) =>
    agent(`${SHARED}\n\nADVERSARIALLY REVIEW the just-built game "${g.label}" at ${ROOT}/${g.path} (and any files in its folder). Builder summary: ${JSON.stringify(build)}.\n\nVerify, by READING the code and reasoning about the actual numbers:\n1) Payout math is correct per the spec (exact odds/paytable; gross-vs-net payout via wallet.payout is right; no EV-flipping bug that pays more than it should).\n2) The house edge / RTP is real and roughly matches the spec.\n3) It uses the shared wallet/audio/RNG/UI correctly, rejects bets > balance, and only touches its own folder.\n4) It will plausibly typecheck under strict TS (no enums, type-only imports, no unused vars).\nReport concrete issues with file + detail. Be skeptical: assume there IS a payout bug and try to find it.`,
      { label: `review:${g.id}`, phase: 'Review', schema: REVIEW_SCHEMA }),
)

return {
  games: GAMES.map((g, i) => ({ id: g.id, ok: results[i] ? true : false })),
  reviews: results,
}