// 12 underground depth layers (B1..B12). Pure data — no three.js import.
// Corridor cross-section is constant (see consts.js); difficulty scales via
// speed, obstacle density, and hole size instead.

// ---------- palettes: B1 concrete -> B5 blacksite neon -> deeper darker/hotter ----------
export const THEMES = [
  { depth: 1, name: 'SURFACE ACCESS', wall: '#5c6b60', wall2: '#465146', floor: '#3a4038', ceil: '#4d5a4f',
    accent: '#ffcc33', accent2: '#2fa84a', fog: '#3c4640', fogNear: 60, fogFar: 210, light: '#dfe8d8', lightIntensity: 1.15, glow: '#7cffb0' },
  { depth: 2, name: 'RUST CONDUIT', wall: '#7a4a30', wall2: '#5c3620', floor: '#3a2417', ceil: '#664027',
    accent: '#ff8a1f', accent2: '#c94a1f', fog: '#4a2f1e', fogNear: 60, fogFar: 210, light: '#ffd9ad', lightIntensity: 1.05, glow: '#ff9a4a' },
  { depth: 3, name: 'BLUE STEEL BAY', wall: '#3f5870', wall2: '#2c4258', floor: '#1c2c3a', ceil: '#33495e',
    accent: '#3fd0ff', accent2: '#1c6fbf', fog: '#1c2b3a', fogNear: 60, fogFar: 220, light: '#cfeeff', lightIntensity: 1.0, glow: '#5fdcff' },
  { depth: 4, name: 'SODIUM TUNNELS', wall: '#5c4420', wall2: '#3f2e14', floor: '#241a0c', ceil: '#4a3618',
    accent: '#ff9d1f', accent2: '#ffcf3e', fog: '#2c1e0c', fogNear: 55, fogFar: 220, light: '#ffb84a', lightIntensity: 1.3, glow: '#ffb020' },
  { depth: 5, name: 'BLACKSITE CORE', wall: '#161620', wall2: '#0c0c14', floor: '#08080c', ceil: '#131320',
    accent: '#ff2fd0', accent2: '#2fe8ff', fog: '#0a0a14', fogNear: 50, fogFar: 220, light: '#c86bff', lightIntensity: 0.9, glow: '#ff4fe0' },
  { depth: 6, name: 'ASH LEVEL', wall: '#2a2426', wall2: '#1a1618', floor: '#100e0f', ceil: '#241f21',
    accent: '#ff3b3b', accent2: '#ff9a1f', fog: '#160f10', fogNear: 50, fogFar: 230, light: '#ffb0a0', lightIntensity: 0.9, glow: '#ff5a3a' },
  { depth: 7, name: 'CRIMSON WARD', wall: '#241014', wall2: '#160a0c', floor: '#0c0608', ceil: '#1f0e12',
    accent: '#ff1f3f', accent2: '#ff6a1f', fog: '#150609', fogNear: 48, fogFar: 230, light: '#ff8a9a', lightIntensity: 0.85, glow: '#ff1f4a' },
  { depth: 8, name: 'VOID PURPLE', wall: '#1a1230', wall2: '#100b20', floor: '#08061a', ceil: '#16102a',
    accent: '#a03fff', accent2: '#ff3fbf', fog: '#0d0820', fogNear: 46, fogFar: 230, light: '#c090ff', lightIntensity: 0.85, glow: '#b03fff' },
  { depth: 9, name: 'TOXIC REACTOR', wall: '#141c10', wall2: '#0c1208', floor: '#080c06', ceil: '#101a0c',
    accent: '#aaff2f', accent2: '#2fff9a', fog: '#0a1206', fogNear: 45, fogFar: 235, light: '#c8ff8a', lightIntensity: 0.85, glow: '#c0ff3f' },
  { depth: 10, name: 'RED ALERT', wall: '#200808', wall2: '#140404', floor: '#0a0202', ceil: '#1a0606',
    accent: '#ff0f2f', accent2: '#ff8a0f', fog: '#100303', fogNear: 42, fogFar: 235, light: '#ff8a8a', lightIntensity: 0.8, glow: '#ff1030' },
  { depth: 11, name: 'STROBE ALARM', wall: '#0e0e10', wall2: '#08080a', floor: '#040405', ceil: '#0c0c0f',
    accent: '#ffffff', accent2: '#ff1f3f', fog: '#050506', fogNear: 40, fogFar: 235, light: '#ffffff', lightIntensity: 1.0, glow: '#ffffff' },
  { depth: 12, name: 'THE CORE', wall: '#1a0505', wall2: '#0e0303', floor: '#060101', ceil: '#150404',
    accent: '#ff4400', accent2: '#ffcc00', fog: '#0c0202', fogNear: 38, fogFar: 240, light: '#ffaa55', lightIntensity: 1.1, glow: '#ff5500' },
]

// ---------- difficulty curve ----------
// Speeds/length computed from a ramp model targeting 45s (B1) -> 75s (B12)
// runs at the level's own pace; see report for the derivation.
function buildLevel(d) {
  const base = 20 + (d - 1) * 4.0
  const rampMult = 1.3 + (d - 1) * 0.02
  const rampTime = 10
  const maxSpeed = base * rampMult
  const T = 45 + (d - 1) * (30 / 11)
  const integral = base * rampTime + (maxSpeed - base) * rampTime / 2 + maxSpeed * Math.max(0, T - rampTime)
  const avg = integral / T
  const length = Math.round(avg * T)
  // front-loaded curves (t^0.62 / t^0.7) — hole size tightens and density
  // rises FASTER in the early-mid depths than a straight line would, so
  // B3-B4 already demand real precision instead of coasting to B5+ on
  // generous margins (measured with the difficulty auto-steerer, see report)
  const t = (d - 1) / 11
  const holeScale = 1.0 - 0.5 * Math.pow(t, 0.62)
  const obstacleCount = Math.round(14 + 20 * Math.pow(t, 0.7))
  return {
    depth: d,
    theme: THEMES[d - 1],
    baseSpeed: base,
    maxSpeed,
    rampTime,
    length,
    holeScale,
    obstacleCount,
    estDurationSec: Math.round(T),
    seed: 1000 + d * 137,
  }
}

export const LEVELS = Array.from({ length: 12 }, (_, i) => buildLevel(i + 1))
export const LEVEL_COUNT = LEVELS.length

// Obstacle types unlock progressively by depth so the early game teaches
// mechanics one at a time.
export const TYPE_UNLOCK_DEPTH = { wall: 1, sturn: 2, laser: 3, fan: 4, crate: 5, piston: 6 }
export function availableTypes(depth) {
  return Object.entries(TYPE_UNLOCK_DEPTH).filter(([, d]) => depth >= d).map(([k]) => k)
}

// Coin/powerup unlock economy for depth progression (ad OR pay a steep price).
export const depthAdUnlock = depth => true // always ad-unlockable
