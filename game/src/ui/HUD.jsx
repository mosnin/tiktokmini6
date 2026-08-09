import { useEffect, useRef, useState } from 'react'
import { useGame, run, REVIVE_AD_COSTS, MAX_REVIVES } from '../store.js'
import { fmt, fmtMoney } from '../consts.js'
import { sfx } from '../audio.js'
import { LEVELS } from '../game/levels.js'
import { CAMOS, camoById } from '../game/camos.js'
import { platform } from '../tiktok.js'
import ElevatorScreen from './ElevatorScreen.jsx'
import HangarScreen from './HangarScreen.jsx'
import ResultsScreen from './ResultsScreen.jsx'
import { CoinIcon, PlayAdIcon, ClockIcon, ShrinkIcon, ArmorIcon, SkullIcon, LockIcon } from './icons.jsx'
import { FlightJoystick, SpeedGauge } from './FlightControls.jsx'
import './flightcontrols.css'
import './hud.css'

function CoinPill() {
  const coins = useGame(s => s.coins)
  const [disp, setDisp] = useState(coins)
  const prev = useRef(coins)
  const rafRef = useRef(0)
  useEffect(() => {
    const from = prev.current
    prev.current = coins
    if (coins === from) { setDisp(coins); return }
    if (coins < from) { setDisp(coins); return }
    const t0 = performance.now(), dur = 900
    let lastTick = 0, i = 0
    cancelAnimationFrame(rafRef.current)
    const step = now => {
      const t = Math.min((now - t0) / dur, 1)
      const eased = 1 - Math.pow(1 - t, 3)
      setDisp(Math.floor(from + (coins - from) * eased))
      if (now - lastTick > 55 && t < 1) { sfx.counterTick?.(i++); lastTick = now }
      if (t < 1) rafRef.current = requestAnimationFrame(step)
      else sfx.counterDone?.()
    }
    rafRef.current = requestAnimationFrame(step)
    return () => cancelAnimationFrame(rafRef.current)
  }, [coins])
  return <div className="dc-coins"><CoinIcon size={24} /><span>{fmtMoney(disp)}</span></div>
}

function PowerupChip({ hud }) {
  if (!hud.powerup) return null
  const isSlow = hud.powerup.kind === 'slowmo'
  const deg = Math.round(hud.powerup.pct * 360)
  return (
    <div className={`dc-pu-chip dc-pu-${hud.powerup.kind}`}>
      <div className="dc-pu-ring" style={{ background: `conic-gradient(${isSlow ? '#3fd0ff' : '#c48af2'} ${deg}deg, rgba(255,255,255,.15) ${deg}deg)` }}>
        <div className="dc-pu-icon">{isSlow ? <ClockIcon size={20} /> : <ShrinkIcon size={20} />}</div>
      </div>
      <span>{isSlow ? 'SLOW-MO' : 'SHRINK'}</span>
    </div>
  )
}

// Bottom-left chip for a touched-but-not-yet-activated powerup. Tapping opens
// the existing rewarded-ad flow (store.activateStoredPowerup); the effect
// itself only starts once that ad finishes (see Gameplay's pendingActivation).
function StoredPowerupChip({ hud }) {
  const activateStoredPowerup = useGame(s => s.activateStoredPowerup)
  const adModal = useGame(s => s.adModal)
  if (!hud.storedPowerup) return null
  const isSlow = hud.storedPowerup.kind === 'slowmo'
  return (
    <button
      className={`dc-stored-chip dc-stored-${hud.storedPowerup.kind}`}
      onClick={() => { if (!adModal) activateStoredPowerup() }}
    >
      <span className="dc-stored-icon">{isSlow ? <ClockIcon size={20} /> : <ShrinkIcon size={20} />}</span>
      <span className="dc-stored-label">ACTIVATE<b>▸AD</b></span>
    </button>
  )
}

function LivesRow({ lives }) {
  return (
    <div className="dc-lives">
      {Array.from({ length: Math.max(lives, 1) }).map((_, i) => (
        <ArmorIcon key={i} size={18} style={{ opacity: i < lives ? 1 : 0.25 }} />
      ))}
    </div>
  )
}

function FlightHUD() {
  const hud = useGame(s => s.hud)
  const selectedDepth = useGame(s => s.selectedDepth)
  const level = LEVELS[selectedDepth - 1]
  return (
    <>
      <div className="dc-depth-badge">B{selectedDepth} <small>{level.theme.name}</small></div>
      <div className="dc-progress-wrap">
        <div className="dc-progress-bar"><i style={{ width: `${hud.progress * 100}%` }} /></div>
        <div className="dc-progress-label">{Math.round(hud.progress * 100)}% TO VAULT</div>
      </div>
      <LivesRow lives={hud.lives} />
      <PowerupChip hud={hud} />
      <StoredPowerupChip hud={hud} />
      <FlightJoystick />
      <SpeedGauge speed={hud.speed} max={level.maxSpeed} />
    </>
  )
}

function DescendingScreen() {
  const selectedDepth = useGame(s => s.selectedDepth)
  return (
    <div className="dc-descend">
      <div className="dc-descend-shaft">
        <div className="dc-descend-car" />
      </div>
      <div className="dc-descend-text">DESCENDING TO B{selectedDepth}</div>
      <div className="dc-descend-sub">{LEVELS[selectedDepth - 1].theme.name}</div>
    </div>
  )
}

function ReviveModal() {
  const declineRevive = useGame(s => s.declineRevive)
  const requestRevive = useGame(s => s.requestRevive)
  const cost = REVIVE_AD_COSTS[Math.min(run.reviveCount, MAX_REVIVES - 1)]
  const exhausted = run.reviveCount >= MAX_REVIVES
  return (
    <div className="dc-modal-wrap">
      <div className="dc-modal dc-panel">
        <div className="dc-modal-icon"><SkullIcon size={44} /></div>
        <h2>HULL BREACH</h2>
        <p>Continue from this point?</p>
        {!exhausted && (
          <button className="dc-btn dc-btn-amber dc-modal-btn" onClick={requestRevive}>
            <PlayAdIcon size={16} /> WATCH {cost > 1 ? `${cost} ADS` : 'AD'} TO CONTINUE
          </button>
        )}
        <button className="dc-btn dc-btn-ghost dc-modal-btn" onClick={declineRevive}>ABORT MISSION</button>
      </div>
    </div>
  )
}

function AdModal() {
  const ad = useGame(s => s.adModal)
  const close = useGame(s => s.closeAd)
  const [t, setT] = useState(3)
  useEffect(() => {
    if (!ad) return
    let cancelled = false
    const fn = ad.kind === 'rewarded' ? platform.showRewardedAd : platform.showInterstitialAd
    fn().then(res => { if (!cancelled && res !== null) close(!!res) })
    setT(3)
    const iv = setInterval(() => setT(x => x - 1), 1000)
    return () => { cancelled = true; clearInterval(iv) }
  }, [ad?.remaining])
  useEffect(() => { if (ad && t <= 0) close(true) }, [t, ad])
  if (!ad) return null
  return (
    <div className="dc-ad-overlay">
      <div className="dc-ad-box">
        <div className="dc-ad-tag">AD {ad.count > 1 ? `${ad.count - ad.remaining + 1}/${ad.count}` : ''}</div>
        <p>{ad.kind === 'rewarded' ? 'Rewarded ad placeholder' : 'Interstitial ad placeholder'}</p>
        <small>TikTok Mini Games SDK ad slot</small>
        <div className="dc-ad-count">{Math.max(t, 0)}</div>
      </div>
    </div>
  )
}

function UnlockCelebration() {
  const unlockCelebration = useGame(s => s.unlockCelebration)
  const dismissUnlock = useGame(s => s.dismissUnlock)
  if (unlockCelebration == null) return null
  return (
    <div className="dc-modal-wrap" onClick={dismissUnlock}>
      <div className="dc-celebrate">
        <div className="dc-celebrate-title">DEPTH UNLOCKED</div>
        <div className="dc-celebrate-depth">B{unlockCelebration}</div>
        <div className="dc-celebrate-tap">TAP TO CONTINUE</div>
      </div>
    </div>
  )
}

// "NEW CAMO UNLOCKED!" — 22% drop rolled on COLLECT (store.rollCamoDrop).
// Uses the same layered/gradient "3D text" treatment as the results screen
// (Feature 3) plus a swatch strip highlighting the freshly-unlocked finish.
function CamoUnlockPopup() {
  const camoUnlock = useGame(s => s.camoUnlock)
  const camos = useGame(s => s.camos)
  const dismissCamoUnlock = useGame(s => s.dismissCamoUnlock)
  if (!camoUnlock) return null
  const cur = camos[camoUnlock.missileIdx] ?? { unlocked: ['classic'] }
  const camo = camoById(camoUnlock.camoId)
  return (
    <div className="dc-modal-wrap dc-camo-pop-wrap" onClick={dismissCamoUnlock}>
      <div className="dc-camo-pop">
        <div className="dc-camo-pop-shadow" />
        <div className="dc-camo-pop-title dc-3d-text">NEW CAMO<br />UNLOCKED!</div>
        <div className="dc-camo-pop-name">{camo.name.toUpperCase()}</div>
        <div className="dc-camo-pop-swatches">
          {CAMOS.map(c => {
            const unlocked = cur.unlocked.includes(c.id)
            const isNew = c.id === camoUnlock.camoId
            return (
              <div key={c.id} className={`dc-camo-pop-swatch${isNew ? ' dc-camo-pop-swatch-new' : ''}${!unlocked ? ' dc-camo-pop-swatch-locked' : ''}`} style={{ background: c.swatch }}>
                {!unlocked && <LockIcon size={12} />}
              </div>
            )
          })}
        </div>
        <div className="dc-camo-pop-tap">EQUIPPED — TAP TO CONTINUE</div>
      </div>
    </div>
  )
}

export default function HUD() {
  const screen = useGame(s => s.screen)
  if (screen === 'loading') return null
  return (
    <div className="dc-hud dc-font">
      {screen !== 'flying' && <CoinPill />}
      {screen === 'elevator' && <ElevatorScreen />}
      {screen === 'hangar' && <HangarScreen />}
      {screen === 'descending' && <DescendingScreen />}
      {screen === 'flying' && <FlightHUD />}
      {screen === 'crashed' && <div className="dc-crash-flash" />}
      {screen === 'revive' && <ReviveModal />}
      {screen === 'results' && <ResultsScreen />}
      <UnlockCelebration />
      <CamoUnlockPopup />
      <AdModal />
    </div>
  )
}
