/* Shared contracts. Every game is reached through GAMES and reads/writes the
   single Wallet via the store's imperative API (useWallet.getState()). */

export type GameId = 'tetris' | 'slots' | 'blackjack' | 'roulette' | 'videopoker'

export interface GameMeta {
  id: GameId
  title: string
  tagline: string
  kind: 'arcade' | 'casino'
  /** hex accent used to theme the game's card + shell highlights */
  accent: string
  route: string
  /** short hint shown on the home card */
  highlight: string
}

export const GAMES: readonly GameMeta[] = [
  {
    id: 'tetris',
    title: 'ChipStack',
    tagline: 'Modern guideline Tetris',
    kind: 'arcade',
    accent: '#8b5cf6',
    route: '/play/tetris',
    highlight: 'SRS · 7-bag · DAS/ARR · T-spins',
  },
  {
    id: 'slots',
    title: 'Neon Reels',
    tagline: '5-reel video slots',
    kind: 'casino',
    accent: '#fbbf24',
    route: '/play/slots',
    highlight: '20 paylines · staggered stops',
  },
  {
    id: 'blackjack',
    title: 'Blackjack 21',
    tagline: 'Dealer stands on 17',
    kind: 'casino',
    accent: '#34e2a8',
    route: '/play/blackjack',
    highlight: 'Split · double · 3:2',
  },
  {
    id: 'roulette',
    title: 'Roulette',
    tagline: 'European single-zero',
    kind: 'casino',
    accent: '#fb7185',
    route: '/play/roulette',
    highlight: 'Full table · 35:1',
  },
  {
    id: 'videopoker',
    title: 'Video Poker',
    tagline: 'Jacks or Better',
    kind: 'casino',
    accent: '#22d3ee',
    route: '/play/videopoker',
    highlight: '9/6 paytable · hold & draw',
  },
] as const

export function gameById(id: GameId): GameMeta {
  return GAMES.find((g) => g.id === id)!
}

/** The wallet surface every casino game uses. Backed by the Zustand store. */
export interface WalletApi {
  getBalance: () => number
  /** Deduct a wager. Returns false (and changes nothing) if balance is insufficient. */
  bet: (amount: number) => boolean
  /** Credit winnings (gross return, including stake for wins). */
  payout: (amount: number) => void
  add: (amount: number) => void
}
