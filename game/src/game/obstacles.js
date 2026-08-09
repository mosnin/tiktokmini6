// Pure-data obstacle generation + collision math (no three.js import — this
// module is deterministic and testable on its own, including by the
// difficulty auto-steerer script).
import { mulberry32 } from './rng.js'
import { availableTypes } from './levels.js'
import { CORRIDOR_HALF_W as HW, CORRIDOR_HALF_H as HH } from '../consts.js'

export const MISSILE_RADIUS = 0.62 // base hitbox radius (before missile/shrink scaling)
const WALL_MARGIN = 0.55           // keep holes from touching the physical wall

// ---------- hole placement ----------
function randomHoleCenter(rnd, r) {
  const mx = HW - r - WALL_MARGIN, my = HH - r - WALL_MARGIN
  return { x: (rnd() * 2 - 1) * Math.max(mx, 0.2), y: (rnd() * 2 - 1) * Math.max(my, 0.2) }
}

function makeWallHole(rnd, holeScale) {
  const shapeRoll = rnd()
  const shape = shapeRoll < 0.4 ? 'circle' : shapeRoll < 0.75 ? 'square' : 'slot'
  if (shape === 'circle') {
    const r = (1.85 + rnd() * 0.55) * holeScale
    const c = randomHoleCenter(rnd, r)
    return { shape, r, cx: c.x, cy: c.y }
  }
  if (shape === 'square') {
    const r = (1.7 + rnd() * 0.5) * holeScale
    const c = randomHoleCenter(rnd, r)
    return { shape, r, cx: c.x, cy: c.y }
  }
  // slot: long axis picked randomly
  const vertical = rnd() < 0.5
  const w = (vertical ? 1.7 : 3.4) * holeScale
  const h = (vertical ? 3.4 : 1.7) * holeScale
  const c = randomHoleCenter(rnd, Math.max(w, h) * 0.5)
  return { shape: 'slot', w, h, cx: c.x, cy: c.y }
}

function holeContains(hole, x, y, margin) {
  const dx = x - hole.cx, dy = y - hole.cy
  if (hole.shape === 'circle') return Math.hypot(dx, dy) <= hole.r - margin
  if (hole.shape === 'square') return Math.abs(dx) <= hole.r - margin && Math.abs(dy) <= hole.r - margin
  return Math.abs(dx) <= hole.w / 2 - margin && Math.abs(dy) <= hole.h / 2 - margin
}

// ---------- per-type generators ----------
let uid = 1
function baseObs(type, distance, extra) { return { id: uid++, type, distance, resolved: false, ...extra } }

function genWall(rnd, distance, holeScale) {
  return baseObs('wall', distance, { hole: makeWallHole(rnd, holeScale) })
}

function genSturn(rnd, distance, holeScale, gap) {
  const side = rnd() < 0.5 ? -1 : 1
  const r1 = (1.9 + rnd() * 0.4) * holeScale
  const r2 = (1.9 + rnd() * 0.4) * holeScale
  // moderate offsets — the point is a readable weave, not a full wall-to-wall
  // sprint the player can't physically complete in the time the gap allows
  const x1 = side * (HW - r1 - WALL_MARGIN) * (0.4 + rnd() * 0.25)
  const x2 = -side * (HW - r2 - WALL_MARGIN) * (0.4 + rnd() * 0.25)
  const y1 = (rnd() * 2 - 1) * (HH - r1 - WALL_MARGIN) * 0.6
  const y2 = (rnd() * 2 - 1) * (HH - r2 - WALL_MARGIN) * 0.6
  return [
    baseObs('wall', distance, { hole: { shape: 'circle', r: r1, cx: x1, cy: y1 } }),
    baseObs('wall', distance + gap, { hole: { shape: 'circle', r: r2, cx: x2, cy: y2 } }),
  ]
}

function genLaser(rnd, distance, depth) {
  const axis = rnd() < 0.5 ? 'h' : 'v'
  const mode = depth >= 6 && rnd() < 0.4 ? 'sweep' : 'blink'
  const bandHalf = 0.55 + rnd() * 0.15
  if (mode === 'blink') {
    const period = Math.max(1.15, 2.3 - depth * 0.05) * (0.85 + rnd() * 0.3)
    return baseObs('laser', distance, {
      axis, mode, period, phase: rnd() * period, duty: 0.4 + rnd() * 0.15, bandHalf,
      pos: axis === 'h' ? (rnd() * 2 - 1) * (HH - 2) : (rnd() * 2 - 1) * (HW - 1.5),
    })
  }
  const period = 3.2 + rnd() * 1.6
  const sweepAmp = axis === 'h' ? HH - 2 : HW - 1.5
  return baseObs('laser', distance, { axis, mode, period, phase: rnd() * period, bandHalf, sweepAmp, center: 0 })
}

function genFan(rnd, distance) {
  const bladeCount = 3 + Math.floor(rnd() * 2)
  const gapFraction = 0.4 + rnd() * 0.08
  const rotSpeed = (0.55 + rnd() * 0.35) * (rnd() < 0.5 ? 1 : -1)
  return baseObs('fan', distance, {
    bladeCount, gapFraction, rotSpeed, phase: rnd() * Math.PI * 2,
    cx: 0, cy: 0, outerRadius: 9, hubRadius: 0.9,
  })
}

function genPiston(rnd, distance, holeScale) {
  const period = 2.6 + rnd() * 1.2
  const openR = 2.6 * holeScale
  const closedAtTop = rnd() < 0.5
  return baseObs('piston', distance, {
    period, phase: rnd() * period,
    openHole: { shape: 'circle', r: openR, cx: 0, cy: 0 },
    closedHole: {
      shape: 'slot', w: 4.0 * holeScale, h: 1.35 * holeScale,
      cx: 0, cy: closedAtTop ? HH - 1.9 : -(HH - 1.9),
    },
  })
}

function genCrate(rnd, distance, holeScale) {
  const axis = rnd() < 0.5 ? 'x' : 'y'
  const period = 3.0 + rnd() * 1.6
  const halfSize = 2.9 * holeScale
  const amplitude = axis === 'x' ? HW - halfSize - 0.6 : HH - halfSize - 0.6
  return baseObs('crate', distance, { axis, period, phase: rnd() * period, halfSize, amplitude })
}

// ---------- level generation ----------
export function generateLevel(level) {
  const rnd = mulberry32(level.seed)
  const types = availableTypes(level.depth)
  const weights = { wall: 3, sturn: types.includes('sturn') ? 1.6 : 0, laser: types.includes('laser') ? 1.8 : 0,
    fan: types.includes('fan') ? 1.3 : 0, crate: types.includes('crate') ? 1.3 : 0, piston: types.includes('piston') ? 1.4 : 0 }
  const pool = Object.entries(weights).filter(([, w]) => w > 0)
  const totalW = pool.reduce((s, [, w]) => s + w, 0)
  const pickType = () => {
    let r = rnd() * totalW
    for (const [k, w] of pool) { if ((r -= w) <= 0) return k }
    return pool[0][0]
  }

  const startMargin = 34
  const endMargin = 55
  const usable = level.length - startMargin - endMargin
  const avgGap = usable / level.obstacleCount

  const obstacles = []
  let d = startMargin + avgGap * 0.6
  let guard = 0
  while (d < level.length - endMargin && guard++ < level.obstacleCount * 3) {
    const type = pickType()
    let usedEnd = d // how far this pick's own footprint extends — the NEXT
                     // obstacle must start after this, or a sturn's second
                     // wall can land at nearly the same distance as the next
                     // pick and create two simultaneously-unsolvable holes
    if (type === 'wall') obstacles.push(genWall(rnd, d, level.holeScale))
    else if (type === 'sturn') {
      // S-turn spacing is TIME-based (scaled by this level's top speed), not
      // a fixed world distance — otherwise the same gap gives a fast deep
      // level far less reaction time than a shallow one for the same move.
      const gap = level.maxSpeed * (1.5 + rnd() * 0.7)
      obstacles.push(...genSturn(rnd, d, level.holeScale, gap))
      usedEnd = d + gap
    }
    else if (type === 'laser') obstacles.push(genLaser(rnd, d, level.depth))
    else if (type === 'fan') obstacles.push(genFan(rnd, d))
    else if (type === 'piston') obstacles.push(genPiston(rnd, d, level.holeScale))
    else if (type === 'crate') obstacles.push(genCrate(rnd, d, level.holeScale))
    d = usedEnd + avgGap * (0.65 + rnd() * 0.7)
  }
  return obstacles.sort((a, b) => a.distance - b.distance)
}

// ---------- collision (evaluated once, at the frame an obstacle crosses the
// missile's fixed z-plane) ----------
export function collideObstacle(obs, mx, my, radius, t) {
  const margin = radius
  switch (obs.type) {
    case 'wall': return !holeContains(obs.hole, mx, my, margin)
    case 'piston': {
      const s = (1 + Math.sin((2 * Math.PI * (t + obs.phase)) / obs.period)) / 2
      const hole = s > 0.5 ? obs.openHole : obs.closedHole
      return !holeContains(hole, mx, my, margin)
    }
    case 'laser': {
      if (obs.mode === 'blink') {
        const phaseT = ((t + obs.phase) % obs.period + obs.period) % obs.period
        const active = phaseT / obs.period < obs.duty
        if (!active) return false
        const v = obs.axis === 'h' ? my : mx
        return Math.abs(v - obs.pos) < obs.bandHalf + margin
      }
      const pos = obs.center + obs.sweepAmp * Math.sin((2 * Math.PI * (t + obs.phase)) / obs.period)
      const v = obs.axis === 'h' ? my : mx
      return Math.abs(v - pos) < obs.bandHalf + margin
    }
    case 'fan': {
      const dx = mx - obs.cx, dy = my - obs.cy
      const dist = Math.hypot(dx, dy)
      if (dist < obs.hubRadius - margin) return false
      if (dist > obs.outerRadius + margin) return false
      const slice = (Math.PI * 2) / obs.bladeCount
      let ang = Math.atan2(dy, dx) - obs.phase - t * obs.rotSpeed
      ang = ((ang % slice) + slice) % slice
      const bladeWidth = slice * (1 - obs.gapFraction)
      const angMargin = margin / Math.max(dist, 1)
      return ang > angMargin && ang < bladeWidth - angMargin
    }
    case 'crate': {
      const center = obs.amplitude * Math.sin((2 * Math.PI * (t + obs.phase)) / obs.period)
      if (obs.axis === 'x') {
        return Math.abs(mx - center) < obs.halfSize + margin && Math.abs(my) < HH - 0.4
      }
      return Math.abs(my - center) < obs.halfSize + margin && Math.abs(mx) < HW - 0.4
    }
    default: return false
  }
}

// Runtime "current safety" test used to draw danger indicators / for the
// difficulty auto-steerer to pick a safe target well before arrival.
export function safeTargetFor(obs) {
  switch (obs.type) {
    case 'wall': return { x: obs.hole.cx, y: obs.hole.cy }
    case 'sturn': return { x: obs.hole.cx, y: obs.hole.cy }
    case 'piston': return { x: 0, y: 0 }
    case 'laser': return obs.axis === 'h' ? { x: 0, y: obs.pos > 0 ? -HH * 0.7 : HH * 0.7 } : { x: obs.pos > 0 ? -HW * 0.7 : HW * 0.7, y: 0 }
    case 'fan': return { x: 0, y: 0 }
    case 'crate': return { x: 0, y: 0 }
    default: return { x: 0, y: 0 }
  }
}
