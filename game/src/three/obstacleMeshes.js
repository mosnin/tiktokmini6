// Procedural THREE geometry for each obstacle/pickup type. Visual shapes are
// built from the exact same hole/angle/timing math as game/obstacles.js so
// what you see is what can hit you.
import * as THREE from 'three'
import { CORRIDOR_HALF_W as HW, CORRIDOR_HALF_H as HH } from '../consts.js'
import { metalTexture, hazardTexture } from './textures.js'

const WALL_THICK = 0.7

function holePath(hole) {
  const p = new THREE.Path()
  if (hole.shape === 'circle') { p.absarc(hole.cx, hole.cy, hole.r, 0, Math.PI * 2, false); return p }
  if (hole.shape === 'square') {
    const r = hole.r
    p.moveTo(hole.cx - r, hole.cy - r); p.lineTo(hole.cx + r, hole.cy - r)
    p.lineTo(hole.cx + r, hole.cy + r); p.lineTo(hole.cx - r, hole.cy + r); p.closePath()
    return p
  }
  const w = hole.w / 2, h = hole.h / 2
  p.moveTo(hole.cx - w, hole.cy - h); p.lineTo(hole.cx + w, hole.cy - h)
  p.lineTo(hole.cx + w, hole.cy + h); p.lineTo(hole.cx - w, hole.cy + h); p.closePath()
  return p
}

function panelGeometry(hole, thickness = WALL_THICK) {
  const shape = new THREE.Shape()
  shape.moveTo(-HW, -HH); shape.lineTo(HW, -HH); shape.lineTo(HW, HH); shape.lineTo(-HW, HH); shape.closePath()
  shape.holes.push(holePath(hole))
  const geo = new THREE.ExtrudeGeometry(shape, { depth: thickness, bevelEnabled: false, curveSegments: 20 })
  geo.translate(0, 0, -thickness / 2)
  geo.computeVertexNormals()
  return geo
}

function outlineForHole(hole, color) {
  let geo
  if (hole.shape === 'circle') geo = new THREE.RingGeometry(hole.r - 0.06, hole.r + 0.12, 28)
  else {
    const w = (hole.shape === 'square' ? hole.r : hole.w / 2), h = (hole.shape === 'square' ? hole.r : hole.h / 2)
    const shp = new THREE.Shape()
    const o = 0.12
    shp.moveTo(-w - o, -h - o); shp.lineTo(w + o, -h - o); shp.lineTo(w + o, h + o); shp.lineTo(-w - o, h + o); shp.closePath()
    const hpth = new THREE.Path(); hpth.moveTo(-w, -h); hpth.lineTo(w, -h); hpth.lineTo(w, h); hpth.lineTo(-w, h); hpth.closePath()
    shp.holes.push(hpth)
    geo = new THREE.ShapeGeometry(shp)
  }
  const mat = new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0.95, side: THREE.DoubleSide })
  const mesh = new THREE.Mesh(geo, mat)
  mesh.position.set(hole.cx, hole.cy, WALL_THICK / 2 + 0.03)
  return mesh
}

function wallMaterial(theme) {
  // Deliberately brighter/steelier than the tunnel shell so obstacles read
  // as distinct riveted-steel objects against the darker bunker walls.
  return new THREE.MeshStandardMaterial({ map: metalTexture(), color: '#9aa2ac', emissive: theme.wall, emissiveIntensity: 0.25, roughness: 0.6, metalness: 0.55 })
}

// ---------- builders (return a THREE.Group; caller adds it to the scene) ----------

export function buildWallGroup(obs, theme) {
  const g = new THREE.Group()
  const mesh = new THREE.Mesh(panelGeometry(obs.hole), wallMaterial(theme))
  mesh.castShadow = false; mesh.receiveShadow = true
  g.add(mesh)
  g.add(outlineForHole(obs.hole, theme.accent))
  return g
}

export function buildPistonGroup(obs, theme) {
  const g = new THREE.Group()
  const matOpen = wallMaterial(theme)
  const matClosed = new THREE.MeshStandardMaterial({ map: metalTexture(), color: theme.accent2, roughness: 0.6, metalness: 0.7 })
  const openMesh = new THREE.Mesh(panelGeometry(obs.openHole, WALL_THICK * 0.9), matOpen)
  const closedMesh = new THREE.Mesh(panelGeometry(obs.closedHole, WALL_THICK * 0.9), matClosed)
  closedMesh.position.z = 0.55
  g.add(openMesh, closedMesh)
  g.add(outlineForHole(obs.openHole, theme.accent))
  const closedOutline = outlineForHole(obs.closedHole, '#ff3b3b')
  closedOutline.position.z += 0.55
  g.add(closedOutline)
  g.userData = { openMesh, closedMesh, closedOutline }
  return g
}
export function updatePiston(g, obs, t) {
  const s = (1 + Math.sin((2 * Math.PI * (t + obs.phase)) / obs.period)) / 2 // 0 closed .. 1 open
  const { openMesh, closedMesh, closedOutline } = g.userData
  openMesh.visible = s > 0.5
  closedMesh.visible = s <= 0.5
  closedOutline.visible = s <= 0.5
}

const FAN_BLADE_COLOR = 0x5a626e
function fanBladeGeometry(bladeCount, gapFraction, outerRadius, hubRadius) {
  const shape = new THREE.Shape()
  const slice = (Math.PI * 2) / bladeCount
  const bladeWidth = slice * (1 - gapFraction)
  shape.moveTo(Math.cos(0) * hubRadius, Math.sin(0) * hubRadius)
  for (let b = 0; b < bladeCount; b++) {
    const a0 = b * slice, a1 = a0 + bladeWidth
    shape.lineTo(Math.cos(a0) * hubRadius, Math.sin(a0) * hubRadius)
    shape.absarc(0, 0, outerRadius, a0, a1, false)
    shape.lineTo(Math.cos(a1) * hubRadius, Math.sin(a1) * hubRadius)
    const nextA0 = (b + 1) * slice
    shape.absarc(0, 0, hubRadius, a1, nextA0, false)
  }
  const geo = new THREE.ExtrudeGeometry(shape, { depth: 0.5, bevelEnabled: true, bevelThickness: 0.05, bevelSize: 0.05, curveSegments: 24 })
  geo.translate(0, 0, -0.25)
  return geo
}
export function buildFanGroup(obs, theme) {
  const g = new THREE.Group()
  const disc = new THREE.Mesh(
    fanBladeGeometry(obs.bladeCount, obs.gapFraction, obs.outerRadius, obs.hubRadius),
    new THREE.MeshStandardMaterial({ color: FAN_BLADE_COLOR, roughness: 0.45, metalness: 0.8, emissive: theme.accent2, emissiveIntensity: 0.15 }),
  )
  g.add(disc)
  const hub = new THREE.Mesh(new THREE.CylinderGeometry(obs.hubRadius * 0.9, obs.hubRadius * 0.9, 0.7, 16), new THREE.MeshStandardMaterial({ color: theme.accent, emissive: theme.accent, emissiveIntensity: 0.6, metalness: 0.6, roughness: 0.3 }))
  hub.rotation.x = Math.PI / 2
  g.add(hub)
  // static frame ring so the fan reads as mounted machinery
  const ring = new THREE.Mesh(new THREE.TorusGeometry(obs.outerRadius + 0.15, 0.16, 8, 32), new THREE.MeshStandardMaterial({ color: theme.wall, metalness: 0.6, roughness: 0.5 }))
  g.add(ring)
  g.userData = { disc }
  return g
}
export function updateFan(g, obs, t) {
  g.userData.disc.rotation.z = obs.phase + t * obs.rotSpeed
}

function laserMaterial(theme) {
  return new THREE.MeshBasicMaterial({ color: theme.accent, transparent: true, opacity: 0.85, side: THREE.DoubleSide, blending: THREE.AdditiveBlending, depthWrite: false })
}
export function buildLaserGroup(obs, theme) {
  const g = new THREE.Group()
  const thickness = obs.bandHalf * 2
  const length = obs.axis === 'h' ? HW * 2 : HH * 2
  const geo = obs.axis === 'h' ? new THREE.BoxGeometry(length, thickness, 0.15) : new THREE.BoxGeometry(thickness, length, 0.15)
  const beam = new THREE.Mesh(geo, laserMaterial(theme))
  g.add(beam)
  // faint always-visible guide rail so the danger zone reads even when off
  const railGeo = obs.axis === 'h' ? new THREE.BoxGeometry(length, 0.06, 0.06) : new THREE.BoxGeometry(0.06, length, 0.06)
  const rail = new THREE.Mesh(railGeo, new THREE.MeshBasicMaterial({ color: theme.accent2, transparent: true, opacity: 0.35 }))
  g.add(rail)
  g.userData = { beam }
  return g
}
export function updateLaser(g, obs, t) {
  const { beam } = g.userData
  if (obs.mode === 'blink') {
    const phaseT = ((t + obs.phase) % obs.period + obs.period) % obs.period
    const active = phaseT / obs.period < obs.duty
    // telegraph: brighten in the last 0.35s before going active
    const preWarn = !active && (obs.period - phaseT) < 0.35
    beam.material.opacity = active ? 0.95 : preWarn ? 0.45 + 0.4 * Math.sin(t * 30) : 0.12
    beam.scale.setScalar(1)
    if (obs.axis === 'h') beam.position.y = obs.pos; else beam.position.x = obs.pos
  } else {
    const pos = obs.center + obs.sweepAmp * Math.sin((2 * Math.PI * (t + obs.phase)) / obs.period)
    beam.material.opacity = 0.9
    if (obs.axis === 'h') beam.position.y = pos; else beam.position.x = pos
  }
}

export function buildCrateGroup(obs, theme) {
  const g = new THREE.Group()
  const size = obs.halfSize * 2
  const geo = new THREE.BoxGeometry(size, size, size * 0.9)
  const mat = new THREE.MeshStandardMaterial({ map: hazardTexture(), color: '#c98a2e', roughness: 0.8, metalness: 0.2 })
  g.add(new THREE.Mesh(geo, mat))
  return g
}
export function updateCrate(g, obs, t) {
  const center = obs.amplitude * Math.sin((2 * Math.PI * (t + obs.phase)) / obs.period)
  if (obs.axis === 'x') g.position.x = center; else g.position.y = center
}

// ---------- pickups ----------
export function buildPickupMesh(kind) {
  if (kind === 'coin') {
    const geo = new THREE.CylinderGeometry(0.42, 0.42, 0.12, 16)
    geo.rotateX(Math.PI / 2)
    return new THREE.Mesh(geo, new THREE.MeshStandardMaterial({ color: '#ffd23e', emissive: '#a06a00', emissiveIntensity: 0.4, metalness: 0.6, roughness: 0.25 }))
  }
  if (kind === 'slowmo') {
    const g = new THREE.Group()
    g.add(new THREE.Mesh(new THREE.IcosahedronGeometry(0.55, 0), new THREE.MeshStandardMaterial({ color: '#3fa8ff', emissive: '#1a5f96', emissiveIntensity: 0.8, transparent: true, opacity: 0.85, metalness: 0.3, roughness: 0.2 })))
    g.add(new THREE.Mesh(new THREE.RingGeometry(0.65, 0.75, 24), new THREE.MeshBasicMaterial({ color: '#8fd8ff', side: THREE.DoubleSide })))
    return g
  }
  const g = new THREE.Group()
  g.add(new THREE.Mesh(new THREE.OctahedronGeometry(0.55, 0), new THREE.MeshStandardMaterial({ color: '#a03fff', emissive: '#5b2fa0', emissiveIntensity: 0.8, metalness: 0.3, roughness: 0.2 })))
  return g
}
