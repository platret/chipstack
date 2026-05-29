import { lazy, Suspense } from 'react'
import { BrowserRouter, Route, Routes } from 'react-router-dom'
import { AppShell } from '@/components/AppShell'
import { Home } from '@/routes/Home'
import { Settings } from '@/routes/Settings'

const TetrisGame = lazy(() => import('@/games/tetris/TetrisGame'))
const Slots = lazy(() => import('@/games/slots/Slots'))
const Olympus = lazy(() => import('@/games/olympus/Olympus'))
const Sheldon = lazy(() => import('@/games/sheldon/Sheldon'))
const Blackjack = lazy(() => import('@/games/blackjack/Blackjack'))
const Roulette = lazy(() => import('@/games/roulette/Roulette'))
const VideoPoker = lazy(() => import('@/games/videopoker/VideoPoker'))

function Loading() {
  return (
    <div className="flex min-h-[60vh] items-center justify-center">
      <div className="size-10 animate-spin rounded-full border-2 border-border border-t-primary" />
    </div>
  )
}

function lazyRoute(node: React.ReactNode) {
  return <Suspense fallback={<Loading />}>{node}</Suspense>
}

const basename = import.meta.env.BASE_URL.replace(/\/$/, '')

export default function App() {
  return (
    <BrowserRouter basename={basename}>
      <Routes>
        <Route element={<AppShell />}>
          <Route path="/" element={<Home />} />
          <Route path="/settings" element={<Settings />} />
          <Route path="/play/tetris" element={lazyRoute(<TetrisGame />)} />
          <Route path="/play/slots" element={lazyRoute(<Slots />)} />
          <Route path="/play/olympus" element={lazyRoute(<Olympus />)} />
          <Route path="/play/sheldon" element={lazyRoute(<Sheldon />)} />
          <Route path="/play/blackjack" element={lazyRoute(<Blackjack />)} />
          <Route path="/play/roulette" element={lazyRoute(<Roulette />)} />
          <Route path="/play/videopoker" element={lazyRoute(<VideoPoker />)} />
          <Route path="*" element={<Home />} />
        </Route>
      </Routes>
    </BrowserRouter>
  )
}
