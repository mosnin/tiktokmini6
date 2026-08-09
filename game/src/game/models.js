// User-provided GLB assets, bundled as data URIs (CSP: no external requests).
// Loads async at boot; consumers subscribe via onModels() and rebuild when the
// tick bumps. Until then a procedural fallback cone renders.
import * as THREE from 'three'
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js'
import missile0Url from '../assets/models/missile0.glb?url'
import missile1Url from '../assets/models/missile1.glb?url'
import missile2Url from '../assets/models/missile2.glb?url'

export const MODELS = { missiles: [null, null, null] }

let tick = 0
const subs = new Set()
export const onModels = cb => { subs.add(cb); return () => subs.delete(cb) }
export const modelsTick = () => tick
const bump = () => { tick += 1; subs.forEach(cb => { try { cb() } catch {} }) }

// Some source models ship a baked ground/shadow quad under the subject — it
// inflates the bounding box and wrecks scale/floor normalization. Strip it.
// Also: if a mesh is a SkinnedMesh and nothing drives its skeleton, it
// renders as a crumpled ball — replace it with a static Mesh of the same
// geometry/material (bind pose looks correct once un-skinned).
function stripHelpers(scene) {
  const kill = []
  const replace = []
  scene.traverse(o => {
    if (!o.isMesh) return
    const n = (o.name || '').toLowerCase()
    if (/ground|shadow|floor/.test(n)) { kill.push(o); return }
    o.geometry.computeBoundingBox()
    const s = new THREE.Vector3()
    o.geometry.boundingBox.getSize(s)
    const dims = [s.x, s.y, s.z].sort((a, b) => a - b)
    if (n.startsWith('plane') && dims[0] < 0.01 * dims[2]) { kill.push(o); return }
    if (o.isSkinnedMesh) replace.push(o)
  })
  kill.forEach(o => o.parent && o.parent.remove(o))
  replace.forEach(o => {
    const mesh = new THREE.Mesh(o.geometry, o.material)
    mesh.position.copy(o.position)
    mesh.rotation.copy(o.rotation)
    mesh.scale.copy(o.scale)
    mesh.castShadow = o.castShadow
    if (o.parent) o.parent.add(mesh)
    o.parent && o.parent.remove(o)
  })
}

// Normalize a loaded scene into game space: yaw so the nose faces -Z, uniform
// scale to targetSize (missile length, since these models are long-and-thin
// along Z once yawed), centered on x/y/z (missiles don't rest on a floor —
// they fly free, so we center vertically rather than floor them).
function normalize(scene, { rotY = 0, targetSize = 3.6, rotX = 0 } = {}) {
  stripHelpers(scene)
  // Per-model corrective "lay flat" rotation, applied BEFORE the rotY yaw —
  // some source rigs (see report) keep their long axis on Y even after the
  // GLTF's own node transform, so length ends up wrong unless corrected here.
  scene.rotation.x = rotX
  const inner = new THREE.Group()
  inner.add(scene)
  inner.rotation.y = rotY
  const wrap = new THREE.Group()
  wrap.add(inner)
  let box = new THREE.Box3().setFromObject(wrap)
  const size = box.getSize(new THREE.Vector3())
  const s = targetSize / Math.max(size.z, size.x, 0.001)
  wrap.scale.setScalar(s)
  box = new THREE.Box3().setFromObject(wrap)
  const c = box.getCenter(new THREE.Vector3())
  inner.position.x -= c.x / s
  inner.position.y -= c.y / s
  inner.position.z -= c.z / s
  scene.traverse(o => { if (o.isMesh) { o.castShadow = true; o.receiveShadow = false } })
  return wrap
}

// targetSize tuned per model (bbox proportions differ) — visually verified
// against screenshots, not assumed equal.
const MISSILE_CFG = [
  { url: missile0Url, rotY: 0, targetSize: 3.7, rotX: 0 },              // vertical-launch, dark blue — chunky
  { url: missile1Url, rotY: 0, targetSize: 4.6, rotX: 0 },              // Brahmos cruise, gray — long & sleek
  { url: missile2Url, rotY: Math.PI, targetSize: 3.1, rotX: -Math.PI / 2 }, // heatseeker — this rig's long axis is Y even after its own node transform; lay it flat first
]

const loader = new GLTFLoader()

// The published artifact runs under a strict CSP whose connect-src blocks
// fetch() even for data: URIs — so NEVER fetch. Decode the bundled base64
// by hand and hand GLTFLoader the raw ArrayBuffer via parse().
export function dataUriToArrayBuffer(uri) {
  const b64 = uri.slice(uri.indexOf(',') + 1)
  const bin = atob(b64)
  const bytes = new Uint8Array(bin.length)
  for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i)
  return bytes.buffer
}

function parseGlb(uri) {
  return new Promise((resolve, reject) => {
    // GLTFLoader picks ImageBitmapLoader (fetch — CSP-blocked) over
    // TextureLoader (<img> element — allowed) when createImageBitmap exists.
    // Hide it for the duration of the parser construction so embedded
    // textures load through the image path.
    const cib = globalThis.createImageBitmap
    try {
      globalThis.createImageBitmap = undefined
      loader.parse(dataUriToArrayBuffer(uri), '', g => resolve(g), e => reject(e))
    } catch (e) { reject(e) }
    finally { globalThis.createImageBitmap = cib }
  })
}

export function preloadModels() {
  MISSILE_CFG.forEach((cfg, i) => {
    parseGlb(cfg.url).then(g => {
      MODELS.missiles[i] = normalize(g.scene, cfg)
      bump()
    }).catch(() => {})
  })
}

// Deep-clone a stored model for scene use (materials stay shared — fine, we
// never mutate them per-instance).
export function cloneModel(m) {
  return m ? m.clone(true) : null
}

preloadModels()
