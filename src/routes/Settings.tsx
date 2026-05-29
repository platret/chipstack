import { ArrowLeft, Gamepad2, KeyRound, Palette, TriangleAlert, Volume2 } from 'lucide-react'
import { useState } from 'react'
import { Link } from 'react-router-dom'
import { HandlingControls } from '@/components/settings/HandlingControls'
import { KeybindEditor } from '@/components/settings/KeybindEditor'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Slider } from '@/components/ui/slider'
import { Switch } from '@/components/ui/switch'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { toast } from '@/components/ui/toast'
import { audio } from '@/lib/audio'
import { THEMES, type ThemeName, useSettings } from '@/store/settings'
import { useStats } from '@/store/stats'
import { useWallet } from '@/store/wallet'

const THEME_LABELS: Record<ThemeName, string> = {
  synthwave: 'Synthwave (violet)',
  aqua: 'Aqua (cyan)',
  ember: 'Ember (orange)',
  matrix: 'Matrix (green)',
}

function ToggleRow({
  label,
  description,
  checked,
  onChange,
}: {
  label: string
  description: string
  checked: boolean
  onChange: (v: boolean) => void
}) {
  return (
    <div className="flex items-center justify-between gap-4 rounded-lg border border-border bg-card/50 px-4 py-3">
      <div>
        <p className="text-sm font-medium">{label}</p>
        <p className="text-xs text-muted-foreground">{description}</p>
      </div>
      <Switch checked={checked} onCheckedChange={onChange} />
    </div>
  )
}

export function Settings() {
  const { volume, muted, theme, gameplay, setVolume, setMuted, setTheme, setGameplay } = useSettings()
  const resetWallet = useWallet((s) => s.reset)
  const resetStats = useStats((s) => s.reset)
  const resetAll = useSettings((s) => s.resetAll)
  const [confirmText, setConfirmText] = useState('')

  return (
    <div className="mx-auto max-w-3xl">
      <div className="mb-6 flex items-center gap-3">
        <Button asChild variant="ghost" size="icon-sm">
          <Link to="/" aria-label="Back to home">
            <ArrowLeft />
          </Link>
        </Button>
        <h1 className="font-display text-2xl font-bold tracking-tight">Settings</h1>
      </div>

      <Tabs defaultValue="controls">
        <TabsList className="flex w-full flex-wrap">
          <TabsTrigger value="controls"><KeyRound className="size-4" /> Controls</TabsTrigger>
          <TabsTrigger value="handling"><Gamepad2 className="size-4" /> Handling</TabsTrigger>
          <TabsTrigger value="audio"><Volume2 className="size-4" /> Audio</TabsTrigger>
          <TabsTrigger value="appearance"><Palette className="size-4" /> Appearance</TabsTrigger>
          <TabsTrigger value="data"><TriangleAlert className="size-4" /> Data</TabsTrigger>
        </TabsList>

        <TabsContent value="controls">
          <Card>
            <CardHeader>
              <CardTitle>Keybinds</CardTitle>
              <CardDescription>Every Tetris action is rebindable. Saved automatically.</CardDescription>
            </CardHeader>
            <CardContent>
              <KeybindEditor />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="handling">
          <Card>
            <CardHeader>
              <CardTitle>Handling</CardTitle>
              <CardDescription>Tune DAS, ARR and soft-drop. Defaults: 133 / 0 / 20×.</CardDescription>
            </CardHeader>
            <CardContent>
              <HandlingControls />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="audio">
          <Card>
            <CardHeader>
              <CardTitle>Audio</CardTitle>
              <CardDescription>Master volume for all sound effects.</CardDescription>
            </CardHeader>
            <CardContent className="flex flex-col gap-5">
              <div className="rounded-lg border border-border bg-card/50 p-4">
                <div className="mb-3 flex items-center justify-between">
                  <Label>Master volume</Label>
                  <span className="tnum text-sm font-semibold text-primary">{Math.round(volume * 100)}%</span>
                </div>
                <Slider
                  min={0}
                  max={1}
                  step={0.01}
                  value={[volume]}
                  onValueChange={([v]) => setVolume(v)}
                  onValueCommit={() => {
                    audio.unlock()
                    audio.play('chipWin')
                  }}
                />
              </div>
              <ToggleRow
                label="Mute all sound"
                description="Silence every effect without losing your volume setting."
                checked={muted}
                onChange={setMuted}
              />
              <Button
                variant="secondary"
                className="self-start"
                onClick={() => {
                  audio.unlock()
                  audio.play('tetris')
                }}
              >
                Test sound
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="appearance">
          <Card>
            <CardHeader>
              <CardTitle>Appearance &amp; Gameplay</CardTitle>
              <CardDescription>Neon theme and optional visual aids.</CardDescription>
            </CardHeader>
            <CardContent className="flex flex-col gap-5">
              <div className="rounded-lg border border-border bg-card/50 p-4">
                <Label className="mb-2 block">Neon theme</Label>
                <Select value={theme} onValueChange={(v) => setTheme(v as ThemeName)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {THEMES.map((t) => (
                      <SelectItem key={t} value={t}>
                        {THEME_LABELS[t]}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <ToggleRow
                label="Ghost piece"
                description="Show where the current piece will land."
                checked={gameplay.ghost}
                onChange={(v) => setGameplay({ ghost: v })}
              />
              <ToggleRow
                label="Board grid"
                description="Faint grid lines on the playfield."
                checked={gameplay.grid}
                onChange={(v) => setGameplay({ grid: v })}
              />
              <ToggleRow
                label="Tetris betting layer"
                description="Wager chips on a target before a round. Never required to play."
                checked={gameplay.bettingEnabled}
                onChange={(v) => setGameplay({ bettingEnabled: v })}
              />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="data">
          <Card>
            <CardHeader>
              <CardTitle className="text-loss">Danger zone</CardTitle>
              <CardDescription>These actions cannot be undone.</CardDescription>
            </CardHeader>
            <CardContent className="flex flex-col gap-4">
              <div className="flex items-center justify-between gap-4 rounded-lg border border-border bg-card/50 px-4 py-3">
                <div>
                  <p className="text-sm font-medium">Reset all settings</p>
                  <p className="text-xs text-muted-foreground">Keybinds, handling, audio and theme back to defaults.</p>
                </div>
                <Button
                  variant="outline"
                  onClick={() => {
                    resetAll()
                    toast({ title: 'Settings reset', description: 'Back to defaults.' })
                  }}
                >
                  Reset
                </Button>
              </div>

              <Dialog>
                <DialogTrigger asChild>
                  <div className="flex items-center justify-between gap-4 rounded-lg border border-loss/40 bg-loss/5 px-4 py-3">
                    <div>
                      <p className="text-sm font-medium text-loss">Reset progress</p>
                      <p className="text-xs text-muted-foreground">Wipe your chip balance, stats and high scores.</p>
                    </div>
                    <Button variant="destructive">Reset progress</Button>
                  </div>
                </DialogTrigger>
                <DialogContent className="max-w-md">
                  <DialogHeader>
                    <DialogTitle className="flex items-center gap-2 text-loss">
                      <TriangleAlert className="size-5" /> Reset all progress?
                    </DialogTitle>
                    <DialogDescription>
                      This permanently clears your balance, stats and Tetris high scores. Type <b>RESET</b> to confirm.
                    </DialogDescription>
                  </DialogHeader>
                  <input
                    autoFocus
                    value={confirmText}
                    onChange={(e) => setConfirmText(e.target.value)}
                    placeholder="RESET"
                    className="h-10 w-full rounded-md border border-input bg-background/60 px-3 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  />
                  <DialogFooter>
                    <DialogClose asChild>
                      <Button variant="ghost">Cancel</Button>
                    </DialogClose>
                    <DialogClose asChild>
                      <Button
                        variant="destructive"
                        disabled={confirmText !== 'RESET'}
                        onClick={() => {
                          resetWallet()
                          resetStats()
                          setConfirmText('')
                          toast({ title: 'Progress reset', description: 'Fresh start — 1,000 chips.' })
                        }}
                      >
                        Wipe everything
                      </Button>
                    </DialogClose>
                  </DialogFooter>
                </DialogContent>
              </Dialog>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}
