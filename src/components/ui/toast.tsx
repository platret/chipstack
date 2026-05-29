import { AnimatePresence, motion } from 'framer-motion'
import { create } from 'zustand'
import { cn } from '@/lib/utils'

type ToastVariant = 'default' | 'win' | 'accent' | 'gold'
interface Toast {
  id: number
  title: string
  description?: string
  variant: ToastVariant
}

interface ToastState {
  toasts: Toast[]
  push: (t: Omit<Toast, 'id'>) => void
  dismiss: (id: number) => void
}

let nextId = 1
const useToastStore = create<ToastState>((set) => ({
  toasts: [],
  push: (t) => {
    const id = nextId++
    set((s) => ({ toasts: [...s.toasts, { ...t, id }] }))
    setTimeout(() => set((s) => ({ toasts: s.toasts.filter((x) => x.id !== id) })), 3200)
  },
  dismiss: (id) => set((s) => ({ toasts: s.toasts.filter((x) => x.id !== id) })),
}))

export function toast(t: { title: string; description?: string; variant?: ToastVariant }) {
  useToastStore.getState().push({ title: t.title, description: t.description, variant: t.variant ?? 'default' })
}

const variantStyles: Record<ToastVariant, string> = {
  default: 'border-primary/50 box-glow',
  win: 'border-win/60 shadow-[0_0_24px_rgba(52,226,168,0.3)]',
  accent: 'border-accent/60 box-glow-accent',
  gold: 'border-gold/60 shadow-[0_0_24px_rgba(251,191,36,0.3)]',
}

export function Toaster() {
  const toasts = useToastStore((s) => s.toasts)
  const dismiss = useToastStore((s) => s.dismiss)
  return (
    <div className="pointer-events-none fixed bottom-4 right-4 z-[100] flex w-80 max-w-[calc(100vw-2rem)] flex-col gap-2" aria-live="polite">
      <AnimatePresence>
        {toasts.map((t) => (
          <motion.button
            key={t.id}
            layout
            initial={{ opacity: 0, x: 40, scale: 0.95 }}
            animate={{ opacity: 1, x: 0, scale: 1 }}
            exit={{ opacity: 0, x: 40, scale: 0.9 }}
            transition={{ type: 'spring', stiffness: 380, damping: 30 }}
            onClick={() => dismiss(t.id)}
            className={cn(
              'pointer-events-auto cursor-pointer rounded-lg border bg-popover/95 p-4 text-left backdrop-blur-md',
              variantStyles[t.variant],
            )}
          >
            <p className="font-display text-sm font-semibold">{t.title}</p>
            {t.description && <p className="mt-0.5 text-xs text-muted-foreground">{t.description}</p>}
          </motion.button>
        ))}
      </AnimatePresence>
    </div>
  )
}
