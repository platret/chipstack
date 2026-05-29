import { create } from 'zustand'
import { persist } from 'zustand/middleware'

const STARTING_BALANCE = 1000

interface WalletState {
  balance: number
  totalAdded: number
  totalWagered: number
  totalWon: number
  biggestWin: number
  spins: number

  /** Add free chips. No limit, no cost — the core "always add as much as I want" feature. */
  add: (amount: number) => void
  /** Place a wager. Returns false and changes nothing if the balance can't cover it. */
  bet: (amount: number) => boolean
  /** Credit a gross return (stake + winnings for a win). */
  payout: (amount: number) => void
  reset: () => void
}

export const useWallet = create<WalletState>()(
  persist(
    (set, get) => ({
      balance: STARTING_BALANCE,
      totalAdded: 0,
      totalWagered: 0,
      totalWon: 0,
      biggestWin: 0,
      spins: 0,

      add: (amount) => {
        if (!Number.isFinite(amount) || amount <= 0) return
        const a = Math.floor(amount)
        set((s) => ({ balance: s.balance + a, totalAdded: s.totalAdded + a }))
      },
      bet: (amount) => {
        const a = Math.floor(amount)
        if (!Number.isFinite(a) || a <= 0) return false
        if (a > get().balance) return false
        set((s) => ({ balance: s.balance - a, totalWagered: s.totalWagered + a, spins: s.spins + 1 }))
        return true
      },
      payout: (amount) => {
        if (!Number.isFinite(amount) || amount <= 0) return
        const a = Math.floor(amount)
        set((s) => ({
          balance: s.balance + a,
          totalWon: s.totalWon + a,
          biggestWin: Math.max(s.biggestWin, a),
        }))
      },
      reset: () =>
        set({
          balance: STARTING_BALANCE,
          totalAdded: 0,
          totalWagered: 0,
          totalWon: 0,
          biggestWin: 0,
          spins: 0,
        }),
    }),
    { name: 'chipstack-wallet', version: 1 },
  ),
)

/** Imperative wallet API for use inside game loops / RAF (no React hooks). */
export const wallet = {
  getBalance: () => useWallet.getState().balance,
  bet: (amount: number) => useWallet.getState().bet(amount),
  payout: (amount: number) => useWallet.getState().payout(amount),
  add: (amount: number) => useWallet.getState().add(amount),
}
