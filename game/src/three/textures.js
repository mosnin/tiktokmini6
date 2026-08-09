// Canvas-generated tiling textures — drawn at runtime, never fetched, so the
// strict CSP (no network, no blob: fetch) never comes into play. Neutral
// grayscale so a single texture set can be tinted per depth-theme via
// material.color/emissive.
import * as THREE from 'three'

function mk(size, draw) {
  const c = document.createElement('canvas')
  c.width = c.height = size
  const ctx = c.getContext('2d')
  draw(ctx, size)
  const tex = new THREE.CanvasTexture(c)
  tex.wrapS = tex.wrapT = THREE.RepeatWrapping
  tex.anisotropy = 4
  return tex
}

let _metal, _hazard, _grate, _panel

export function metalTexture() {
  if (_metal) return _metal
  _metal = mk(256, (ctx, s) => {
    ctx.fillStyle = '#9aa0a6'
    ctx.fillRect(0, 0, s, s)
    // panel seams
    ctx.strokeStyle = 'rgba(30,34,38,0.55)'
    ctx.lineWidth = 3
    const cells = 4
    for (let i = 0; i <= cells; i++) {
      const p = (i / cells) * s
      ctx.beginPath(); ctx.moveTo(p, 0); ctx.lineTo(p, s); ctx.stroke()
      ctx.beginPath(); ctx.moveTo(0, p); ctx.lineTo(s, p); ctx.stroke()
    }
    // subtle panel shading
    for (let i = 0; i < cells; i++) {
      for (let j = 0; j < cells; j++) {
        const shade = 0.9 + Math.random() * 0.2
        ctx.fillStyle = `rgba(${Math.round(20 * (1 - shade))},${Math.round(20 * (1 - shade))},${Math.round(20 * (1 - shade))},${(1 - shade) < 0 ? 0.15 : 0.08})`
        ctx.fillRect((i / cells) * s, (j / cells) * s, s / cells, s / cells)
      }
    }
    // rivets at panel corners
    ctx.fillStyle = 'rgba(20,22,25,0.8)'
    const inset = s / cells * 0.14
    for (let i = 0; i <= cells; i++) {
      for (let j = 0; j <= cells; j++) {
        const x = (i / cells) * s, y = (j / cells) * s
        if (x > 2 && x < s - 2 && y > 2 && y < s - 2) continue
        ctx.beginPath(); ctx.arc(x, y, 3.2, 0, Math.PI * 2); ctx.fill()
      }
    }
    // fine noise for grime
    const id = ctx.getImageData(0, 0, s, s)
    for (let k = 0; k < id.data.length; k += 4) {
      const n = (Math.random() - 0.5) * 14
      id.data[k] = Math.max(0, Math.min(255, id.data[k] + n))
      id.data[k + 1] = Math.max(0, Math.min(255, id.data[k + 1] + n))
      id.data[k + 2] = Math.max(0, Math.min(255, id.data[k + 2] + n))
    }
    ctx.putImageData(id, 0, 0)
  })
  return _metal
}

export function hazardTexture() {
  if (_hazard) return _hazard
  _hazard = mk(128, (ctx, s) => {
    ctx.fillStyle = '#151515'
    ctx.fillRect(0, 0, s, s)
    ctx.fillStyle = '#f4c11f'
    const stripeW = s / 6
    ctx.save()
    ctx.translate(s / 2, s / 2)
    ctx.rotate(Math.PI / 4)
    ctx.translate(-s, -s)
    for (let x = -s; x < s * 3; x += stripeW * 2) ctx.fillRect(x, -s, stripeW, s * 4)
    ctx.restore()
  })
  return _hazard
}

export function grateTexture() {
  if (_grate) return _grate
  _grate = mk(128, (ctx, s) => {
    ctx.fillStyle = '#2c2f33'
    ctx.fillRect(0, 0, s, s)
    ctx.strokeStyle = 'rgba(10,10,12,0.9)'
    ctx.lineWidth = 4
    const n = 6
    for (let i = 1; i < n; i++) {
      const p = (i / n) * s
      ctx.beginPath(); ctx.moveTo(p, 0); ctx.lineTo(p, s); ctx.stroke()
    }
    ctx.lineWidth = 3
    for (let i = 1; i < n * 2; i++) {
      const p = (i / (n * 2)) * s
      ctx.beginPath(); ctx.moveTo(0, p); ctx.lineTo(s, p); ctx.stroke()
    }
  })
  return _grate
}

// Diamond-plate style panel for doors / vault face.
export function panelTexture() {
  if (_panel) return _panel
  _panel = mk(256, (ctx, s) => {
    ctx.fillStyle = '#8a8f96'
    ctx.fillRect(0, 0, s, s)
    ctx.fillStyle = 'rgba(255,255,255,0.18)'
    const n = 8, cell = s / n
    for (let i = 0; i < n; i++) {
      for (let j = 0; j < n; j++) {
        const x = i * cell + cell / 2, y = j * cell + cell / 2
        ctx.save()
        ctx.translate(x, y); ctx.rotate(Math.PI / 4)
        ctx.fillRect(-cell * 0.18, -cell * 0.18, cell * 0.36, cell * 0.36)
        ctx.restore()
      }
    }
    ctx.strokeStyle = 'rgba(20,22,25,0.35)'
    ctx.lineWidth = 2
    ctx.strokeRect(1, 1, s - 2, s - 2)
  })
  return _panel
}
