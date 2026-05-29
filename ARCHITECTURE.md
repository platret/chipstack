# ChipStack — Architecture & Contracts

A neon browser arcade: a tetr.io-grade Tetris plus a play-money casino (slots,
blackjack, roulette, video poker). **Play money only — no real currency, no
payment integrations, ever.** Everything runs client-side and persists in
localStorage.

## Stack
- Vite + React 19 + TypeScript (strict). Tailwind v4 (`@tailwindcss/vite`).
- shadcn-style UI primitives in `src/components/ui/` (Radix + cva + our tokens).
- Zustand (+ `persist`) for wallet / settings / stats.
- Framer Motion for UI transitions; GSAP allowed for casino flourishes.
- HTML5 Canvas 2D for the Tetris playfield and canvas-heavy casino animations
  (roulette wheel, slot reels). **Never render the Tetris board as DOM cells.**
- Web Audio API SFX via the single `audio` manager (`src/lib/audio.ts`).

## Hard TypeScript constraints (the build enforces these)
- `verbatimModuleSyntax` → type-only imports MUST use `import type { … }`.
- `erasableSyntaxOnly` → **no `enum`, no namespaces, no parameter properties.**
  Use `const X = […] as const` + `type T = (typeof X)[number]` unions instead.
- `noUnusedLocals` / `noUnusedParameters` → no dead variables/params.
- `strict` on. `@/*` aliases `src/*`. Run `npm run build` to typecheck.

## File layout
```
src/
  lib/        utils (cn), rng (seeded mulberry32), format, audio, keys
  store/      wallet.ts, settings.ts, stats.ts   (Zustand + persist)
  types/      game.ts  — GameMeta registry (GAMES), WalletApi
  components/
    ui/       button card dialog input label slider switch tabs tooltip
              select scroll-area badge toast
    settings/ KeybindEditor, HandlingControls
    AppShell WalletHud AddChipsDialog GameCard GameShell AnimatedNumber
  routes/     Home.tsx, Settings.tsx
  games/
    tetris/      TetrisGame.tsx (default export) + engine modules
    slots/       Slots.tsx (default export)
    blackjack/   Blackjack.tsx (default export)
    roulette/    Roulette.tsx (default export)
    videopoker/  VideoPoker.tsx (default export)
```
Each game is a **default-exported** React component, lazy-loaded by `App.tsx`
at `/play/<id>`. Keep all game code inside its own `games/<id>/` folder.

## Wallet — the single source of truth
One wallet in `src/store/wallet.ts`. Every game reads/writes through it.

- Hook (React components): `const balance = useWallet((s) => s.balance)`.
- Imperative (loops / RAF / event handlers), from `@/store/wallet`:
  - `wallet.getBalance(): number`
  - `wallet.bet(amount): boolean`  — deducts; returns **false** (no-op) if balance < amount
  - `wallet.payout(amount): void`  — credits gross return (stake + winnings on a win)
  - `wallet.add(amount): void`     — free chips (Add Chips feature)
- Rules: bets are integers > 0. **Reject bets that exceed balance at the UI level**
  (disable/▸validate before calling `bet`). Persisted on every change.
- A win pays the **gross** amount. e.g. roulette straight win on a 10-chip bet:
  `bet(10)` then `payout(360)` (35:1 → 350 profit + 10 stake). A loss is just `bet(10)`.

## House edge (authentic feel — chips are free anyway)
Every casino game must carry a realistic negative expected value so long-run
balance trends down. Use the seeded RNG in `src/lib/rng.ts` (`createRng(seed)`),
never `Math.random()` in game logic. Reference targets:
- Slots: RTP ~92–96% baked into symbol weights × paytable.
- Blackjack: standard rules, dealer stands on 17, BJ pays 3:2 (house edge from rules).
- Roulette: single-zero European wheel (2.70% edge inherent to correct payouts).
- Video poker: 9/6 Jacks-or-Better paytable (~99.5% with perfect play — fine).

## Audio
`import { audio } from '@/lib/audio'`. Call `audio.unlock()` from a user gesture,
then `audio.play(name)`. Names are in the `Sfx` union (lock, lineclear, harddrop,
chipWin, jackpot, chipBet, reelStop, spin, cardFlip, cardDeal, lose, click, …).
Do not create new AudioContexts. Volume/mute are driven by the settings store.

## Settings the games must respect
`useSettings()` exposes: `keybinds` (Tetris), `handling` {das, arr, sdf},
`volume`, `muted`, `theme`, `gameplay` {ghost, grid, bettingEnabled}.
The Tetris engine reads keybinds + handling live. `SDF_INFINITE = 41`.

## Design system (see design-system/MASTER.md)
Retro-Futurism / synthwave, dark only. Tokens are CSS vars surfaced as Tailwind
colors: `bg-background card popover primary secondary muted accent destructive
border ring gold win loss`. Fonts: `font-display` (Orbitron) for headings/score,
`font-mono` (JetBrains Mono) body. Helpers: `.text-glow`, `.box-glow`, `.panel`,
`.bg-arena`, `.bg-grid`, `.scanlines`, `.tnum` (tabular numerals — use for all
money/score/timers). Use the `GameShell` wrapper for a consistent header/back button.

## Conventions
- KISS, DRY, no premature abstraction. No comments unless genuinely non-obvious
  (DAS/ARR timing math is the one sanctioned place for a short note).
- SVG icons only (lucide-react). No emoji as icons.
- `npm run build` must pass (tsc + vite) after every phase.
```
