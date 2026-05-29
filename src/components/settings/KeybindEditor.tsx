import { RotateCcw } from 'lucide-react'
import { useEffect, useState } from 'react'
import { Button } from '@/components/ui/button'
import { toast } from '@/components/ui/toast'
import { keyLabel } from '@/lib/keys'
import { cn } from '@/lib/utils'
import { ACTION_LABELS, TETRIS_ACTIONS, useSettings, type TetrisAction } from '@/store/settings'

export function KeybindEditor() {
  const keybinds = useSettings((s) => s.keybinds)
  const setKeybind = useSettings((s) => s.setKeybind)
  const resetKeybinds = useSettings((s) => s.resetKeybinds)
  const [listening, setListening] = useState<TetrisAction | null>(null)

  useEffect(() => {
    if (!listening) return
    const onKey = (e: KeyboardEvent) => {
      e.preventDefault()
      e.stopPropagation()
      const code = e.code
      // resolve duplicates: a key maps to exactly one action
      const conflict = (Object.entries(keybinds) as [TetrisAction, string][]).find(
        ([a, c]) => a !== listening && c === code,
      )
      setKeybind(listening, code)
      if (conflict) {
        setKeybind(conflict[0], '')
        toast({
          title: 'Key reassigned',
          description: `${keyLabel(code)} was bound to "${ACTION_LABELS[conflict[0]]}" — now cleared.`,
          variant: 'accent',
        })
      }
      setListening(null)
    }
    window.addEventListener('keydown', onKey, { capture: true })
    return () => window.removeEventListener('keydown', onKey, { capture: true } as EventListenerOptions)
  }, [listening, keybinds, setKeybind])

  return (
    <div className="flex flex-col gap-3">
      <div className="grid gap-2 sm:grid-cols-2">
        {TETRIS_ACTIONS.map((action) => {
          const isListening = listening === action
          return (
            <div
              key={action}
              className="flex items-center justify-between gap-3 rounded-lg border border-border bg-card/50 px-3 py-2"
            >
              <span className="text-sm">{ACTION_LABELS[action]}</span>
              <Button
                variant={isListening ? 'accent' : 'outline'}
                size="sm"
                className={cn('min-w-20 font-mono', isListening && 'animate-glow-throb')}
                onClick={() => setListening(isListening ? null : action)}
              >
                {isListening ? 'Press a key…' : keyLabel(keybinds[action])}
              </Button>
            </div>
          )
        })}
      </div>
      <div className="flex items-center justify-between">
        <p className="text-xs text-muted-foreground">
          Click an action, then press the key to bind. Conflicting keys are reassigned automatically.
        </p>
        <Button variant="ghost" size="sm" onClick={resetKeybinds} className="gap-1.5 text-muted-foreground">
          <RotateCcw className="size-3.5" /> Defaults
        </Button>
      </div>
    </div>
  )
}
