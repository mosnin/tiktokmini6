import { create } from 'zustand'
import { MISSILES, isMissileUnlocked } from './game/missiles.js'
import {
  PART_KEYS, partCost, isAdLevel, handlingMult, totalLives, salvageMult, depthBuyPrice,
} from './game/progression.js'
import { LEVELS, LEVEL_COUNT } from './game/levels.js'
import { sfx } from './audio.js'

const KEY = 'depthcharge-save-v1'
const load = () => { try { return JSON.parse(localStorage.getItem(KEY)) || {} } catch { return {} } }
const s = load()

const freshParts = () => ({ thrusters: 1, armor: 1, salvage: 1 })

// Revive cost escalates per attempt within the same run: 1st, 2nd, 3rd revive
// need 1 / 1 / 2 ads respectively.
export const REVIVE_AD_COSTS = [1, 1, 2]
export const MAX_REVIVES = REVIVE_AD_COSTS.length

// Fast-changing run data lives outside React state — the 3D loop mutates
// this object and the HUD samples it at ~12Hz via syncHud.
export const run = {
  traveled: 0, speed: 0, coinsThisRun: 0, obstaclesCleared: 0, grazes: 0,
  powerup: null,        // { kind: 'slowmo'|'shrink', endsAt }
  reviveCount: 0,
  livesLeft: 1,
  finished: false,
}

export const useGame = create((set, get) => ({
  screen: 'loading', // loading | elevator | hangar | descending | flying | crashed | revive | results
  coins: s.coins ?? 400,
  missileIdx: s.missileIdx ?? 0,
  viewMissileIdx: s.missileIdx ?? 0,
  unlockedDepth: s.unlockedDepth ?? 1,     // highest depth playable
  selectedDepth: s.selectedDepth ?? 1,
  parts: s.parts ?? { 0: freshParts() },
  bestTime: s.bestTime ?? {},              // depth -> best clear time (s)
  runs: s.runs ?? 0,
  hud: { traveled: 0, speed: 0, progress: 0, lives: 1, powerup: null },
  flightSeq: 0, // bumped on every beginFlight() so a replay of the SAME depth still rebuilds fresh obstacles/pickups
  lastResults: null,
  adModal: null,          // { kind, count, remaining, onDone }
  unlockCelebration: null,

  save() {
    const g = get()
    localStorage.setItem(KEY, JSON.stringify({
      coins: g.coins, missileIdx: g.missileIdx, unlockedDepth: g.unlockedDepth,
      selectedDepth: g.selectedDepth, parts: g.parts, bestTime: g.bestTime, runs: g.runs,
    }))
  },

  currentParts: () => get().parts[get().missileIdx] ?? freshParts(),
  statsFor(idx) {
    const p = get().parts[idx] ?? freshParts()
    return {
      handling: handlingMult(idx, p.thrusters),
      lives: totalLives(idx, p.armor),
      income: salvageMult(p.salvage),
      parts: p,
    }
  },

  // ---------- screens ----------
  bootDone() { set({ screen: 'elevator' }) },
  toElevator() { sfx.click(); set({ screen: 'elevator', lastResults: null }) },
  toHangar() { sfx.click(); set({ screen: 'hangar', viewMissileIdx: get().missileIdx }) },
  setPhase: screen => set({ screen }),
  syncHud: hud => set({ hud }),

  // ---------- hangar ----------
  viewMissile(idx) {
    if (idx < 0 || idx >= MISSILES.length) return
    sfx.swoosh(); set({ viewMissileIdx: idx })
  },
  selectMissile(idx) {
    if (!isMissileUnlocked(idx, get().unlockedDepth)) return
    sfx.click(); set({ missileIdx: idx, viewMissileIdx: idx }); get().save()
  },
  buyPart(part) {
    const g = get()
    const idx = g.viewMissileIdx
    if (!isMissileUnlocked(idx, g.unlockedDepth)) return
    const parts = g.parts[idx] ?? freshParts()
    const lvl = parts[part]
    if (lvl >= 20) return
    const apply = () => {
      const cur = get()
      const p = { ...(cur.parts[idx] ?? freshParts()) }
      p[part] += 1
      set({ parts: { ...cur.parts, [idx]: p } })
      get().save(); sfx.upgrade()
    }
    if (isAdLevel(lvl)) return g.showAd('rewarded', apply)
    const cost = partCost(idx, part, lvl)
    if (g.coins < cost) return sfx.deny()
    set({ coins: g.coins - cost })
    apply()
  },

  // ---------- elevator / depth select ----------
  selectDepth(depth) {
    const g = get()
    if (depth > g.unlockedDepth) return
    sfx.click()
    set({ selectedDepth: depth, screen: 'descending' })
  },
  beginFlight() {
    const g = get()
    const level = LEVELS[g.selectedDepth - 1]
    const stats = g.statsFor(g.missileIdx)
    run.traveled = 0; run.speed = level.baseSpeed; run.coinsThisRun = 0; run.obstaclesCleared = 0
    run.grazes = 0; run.powerup = null; run.reviveCount = 0; run.livesLeft = stats.lives; run.finished = false
    g.syncHud({ traveled: 0, speed: level.baseSpeed, progress: 0, lives: run.livesLeft, powerup: null })
    set({ screen: 'flying', flightSeq: g.flightSeq + 1 })
  },

  // ---------- flight outcome ----------
  registerGraze() {
    sfx.graze()
    run.grazes += 1
    run.powerup = null
  },
  crash() {
    set({ screen: 'crashed' })
  },
  requestRevive() {
    if (run.reviveCount >= MAX_REVIVES) { get().finishRun(false); return }
    const cost = REVIVE_AD_COSTS[run.reviveCount]
    set({ screen: 'revive' })
    get().showAd('rewarded', () => {
      run.reviveCount += 1
      run.livesLeft = 1
      set({ screen: 'flying' })
    }, cost)
  },
  declineRevive() { get().finishRun(false) },

  finishRun(won) {
    const g = get()
    const level = LEVELS[g.selectedDepth - 1]
    const stats = g.statsFor(g.missileIdx)
    const distanceCoins = Math.floor(run.traveled * 0.12 * stats.income)
    const earned = Math.floor((distanceCoins + run.coinsThisRun) * stats.income)
    const prevBest = g.bestTime[g.selectedDepth]
    const nowSec = run.traveled / Math.max(1, level.baseSpeed)
    const isBest = won && (prevBest == null || nowSec < prevBest)
    const bestTime = isBest ? { ...g.bestTime, [g.selectedDepth]: nowSec } : g.bestTime
    const canUnlockNext = won && g.selectedDepth === g.unlockedDepth && g.unlockedDepth < LEVEL_COUNT
    set({
      bestTime, runs: g.runs + 1,
      lastResults: {
        won, depth: g.selectedDepth, distance: Math.floor(run.traveled), earned,
        grazes: run.grazes, isBest, canUnlockNext, wheelMult: null, collected: false,
      },
      screen: 'results',
    })
    get().save()
    if (won) sfx.goal()
  },

  claimWheel(mult) {
    const g = get()
    if (!g.lastResults || g.lastResults.wheelMult || g.lastResults.collected) return
    g.showAd('rewarded', () => {
      const cur = get()
      set({ lastResults: { ...cur.lastResults, wheelMult: mult } })
      if (mult >= 3) sfx.jackpot(); else sfx.counterDone?.()
    })
  },
  collect() {
    const g = get()
    const r = g.lastResults
    if (!r || r.collected) return 0
    const total = Math.floor(r.earned * (r.wheelMult ?? 1))
    set({ coins: g.coins + total, lastResults: { ...r, collected: true, total } })
    get().save()
    return total
  },

  unlockNextDepth(viaAd) {
    const g = get()
    if (g.unlockedDepth >= LEVEL_COUNT) return
    const next = g.unlockedDepth + 1
    const grant = () => {
      set({ unlockedDepth: next, unlockCelebration: next })
      get().save(); sfx.unlockNext()
    }
    if (viaAd) g.showAd('rewarded', grant)
    else {
      const price = depthBuyPrice(next)
      if (g.coins < price) return sfx.deny()
      set({ coins: g.coins - price })
      grant()
    }
  },
  dismissUnlock() { set({ unlockCelebration: null }) },

  continueFromResults() {
    const g = get()
    sfx.click()
    const next = () => set({ screen: 'elevator', lastResults: null })
    if (g.runs > 0 && g.runs % 2 === 0) g.showAd('interstitial', next)
    else next()
  },

  // ---------- TikTok SDK seam (stub modal in browser); `count` chains N
  // sequential ad-watches before onDone fires (escalating revive cost). ----------
  showAd(kind, onDone, count = 1) {
    set({ adModal: { kind, count, remaining: count, onDone } })
  },
  closeAd(granted) {
    const m = get().adModal
    if (!granted) { set({ adModal: null }); return }
    if (m && m.remaining > 1) {
      set({ adModal: { ...m, remaining: m.remaining - 1 } })
      return
    }
    set({ adModal: null })
    if (m?.onDone) m.onDone()
  },
}))

window.__store = useGame // debug/testing hook — also used by the difficulty auto-steerer

setInterval(() => useGame.getState().save(), 15000)
window.addEventListener('visibilitychange', () => {
  if (document.visibilityState === 'hidden') useGame.getState().save()
})
