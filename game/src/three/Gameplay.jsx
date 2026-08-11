import * as THREE from 'three'
import { useRef, useEffect, useMemo, useState } from 'react'
import { useFrame, useThree } from '@react-three/fiber'
import { useGame, run, MAX_POWERUP_ACTIVATIONS, POWERUP_GRACE } from '../store.js'
import { LEVELS } from '../game/levels.js'
import { MISSILES } from '../game/missiles.js'
import { generateLevel, collideObstacle, safeTargetFor, MISSILE_RADIUS } from '../game/obstacles.js'
import { generatePickups, POWERUP_DURATION, SLOWMO_FACTOR, SHRINK_FACTOR, COIN_VALUE } from '../game/powerups.js'
import { CORRIDOR_HALF_W as HW, CORRIDOR_HALF_H as HH } from '../consts.js'
import { MODELS, cloneModel, onModels } from '../game/models.js'
import { flightInput } from '../ui/FlightControls.jsx'
import { sfx } from '../audio.js'
import { Effects } from './effects.js'
import Corridor, { updateBlinkingLights } from './Corridor.jsx'
import {
  buildWallGroup, buildPistonGroup, updatePiston, buildFanGroup, updateFan,
  buildLaserGroup, updateLaser, buildCrateGroup, updateCrate, buildPickupMesh,
} from './obstacleMeshes.js'

const ENVELOPE_X = HW - 0.9
const ENVELOPE_Y = HH - 1.1
const STEER_ACCEL = 9.5
const CAM_HEIGHT = 3.3
const CAM_DIST = 13
const LOOKAT_Y = 0.75

function fallbackMissile() {
  const g = new THREE.Group()
  const body = new THREE.Mesh(new THREE.ConeGeometry(0.45, 2.6, 12), new THREE.MeshStandardMaterial({ color: '#556', metalness: 0.6, roughness: 0.4 }))
  body.rotation.x = -Math.PI / 2
  g.add(body)
  return g
}

export default function Gameplay() {
  const { scene, camera } = useThree()
  const missileWrapRef = useRef()   // scale (shrink powerup)
  const missileTiltRef = useRef()   // bank/pitch visual
  const flameRef = useRef()         // thruster flame cones (flickered per frame)
  const headlightRef = useRef()     // missile-mounted forward light
  const corridorRef = useRef()
  const obstacleRootRef = useRef()
  const pickupRootRef = useRef()

  const screen = useGame(s => s.screen)
  const missileIdx = useGame(s => s.missileIdx)
  const equippedCamo = useGame(s => s.camos[s.missileIdx]?.equipped ?? 'classic')
  const selectedDepth = useGame(s => s.selectedDepth)
  const parts = useGame(s => s.parts)
  // bumped every beginFlight() — replaying the SAME depth must still get a
  // fresh obstacle/pickup rebuild (resolved/taken flags reset), not the
  // stale arrays from the previous attempt
  const flightSeq = useGame(s => s.flightSeq)

  const level = LEVELS[selectedDepth - 1]
  const missileDef = MISSILES[missileIdx]
  const stats = useGame.getState().statsFor(missileIdx)

  const [mTick, setMTick] = useState(0)
  useEffect(() => onModels(() => setMTick(t => t + 1)), [])
  const missileModel = useMemo(() => cloneModel(MODELS.missiles[missileIdx], equippedCamo) || fallbackMissile(), [missileIdx, mTick, equippedCamo])

  const obstacles = useMemo(() => generateLevel(level), [level.depth, flightSeq])
  // Power-up pickups are seeded at random points in the corridor cross-section,
  // which regularly put them behind a wall or far off the only survivable line
  // — unreachable in practice. Snap each one onto the gap of the nearest
  // obstacle so it always sits on the path the player must fly anyway.
  const pickups = useMemo(() => {
    const list = generatePickups(level)
    for (const p of list) {
      if (p.kind === 'coin') continue
      // Only walls: their safeTargetFor is a real hole centre. Lasers/crates/
      // pistons only have an approximate "safe-ish" point, and parking a
      // capsule there can bury it inside solid geometry.
      let near = null, best = 1e9
      for (const o of obstacles) {
        if (o.type !== 'wall') continue
        const gap = Math.abs(o.distance - p.distance)
        if (gap < best) { best = gap; near = o }
      }
      if (near && best < 90) {
        const t = safeTargetFor(near)
        p.x = t.x; p.y = t.y
        // Sit exactly IN the hole. This makes the capsule structurally
        // collectable: surviving the wall means being inside the hole, and the
        // grab radius below is wider than the largest hole — so if you make it
        // through, you get the power-up. Parking it 2-8m short failed because
        // the missile is still sliding onto the safe line that far out.
        p.distance = near.distance
      }
    }
    return list
  }, [obstacles, level.depth, flightSeq])

  const fx = useMemo(() => new Effects(scene), [scene])
  useEffect(() => () => fx.dispose(), [fx])

  const sim = useRef({
    mx: 0, my: 0, vx: 0, vy: 0, tilt: { x: 0, z: 0 },
    accumT: 0, hudT: 0, crashT: 0, crashDone: false, shake: 0,
    vaultDone: false, finishT: 0,
  }).current

  // ---------- build/rebuild obstacle + pickup meshes when the level changes ----------
  useEffect(() => {
    const root = obstacleRootRef.current
    const pRoot = pickupRootRef.current
    if (!root || !pRoot) return
    while (root.children.length) root.remove(root.children[0])
    while (pRoot.children.length) pRoot.remove(pRoot.children[0])
    const theme = level.theme
    for (const obs of obstacles) {
      let g
      if (obs.type === 'wall') g = buildWallGroup(obs, theme)
      else if (obs.type === 'piston') g = buildPistonGroup(obs, theme)
      else if (obs.type === 'fan') g = buildFanGroup(obs, theme)
      else if (obs.type === 'laser') g = buildLaserGroup(obs, theme)
      else if (obs.type === 'crate') g = buildCrateGroup(obs, theme)
      if (!g) continue
      obs.mesh = g
      obs.resolved = false
      root.add(g)
    }
    for (const p of pickups) {
      const m = buildPickupMesh(p.kind)
      m.position.set(p.x, p.y, 0)
      p.mesh = m
      p.taken = false
      pRoot.add(m)
    }
    // reset run scroll state for a fresh look at the level
    sim.accumT = 0; sim.crashT = 0; sim.crashDone = false; sim.vaultDone = false; sim.finishT = 0
    sim.mx = 0; sim.my = 0; sim.vx = 0; sim.vy = 0

    // debug hook for the difficulty auto-steerer / QA scripts (not gated —
    // harmless read-only surface, mirrors the window.__store pattern)
    window.__dc = { obstacles, pickups, level, run, sim, safeTargetFor, getMissile: () => ({ x: sim.mx, y: sim.my }) }
  }, [obstacles, pickups, level])

  // ---------- descending transition: kick off the run once the elevator animation lands ----------
  useEffect(() => {
    if (screen !== 'descending') return
    const t = setTimeout(() => useGame.getState().beginFlight(), 1500)
    return () => clearTimeout(t)
  }, [screen])

  useFrame((state, rawDt) => {
    const realDt = Math.min(rawDt, 1 / 30)
    const g = useGame.getState()

    if (g.screen === 'hangar' || g.screen === 'elevator' || g.screen === 'loading') return
    // ad-activated powerups: freeze the whole corridor while the rewarded-ad
    // modal is up over the flying screen (stored-powerup activation) — no
    // physics, no scroll, no spawns, camera holds still.
    if (g.screen === 'flying' && g.adModal) return

    const missileWrap = missileWrapRef.current
    const missileTilt = missileTiltRef.current
    if (!missileWrap) return

    // ---------------- FLYING ----------------
    if (g.screen === 'flying') {
      const slowmoActive = run.powerup?.kind === 'slowmo'
      const worldDt = realDt * (slowmoActive ? SLOWMO_FACTOR : 1)
      sim.accumT += worldDt
      const t = sim.accumT

      // ad-activated powerup: the rewarded ad just closed (store set this
      // flag) — turn the stored pickup into the real, timed effect now that
      // we have a sim-time clock to stamp endsAt/graceUntil with.
      if (run.pendingActivation) {
        const kind = run.pendingActivation
        run.pendingActivation = null
        run.powerup = { kind, endsAt: t + POWERUP_DURATION }
        run.powerupActivations += 1
        run.graceUntil = t + POWERUP_GRACE
        fx.spawnPowerup(new THREE.Vector3(sim.mx, sim.my, 0), kind === 'slowmo' ? '#3fa8ff' : '#a03fff')
        if (kind === 'slowmo') { sfx.slowmoEnter(); sfx.setSlowmo(true) } else sfx.powerup(true)
      }

      // speed ramp
      const rampP = Math.min(1, t / level.rampTime)
      run.speed = level.baseSpeed + (level.maxSpeed - level.baseSpeed) * rampP
      run.traveled += run.speed * worldDt

      // ---- steering (real-time, unscaled by slow-mo — player advantage) ----
      const active = flightInput.active
      const ix = active ? flightInput.x : 0
      const iy = active ? -flightInput.y : 0
      const maxSpeedLat = 7.5 * stats.handling
      const targetVx = ix * maxSpeedLat
      const targetVy = iy * maxSpeedLat
      const rate = Math.min(STEER_ACCEL * stats.handling * realDt, 1)
      sim.vx += (targetVx - sim.vx) * rate
      sim.vy += (targetVy - sim.vy) * rate
      sim.mx = THREE.MathUtils.clamp(sim.mx + sim.vx * realDt, -ENVELOPE_X, ENVELOPE_X)
      sim.my = THREE.MathUtils.clamp(sim.my + sim.vy * realDt, -ENVELOPE_Y, ENVELOPE_Y)

      const shrinkActive = run.powerup?.kind === 'shrink'
      const visScale = shrinkActive ? SHRINK_FACTOR : 1
      missileWrap.scale.setScalar(visScale)
      missileWrap.position.set(sim.mx, sim.my, 0)
      if (headlightRef.current) headlightRef.current.position.set(sim.mx, sim.my, 2)
      missileTilt.rotation.z = THREE.MathUtils.lerp(missileTilt.rotation.z, -sim.vx * 0.05, 0.15)
      missileTilt.rotation.x = THREE.MathUtils.lerp(missileTilt.rotation.x, sim.vy * 0.045, 0.15)
      if (flameRef.current) {
        const fl = 0.85 + Math.random() * 0.3
        const spd = 0.7 + Math.min(1, run.speed / level.maxSpeed) * 0.6
        flameRef.current.scale.set(fl, fl * spd, fl)
        flameRef.current.visible = true
      }

      // engine flame + smoke trail
      const speedNorm = Math.min(1, run.speed / level.maxSpeed)
      const nosePos = new THREE.Vector3(sim.mx, sim.my, 0.9)
      fx.spawnEngineTick(nosePos, missileDef.flame, speedNorm)
      if (!sim.vaultDone) sfx.engine(speedNorm)

      // corridor scroll
      if (corridorRef.current) corridorRef.current.position.z = run.traveled
      updateBlinkingLights(corridorRef.current, state.clock.elapsedTime)

      // obstacles: scroll, animate, collide
      const radius = MISSILE_RADIUS * missileDef.hitboxScale * visScale * 0.7
      let nearestLaserProx = 0
      for (const obs of obstacles) {
        const z = run.traveled - obs.distance
        if (obs.mesh) {
          // once past the missile plane, hide it — otherwise walls sweep on
          // through the camera as huge screen-filling bands (reads as a glitch)
          obs.mesh.visible = z < 1.2
          obs.mesh.position.z = z
          if (obs.type === 'fan') updateFan(obs.mesh, obs, t)
          else if (obs.type === 'piston') updatePiston(obs.mesh, obs, t)
          else if (obs.type === 'laser') { updateLaser(obs.mesh, obs, t); if (Math.abs(z) < 40) nearestLaserProx = Math.max(nearestLaserProx, 1 - Math.abs(z) / 40) }
          else if (obs.type === 'crate') updateCrate(obs.mesh, obs, t)
        }
        if (!obs.resolved && z >= -0.05) {
          obs.resolved = true
          const hit = collideObstacle(obs, sim.mx, sim.my, radius, t)
          if (hit) onHit(g)
          else { run.obstaclesCleared += 1 }
        }
      }
      sfx.laserHum(nearestLaserProx)

      // pickups
      for (const p of pickups) {
        if (p.taken) continue
        const z = run.traveled - p.distance
        if (p.mesh) { p.mesh.visible = z < 0.8; p.mesh.position.z = z; p.mesh.rotation.y = t * 2.4 }
        if (Math.abs(z) < 3) {
          const dx = p.x - sim.mx, dy = p.y - sim.my
          // Power-ups get a much wider grab than coins: they gate a rewarded
          // ad, so a near-miss costs a real impression. 2.83 units comfortably
          // exceeds the largest wall hole (~2.4), which is what makes
          // "survived the wall => collected the capsule" hold.
          const grabR2 = p.kind === 'coin' ? 1.6 : 8
          if (dx * dx + dy * dy + z * z < grabR2) {
            if (p.kind === 'coin') {
              p.taken = true; p.mesh.visible = false
              run.coinsThisRun += COIN_VALUE; sfx.coin(); fx.spawnCoinPop(new THREE.Vector3(p.x, p.y, 0))
            } else {
              // ad-activated powerup: touching only STORES it (one at a time,
              // capped activations per run) — activation happens later via
              // the HUD chip -> rewarded ad -> pendingActivation above. If the
              // slot is full or the run is out of activations, leave the
              // pickup live so the player can grab it once the slot frees up.
              const canStore = !run.storedPowerup && run.powerupActivations < MAX_POWERUP_ACTIVATIONS
              if (canStore) {
                p.taken = true; p.mesh.visible = false
                run.storedPowerup = { kind: p.kind }
                fx.spawnPowerup(new THREE.Vector3(p.x, p.y, 0), p.kind === 'slowmo' ? '#3fa8ff' : '#a03fff')
                sfx.powerup(true)
              }
            }
          }
        }
      }

      // powerup expiry
      if (run.powerup && t >= run.powerup.endsAt) {
        if (run.powerup.kind === 'slowmo') { sfx.slowmoExit(); sfx.setSlowmo(false) }
        run.powerup = null
      }

      // vault door
      const vaultZ = run.traveled - level.length
      if (vaultZ >= -0.3 && !sim.vaultDone) {
        sim.vaultDone = true
        fx.spawnVaultExplosion(new THREE.Vector3(sim.mx, sim.my, 0))
        sfx.explosion()
        sfx.engine(0); sfx.laserHum(0)
        sim.finishT = 0
      }
      if (sim.vaultDone) {
        sim.finishT += realDt
        sim.shake = Math.max(sim.shake, 0.5)
        if (sim.finishT > 1.3) useGame.getState().finishRun(true)
      }

      // HUD sync
      sim.hudT += realDt
      if (sim.hudT > 0.08) {
        sim.hudT = 0
        g.syncHud({
          traveled: Math.floor(run.traveled), speed: Math.round(run.speed),
          progress: THREE.MathUtils.clamp(run.traveled / level.length, 0, 1),
          lives: run.livesLeft, powerup: run.powerup ? { kind: run.powerup.kind, pct: THREE.MathUtils.clamp((run.powerup.endsAt - t) / POWERUP_DURATION, 0, 1) } : null,
          storedPowerup: run.storedPowerup ? { kind: run.storedPowerup.kind } : null,
          coins: run.coinsThisRun,
        })
      }
    }

    // ---------------- CRASHED ----------------
    else if (g.screen === 'crashed') {
      sim.crashT += realDt
      sim.shake = Math.max(0, 0.6 - sim.crashT)
      if (sim.crashT > 1.1 && !sim.crashDone) { sim.crashDone = true; g.setPhase('revive') }
    }

    // camera
    const camTarget = new THREE.Vector3(sim.mx, sim.my + CAM_HEIGHT * 0.35, CAM_DIST)
    camera.position.lerp(camTarget, g.screen === 'flying' ? 0.14 : 0.05)
    if (sim.shake > 0.01) {
      camera.position.x += (Math.random() - 0.5) * sim.shake
      camera.position.y += (Math.random() - 0.5) * sim.shake
      sim.shake *= 0.9
    }
    camera.lookAt(sim.mx, sim.my, -60)

    fx.update(realDt)
  })

  function onHit(g) {
    // post-ad-activation invincibility grace: absorb the hit silently so
    // resuming after the ad modal closes isn't an instant wall.
    if (sim.accumT < run.graceUntil) return
    if (run.livesLeft > 1) {
      run.livesLeft -= 1
      useGame.getState().registerGraze()
      sim.shake = 0.35
      fx.spawnGraze(new THREE.Vector3(sim.mx, sim.my, 0))
    } else {
      run.livesLeft = 0
      sim.crashT = 0; sim.crashDone = false
      fx.spawnVaultExplosion(new THREE.Vector3(sim.mx, sim.my, 0))
      sfx.explosion()
      sfx.engine(0); sfx.laserHum(0)
      sim.shake = 0.9
      if (missileWrapRef.current) missileWrapRef.current.visible = false
      useGame.getState().crash()
    }
  }

  // restore missile visibility on a fresh flight AND on ad-revive (which
  // returns straight to 'flying' without passing 'descending')
  useEffect(() => {
    if ((screen === 'descending' || screen === 'flying') && missileWrapRef.current) missileWrapRef.current.visible = true
  }, [screen])

  return (
    <group>
      <ambientLight intensity={0.75} color={level.theme.light} />
      <directionalLight position={[4, 8, 6]} intensity={level.theme.lightIntensity * 1.6} color={level.theme.light} />
      <hemisphereLight args={[level.theme.light, level.theme.wall, 0.6]} />
      <pointLight position={[0, 2, -2]} intensity={0.9} color={level.theme.accent} distance={16} />
      <pointLight ref={headlightRef} position={[0, 0, 2]} intensity={2.6} color="#fff6e0" distance={30} decay={1.6} />

      <Corridor level={level} groupRef={corridorRef} />
      <group ref={obstacleRootRef} />
      <group ref={pickupRootRef} />

      <group ref={missileWrapRef} position={[0, 0, 0]}>
        <group ref={missileTiltRef}>
          <primitive object={missileModel} />
          <group ref={flameRef} position={[0, 0, 1.05]} rotation={[Math.PI / 2, 0, 0]}>
            <mesh position={[0, -0.35, 0]}>
              <coneGeometry args={[0.22, 0.9, 12, 1, true]} />
              <meshBasicMaterial color="#ff7a1e" transparent opacity={0.85} blending={THREE.AdditiveBlending} depthWrite={false} side={THREE.DoubleSide} />
            </mesh>
            <mesh position={[0, -0.22, 0]}>
              <coneGeometry args={[0.11, 0.5, 10, 1, true]} />
              <meshBasicMaterial color="#fff3c8" transparent opacity={0.95} blending={THREE.AdditiveBlending} depthWrite={false} side={THREE.DoubleSide} />
            </mesh>
          </group>
        </group>
      </group>
    </group>
  )
}
