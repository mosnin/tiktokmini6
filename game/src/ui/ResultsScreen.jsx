import { useEffect, useRef, useState } from 'react'
import { useGame } from '../store.js'
import { fmt, fmtMoney } from '../consts.js'
import { sfx } from '../audio.js'
import { CoinIcon, PlayAdIcon, TrophyIcon, SkullIcon } from './icons.jsx'
import './results.css'

const CONFETTI_COLORS = ['#ffd76e', '#ffb020', '#4ade60', '#ff7a7a', '#3fd0ff', '#ffffff']

function useCountUp(to, from = 0, duration = 900) {
  const [display, setDisplay] = useState(from)
  const rafRef = useRef(0)
  useEffect(() => {
    if (window.matchMedia?.('(prefers-reduced-motion: reduce)').matches) { setDisplay(to); return }
    const t0 = performance.now()
    let lastTick = 0, i = 0
    cancelAnimationFrame(rafRef.current)
    const step = now => {
      const t = Math.min((now - t0) / duration, 1)
      const eased = 1 - Math.pow(1 - t, 3)
      setDisplay(Math.floor(from + (to - from) * eased))
      if (now - lastTick > 50 && t < 1) { sfx.counterTick?.(i++); lastTick = now }
      if (t < 1) rafRef.current = requestAnimationFrame(step)
      else sfx.counterDone?.()
    }
    rafRef.current = requestAnimationFrame(step)
    return () => cancelAnimationFrame(rafRef.current)
  }, [to, from, duration])
  return display
}

const WEDGES = [2, 3, 2.5, 5, 2.5, 10]
const WEDGE_COLORS = ['#5b8def', '#4ade60', '#f7b820', '#e8402f', '#f7b820', '#a03fff']
function pickWedge() {
  const r = Math.random()
  if (r < 0.28) return 1
  if (r < 0.55) return 2
  if (r < 0.72) return 4
  if (r < 0.86) return 0
  if (r < 0.95) return 3
  return 5
}

function Wheel({ onClaim, onSkip }) {
  const [angle, setAngle] = useState(0)
  const [landed, setLanded] = useState(null)
  const target = useRef(pickWedge())
  const rafRef = useRef(0)
  useEffect(() => {
    const wedge = target.current
    const final = 360 * 5 + (360 - (wedge * 60 + 30))
    const dur = 4000
    const t0 = performance.now()
    let lastPass = -1
    const step = now => {
      const t = Math.min((now - t0) / dur, 1)
      const eased = 1 - Math.pow(1 - t, 4)
      const a = final * eased
      setAngle(a)
      const pass = Math.floor(a / 60)
      if (pass !== lastPass) { lastPass = pass; sfx.counterTick?.(pass % 8) }
      if (t < 1) rafRef.current = requestAnimationFrame(step)
      else { setLanded(wedge); WEDGES[wedge] >= 3 ? sfx.jackpot?.() : sfx.counterDone?.() }
    }
    rafRef.current = requestAnimationFrame(step)
    return () => cancelAnimationFrame(rafRef.current)
  }, [])
  return (
    <div className="rs-wheel-overlay">
      <div className="rs-wheel-title">{landed !== null ? `x${WEDGES[landed]}!` : 'MULTIPLIER SPIN'}</div>
      <div className="rs-wheel-box">
        <div className="rs-wheel-pointer" />
        <div className="rs-wheel" style={{ transform: `rotate(${angle}deg)` }}>
          <svg className="rs-wheel-bg" viewBox="0 0 200 200">
            {WEDGES.map((w, i) => {
              const a0 = (i * 60 - 90) * Math.PI / 180, a1 = ((i + 1) * 60 - 90) * Math.PI / 180
              const x0 = 100 + 96 * Math.cos(a0), y0 = 100 + 96 * Math.sin(a0)
              const x1 = 100 + 96 * Math.cos(a1), y1 = 100 + 96 * Math.sin(a1)
              return <path key={i} d={`M100,100 L${x0},${y0} A96,96 0 0 1 ${x1},${y1} Z`} fill={WEDGE_COLORS[i]} stroke="#0a0c10" strokeWidth="2.5" />
            })}
            <circle cx="100" cy="100" r="97" fill="none" stroke="var(--dc-amber)" strokeWidth="6" />
            <circle cx="100" cy="100" r="16" fill="#0a0c10" stroke="var(--dc-amber)" strokeWidth="4" />
          </svg>
          {WEDGES.map((w, i) => (
            <div key={i} className="rs-wedge" style={{ transform: `rotate(${i * 60 + 30}deg)` }}><b>x{w}</b></div>
          ))}
        </div>
      </div>
      {landed !== null && (
        <div className="rs-wheel-actions">
          <button className="dc-btn dc-btn-amber rs-btn" onClick={() => onClaim(WEDGES[landed])}>
            <PlayAdIcon size={15} /> CLAIM x{WEDGES[landed]}
          </button>
          <button className="rs-skip" onClick={onSkip}>No thanks</button>
        </div>
      )}
    </div>
  )
}

export default function ResultsScreen() {
  const results = useGame(s => s.lastResults)
  const continueFromResults = useGame(s => s.continueFromResults)
  const claimWheel = useGame(s => s.claimWheel)
  const collect = useGame(s => s.collect)
  const unlockNextDepth = useGame(s => s.unlockNextDepth)
  const [showWheel, setShowWheel] = useState(true) // wheel-first: the spin IS the results moment
  const [collecting, setCollecting] = useState(false)
  const [unlocked, setUnlocked] = useState(false)
  const flyRef = useRef(null)

  const { won, depth, distance, earned = 0, grazes, isBest, canUnlockNext, wheelMult, collected } = results ?? {}
  const bigWin = (wheelMult ?? 1) >= 3 || won
  const pot = Math.floor(earned * (wheelMult ?? 1))
  const shownEarned = useCountUp(pot, wheelMult ? earned : 0)

  const doCollect = () => {
    if (collecting || collected) return
    setCollecting(true)
    const host = flyRef.current
    const pill = document.querySelector('.dc-hud .dc-coins')
    if (host && pill) {
      const hr = host.getBoundingClientRect(), pr = pill.getBoundingClientRect()
      const startX = hr.width / 2, startY = 20
      const targetX = (pr.left + pr.width / 2) - hr.left, targetY = (pr.top + pr.height / 2) - hr.top
      const n = 8, gap = 100
      for (let i = 0; i < n; i++) {
        const el = document.createElement('span')
        el.className = 'rs-flycoin'
        const jx = (Math.random() - 0.5) * 80
        el.style.left = `${startX + jx}px`; el.style.top = `${startY + (Math.random() - 0.5) * 20}px`
        host.appendChild(el)
        requestAnimationFrame(() => requestAnimationFrame(() => {
          el.style.transitionDelay = `${i * gap}ms`
          el.style.transform = `translate(${targetX - startX - jx}px, ${targetY - startY}px) scale(.4)`
          el.style.opacity = '0'
        }))
        setTimeout(() => { sfx.tickUp?.(6 + i * 2) }, i * gap + 460)
      }
      setTimeout(() => { while (host.firstChild) host.removeChild(host.firstChild) }, n * gap + 900)
    }
    setTimeout(() => collect(), 460)
    if (!canUnlockNext) setTimeout(() => continueFromResults(), 8 * 100 + 1000)
  }

  const doUnlock = () => { unlockNextDepth(true); setUnlocked(true); setTimeout(() => continueFromResults(), 1400) }

  if (!results) return null

  const statRows = [
    { key: 'distance', label: 'Distance', value: `${fmt(distance)}m` },
    { key: 'grazes', label: 'Grazes', value: grazes },
  ]
  if (wheelMult) statRows.push({ key: 'wheel', label: 'Wheel Bonus', value: `x${wheelMult}`, accent: true })

  return (
    <div className="rs-root">
      <div className="rs-dim" />
      {bigWin && (
        <div className="rs-confetti" aria-hidden="true">
          {Array.from({ length: 14 }).map((_, i) => (
            <span key={i} className="rs-confetti-piece" style={{ left: `${(i * 7.3) % 100}%`, background: CONFETTI_COLORS[i % 6], animationDelay: `${(i % 7) * 0.16}s` }} />
          ))}
        </div>
      )}

      <div className="rs-content">
        {bigWin && <div className="rs-bigwin">BIG WIN!</div>}
        <div className="rs-medallion">{won ? <TrophyIcon size={64} /> : <SkullIcon size={64} />}</div>
        <div className="rs-title-wrap">
          <h1 className={`rs-title dc-3d-text${won ? ' rs-title-win' : ' rs-title-loss'}`}>
            {won ? 'MISSION COMPLETE' : 'MISSION FAILED'}
          </h1>
          <div className="dc-3d-text-ground" />
        </div>
        {won && isBest && <div className="rs-ribbon">NEW BEST TIME</div>}

        <div className="rs-stats">
          {statRows.map((row, i) => (
            <div key={row.key}>
              {i > 0 && <div className="rs-divider" />}
              <div className={`rs-row rs-row-anim${row.accent ? ' rs-row-wheel' : ''}`} style={{ animationDelay: `${140 + i * 80}ms` }}>
                <span className="rs-label">{row.label}</span><b className="rs-value">{row.value}</b>
              </div>
            </div>
          ))}
        </div>

        <div className="rs-coinblock" ref={flyRef}>
          <div className="rs-collected-tag dc-3d-text-sm rs-row-anim" style={{ animationDelay: `${140 + statRows.length * 80}ms` }}>YOU COLLECTED</div>
          <div className="rs-earned" style={{ animationDelay: `${140 + statRows.length * 80 + 160}ms` }}>
            <CoinIcon size={26} /> <span className="dc-3d-text">{fmtMoney(shownEarned)}</span>
          </div>
        </div>
      </div>

      <div className="rs-buttons">
        {!wheelMult && !collected && (
          <button className="dc-btn dc-btn-purple rs-btn" onClick={() => { sfx.click?.(); setShowWheel(true) }}>
            <PlayAdIcon size={15} /> SPIN x5
          </button>
        )}
        {!collected ? (
          <button className="dc-btn dc-btn-amber rs-btn" onClick={doCollect} disabled={collecting}>{collecting ? '...' : 'COLLECT'}</button>
        ) : canUnlockNext && !unlocked ? (
          <button className="dc-btn dc-btn-amber rs-btn" onClick={doUnlock}><PlayAdIcon size={15} /> UNLOCK B{depth + 1}</button>
        ) : (
          <button className="dc-btn dc-btn-ghost rs-btn" onClick={continueFromResults}>CONTINUE</button>
        )}
      </div>

      {showWheel && !wheelMult && !collected && (
        <Wheel onClaim={m => { setShowWheel(false); claimWheel(m) }} onSkip={() => { sfx.click?.(); setShowWheel(false) }} />
      )}
    </div>
  )
}
