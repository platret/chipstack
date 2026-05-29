<div align="center">

# ⬛ CHIP**STACK**

### A neon browser arcade — guideline-grade Tetris × a play-money casino

*tetr.io-quality stacking meets slots, blackjack, roulette &amp; video poker.*
*All chips are free. No real money. No accounts. No backend. Ever.*

![Vite](https://img.shields.io/badge/Vite-8-646CFF?logo=vite&logoColor=white)
![React](https://img.shields.io/badge/React-19-61DAFB?logo=react&logoColor=black)
![TypeScript](https://img.shields.io/badge/TypeScript-strict-3178C6?logo=typescript&logoColor=white)
![Tailwind](https://img.shields.io/badge/Tailwind-v4-38BDF8?logo=tailwindcss&logoColor=white)
![Canvas](https://img.shields.io/badge/Canvas-2D-f43f5e)
![License](https://img.shields.io/badge/license-MIT-8b5cf6)

</div>

---

## ✦ What is this

ChipStack is a fast, polished, fully client-side arcade built around two pillars:

- **A real Tetris engine** — fixed-timestep logic, full SRS with wall-kicks, 7-bag,
  tunable DAS/ARR/SDF, lock delay with move-reset, T-spins, back-to-back &amp; combos.
  Rendered on a 2D canvas, not the DOM. The feel is the product.
- **A play-money casino** — slots, blackjack, roulette and Jacks-or-Better video poker,
  each a self-contained module behind one shared wallet, with authentic house edges
  baked into the math (because the chips are free, the *odds* should still feel real).

There is **no real-money payment of any kind**. The signature feature is the opposite:
an **Add Chips** button that drops any positive integer into your balance instantly —
no cost, no limit, no friction.

## ✦ Features

| Arcade | Casino | Shell |
|---|---|---|
| Modern guideline Tetris | 5-reel slots, 20 paylines | One persistent wallet HUD |
| Full SRS + I-kicks + 180° | Blackjack (split / double, 3:2) | Add Chips — any amount, instant |
| 7-bag randomizer | European single-zero roulette | Fully rebindable keybinds |
| DAS / ARR / SDF handling | Video Poker (9/6 Jacks-or-Better) | DAS / ARR / SDF sliders |
| Ghost, hold, hard-drop | Seeded RNG + real house edge | 4 neon themes |
| T-spins, back-to-back, combos | Staggered reels, card &amp; chip SFX | Persists to localStorage |

## ✦ The Tetris engine

The hard part, done right:

- **Fixed-timestep loop** — logic runs at a locked 60 Hz off an accumulator, decoupled
  from `requestAnimationFrame` render. The feel is **identical at 60, 144 and 240 Hz**.
- **SRS** — canonical rotation states, separate **I** wall-kick table, plus a 180° kick set.
- **Movement** — DAS and ARR are computed off the logic tick, **never** browser key-repeat.
  Defaults: `DAS 133ms · ARR 0ms (instant) · SDF 20×` — all editable; ARR up to 83ms,
  SDF up to ∞.
- **Lock delay** — ~500 ms with move-reset and a 15-move reset cap so you can't stall.
- **Gravity** — guideline per-level curve; **T-spin** detection via the 3-corner rule
  (front-corner + kick upgrade for full vs mini); back-to-back ×1.5 and combo scoring.
- **Rendering** — neon beveled blocks, smooth sub-cell fall, ghost, hard-drop &amp;
  line-clear particles — all on canvas, with `shadowBlur` limited to the active piece for 60fps.

## ✦ Controls (all rebindable in Settings)

| Action | Default | Action | Default |
|---|---|---|---|
| Move left / right | `←` `→` | Rotate CW / CCW | `↑` / `Z` |
| Soft drop | `↓` | Rotate 180° | `A` |
| Hard drop | `Space` | Hold | `C` |
| Pause | `Esc` | Restart | `R` |

## ✦ Tech stack

- **Vite + React 19 + TypeScript** (strict: `verbatimModuleSyntax`, `erasableSyntaxOnly`)
- **Tailwind v4** + shadcn-style primitives (Radix + cva) — synthwave design system
- **Zustand** (+ persist) for wallet / settings / stats
- **Framer Motion** for UI; **GSAP** for casino flourishes
- **HTML5 Canvas 2D** for the playfield and reel / wheel animations
- **Web Audio API** — a single manager synthesizes every SFX (no audio files)

## ✦ Run it

```bash
npm install
npm run dev      # http://localhost:5173
npm run build    # typecheck (tsc -b) + production build
```

No environment variables, no services. Everything is local.

## ✦ Project layout

```
src/
  games/tetris/   engine · pieces (SRS) · scoring · renderer · useTetris · shell
  games/{slots,blackjack,roulette,videopoker}/   casino modules
  store/          wallet · settings · stats   (Zustand + persist)
  components/ui/  shadcn-style primitives
  lib/            rng (seeded) · audio · format · keys
```

See [`ARCHITECTURE.md`](./ARCHITECTURE.md) for the module contracts and
[`design-system/MASTER.md`](./design-system/MASTER.md) for the visual system.

## ✦ Responsible note

ChipStack uses **fake chips only** to recreate the *feel* of arcade and casino games.
It has no real-money mechanics, no purchases, and no way to cash out. It is a toy.

<div align="center">

—

*Built with a multi-agent workflow. Tetris feel first; everything else after.*

</div>
