import { Coins, Plus } from 'lucide-react'
import { useState } from 'react'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { toast } from '@/components/ui/toast'
import { audio } from '@/lib/audio'
import { formatChipsCompact, parsePositiveInt } from '@/lib/format'
import { useWallet } from '@/store/wallet'

const QUICK = [1_000, 10_000, 100_000, 1_000_000]

export function AddChipsDialog({ trigger }: { trigger?: React.ReactNode }) {
  const add = useWallet((s) => s.add)
  const [open, setOpen] = useState(false)
  const [raw, setRaw] = useState('')
  const [error, setError] = useState<string | null>(null)

  function commit(amount: number) {
    add(amount)
    audio.unlock()
    audio.play('chipWin')
    toast({ title: `+${formatChipsCompact(amount)} chips`, description: 'Added to your balance.', variant: 'gold' })
  }

  function handleAddCustom() {
    const n = parsePositiveInt(raw)
    if (n === null) {
      setError('Enter a positive whole number.')
      return
    }
    commit(n)
    setRaw('')
    setError(null)
    setOpen(false)
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {trigger ?? (
          <Button variant="gold" size="sm" className="gap-1.5">
            <Plus className="size-4" />
            Add Chips
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Coins className="size-5 text-gold" />
            Add Chips
          </DialogTitle>
          <DialogDescription>
            Play money only — add as many free chips as you want. No cost, no limit, ever.
          </DialogDescription>
        </DialogHeader>

        <div className="grid grid-cols-2 gap-2">
          {QUICK.map((q) => (
            <Button
              key={q}
              variant="secondary"
              onClick={() => commit(q)}
              className="tnum justify-center text-base"
            >
              +{formatChipsCompact(q)}
            </Button>
          ))}
        </div>

        <div className="flex flex-col gap-2">
          <div className="flex gap-2">
            <Input
              autoFocus
              inputMode="numeric"
              placeholder="Custom amount…"
              value={raw}
              onChange={(e) => {
                setRaw(e.target.value)
                setError(null)
              }}
              onKeyDown={(e) => {
                if (e.key === 'Enter') handleAddCustom()
              }}
              aria-invalid={error ? true : undefined}
            />
            <Button variant="gold" onClick={handleAddCustom} className="shrink-0">
              Add
            </Button>
          </div>
          {error && <p className="text-xs text-loss" role="alert">{error}</p>}
        </div>
      </DialogContent>
    </Dialog>
  )
}
