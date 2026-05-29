import { Coins } from 'lucide-react'
import { AddChipsDialog } from '@/components/AddChipsDialog'
import { AnimatedNumber } from '@/components/AnimatedNumber'
import { cn } from '@/lib/utils'
import { useWallet } from '@/store/wallet'

export function WalletHud({ className }: { className?: string }) {
  const balance = useWallet((s) => s.balance)
  return (
    <div className={cn('flex items-center gap-3', className)}>
      <div className="flex items-center gap-2 rounded-lg border border-border bg-card/70 px-3 py-1.5 backdrop-blur-sm">
        <Coins className="size-4 text-gold" aria-hidden />
        <AnimatedNumber value={balance} className="tnum font-display text-base font-semibold tracking-tight text-gold" />
        <span className="text-xs uppercase tracking-wider text-muted-foreground">chips</span>
      </div>
      <AddChipsDialog />
    </div>
  )
}
