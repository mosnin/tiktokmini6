import { useGame } from '../store.js'
import { fmt } from '../consts.js'
import { PART_KEYS, PART_INFO, PART_MAX, partCost, isAdLevel, salvageMult, totalLives } from '../game/progression.js'
import { MISSILES, isMissileUnlocked } from '../game/missiles.js'
import { ThrusterIcon, ArmorIcon, SalvageIcon, PlayAdIcon, LockIcon, CoinIcon } from './icons.jsx'
import './hangar.css'

const PART_COLORS = { thrusters: '#ff8a1f', armor: '#5b8def', salvage: '#f7b820' }
const PART_ICONS = { thrusters: ThrusterIcon, armor: ArmorIcon, salvage: SalvageIcon }
const EMPTY_PARTS = { thrusters: 1, armor: 1, salvage: 1 }

function PartCard({ partKey, missileIdx, parts, coins, locked, buyPart }) {
  const info = PART_INFO[partKey]
  const lvl = parts[partKey]
  const filled = ((lvl - 1) % 5) + 1
  const maxed = lvl >= PART_MAX
  const cost = maxed ? 0 : partCost(missileIdx, partKey, lvl)
  const adLevel = !maxed && isAdLevel(lvl)
  const afford = coins >= cost
  const Icon = PART_ICONS[partKey]
  const readout = partKey === 'salvage' ? `x${salvageMult(lvl).toFixed(2).replace(/\.?0+$/, '')}`
    : partKey === 'armor' ? `${totalLives(missileIdx, lvl)} HP` : `LV ${lvl}`

  return (
    <div className={`hg-card${locked ? ' hg-card-locked' : ''}`}>
      <div className="hg-card-head"><span>{info.label}</span><i className="hg-badge">{readout}</i></div>
      <div className={`hg-card-art`} style={{ color: PART_COLORS[partKey] }}><Icon size={44} /></div>
      <div className="hg-pips">
        {[0, 1, 2, 3, 4].map(i => <i key={i} style={i < filled ? { background: PART_COLORS[partKey] } : undefined} />)}
      </div>
      <button
        className={`hg-buy${!adLevel && !afford && !maxed ? ' hg-buy-cant' : ''}`}
        style={!adLevel && !maxed ? { background: `linear-gradient(180deg, ${PART_COLORS[partKey]}, ${PART_COLORS[partKey]})` } : undefined}
        disabled={locked || maxed}
        onClick={() => buyPart(partKey)}
      >
        {maxed ? <b>MAX</b> : adLevel ? (
          <><span className="hg-buy-top"><PlayAdIcon size={13} /> WATCH AD</span><b>FREE</b></>
        ) : (
          <><span className="hg-buy-top">UPGRADE</span><b><CoinIcon size={13} /> {fmt(cost)}</b></>
        )}
      </button>
    </div>
  )
}

export default function HangarScreen() {
  const viewMissileIdx = useGame(s => s.viewMissileIdx)
  const missileIdx = useGame(s => s.missileIdx)
  const unlockedDepth = useGame(s => s.unlockedDepth)
  const coins = useGame(s => s.coins)
  const parts = useGame(s => s.parts)
  const viewMissile = useGame(s => s.viewMissile)
  const selectMissile = useGame(s => s.selectMissile)
  const buyPart = useGame(s => s.buyPart)
  const toElevator = useGame(s => s.toElevator)

  const def = MISSILES[viewMissileIdx]
  const locked = !isMissileUnlocked(viewMissileIdx, unlockedDepth)
  const viewParts = parts[viewMissileIdx] ?? EMPTY_PARTS
  const showSelect = !locked && viewMissileIdx !== missileIdx

  return (
    <div className="hg-root">
      <button className="hg-back" onClick={toElevator}>‹ ELEVATOR</button>
      <div className="hg-banner">
        <div className="hg-banner-name">{def.name}</div>
        <div className="hg-banner-sub">{def.subtitle}</div>
      </div>

      <div className="hg-dots">
        {MISSILES.map((m, i) => (
          <span key={m.id} className={'hg-dot ' + (i === viewMissileIdx ? 'hg-dot-cur' : isMissileUnlocked(i, unlockedDepth) ? 'hg-dot-unlocked' : 'hg-dot-locked')} />
        ))}
      </div>

      {viewMissileIdx > 0 && <button className="hg-arrow hg-arrow-l" onClick={() => viewMissile(viewMissileIdx - 1)}>‹</button>}
      {viewMissileIdx < MISSILES.length - 1 && <button className="hg-arrow hg-arrow-r" onClick={() => viewMissile(viewMissileIdx + 1)}>›</button>}

      {locked && (
        <div className="hg-lock-overlay">
          <div className="hg-lock-card">
            <div className="hg-lock-icon"><LockIcon size={36} /></div>
            <div className="hg-lock-text">Unlocks at Depth B{def.unlockLevel}</div>
          </div>
        </div>
      )}

      <div className="hg-cards">
        {PART_KEYS.map(key => (
          <PartCard key={key} partKey={key} missileIdx={viewMissileIdx} parts={viewParts} coins={coins} locked={locked} buyPart={buyPart} />
        ))}
      </div>

      {showSelect && <button className="hg-select-pill" onClick={() => selectMissile(viewMissileIdx)}>EQUIP THIS MISSILE</button>}
      {!locked && !showSelect && <div className="hg-equipped">EQUIPPED</div>}
    </div>
  )
}
