import { useMemo } from 'react'
import { cn } from '@/lib/utils'
import { colorOf, type BetSpot } from './bets'
import {
  buildInsideSpots,
  columnSpots,
  dozenSpots,
  evenMoneySpots,
  numAt,
  type PositionedSpot,
} from './board'
import { Chip } from './Chip'

const COLS = 12
const ROWS = 3

const FELT = {
  red: '#b01030',
  black: '#16162a',
  green: '#0f7a36',
} as const

function feltBg(n: number): string {
  return FELT[colorOf(n)]
}

interface BoardProps {
  amounts: Record<string, number>
  highlightNumbers: ReadonlySet<number> | null
  winningSpotIds: ReadonlySet<string> | null
  disabled: boolean
  onPlace: (spot: BetSpot) => void
}

export function BettingBoard({ amounts, highlightNumbers, winningSpotIds, disabled, onPlace }: BoardProps) {
  const inside = useMemo(buildInsideSpots, [])
  const seamSpots = useMemo(() => inside.filter((s) => s.kind !== 'straight'), [inside])
  const columns = useMemo(columnSpots, [])
  const dozens = useMemo(dozenSpots, [])
  const evenMoney = useMemo(evenMoneySpots, [])

  const place = (spot: BetSpot) => {
    if (disabled) return
    onPlace(spot)
  }

  const isHot = (nums: readonly number[]) =>
    highlightNumbers ? nums.some((n) => highlightNumbers.has(n)) : false

  const ChipBadge = ({ id }: { id: string }) =>
    amounts[id] ? (
      <div className="pointer-events-none absolute left-1/2 top-1/2 z-20 -translate-x-1/2 -translate-y-1/2 animate-chip-bounce">
        <Chip amount={amounts[id]!} size={26} />
      </div>
    ) : null

  return (
    <div className="select-none">
      <div className="flex gap-1">
        {/* ZERO cell spanning the 3 number rows */}
        <button
          type="button"
          disabled={disabled}
          onClick={() => place(inside.find((s) => s.id === 'straight:0')!)}
          className={cn(
            'relative flex w-9 shrink-0 items-center justify-center rounded-md border border-black/40 font-display text-lg font-bold text-white transition-[filter] hover:brightness-125 sm:w-11',
            winningSpotIds?.has('straight:0') && 'ring-2 ring-loss ring-offset-1 ring-offset-background',
            isHot([0]) && 'outline outline-2 outline-loss/70',
          )}
          style={{ minHeight: 132, background: feltBg(0) }}
        >
          0
          <ChipBadge id="straight:0" />
        </button>

        {/* Number grid + seams */}
        <div className="relative flex-1">
          <div
            className="grid gap-1"
            style={{
              gridTemplateColumns: `repeat(${COLS}, minmax(0,1fr))`,
              gridTemplateRows: `repeat(${ROWS}, 1fr)`,
            }}
          >
            {Array.from({ length: ROWS }).map((_, row) =>
              Array.from({ length: COLS }).map((__, col) => {
                const n = numAt(col, row)
                const sid = `straight:${n}`
                return (
                  <button
                    key={n}
                    type="button"
                    disabled={disabled}
                    onClick={() => place(inside.find((s) => s.id === sid)!)}
                    className={cn(
                      'relative flex aspect-[4/5] items-center justify-center rounded-[5px] border border-black/40 font-mono text-sm font-bold text-white transition-[filter] hover:brightness-125 sm:text-base',
                      winningSpotIds?.has(sid) && 'z-10 ring-2 ring-loss ring-offset-1 ring-offset-background',
                      isHot([n]) && 'outline outline-2 outline-loss/70',
                    )}
                    style={{ gridColumn: col + 1, gridRow: row + 1, background: feltBg(n) }}
                  >
                    {n}
                    <ChipBadge id={sid} />
                  </button>
                )
              }),
            )}
          </div>

          {/* Seam hotspots overlaid by fractional grid position */}
          <SeamLayer
            spots={seamSpots}
            amounts={amounts}
            winningSpotIds={winningSpotIds}
            disabled={disabled}
            onPlace={place}
          />
        </div>

        {/* Column 2:1 bets */}
        <div className="flex w-9 shrink-0 flex-col gap-1 sm:w-11">
          {columns.map((c) => (
            <OutsideButton
              key={c.id}
              spot={c}
              amount={amounts[c.id] ?? 0}
              win={winningSpotIds?.has(c.id) ?? false}
              hot={isHot(c.numbers)}
              disabled={disabled}
              onClick={place}
              className="flex-1"
            />
          ))}
        </div>
      </div>

      {/* Dozens */}
      <div className="mt-1 flex gap-1 pl-10 sm:pl-12">
        <div className="grid flex-1 grid-cols-3 gap-1 pr-10 sm:pr-12">
          {dozens.map((d) => (
            <OutsideButton
              key={d.id}
              spot={d}
              amount={amounts[d.id] ?? 0}
              win={winningSpotIds?.has(d.id) ?? false}
              hot={isHot(d.numbers)}
              disabled={disabled}
              onClick={place}
              className="h-9"
            />
          ))}
        </div>
      </div>

      {/* Even-money row */}
      <div className="mt-1 flex gap-1 pl-10 sm:pl-12">
        <div className="grid flex-1 grid-cols-6 gap-1 pr-10 sm:pr-12">
          {evenMoney.map((e) => (
            <OutsideButton
              key={e.id}
              spot={e}
              amount={amounts[e.id] ?? 0}
              win={winningSpotIds?.has(e.id) ?? false}
              hot={isHot(e.numbers)}
              disabled={disabled}
              onClick={place}
              className="h-9"
              bgColor={e.kind === 'red' ? FELT.red : e.kind === 'black' ? FELT.black : undefined}
            />
          ))}
        </div>
      </div>
    </div>
  )
}

function SeamLayer({
  spots,
  amounts,
  winningSpotIds,
  disabled,
  onPlace,
}: {
  spots: PositionedSpot[]
  amounts: Record<string, number>
  winningSpotIds: ReadonlySet<string> | null
  disabled: boolean
  onPlace: (spot: BetSpot) => void
}) {
  // grid is COLS columns × ROWS rows; map fractional (gx,gy) → percentage centers.
  return (
    <div className="pointer-events-none absolute inset-0">
      {spots.map((s) => {
        const leftPct = ((s.gx + 0.5) / COLS) * 100
        const topPct = ((s.gy + 0.5) / ROWS) * 100
        const active = !!amounts[s.id]
        return (
          <button
            key={s.id}
            type="button"
            disabled={disabled}
            onClick={() => onPlace(s)}
            aria-label={`${s.kind} ${s.numbers.join(', ')}`}
            className={cn(
              'group pointer-events-auto absolute z-10 flex -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full transition-colors',
              active ? 'size-7' : 'size-5 hover:bg-loss/25',
              winningSpotIds?.has(s.id) && 'ring-2 ring-loss',
            )}
            style={{ left: `${leftPct}%`, top: `${topPct}%` }}
          >
            {active ? (
              <div className="pointer-events-none absolute left-1/2 top-1/2 z-20 -translate-x-1/2 -translate-y-1/2 animate-chip-bounce">
                <Chip amount={amounts[s.id]!} size={24} />
              </div>
            ) : (
              <span className="size-1.5 rounded-full bg-loss/0 transition-colors group-hover:bg-loss" />
            )}
          </button>
        )
      })}
    </div>
  )
}

function OutsideButton({
  spot,
  amount,
  win,
  hot,
  disabled,
  onClick,
  className,
  bgColor,
}: {
  spot: BetSpot
  amount: number
  win: boolean
  hot: boolean
  disabled: boolean
  onClick: (s: BetSpot) => void
  className?: string
  bgColor?: string
}) {
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={() => onClick(spot)}
      style={bgColor ? { background: bgColor } : undefined}
      className={cn(
        'relative flex items-center justify-center rounded-md border border-black/40 font-mono text-[11px] font-bold uppercase tracking-wide text-white transition-[filter] hover:brightness-125 sm:text-xs',
        !bgColor && 'bg-secondary/80',
        win && 'z-10 ring-2 ring-loss ring-offset-1 ring-offset-background',
        hot && 'outline outline-2 outline-loss/70',
        className,
      )}
    >
      {spot.label}
      {amount > 0 && (
        <div className="pointer-events-none absolute left-1/2 top-1/2 z-20 -translate-x-1/2 -translate-y-1/2 animate-chip-bounce">
          <Chip amount={amount} size={24} />
        </div>
      )}
    </button>
  )
}
