// Economy + stat math. missiles.js owns visuals/names, levels.js owns depth
// difficulty; this file owns the upgrade numbers.
import { MISSILES } from './missiles.js'

export const PART_KEYS = ['thrusters', 'armor', 'salvage']
export const PART_MAX = 20
export const PART_INFO = {
  thrusters: { label: 'THRUSTERS', desc: 'Steering response' },
  armor: { label: 'ARMOR', desc: 'Survive wall grazes' },
  salvage: { label: 'SALVAGE', desc: 'Coin multiplier' },
}

// Every 5th part level is unlocked by watching an ad instead of coins.
export const isAdLevel = lvl => lvl % 5 === 0

const BASE_COST = { thrusters: 140, armor: 190, salvage: 160 }

export const partCost = (missileIdx, part, lvl) => {
  const tier = Math.pow(5.2, missileIdx)
  return Math.round(BASE_COST[part] * tier * Math.pow(1.42, lvl - 1))
}

// Handling multiplier: how fast the missile accelerates toward the stick's
// target lateral velocity — higher = snappier, more precise steering.
export function handlingMult(missileIdx, thrustersLvl) {
  const base = MISSILES[missileIdx]?.baseHandling ?? 1
  return base * (0.85 + thrustersLvl * 0.045)
}

// Armor upgrade grants extra wall-graze survivals (a graze knocks any active
// powerup off + shakes the camera instead of ending the run). Missile tier
// adds its own baseline shield on top.
export function armorLives(armorLvl) {
  if (armorLvl >= 14) return 3
  if (armorLvl >= 7) return 2
  return 1
}
export function totalLives(missileIdx, armorLvl) {
  return armorLives(armorLvl) + (MISSILES[missileIdx]?.baseShield ?? 0)
}

// Salvage: income multiplier applied to the coin payout at the results screen.
export const salvageMult = lvl => 1 + (lvl - 1) * 0.22

// ---------- depth unlock economy ----------
// Cost (in coins) to buy past a locked depth without watching the unlock ad.
export const depthBuyPrice = depth => Math.round(900 * Math.pow(1.55, depth - 2))

export const isLastMissile = idx => idx >= MISSILES.length - 1
