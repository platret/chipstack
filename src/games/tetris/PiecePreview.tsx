import { PIECE_CELLS, PIECE_COLORS, type PieceType } from './pieces'

export function PiecePreview({ type, cell = 15 }: { type: PieceType | null; cell?: number }) {
  const boxW = 4 * cell
  const boxH = 2 * cell
  if (!type) return <div style={{ width: boxW, height: boxH }} />

  const cells = PIECE_CELLS[type][0]
  const xs = cells.map((c) => c[0])
  const ys = cells.map((c) => c[1])
  const minX = Math.min(...xs)
  const maxX = Math.max(...xs)
  const minY = Math.min(...ys)
  const maxY = Math.max(...ys)
  const w = maxX - minX + 1
  const h = maxY - minY + 1
  const color = PIECE_COLORS[type]
  const offX = (4 - w) / 2
  const offY = (2 - h) / 2

  return (
    <div className="relative" style={{ width: boxW, height: boxH }}>
      {cells.map(([cx, cy], i) => (
        <div
          key={i}
          className="absolute rounded-[3px]"
          style={{
            width: cell - 2,
            height: cell - 2,
            left: (cx - minX + offX) * cell + 1,
            top: (cy - minY + offY) * cell + 1,
            background: color,
            boxShadow: `inset 0 2px 0 rgba(255,255,255,0.35), 0 0 8px ${color}66`,
          }}
        />
      ))}
    </div>
  )
}
