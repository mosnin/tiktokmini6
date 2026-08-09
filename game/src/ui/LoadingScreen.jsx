import { useEffect, useState } from 'react'
import { useGame } from '../store.js'
import { DepthIcon } from './icons.jsx'
import './loading.css'

export default function LoadingScreen() {
  const bootDone = useGame(s => s.bootDone)
  const [pct, setPct] = useState(0)
  useEffect(() => {
    const t0 = performance.now()
    let raf
    const tick = () => {
      const p = Math.min(100, ((performance.now() - t0) / 1400) * 100)
      setPct(p)
      if (p < 100) raf = requestAnimationFrame(tick)
    }
    raf = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(raf)
  }, [])

  return (
    <div className="ld-root dc-font">
      <div className="ld-glow" />
      <div className="ld-logo">
        <DepthIcon size={40} />
        <div className="ld-title">DEPTH<span>CHARGE</span></div>
      </div>
      <div className="ld-sub">UNDERGROUND MISSILE RUN</div>
      <div className="ld-bar"><i style={{ width: `${pct}%` }} /></div>
      <div className="ld-pct">{Math.round(pct)}%</div>
      {pct >= 100 && (
        <button className="dc-btn dc-btn-amber ld-play" onClick={bootDone}>LAUNCH</button>
      )}
    </div>
  )
}
