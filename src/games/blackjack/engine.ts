import { createRng, randomSeed, type Rng } from '@/lib/rng'

export const SUITS = ['S', 'H', 'D', 'C'] as const
export type Suit = (typeof SUITS)[number]

export const RANKS = ['A', '2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K'] as const
export type Rank = (typeof RANKS)[number]

export interface Card {
  rank: Rank
  suit: Suit
  /** stable id so framer-motion keys and deal animations stay consistent */
  id: number
}

const DECKS = 6
/** Reshuffle once fewer than this fraction of cards remain (~25%). */
const PENETRATION = 0.25

export function isRed(suit: Suit): boolean {
  return suit === 'H' || suit === 'D'
}

/** Base value of a rank: Ace counts as 11 here; soft/hard reconciliation happens in handValue. */
export function rankValue(rank: Rank): number {
  if (rank === 'A') return 11
  if (rank === '10' || rank === 'J' || rank === 'Q' || rank === 'K') return 10
  return Number(rank)
}

export interface HandScore {
  /** Best total <= 21 if possible, else the minimal busting total. */
  total: number
  /** True when at least one Ace is still counted as 11. */
  soft: boolean
}

export function handValue(cards: readonly Card[]): HandScore {
  let total = 0
  let aces = 0
  for (const c of cards) {
    total += rankValue(c.rank)
    if (c.rank === 'A') aces++
  }
  // Demote Aces from 11 to 1 while busting and any 11-Ace remains.
  while (total > 21 && aces > 0) {
    total -= 10
    aces--
  }
  return { total, soft: aces > 0 }
}

export function isBust(cards: readonly Card[]): boolean {
  return handValue(cards).total > 21
}

export function isBlackjack(cards: readonly Card[]): boolean {
  return cards.length === 2 && handValue(cards).total === 21
}

export interface Shoe {
  cards: Card[]
  /** index of the next card to draw */
  pos: number
  rng: Rng
  nextId: number
}

function buildCards(startId: number): { cards: Card[]; nextId: number } {
  const cards: Card[] = []
  let id = startId
  for (let d = 0; d < DECKS; d++) {
    for (const suit of SUITS) {
      for (const rank of RANKS) {
        cards.push({ rank, suit, id: id++ })
      }
    }
  }
  return { cards, nextId: id }
}

export function createShoe(): Shoe {
  const rng = createRng(randomSeed())
  const { cards, nextId } = buildCards(0)
  rng.shuffle(cards)
  return { cards, pos: 0, rng, nextId }
}

/** Reshuffle the shoe in place with a fresh seeded order, preserving the rng stream. */
export function reshuffle(shoe: Shoe): void {
  const { cards, nextId } = buildCards(shoe.nextId)
  shoe.rng.shuffle(cards)
  shoe.cards = cards
  shoe.pos = 0
  shoe.nextId = nextId
}

export function needsReshuffle(shoe: Shoe): boolean {
  const remaining = shoe.cards.length - shoe.pos
  return remaining < shoe.cards.length * PENETRATION || remaining < 15
}

export function draw(shoe: Shoe): Card {
  if (shoe.pos >= shoe.cards.length) reshuffle(shoe)
  return shoe.cards[shoe.pos++]!
}

export type Outcome = 'blackjack' | 'win' | 'push' | 'lose' | 'bust'

export interface SettleResult {
  outcome: Outcome
  /** gross return credited to the wallet (0 on a loss). */
  gross: number
}

/**
 * Settle one player hand against the dealer's final hand.
 * `wager` is the chips already deducted for this hand (includes any double).
 * Natural blackjack pays 3:2 (gross 2.5x) and only applies to the original two-card hand
 * that was not produced by a split.
 */
export function settleHand(
  player: readonly Card[],
  dealer: readonly Card[],
  wager: number,
  isNatural: boolean,
): SettleResult {
  const p = handValue(player).total
  if (p > 21) return { outcome: 'bust', gross: 0 }

  const dealerBJ = isBlackjack(dealer)
  if (isNatural) {
    if (dealerBJ) return { outcome: 'push', gross: wager }
    return { outcome: 'blackjack', gross: Math.floor(wager * 2.5) }
  }
  if (dealerBJ) return { outcome: 'lose', gross: 0 }

  const d = handValue(dealer).total
  if (d > 21) return { outcome: 'win', gross: wager * 2 }
  if (p > d) return { outcome: 'win', gross: wager * 2 }
  if (p < d) return { outcome: 'lose', gross: 0 }
  return { outcome: 'push', gross: wager }
}
