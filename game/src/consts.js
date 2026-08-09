// Shared small helpers. Level/depth data lives in game/levels.js, missile
// visuals/stats in game/missiles.js, upgrade economy in game/progression.js.

// Corridor cross-section (world units) — constant across all depths; the
// challenge scales via speed/hole-size/density, not the tube itself.
export const CORRIDOR_HALF_W = 5
export const CORRIDOR_HALF_H = 7

export const fmt = n => n >= 1e6 ? (n / 1e6).toFixed(2) + 'M'
  : n >= 1000 ? (n / 1000).toFixed(2) + 'K' : Math.floor(n).toString()

export const fmtMoney = n => '$' + fmt(n)

// Bumped every published build — always visible in the corner of the game so
// there is never ambiguity about which version is actually running.
export const BUILD = 'dc-v1'
