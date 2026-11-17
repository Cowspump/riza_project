import { useEffect, useMemo, useRef, useState } from 'react'
import { tenge } from './api'

const MAX_SLOTS = 10
const SIZE = 340
const CENTER = SIZE / 2
const RADIUS = CENTER - 6
const SPIN_MS = 4600
const COLORS = ['#c46a45', '#3f6b52', '#c8893a', '#8d2f24', '#8a7a4f']

function sample(list, count) {
  const copy = [...list]
  for (let i = copy.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[copy[i], copy[j]] = [copy[j], copy[i]]
  }
  return copy.slice(0, count)
}

function colorAt(index, total) {
  // the last slice must differ from the first one it touches
  if (total > 1 && index === total - 1 && index % COLORS.length === 0) return COLORS[2]
  return COLORS[index % COLORS.length]
}

function point(angleDeg, radius) {
  const rad = ((angleDeg - 90) * Math.PI) / 180
  return [CENTER + radius * Math.cos(rad), CENTER + radius * Math.sin(rad)]
}

function slicePath(index, total) {
  const step = 360 / total
  const [x1, y1] = point(index * step, RADIUS)
  const [x2, y2] = point((index + 1) * step, RADIUS)
  const large = step > 180 ? 1 : 0
  return `M${CENTER} ${CENTER} L${x1} ${y1} A${RADIUS} ${RADIUS} 0 ${large} 1 ${x2} ${y2} Z`
}

function shorten(text, limit) {
  return text.length > limit ? `${text.slice(0, limit - 1)}…` : text
}

export default function FortuneWheel({ dishes, inCart, onAdd, onClose }) {
  const [filter, setFilter] = useState('Все')
  const [slots, setSlots] = useState([])
  const [rotation, setRotation] = useState(0)
  const [animate, setAnimate] = useState(false)
  const [spinning, setSpinning] = useState(false)
  const [winner, setWinner] = useState(null)
  const pending = useRef(null)
  const timers = useRef([])

  const categories = useMemo(() => ['Все', ...new Set(dishes.map((dish) => dish.category))], [dishes])
  const pool = useMemo(
    () => dishes.filter((dish) => filter === 'Все' || dish.category === filter),
    [dishes, filter],
  )

  useEffect(() => {
    setSlots(sample(pool, MAX_SLOTS))
    setRotation(0)
    setAnimate(false)
    setWinner(null)
  }, [pool])

  useEffect(() => {
    function onKey(event) {
      if (event.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])

  useEffect(() => () => timers.current.forEach(clearTimeout), [])

  function spin() {
    if (spinning || pool.length === 0) return
    const reduced = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches
    const next = sample(pool, MAX_SLOTS)
    const index = Math.floor(Math.random() * next.length)
    const step = 360 / next.length
    const jitter = (Math.random() - 0.5) * step * 0.7
    const target = 360 * (reduced ? 1 : 5 + Math.floor(Math.random() * 3)) - (index + 0.5) * step + jitter

    pending.current = next[index]
    setWinner(null)
    setSpinning(true)
    setAnimate(false)
    setRotation(0)
    setSlots(next)

    timers.current.push(
      setTimeout(() => {
        setAnimate(true)
        setRotation(target)
      }, 50),
      setTimeout(() => {
        setSpinning(false)
        setWinner(pending.current)
      }, 50 + (reduced ? 0 : SPIN_MS) + 120),
    )
  }

  const total = slots.length
  const step = total ? 360 / total : 360
  const duration = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ? 0 : SPIN_MS

  return (
    <div className="wheel-backdrop" onClick={onClose}>
      <section
        className="wheel-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="wheel-title"
        onClick={(event) => event.stopPropagation()}
      >
        <header className="wheel-head">
          <div>
            <h2 id="wheel-title">Колесо фортуны</h2>
            <p>Не знаете, что заказать? Крутим — колесо выберет блюдо.</p>
          </div>
          <button type="button" className="wheel-close" onClick={onClose} aria-label="Закрыть">×</button>
        </header>

        <div className="wheel-cats">
          {categories.map((name) => (
            <button
              key={name}
              type="button"
              className={name === filter ? 'on' : ''}
              disabled={spinning}
              onClick={() => setFilter(name)}
            >
              {name}
            </button>
          ))}
        </div>

        <div className="wheel-stage">
          <div className="wheel-pointer" aria-hidden="true" />
          <svg
            className="wheel-disc"
            viewBox={`0 0 ${SIZE} ${SIZE}`}
            style={{
              transform: `rotate(${rotation}deg)`,
              transition: animate ? `transform ${duration}ms cubic-bezier(0.12, 0.6, 0.12, 1)` : 'none',
            }}
            role="img"
            aria-label="Колесо с блюдами"
          >
            {slots.map((dish, index) => {
              const middle = index * step + step / 2
              const [tx, ty] = point(middle, RADIUS * 0.94)
              return (
                <g key={`${dish.id}-${index}`}>
                  <path d={slicePath(index, total)} fill={colorAt(index, total)} stroke="#f7f1e6" strokeWidth="2" />
                  <text
                    x={tx}
                    y={ty}
                    transform={`rotate(${middle - 90} ${tx} ${ty})`}
                    textAnchor="end"
                    dominantBaseline="middle"
                    className="wheel-label"
                  >
                    {shorten(dish.name, total > 6 ? 16 : 22)}
                  </text>
                </g>
              )
            })}
            <circle cx={CENTER} cy={CENTER} r="26" fill="#f7f1e6" stroke="#241910" strokeWidth="2" />
          </svg>
        </div>

        <div className="wheel-result" aria-live="polite">
          {winner ? (
            <>
              <p className="wheel-kicker">Колесо выбрало · {winner.category}</p>
              <h3>{winner.name}</h3>
              <p className="wheel-desc">{winner.description}</p>
              <p className="wheel-price">{tenge(winner.price)}</p>
              <div className="wheel-actions">
                <button type="button" className="action" onClick={() => onAdd(winner.id)}>
                  {inCart[winner.id] ? `В чеке ${inCart[winner.id]} · ещё одну` : 'Добавить в чек'}
                </button>
                <button type="button" className="quiet" onClick={spin}>Крутить ещё</button>
              </div>
            </>
          ) : (
            <button type="button" className="action wheel-spin" onClick={spin} disabled={spinning || pool.length === 0}>
              {spinning ? 'Крутится…' : 'Крутить'}
            </button>
          )}
        </div>
      </section>
    </div>
  )
}
