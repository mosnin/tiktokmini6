import * as THREE from 'three'
import { useRef, useMemo, useEffect, useState } from 'react'
import { useFrame, useThree } from '@react-three/fiber'
import { useGame } from '../store.js'
import { MISSILES } from '../game/missiles.js'
import { MODELS, cloneModel, onModels } from '../game/models.js'

function fallbackMissile() {
  const g = new THREE.Group()
  const body = new THREE.Mesh(new THREE.ConeGeometry(0.45, 2.6, 12), new THREE.MeshStandardMaterial({ color: '#556', metalness: 0.6, roughness: 0.4 }))
  body.rotation.x = -Math.PI / 2
  g.add(body)
  return g
}

export default function HangarScene() {
  const { camera } = useThree()
  const rootRef = useRef()
  const viewMissileIdx = useGame(s => s.viewMissileIdx)
  const [mTick, setMTick] = useState(0)
  useEffect(() => onModels(() => setMTick(t => t + 1)), [])
  const model = useMemo(() => cloneModel(MODELS.missiles[viewMissileIdx]) || fallbackMissile(), [viewMissileIdx, mTick])
  const def = MISSILES[viewMissileIdx]

  useFrame((state, dt) => {
    if (rootRef.current) rootRef.current.rotation.y += dt * 0.4
    camera.position.lerp(new THREE.Vector3(0.9, 0.55, 6.6), 0.09)
    camera.lookAt(-0.45, -0.1, 0)
    const targetFov = 48
    if (Math.abs(camera.fov - targetFov) > 0.02) { camera.fov = THREE.MathUtils.lerp(camera.fov, targetFov, 0.1); camera.updateProjectionMatrix() }
  })

  return (
    <group>
      <color attach="background" args={['#05070a']} />
      <ambientLight intensity={0.85} />
      <directionalLight position={[3, 3, 6]} intensity={2.4} color="#fff2dd" />
      <directionalLight position={[-2, 2, 4]} intensity={1.4} color="#cfe4ff" />
      <directionalLight position={[-3, 1, -4]} intensity={1.6} color={def.palette.accent} />
      <pointLight position={[1.5, 0.5, 4]} intensity={1.2} color="#fff2dd" distance={14} />
      <mesh position={[0, -1.6, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <circleGeometry args={[3.4, 40]} />
        <meshStandardMaterial color="#161a20" metalness={0.6} roughness={0.4} />
      </mesh>
      <mesh position={[0, -1.58, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <ringGeometry args={[2.6, 2.75, 40]} />
        <meshBasicMaterial color={def.palette.accent} />
      </mesh>
      <group ref={rootRef} rotation={[0.12, 0.3, 0.55]} position={[0, 0, 0]} scale={1.7}>
        <primitive object={model} />
      </group>
    </group>
  )
}
