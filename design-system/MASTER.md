# ChipStack — Design System (MASTER)

Source of truth for visuals. Generated from ui-ux-pro-max (Retro-Futurism /
synthwave) and refined for a dark-only neon arcade.

## Pattern
Immersive/interactive experience. Dark background for focus, neon highlights on
interactive elements. Full-screen game stage; chrome (HUD, nav) stays minimal.

## Style
**Retro-Futurism / synthwave** — 80s sci-fi, neon glow, subtle CRT scanlines,
faint perspective grid. Dark-focused. Moderate motion. Keep contrast high.

## Color tokens (CSS vars → Tailwind colors)
| Role | Default (synthwave) | Tailwind |
|------|--------------------|----------|
| background | `#07070f` | `bg-background` |
| foreground | `#e9e9f6` | `text-foreground` |
| card | `#11111f` | `bg-card` |
| popover | `#14142a` | `bg-popover` |
| primary | `#8b5cf6` (violet) | `bg-primary` / `text-primary` |
| secondary | `#1c1c33` | `bg-secondary` |
| muted-foreground | `#8c8cb4` | `text-muted-foreground` |
| accent | `#f43f5e` (rose) | `bg-accent` / `text-accent` |
| border | `#262647` | `border-border` |
| ring | `#8b5cf6` | `ring-ring` |
| gold (chips) | `#fbbf24` | `text-gold` |
| win | `#34e2a8` | `text-win` |
| loss | `#fb7185` | `text-loss` |

Alternate neon families via `[data-theme="aqua|ember|matrix"]` (Settings →
Appearance) swap primary/accent/ring/border + glow tints.

### Per-game accents (cards + shell highlights)
Tetris `#8b5cf6` · Slots `#fbbf24` · Blackjack `#34e2a8` · Roulette `#fb7185` ·
Video Poker `#22d3ee`. Tetromino colors are guideline-canonical (see engine).

## Typography
- Display/headings/score/timers: **Orbitron** (`font-display`), 500/700/900.
- Body/UI/numbers: **JetBrains Mono** (`font-mono`), 400/500/700.
- Always `.tnum` (tabular-nums) for money, score, level, time, multipliers.
- Scale: 12 / 14 / 16 / 18 / 24 / 32 / 48. Line-height 1.5 body.

## Spacing / radius / elevation
- 4/8px rhythm. Container `max-w-7xl`. Section gaps 16/24/32/40.
- Radius: base `0.75rem` (`rounded-xl` cards, `rounded-md` inputs/buttons).
- Elevation = neon glow not heavy shadow: `.box-glow`, `.box-glow-accent`,
  `.panel` (translucent card + blur), card hover lifts `y:-4`.

## Atmosphere helpers
`.bg-arena` (radial neon wash) · `.bg-grid` (masked perspective grid) ·
`.scanlines` (::after CRT overlay) · `.text-glow` / `.text-glow-accent` ·
`shimmer`, `animate-glow-throb`, `animate-pop-in`, `animate-chip-bounce`.

## Motion
- 150–300ms micro-interactions; spring for cards/toasts (stiffness ~380, damping ~30).
- ease-out enter, exit ~60–70% duration. Stagger lists 30–50ms.
- Respect `prefers-reduced-motion` (globally damped in index.css).
- **Never** put a JS animation library in the Tetris engine hot path — canvas only.

## Components
shadcn-style in `src/components/ui/`: Button (default/accent/secondary/outline/
ghost/destructive/gold/link), Card, Dialog, Input, Label, Slider, Switch, Tabs,
Tooltip, Select, ScrollArea, Badge, Toast (`toast()` + `<Toaster/>`).

## Anti-patterns
Minimalist/flat look, static dead screens, emoji icons, gray-on-gray text,
raw hex in components (use tokens), layout-shifting hovers, color-only meaning.

## Accessibility
Contrast ≥4.5:1 (neon on `#07070f` passes for primary/gold/win text). Visible
focus rings (`ring-ring`). Keyboard reachable. Toasts `aria-live="polite"`.
Confirm destructive actions (reset progress is type-to-confirm).
