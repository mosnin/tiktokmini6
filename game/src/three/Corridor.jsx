import * as THREE from 'three'
import { useMemo, useEffect, useRef } from 'react'
import { CORRIDOR_HALF_W as HW, CORRIDOR_HALF_H as HH } from '../consts.js'
import { metalTexture, hazardTexture, grateTexture, panelTexture } from './textures.js'

const _m = new THREE.Matrix4()

// One instanced draw call for a set of axis-aligned box transforms, instead
// of one React-managed Mesh per repeat — deep levels can have 500+ girders/
// lights/stripes, and that must stay ONE draw call each, not hundreds.
function InstancedBoxes({ xforms, geometry, material, userData }) {
  const ref = useRef()
  useEffect(() => {
    const mesh = ref.current
    if (!mesh) return
    xforms.forEach((xf, i) => {
      _m.compose(
        new THREE.Vector3(xf.x, xf.y, xf.z),
        new THREE.Quaternion(),
        new THREE.Vector3(xf.sx ?? 1, xf.sy ?? 1, xf.sz ?? 1),
      )
      mesh.setMatrixAt(i, _m)
    })
    mesh.instanceMatrix.needsUpdate = true
  }, [xforms])
  if (xforms.length === 0) return null
  return <instancedMesh ref={ref} args={[geometry, material, xforms.length]} userData={userData} frustumCulled={false} />
}

// Builds the whole depth-layer tunnel shell (floor/ceiling/walls + girders,
// pipes, blinking lights, hazard stripes, and the vault door at the far end)
// as ONE persistent object graph for the level. The parent (Gameplay) moves
// the returned group's position.z = traveled each frame — everything here is
// authored in "level space" (localZ = -distanceFromStart).
export default function Corridor({ level, groupRef }) {
  const theme = level.theme
  const length = level.length + 40 // small margin past the vault

  const wallMat = useMemo(() => {
    const m = new THREE.MeshStandardMaterial({ map: metalTexture(), color: theme.wall, roughness: 0.8, metalness: 0.35 })
    m.map = m.map.clone(); m.map.needsUpdate = true
    m.map.repeat.set(HW * 2 / 3, length / 12)
    return m
  }, [theme, length])
  const floorMat = useMemo(() => {
    const m = new THREE.MeshStandardMaterial({ map: grateTexture(), color: theme.floor, roughness: 0.9, metalness: 0.2 })
    m.map = m.map.clone(); m.map.needsUpdate = true
    m.map.repeat.set(HW * 2 / 3, length / 10)
    return m
  }, [theme, length])
  const ceilMat = useMemo(() => {
    const m = new THREE.MeshStandardMaterial({ map: metalTexture(), color: theme.ceil, roughness: 0.85, metalness: 0.3 })
    m.map = m.map.clone(); m.map.needsUpdate = true
    m.map.repeat.set(HW * 2 / 3, length / 12)
    return m
  }, [theme, length])

  const girderCount = Math.max(4, Math.floor(length / 15))
  const lightCount = Math.max(4, Math.floor(length / 22))
  const stripeCount = Math.max(4, Math.floor(length / 9))

  const girderMat = useMemo(() => new THREE.MeshStandardMaterial({ color: theme.wall2, roughness: 0.55, metalness: 0.75 }), [theme])
  const lightMatA = useMemo(() => new THREE.MeshBasicMaterial({ color: theme.light, transparent: true }), [theme])
  const lightMatB = useMemo(() => new THREE.MeshBasicMaterial({ color: theme.accent, transparent: true }), [theme])
  const pipeMat = useMemo(() => new THREE.MeshStandardMaterial({ color: theme.wall2, roughness: 0.4, metalness: 0.8 }), [theme])
  const stripeMat = useMemo(() => new THREE.MeshBasicMaterial({ color: theme.accent }), [theme])

  const girderGeo = useMemo(() => new THREE.BoxGeometry(1, 1, 1), [])
  const lightGeo = useMemo(() => new THREE.BoxGeometry(0.5, 0.16, 0.16), [])
  // height/depth swapped vs. a "flat decal" on purpose — reads as a low
  // raised hazard tick from the near-level chase camera, matching the look
  // this was tuned against
  const stripeGeo = useMemo(() => new THREE.BoxGeometry(0.9, 0.32, 0.05), [])

  // girder ribs: 4 bars framing the cross-section every ~15 units
  const girderXf = useMemo(() => {
    const arr = []
    for (let i = 0; i < girderCount; i++) {
      const z = -8 - i * (length / girderCount)
      arr.push({ x: 0, y: HH - 0.15, z, sx: HW * 2 - 0.4, sy: 0.32, sz: 0.32 })
      arr.push({ x: 0, y: -HH + 0.15, z, sx: HW * 2 - 0.4, sy: 0.32, sz: 0.32 })
      arr.push({ x: -HW + 0.15, y: 0, z, sx: 0.32, sy: HH * 2 - 0.4, sz: 0.32 })
      arr.push({ x: HW - 0.15, y: 0, z, sx: 0.32, sy: HH * 2 - 0.4, sz: 0.32 })
    }
    return arr
  }, [girderCount, length])

  // two alternating instanced sets so the blink animation reads as offset,
  // not synchronized strobing down the whole corridor
  const lightXfA = useMemo(() => {
    const arr = []
    for (let i = 0; i < lightCount; i++) {
      const z = -12 - i * (length / lightCount)
      arr.push({ x: -HW + 0.2, y: HH - 1.1, z })
      if (i % 2 === 0) arr.push({ x: HW - 0.2, y: HH - 1.1, z })
    }
    return arr
  }, [lightCount, length])
  const lightXfB = useMemo(() => {
    const arr = []
    for (let i = 0; i < lightCount; i++) {
      const z = -12 - i * (length / lightCount)
      if (i % 2 !== 0) arr.push({ x: HW - 0.2, y: HH - 1.1, z })
    }
    return arr
  }, [lightCount, length])

  const stripeXf = useMemo(() => {
    const arr = []
    for (let i = 0; i < stripeCount; i++) arr.push({ x: 0, y: -HH + 0.19, z: -6 - i * (length / stripeCount), sx: HW * 1.6, sy: 1, sz: 1 })
    return arr
  }, [stripeCount, length])

  const lightsRefA = useRef(), lightsRefB = useRef()

  return (
    <group ref={groupRef}>
      {/* shell */}
      <mesh position={[0, -HH, -length / 2]} rotation={[-Math.PI / 2, 0, 0]} material={floorMat} receiveShadow>
        <planeGeometry args={[HW * 2, length]} />
      </mesh>
      <mesh position={[0, HH, -length / 2]} rotation={[Math.PI / 2, 0, 0]} material={ceilMat}>
        <planeGeometry args={[HW * 2, length]} />
      </mesh>
      <mesh position={[-HW, 0, -length / 2]} rotation={[0, Math.PI / 2, 0]} material={wallMat}>
        <planeGeometry args={[length, HH * 2]} />
      </mesh>
      <mesh position={[HW, 0, -length / 2]} rotation={[0, -Math.PI / 2, 0]} material={wallMat}>
        <planeGeometry args={[length, HH * 2]} />
      </mesh>

      {/* pipes running the corridor's upper corners */}
      <mesh position={[-HW + 0.6, HH - 0.6, -length / 2]} rotation={[Math.PI / 2, 0, 0]} material={pipeMat}>
        <cylinderGeometry args={[0.22, 0.22, length, 10]} />
      </mesh>
      <mesh position={[HW - 0.6, HH - 0.6, -length / 2]} rotation={[Math.PI / 2, 0, 0]} material={pipeMat}>
        <cylinderGeometry args={[0.22, 0.22, length, 10]} />
      </mesh>

      <InstancedBoxes xforms={girderXf} geometry={girderGeo} material={girderMat} />
      <InstancedLights xforms={lightXfA} geometry={lightGeo} material={lightMatA} innerRef={lightsRefA} />
      <InstancedLights xforms={lightXfB} geometry={lightGeo} material={lightMatB} innerRef={lightsRefB} phaseOffset={Math.PI} />
      <InstancedBoxes xforms={stripeXf} geometry={stripeGeo} material={stripeMat} />

      <VaultDoor level={level} />
    </group>
  )
}

function InstancedLights({ xforms, geometry, material, innerRef, phaseOffset = 0 }) {
  useEffect(() => {
    if (innerRef.current) innerRef.current.userData = { blink: true, phase: phaseOffset }
  }, [xforms])
  return <InstancedBoxes xforms={xforms} geometry={geometry} material={material} />
}

function VaultDoor({ level }) {
  const theme = level.theme
  const z = -(level.length)
  const panelMat = useMemo(() => new THREE.MeshStandardMaterial({ map: panelTexture(), color: theme.accent2, metalness: 0.75, roughness: 0.35 }), [theme])
  const ringMat = useMemo(() => new THREE.MeshStandardMaterial({ color: theme.accent, emissive: theme.accent, emissiveIntensity: 0.7, metalness: 0.5, roughness: 0.3 }), [theme])
  const frameMat = useMemo(() => new THREE.MeshStandardMaterial({ color: theme.wall2, metalness: 0.6, roughness: 0.5 }), [theme])
  return (
    <group position={[0, 0, z]}>
      <mesh material={frameMat}><boxGeometry args={[HW * 2 + 0.6, HH * 2 + 0.6, 0.8]} /></mesh>
      <mesh position={[0, 0, 0.45]} material={panelMat}><circleGeometry args={[Math.min(HW, HH) - 0.3, 40]} /></mesh>
      {[0.72, 0.5, 0.28].map((f, i) => (
        <mesh key={i} position={[0, 0, 0.46 + i * 0.01]} material={i % 2 === 0 ? ringMat : frameMat} rotation={[0, 0, 0]}>
          <ringGeometry args={[Math.min(HW, HH) * f - 0.12, Math.min(HW, HH) * f, 32]} />
        </mesh>
      ))}
      <mesh position={[0, 0, 0.5]} material={ringMat}><circleGeometry args={[0.4, 24]} /></mesh>
    </group>
  )
}

// Blink the two instanced light materials (shared opacity per group reads as
// alternating banks of lights down the corridor, cheap: 2 material updates
// instead of per-instance state).
export function updateBlinkingLights(group, t) {
  if (!group) return
  group.traverse(o => {
    if (!o.isInstancedMesh || !o.userData?.blink) return
    const on = Math.sin(t * 2.4 + o.userData.phase) > -0.3
    o.material.opacity = on ? 1 : 0.15
  })
}
