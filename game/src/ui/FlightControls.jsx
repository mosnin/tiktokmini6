import { useEffect, useRef } from 'react'
import './flightcontrols.css'

// Mutable singleton the 3D game loop reads every frame (no React re-renders).
// Appears at the touch point, disappears on release.
export const flightInput = { x: 0, y: 0, active: false }
window.__flightInput = flightInput // debug/testing hook — lets a QA script drive steering directly

const R = 52 // clamp radius in px, matches the knob travel range

export function FlightJoystick() {
  const layerRef = useRef(null)
  const stickRef = useRef(null)
  const knobRef = useRef(null)
  const pointerIdRef = useRef(null)
  const hideTimerRef = useRef(null)

  useEffect(() => {
    const layer = layerRef.current
    if (!layer) return

    const showStickAt = (x, y) => {
      const stick = stickRef.current
      if (!stick) return
      if (hideTimerRef.current) { clearTimeout(hideTimerRef.current); hideTimerRef.current = null }
      stick.style.left = `${x}px`
      stick.style.top = `${y}px`
      stick.style.display = 'block'
      stick.classList.remove('fc-out')
      void stick.offsetWidth
      stick.classList.add('fc-in')
    }
    const moveKnob = (dx, dy) => {
      const knob = knobRef.current
      if (!knob) return
      knob.style.transform = `translate(-50%, -50%) translate(${dx}px, ${dy}px)`
    }
    const resetKnob = () => moveKnob(0, 0)
    const hideStick = () => {
      const stick = stickRef.current
      if (!stick) return
      stick.classList.remove('fc-in')
      stick.classList.add('fc-out')
      hideTimerRef.current = setTimeout(() => {
        if (stickRef.current) stickRef.current.style.display = 'none'
        hideTimerRef.current = null
      }, 150)
    }

    const originRef = { x: 0, y: 0 }

    const onPointerDown = e => {
      if (pointerIdRef.current !== null) return
      pointerIdRef.current = e.pointerId
      try { layer.setPointerCapture(e.pointerId) } catch {}
      originRef.x = e.clientX; originRef.y = e.clientY
      resetKnob()
      showStickAt(e.clientX, e.clientY)
      flightInput.active = true
      flightInput.x = 0; flightInput.y = 0
    }
    const onPointerMove = e => {
      if (pointerIdRef.current === null || e.pointerId !== pointerIdRef.current) return
      let dx = e.clientX - originRef.x
      let dy = e.clientY - originRef.y
      const len = Math.hypot(dx, dy)
      if (len > R) { const scale = R / len; dx *= scale; dy *= scale }
      moveKnob(dx, dy)
      flightInput.x = dx / R
      flightInput.y = dy / R
    }
    const endPointer = e => {
      if (pointerIdRef.current === null || e.pointerId !== pointerIdRef.current) return
      pointerIdRef.current = null
      try { layer.releasePointerCapture(e.pointerId) } catch {}
      flightInput.x = 0; flightInput.y = 0; flightInput.active = false
      resetKnob(); hideStick()
    }

    layer.addEventListener('pointerdown', onPointerDown)
    layer.addEventListener('pointermove', onPointerMove)
    layer.addEventListener('pointerup', endPointer)
    layer.addEventListener('pointercancel', endPointer)
    return () => {
      layer.removeEventListener('pointerdown', onPointerDown)
      layer.removeEventListener('pointermove', onPointerMove)
      layer.removeEventListener('pointerup', endPointer)
      layer.removeEventListener('pointercancel', endPointer)
      if (hideTimerRef.current) clearTimeout(hideTimerRef.current)
      flightInput.x = 0; flightInput.y = 0; flightInput.active = false
    }
  }, [])

  return (
    <div ref={layerRef} className="fc-touch-layer">
      <div ref={stickRef} className="fc-stick" style={{ display: 'none' }}>
        <div className="fc-ring" />
        <div ref={knobRef} className="fc-knob" />
      </div>
    </div>
  )
}

export function SpeedGauge({ speed, max = 100 }) {
  const clamped = Math.max(0, Math.min(1, (speed || 0) / max))
  return (
    <div className="fc-gauge">
      <div className="fc-gauge-label">SPD</div>
      <div className="fc-gauge-bar"><i style={{ width: `${clamped * 100}%` }} /></div>
      <div className="fc-gauge-val">{Math.round(speed || 0)}</div>
    </div>
  )
}
