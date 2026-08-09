// Missile roster — visuals/identity live here, economy math in progression.js.
export const MISSILES = [
  {
    id: 'vanguard',
    name: 'VANGUARD',
    subtitle: 'Vertical-Launch',
    unlockLevel: 1,           // unlocked from the start
    baseHandling: 1.0,        // steering accel multiplier
    baseShield: 0,            // extra hit shield beyond armor upgrade
    hitboxScale: 1.05,
    palette: { body: '#2a4fb8', accent: '#8fb4ff', dark: '#0e1f4a' },
    flame: '#5fa8ff',
  },
  {
    id: 'brahmos',
    name: 'BRAHMOS-K',
    subtitle: 'Cruise Missile',
    unlockLevel: 5,
    baseHandling: 1.25,
    baseShield: 1,
    hitboxScale: 0.95,
    palette: { body: '#8a919c', accent: '#e2e6ea', dark: '#3a3f47' },
    flame: '#ffb020',
  },
  {
    id: 'reaper',
    name: 'REAPER-X',
    subtitle: 'Heatseeker',
    unlockLevel: 9,
    baseHandling: 1.55,
    baseShield: 2,
    hitboxScale: 0.85,
    palette: { body: '#1c1f24', accent: '#ff3b3b', dark: '#050608' },
    flame: '#ff5540',
  },
]

export const isMissileUnlocked = (idx, unlockedDepth) => unlockedDepth >= MISSILES[idx].unlockLevel
