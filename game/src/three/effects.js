// Lightweight imperative particle-effects module — pure Three.js (no React),
// pooled THREE.Points systems, driven by update(dt). Everything pre-allocated
// at construct time; spawn/update never allocate after warmup.
import * as THREE from 'three'

function makeSoftCircleTexture() {
  const size = 64
  const canvas = document.createElement('canvas')
  canvas.width = size; canvas.height = size
  const ctx = canvas.getContext('2d')
  const g = ctx.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2)
  g.addColorStop(0, 'rgba(255,255,255,1)')
  g.addColorStop(0.35, 'rgba(255,255,255,0.85)')
  g.addColorStop(1, 'rgba(255,255,255,0)')
  ctx.fillStyle = g
  ctx.fillRect(0, 0, size, size)
  const tex = new THREE.CanvasTexture(canvas)
  tex.needsUpdate = true
  return tex
}

const VERTEX_SHADER = `
attribute float aSize;
attribute float aAlpha;
attribute vec3 aColor;
varying float vAlpha;
varying vec3 vColor;
void main() {
  vAlpha = aAlpha;
  vColor = aColor;
  vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
  gl_PointSize = aSize * (300.0 / max(-mvPosition.z, 0.0001));
  gl_Position = projectionMatrix * mvPosition;
}
`
const FRAGMENT_SHADER = `
uniform sampler2D uMap;
varying float vAlpha;
varying vec3 vColor;
void main() {
  vec4 tex = texture2D(uMap, gl_PointCoord);
  float a = tex.a * vAlpha;
  if (a <= 0.003) discard;
  gl_FragColor = vec4(vColor * tex.rgb, a);
}
`

const _baseColor = new THREE.Color()
const _outColor = new THREE.Color()
const _hsl = { h: 0, s: 0, l: 0 }
function varyColor(baseColor, out, amount) {
  baseColor.getHSL(_hsl)
  const l = THREE.MathUtils.clamp(_hsl.l * (1 + (Math.random() * 2 - 1) * amount), 0, 1)
  out.setHSL(_hsl.h, _hsl.s, l)
  return out
}

class ParticleSystem {
  constructor(scene, capacity, texture, blending) {
    this.capacity = capacity
    this.aliveCount = 0
    this.px = new Float32Array(capacity); this.py = new Float32Array(capacity); this.pz = new Float32Array(capacity)
    this.vx = new Float32Array(capacity); this.vy = new Float32Array(capacity); this.vz = new Float32Array(capacity)
    this.life = new Float32Array(capacity); this.maxLife = new Float32Array(capacity)
    this.size = new Float32Array(capacity); this.sizeVel = new Float32Array(capacity)
    this.gravity = new Float32Array(capacity); this.baseAlpha = new Float32Array(capacity)
    this.flicker = new Float32Array(capacity); this.flickerPhase = new Float32Array(capacity)
    this.age = new Float32Array(capacity)
    this.freeList = []
    for (let i = capacity - 1; i >= 0; i--) this.freeList.push(i)
    const geometry = new THREE.BufferGeometry()
    geometry.setAttribute('position', new THREE.BufferAttribute(new Float32Array(capacity * 3), 3))
    geometry.setAttribute('aColor', new THREE.BufferAttribute(new Float32Array(capacity * 3), 3))
    geometry.setAttribute('aSize', new THREE.BufferAttribute(new Float32Array(capacity), 1))
    geometry.setAttribute('aAlpha', new THREE.BufferAttribute(new Float32Array(capacity), 1))
    const material = new THREE.ShaderMaterial({
      uniforms: { uMap: { value: texture } }, vertexShader: VERTEX_SHADER, fragmentShader: FRAGMENT_SHADER,
      transparent: true, depthWrite: false, blending,
    })
    this.geometry = geometry; this.material = material
    this.points = new THREE.Points(geometry, material)
    this.points.frustumCulled = false
    this.points.visible = false
    scene.add(this.points)
  }
  alloc() { if (this.freeList.length === 0) return -1; const idx = this.freeList.pop(); this.aliveCount++; return idx }
  free(idx) { this.life[idx] = 0; this.freeList.push(idx); this.aliveCount-- }
  spawnParticle(x, y, z, vx, vy, vz, life, size, sizeVel, gravity, color, baseAlpha, flicker) {
    const idx = this.alloc()
    if (idx === -1) return -1
    this.px[idx] = x; this.py[idx] = y; this.pz[idx] = z
    this.vx[idx] = vx; this.vy[idx] = vy; this.vz[idx] = vz
    this.life[idx] = life; this.maxLife[idx] = life > 0 ? life : 0.0001
    this.size[idx] = size; this.sizeVel[idx] = sizeVel; this.gravity[idx] = gravity
    this.baseAlpha[idx] = baseAlpha
    const fl = flicker || 0
    this.flicker[idx] = fl; this.flickerPhase[idx] = fl > 0 ? Math.random() * Math.PI * 2 : 0
    this.age[idx] = 0
    const posArr = this.geometry.attributes.position.array
    const colArr = this.geometry.attributes.aColor.array
    const sizeArr = this.geometry.attributes.aSize.array
    const alphaArr = this.geometry.attributes.aAlpha.array
    posArr[idx * 3] = x; posArr[idx * 3 + 1] = y; posArr[idx * 3 + 2] = z
    colArr[idx * 3] = color.r; colArr[idx * 3 + 1] = color.g; colArr[idx * 3 + 2] = color.b
    sizeArr[idx] = size; alphaArr[idx] = baseAlpha
    this.geometry.attributes.position.needsUpdate = true
    this.geometry.attributes.aColor.needsUpdate = true
    this.geometry.attributes.aSize.needsUpdate = true
    this.geometry.attributes.aAlpha.needsUpdate = true
    this.points.visible = true
    return idx
  }
  update(dt) {
    if (this.aliveCount === 0) { if (this.points.visible) this.points.visible = false; return }
    const posArr = this.geometry.attributes.position.array
    const sizeArr = this.geometry.attributes.aSize.array
    const alphaArr = this.geometry.attributes.aAlpha.array
    for (let i = 0; i < this.capacity; i++) {
      if (this.life[i] <= 0) continue
      this.life[i] -= dt; this.age[i] += dt
      if (this.life[i] <= 0) { this.free(i); alphaArr[i] = 0; continue }
      this.vy[i] += this.gravity[i] * dt
      this.px[i] += this.vx[i] * dt; this.py[i] += this.vy[i] * dt; this.pz[i] += this.vz[i] * dt
      this.size[i] += this.sizeVel[i] * dt
      if (this.size[i] < 0) this.size[i] = 0
      const lifeRatio = this.life[i] / this.maxLife[i]
      let alpha = this.baseAlpha[i] * Math.max(0, lifeRatio)
      if (this.flicker[i] > 0) {
        const tw = 0.5 + 0.5 * Math.sin(this.age[i] * this.flicker[i] + this.flickerPhase[i])
        alpha *= 0.35 + 0.65 * tw
      }
      posArr[i * 3] = this.px[i]; posArr[i * 3 + 1] = this.py[i]; posArr[i * 3 + 2] = this.pz[i]
      sizeArr[i] = this.size[i]; alphaArr[i] = alpha
    }
    this.geometry.attributes.position.needsUpdate = true
    this.geometry.attributes.aSize.needsUpdate = true
    this.geometry.attributes.aAlpha.needsUpdate = true
  }
  dispose(scene) { scene.remove(this.points); this.geometry.dispose(); this.material.dispose() }
}

export class Effects {
  constructor(scene) {
    this.scene = scene
    this.texture = makeSoftCircleTexture()
    this.flame = new ParticleSystem(scene, 90, this.texture, THREE.AdditiveBlending)
    this.smoke = new ParticleSystem(scene, 140, this.texture, THREE.NormalBlending)
    this.burst = new ParticleSystem(scene, 220, this.texture, THREE.AdditiveBlending)
    this.spark = new ParticleSystem(scene, 90, this.texture, THREE.AdditiveBlending)
    this._systems = [this.flame, this.smoke, this.burst, this.spark]
  }

  // Continuous engine flame + smoke trail behind the missile — call every
  // frame while flying with the missile's world position and forward speed.
  spawnEngineTick(pos, colorHex, speedNorm) {
    _baseColor.set(colorHex)
    varyColor(_baseColor, _outColor, 0.12)
    this.flame.spawnParticle(
      pos.x + (Math.random() - 0.5) * 0.12, pos.y + (Math.random() - 0.5) * 0.12, pos.z + 0.3,
      (Math.random() - 0.5) * 0.6, (Math.random() - 0.5) * 0.6, 2.5 + speedNorm * 4 + Math.random() * 1.5,
      0.22 + Math.random() * 0.1, 0.35 + speedNorm * 0.25, -0.9, 0, _outColor, 0.85, 0,
    )
    if (Math.random() < 0.6) {
      _baseColor.set('#8a8a8a')
      varyColor(_baseColor, _outColor, 0.1)
      this.smoke.spawnParticle(
        pos.x, pos.y, pos.z + 0.5,
        (Math.random() - 0.5) * 0.4, (Math.random() - 0.5) * 0.4, 1.6 + Math.random() * 0.8,
        0.7 + Math.random() * 0.3, 0.4 + Math.random() * 0.3, 0.55, 0, _outColor, 0.22, 0,
      )
    }
  }

  spawnGraze(pos) {
    _baseColor.set('#ffd23e')
    for (let i = 0; i < 14; i++) {
      const a = Math.random() * Math.PI * 2
      varyColor(_baseColor, _outColor, 0.15)
      this.spark.spawnParticle(
        pos.x, pos.y, pos.z,
        Math.cos(a) * (3 + Math.random() * 3), (Math.random() - 0.3) * 4, Math.sin(a) * (2 + Math.random() * 2),
        0.3 + Math.random() * 0.25, 0.1 + Math.random() * 0.1, -0.3, -3, _outColor, 1, 20,
      )
    }
  }

  spawnCoinPop(pos, count = 10) {
    _baseColor.set('#fff2b0')
    for (let i = 0; i < count; i++) {
      const angle = Math.random() * Math.PI * 2
      const upAngle = Math.random() * Math.PI * 0.5
      const s = 2.5 + Math.random() * 3
      varyColor(_baseColor, _outColor, 0.12)
      this.burst.spawnParticle(
        pos.x, pos.y, pos.z,
        Math.cos(angle) * Math.cos(upAngle) * s, Math.sin(upAngle) * s + 1.2, Math.sin(angle) * Math.cos(upAngle) * s,
        0.35 + Math.random() * 0.3, 0.09 + Math.random() * 0.1, -0.2, -3, _outColor, 1, 24,
      )
    }
  }

  spawnPowerup(pos, colorHex) {
    _baseColor.set(colorHex)
    for (let i = 0; i < 20; i++) {
      const a = Math.random() * Math.PI * 2
      const r = 0.5 + Math.random() * 1.5
      varyColor(_baseColor, _outColor, 0.1)
      this.spark.spawnParticle(
        pos.x + Math.cos(a) * r, pos.y + Math.sin(a) * r, pos.z,
        Math.cos(a) * 1.5, Math.sin(a) * 1.5, (Math.random() - 0.5) * 1.5,
        0.5 + Math.random() * 0.3, 0.14 + Math.random() * 0.1, -0.15, 0, _outColor, 0.9, 12,
      )
    }
  }

  // Vault-door finale — a huge layered explosion.
  spawnVaultExplosion(pos) {
    _baseColor.set('#ffaa33')
    for (let i = 0; i < 160; i++) {
      const theta = Math.random() * Math.PI * 2
      const cosPhi = -0.3 + Math.random() * 1.3
      const sinPhi = Math.sqrt(Math.max(0, 1 - cosPhi * cosPhi))
      const s = 6 + Math.random() * 14
      varyColor(_baseColor, _outColor, 0.2)
      this.burst.spawnParticle(
        pos.x, pos.y, pos.z,
        sinPhi * Math.cos(theta) * s, cosPhi * s + 2, sinPhi * Math.sin(theta) * s,
        0.8 + Math.random() * 0.9, 0.35 + Math.random() * 0.5, -0.25, -6, _outColor, 1, 0,
      )
    }
    _baseColor.set('#6a6a6a')
    for (let i = 0; i < 60; i++) {
      const a = Math.random() * Math.PI * 2
      varyColor(_baseColor, _outColor, 0.1)
      this.smoke.spawnParticle(
        pos.x + Math.cos(a) * 0.5, pos.y + Math.sin(a) * 0.5, pos.z,
        Math.cos(a) * 1.5, 1 + Math.random() * 2, Math.sin(a) * 1.5,
        1.6 + Math.random() * 0.8, 1.2 + Math.random() * 0.8, 0.6, -0.4, _outColor, 0.4, 0,
      )
    }
  }

  update(dt) { for (let i = 0; i < this._systems.length; i++) this._systems[i].update(dt) }
  dispose() { for (let i = 0; i < this._systems.length; i++) this._systems[i].dispose(this.scene); this.texture.dispose() }
}
