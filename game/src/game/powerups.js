// Pickups: coins (sparse, worth 5) and the two power-ups (slow-mo, shrink).
// Generated from the same seeded RNG stream as the level's obstacles so the
// whole layout is reproducible.
import { mulberry32 } from './rng.js'
import { CORRIDOR_HALF_W as HW, CORRIDOR_HALF_H as HH } from '../consts.js'

export const POWERUP_DURATION = 10 // seconds
export const SLOWMO_FACTOR = 0.55
export const SHRINK_FACTOR = 0.5
export const COIN_VALUE = 5

let uid = 1

export function generatePickups(level) {
  // offset the seed from the obstacle generator so streams don't correlate
  const rnd = mulberry32(level.seed + 777)
  const pickups = []
  const startMargin = 40
  const endMargin = 60
  const usable = level.length - startMargin - endMargin

  // coins: loose clusters
  const coinGap = 46
  for (let d = startMargin; d < level.length - endMargin; d += coinGap * (0.7 + rnd() * 0.8)) {
    const clusterLen = 3 + Math.floor(rnd() * 3)
    const cx = (rnd() * 2 - 1) * (HW - 1.4)
    const cy = (rnd() * 2 - 1) * (HH - 1.6)
    for (let i = 0; i < clusterLen; i++) {
      pickups.push({ id: uid++, kind: 'coin', distance: d + i * 1.35, x: cx + Math.sin(i * 1.3) * 0.6, y: cy + i * 0.05, taken: false })
    }
  }

  // power-ups: sparse, alternating types, never within the first stretch
  const puCount = Math.max(2, Math.round(level.obstacleCount / 5))
  for (let i = 0; i < puCount; i++) {
    const d = startMargin + 70 + (usable - 70) * ((i + rnd() * 0.4) / puCount)
    const kind = i % 2 === 0 ? 'slowmo' : 'shrink'
    pickups.push({
      id: uid++, kind, distance: d,
      x: (rnd() * 2 - 1) * (HW - 1.6), y: (rnd() * 2 - 1) * (HH - 2.2), taken: false,
    })
  }
  return pickups.sort((a, b) => a.distance - b.distance)
}
