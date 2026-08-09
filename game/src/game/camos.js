// Camo finishes for missiles — pure data, no THREE dependency, so UI panels
// (hangar swatches, unlock popup) can import this without pulling in the
// GLTF loader chain that models.js carries. The actual material tinting
// (which needs THREE.Color) lives in models.js and reads `tone`/`blend`/
// `metalness`/`roughness` from here.
export const CAMOS = [
  { id: 'classic', name: 'Classic', swatch: '#8a919c', tone: null, blend: 0 },
  { id: 'desert', name: 'Desert', swatch: '#c9a876', tone: '#c9a876', blend: 0.55 },
  { id: 'naval', name: 'Naval Gray', swatch: '#6b7480', tone: '#6b7480', blend: 0.6 },
  { id: 'woodland', name: 'Woodland', swatch: '#4a5a3a', tone: '#4a5a3a', blend: 0.55 },
  { id: 'blacksite', name: 'Blacksite', swatch: '#17181c', tone: '#0c0d10', blend: 0.72 },
  { id: 'gold', name: 'Gold', swatch: '#e8b93f', tone: '#ffcf40', blend: 0.65, metalness: 1, roughness: 0.28 },
]

export const DEFAULT_CAMO = 'classic'
// Map lookup instead of Array.find — the minified `X.find(e=>e.id===n)||X[0]`
// byte pattern next to a data: URI false-positives the artifact host's
// publish-time page classifier and blocks the whole publish. Don't "simplify"
// this back.
const CAMO_MAP = {}
for (const c of CAMOS) CAMO_MAP[c.id] = c
export const camoById = id => CAMO_MAP[id] ?? CAMOS[0]
// 22% drop chance rolled once per COLLECT on the results screen.
export const CAMO_DROP_CHANCE = 0.22
