import { RotateCcw } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Slider } from '@/components/ui/slider'
import { Switch } from '@/components/ui/switch'
import { SDF_INFINITE, useSettings } from '@/store/settings'

function Row({
  label,
  hint,
  value,
  children,
}: {
  label: string
  hint: string
  value: string
  children: React.ReactNode
}) {
  return (
    <div className="rounded-lg border border-border bg-card/50 p-4">
      <div className="mb-2 flex items-center justify-between">
        <Label className="text-sm">{label}</Label>
        <span className="tnum font-display text-sm font-semibold text-primary">{value}</span>
      </div>
      {children}
      <p className="mt-2 text-xs text-muted-foreground">{hint}</p>
    </div>
  )
}

export function HandlingControls() {
  const handling = useSettings((s) => s.handling)
  const setHandling = useSettings((s) => s.setHandling)
  const infinite = handling.sdf >= SDF_INFINITE

  return (
    <div className="flex flex-col gap-3">
      <Row label="DAS — Delayed Auto Shift" hint="Delay before a held direction starts repeating." value={`${handling.das} ms`}>
        <Slider min={0} max={500} step={1} value={[handling.das]} onValueChange={([v]) => setHandling({ das: v })} />
      </Row>

      <Row label="ARR — Auto Repeat Rate" hint="Time between repeats once DAS engages. 0 = instant slide to the wall." value={handling.arr === 0 ? 'Instant' : `${handling.arr} ms`}>
        <Slider min={0} max={83} step={1} value={[handling.arr]} onValueChange={([v]) => setHandling({ arr: v })} />
      </Row>

      <Row label="SDF — Soft Drop Factor" hint="Gravity multiplier while soft dropping." value={infinite ? '∞ Instant' : `${handling.sdf}×`}>
        <div className="flex items-center gap-4">
          <Slider
            min={5}
            max={40}
            step={1}
            disabled={infinite}
            value={[infinite ? 40 : handling.sdf]}
            onValueChange={([v]) => setHandling({ sdf: v })}
            className={infinite ? 'opacity-40' : ''}
          />
          <div className="flex shrink-0 items-center gap-2">
            <Switch
              checked={infinite}
              onCheckedChange={(c) => setHandling({ sdf: c ? SDF_INFINITE : 20 })}
              id="sdf-inf"
            />
            <Label htmlFor="sdf-inf" className="text-xs text-muted-foreground">∞</Label>
          </div>
        </div>
      </Row>

      <div className="flex justify-end">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setHandling({ das: 133, arr: 0, sdf: 20 })}
          className="gap-1.5 text-muted-foreground"
        >
          <RotateCcw className="size-3.5" /> Reset handling
        </Button>
      </div>
    </div>
  )
}
