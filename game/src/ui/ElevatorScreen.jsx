import { useState } from 'react'
import { useGame } from '../store.js'
import { LEVELS, LEVEL_COUNT } from '../game/levels.js'
import { depthBuyPrice } from '../game/progression.js'
import { fmtMoney } from '../consts.js'
import { LockIcon, PlayAdIcon, MissileIcon, DepthIcon } from './icons.jsx'
import './elevator.css'

function UnlockSheet({ depth, onClose }) {
  const coins = useGame(s => s.coins)
  const unlockNextDepth = useGame(s => s.unlockNextDepth)
  const price = depthBuyPrice(depth)
  return (
    <div className="dc-modal-wrap" onClick={onClose}>
      <div className="dc-panel dc-unlock-sheet" onClick={e => e.stopPropagation()}>
        <div className="dc-unlock-title">UNLOCK B{depth}</div>
        <p>Descend deeper into the facility.</p>
        <button className="dc-btn dc-btn-amber dc-modal-btn" onClick={() => { unlockNextDepth(true); onClose() }}>
          <PlayAdIcon size={16} /> WATCH AD
        </button>
        <button
          className="dc-btn dc-btn-ghost dc-modal-btn"
          disabled={coins < price}
          onClick={() => { unlockNextDepth(false); onClose() }}
        >
          PAY {fmtMoney(price)}
        </button>
        <button className="dc-unlock-cancel" onClick={onClose}>Cancel</button>
      </div>
    </div>
  )
}

export default function ElevatorScreen() {
  const unlockedDepth = useGame(s => s.unlockedDepth)
  const selectDepth = useGame(s => s.selectDepth)
  const toHangar = useGame(s => s.toHangar)
  const bestTime = useGame(s => s.bestTime)
  const [unlockTarget, setUnlockTarget] = useState(null)

  return (
    <div className="dc-elev-root">
      <div className="dc-elev-header">
        <DepthIcon size={22} />
        <div>
          <div className="dc-elev-title">DEPTH CHARGE</div>
          <div className="dc-elev-sub">SELECT DESCENT LEVEL</div>
        </div>
      </div>

      <div className="dc-elev-shaft">
        {LEVELS.map(level => {
          const d = level.depth
          const unlocked = d <= unlockedDepth
          const isNext = d === unlockedDepth + 1
          const best = bestTime[d]
          return (
            <button
              key={d}
              className={`dc-elev-row${unlocked ? '' : ' dc-elev-locked'}${d === unlockedDepth ? ' dc-elev-current' : ''}`}
              onClick={() => (unlocked ? selectDepth(d) : isNext ? setUnlockTarget(d) : null)}
            >
              <div className="dc-elev-num">B{d}</div>
              <div className="dc-elev-info">
                <div className="dc-elev-name">{level.theme.name}</div>
                <div className="dc-elev-meta">{best != null ? `Best ${best.toFixed(1)}s` : `~${level.estDurationSec}s run`}</div>
              </div>
              {!unlocked && <div className="dc-elev-lock"><LockIcon size={20} /></div>}
              {unlocked && <div className="dc-elev-go">GO</div>}
            </button>
          )
        })}
      </div>

      <button className="dc-elev-hangar" onClick={toHangar}>
        <MissileIcon size={22} /> MISSILE HANGAR
      </button>

      {unlockTarget != null && <UnlockSheet depth={unlockTarget} onClose={() => setUnlockTarget(null)} />}
    </div>
  )
}
