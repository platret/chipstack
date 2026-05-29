import { Settings as SettingsIcon } from 'lucide-react'
import { useEffect } from 'react'
import { Link, Outlet } from 'react-router-dom'
import { Toaster } from '@/components/ui/toast'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip'
import { WalletHud } from '@/components/WalletHud'
import { audio } from '@/lib/audio'

export function AppShell() {
  useEffect(() => {
    const unlock = () => audio.unlock()
    window.addEventListener('pointerdown', unlock, { once: true })
    window.addEventListener('keydown', unlock, { once: true })
    return () => {
      window.removeEventListener('pointerdown', unlock)
      window.removeEventListener('keydown', unlock)
    }
  }, [])

  return (
    <TooltipProvider delayDuration={300}>
      <div className="relative min-h-dvh bg-arena scanlines">
        <div className="pointer-events-none absolute inset-0 bg-grid opacity-60" aria-hidden />
        <header className="sticky top-0 z-40 border-b border-border/60 bg-background/70 backdrop-blur-md">
          <div className="mx-auto flex h-16 max-w-7xl items-center justify-between gap-4 px-4 sm:px-6">
            <Link to="/" className="group flex items-center gap-2" aria-label="ChipStack home">
              <span className="font-display text-xl font-black tracking-tight">
                <span className="text-foreground">CHIP</span>
                <span className="text-primary text-glow">STACK</span>
              </span>
            </Link>
            <div className="flex items-center gap-2 sm:gap-3">
              <WalletHud />
              <Tooltip>
                <TooltipTrigger asChild>
                  <Link
                    to="/settings"
                    aria-label="Settings"
                    className="inline-flex size-10 items-center justify-center rounded-md border border-border bg-card/70 text-muted-foreground transition-colors hover:border-primary/60 hover:text-foreground cursor-pointer"
                  >
                    <SettingsIcon className="size-5" />
                  </Link>
                </TooltipTrigger>
                <TooltipContent>Settings</TooltipContent>
              </Tooltip>
            </div>
          </div>
        </header>

        <main className="relative z-10 mx-auto max-w-7xl px-4 py-6 sm:px-6 sm:py-8">
          <Outlet />
        </main>

        <Toaster />
      </div>
    </TooltipProvider>
  )
}
