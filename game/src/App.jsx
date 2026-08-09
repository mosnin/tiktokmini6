import { useEffect } from 'react'
import { Canvas, useThree } from '@react-three/fiber'
import * as THREE from 'three'
import Gameplay from './three/Gameplay.jsx'
import HangarScene from './three/HangarScene.jsx'
import LoadingScreen from './ui/LoadingScreen.jsx'
import HUD from './ui/HUD.jsx'
import { useGame } from './store.js'
import { LEVELS } from './game/levels.js'
import { sfx } from './audio.js'
import { BUILD } from './consts.js'
import './ui/theme.css'

const RUN_SCREENS = ['descending', 'flying', 'crashed', 'revive', 'results']

function SceneSetup({ theme }) {
  const { scene } = useThree()
  useEffect(() => {
    scene.fog = new THREE.Fog(new THREE.Color(theme.fog), theme.fogNear, theme.fogFar)
    scene.background = new THREE.Color(theme.fog)
  }, [scene, theme])
  return null
}

export default function App() {
  const screen = useGame(s => s.screen)
  const selectedDepth = useGame(s => s.selectedDepth)
  const theme = LEVELS[selectedDepth - 1].theme

  useEffect(() => {
    const boot = () => sfx.unlock()
    window.addEventListener('pointerdown', boot, { once: true })
    return () => window.removeEventListener('pointerdown', boot)
  }, [])

  const showGameplay = RUN_SCREENS.includes(screen)
  const showHangar = screen === 'hangar'

  return (
    <>
      <Canvas
        dpr={[1, 2]}
        camera={{ fov: 82, near: 0.1, far: 400, position: [0, 3.3, 13] }}
        gl={{ antialias: true, toneMapping: THREE.ACESFilmicToneMapping, toneMappingExposure: 1.1 }}
      >
        {showGameplay && <SceneSetup theme={theme} />}
        {showGameplay && <Gameplay key={selectedDepth} />}
        {showHangar && <HangarScene />}
      </Canvas>
      <div className="dc-scanlines" />
      {screen === 'loading' && <LoadingScreen />}
      <HUD />
      <div className="dc-build-tag">{BUILD}</div>
    </>
  )
}
