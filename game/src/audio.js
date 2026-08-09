// Premium WebAudio synth engine — zero asset files, everything generated at runtime.
// Signal flow:
//   voice -> master (dry bus) -> [optional lowpass send for slow-mo] -> compressor -> destination
//   voice -> sendGain -> convolver (generated impulse response) -> wetReturn -> master
// Every public call is try/catch guarded so a locked/suspended AudioContext never throws.
// No background music by design — the corridor whoosh + one-shots carry the mix.

let ctx = null
let master = null       // dry bus, everything passes through this on the way to the compressor
let lowpassNode = null  // slow-mo "underwater" filter, bypassed by default (bypassGain=1, wetGain=0)
let dryGain = null, wetLpGain = null
let compressor = null   // final bus glue
let convolver = null    // shared generated reverb
let graphReady = false

function ac() {
  if (!ctx) ctx = new (window.AudioContext || window.webkitAudioContext)()
  if (!graphReady) buildGraph(ctx)
  return ctx
}

function buildGraph(c) {
  try {
    compressor = c.createDynamicsCompressor()
    const t = c.currentTime
    compressor.threshold.setValueAtTime(-18, t)
    compressor.ratio.setValueAtTime(3, t)
    compressor.knee.setValueAtTime(12, t)
    compressor.attack.setValueAtTime(0.003, t)
    compressor.release.setValueAtTime(0.25, t)
    compressor.connect(c.destination)

    master = c.createGain()
    master.gain.value = 0.9

    // slow-mo lowpass send: master splits into dry path + filtered path,
    // crossfaded by setSlowmo()
    dryGain = c.createGain(); dryGain.gain.value = 1
    wetLpGain = c.createGain(); wetLpGain.gain.value = 0
    lowpassNode = c.createBiquadFilter(); lowpassNode.type = 'lowpass'; lowpassNode.frequency.value = 900; lowpassNode.Q.value = 0.5
    master.connect(dryGain); dryGain.connect(compressor)
    master.connect(lowpassNode); lowpassNode.connect(wetLpGain); wetLpGain.connect(compressor)

    convolver = c.createConvolver()
    convolver.buffer = makeImpulseResponse(c)
    const wetReturn = c.createGain()
    wetReturn.gain.value = 1
    convolver.connect(wetReturn)
    wetReturn.connect(master)

    graphReady = true
  } catch { /* audio locked until first gesture — retried lazily on next call */ }
}

// ---------- generators ----------

function makeImpulseResponse(c, duration = 1.2, decay = 3.2) {
  const len = Math.max(1, Math.floor(c.sampleRate * duration))
  const buf = c.createBuffer(2, len, c.sampleRate)
  for (let ch = 0; ch < 2; ch++) {
    const d = buf.getChannelData(ch)
    for (let i = 0; i < len; i++) {
      const env = Math.pow(1 - i / len, decay)
      d[i] = (Math.random() * 2 - 1) * env
    }
  }
  return buf
}

function noiseBuffer(c, duration = 0.3, pink = false) {
  const len = Math.max(1, Math.floor(c.sampleRate * duration))
  const buf = c.createBuffer(1, len, c.sampleRate)
  const d = buf.getChannelData(0)
  if (pink) {
    let b0 = 0, b1 = 0, b2 = 0, b3 = 0, b4 = 0, b5 = 0, b6 = 0
    for (let i = 0; i < len; i++) {
      const w = Math.random() * 2 - 1
      b0 = 0.99886 * b0 + w * 0.0555179
      b1 = 0.99332 * b1 + w * 0.0750759
      b2 = 0.96900 * b2 + w * 0.1538520
      b3 = 0.86650 * b3 + w * 0.3104856
      b4 = 0.55000 * b4 + w * 0.5329522
      b5 = -0.7616 * b5 - w * 0.0168980
      d[i] = (b0 + b1 + b2 + b3 + b4 + b5 + b6 + w * 0.5362) * 0.11
      b6 = w * 0.115926
    }
  } else {
    for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1
  }
  return buf
}

function noiseSource(c, duration = 0.3, pink = false) {
  const src = c.createBufferSource()
  src.buffer = noiseBuffer(c, duration, pink)
  return src
}

function vary(freq, amt = 0.03) {
  return freq * (1 + (Math.random() * 2 - 1) * amt)
}

function out(node, wet = 0.18, dry = 1) {
  try {
    const c = ac()
    if (dry > 0) {
      if (dry === 1) node.connect(master)
      else { const dg = c.createGain(); dg.gain.value = dry; node.connect(dg); dg.connect(master) }
    }
    if (wet > 0) {
      const sg = c.createGain(); sg.gain.value = wet
      node.connect(sg); sg.connect(convolver)
    }
  } catch {}
}

function envelope(param, { t0, peak = 0.2, attack = 0.006, decay = 0.1, sustain = 0.5, sustainTime = 0.06, release = 0.2 }) {
  param.setValueAtTime(0.0001, t0)
  param.linearRampToValueAtTime(peak, t0 + attack)
  param.linearRampToValueAtTime(Math.max(peak * sustain, 0.0001), t0 + attack + decay)
  param.setTargetAtTime(0.0001, t0 + attack + decay + sustainTime, Math.max(release / 3, 0.01))
}

// ---------- one-shots ----------

function fnClick() {
  const c = ac(), t = c.currentTime
  const src = noiseSource(c, 0.06)
  const bp = c.createBiquadFilter(); bp.type = 'bandpass'; bp.frequency.value = vary(2200, 0.08); bp.Q.value = 3.5
  const g = c.createGain()
  envelope(g.gain, { t0: t, peak: 0.08, attack: 0.002, decay: 0.03, sustain: 0.15, sustainTime: 0.01, release: 0.04 })
  src.connect(bp).connect(g)
  out(g, 0.12)
  src.start(t); src.stop(t + 0.09)
  const o = c.createOscillator(); o.type = 'sine'; o.frequency.setValueAtTime(vary(1500, 0.04), t)
  const og = c.createGain()
  og.gain.setValueAtTime(0.0001, t)
  og.gain.linearRampToValueAtTime(0.03, t + 0.004)
  og.gain.exponentialRampToValueAtTime(0.0001, t + 0.05)
  o.connect(og); out(og, 0.12)
  o.start(t); o.stop(t + 0.06)
}

function fnSwoosh() {
  const c = ac(), t = c.currentTime, dur = 0.35
  const src = noiseSource(c, dur, true)
  const bp = c.createBiquadFilter(); bp.type = 'bandpass'; bp.Q.value = 1.2
  bp.frequency.setValueAtTime(400, t)
  bp.frequency.exponentialRampToValueAtTime(3200, t + dur * 0.6)
  bp.frequency.exponentialRampToValueAtTime(900, t + dur)
  const g = c.createGain()
  g.gain.setValueAtTime(0.0001, t)
  g.gain.linearRampToValueAtTime(0.25, t + dur * 0.35)
  g.gain.exponentialRampToValueAtTime(0.0001, t + dur)
  src.connect(bp).connect(g)
  out(g, 0.2)
  src.start(t); src.stop(t + dur + 0.02)
}

function fnLaunch() {
  const c = ac(), t = c.currentTime
  const o1 = c.createOscillator(); o1.type = 'sawtooth'
  o1.frequency.setValueAtTime(70, t)
  o1.frequency.exponentialRampToValueAtTime(280, t + 0.4)
  const lp1 = c.createBiquadFilter(); lp1.type = 'lowpass'; lp1.frequency.setValueAtTime(400, t); lp1.frequency.exponentialRampToValueAtTime(3000, t + 0.4)
  const g1 = c.createGain()
  g1.gain.setValueAtTime(0.001, t)
  g1.gain.linearRampToValueAtTime(0.4, t + 0.05)
  g1.gain.exponentialRampToValueAtTime(0.001, t + 0.55)
  o1.connect(lp1).connect(g1); out(g1, 0.2)
  o1.start(t); o1.stop(t + 0.6)

  const dur3 = 0.5
  const src = noiseSource(c, dur3, true)
  const bp3 = c.createBiquadFilter(); bp3.type = 'bandpass'; bp3.Q.value = 0.9
  bp3.frequency.setValueAtTime(300, t)
  bp3.frequency.exponentialRampToValueAtTime(2800, t + dur3)
  const g3 = c.createGain()
  g3.gain.setValueAtTime(0.0001, t)
  g3.gain.linearRampToValueAtTime(0.28, t + dur3 * 0.4)
  g3.gain.exponentialRampToValueAtTime(0.0001, t + dur3)
  src.connect(bp3).connect(g3); out(g3, 0.2)
  src.start(t); src.stop(t + dur3 + 0.02)

  const sub = c.createOscillator(); sub.type = 'sine'
  sub.frequency.setValueAtTime(60, t)
  sub.frequency.exponentialRampToValueAtTime(30, t + 0.3)
  const subG = c.createGain()
  subG.gain.setValueAtTime(0.4, t)
  subG.gain.exponentialRampToValueAtTime(0.001, t + 0.35)
  sub.connect(subG); out(subG, 0.15)
  sub.start(t); sub.stop(t + 0.4)
}

function fnGraze() {
  const c = ac(), t = c.currentTime
  // metal clank: short detuned metallic ring
  for (const [f, det] of [[820, 0], [1230, 6], [1640, -9]]) {
    const o = c.createOscillator(); o.type = 'triangle'; o.frequency.value = vary(f, 0.02); o.detune.value = det
    const g = c.createGain()
    g.gain.setValueAtTime(0.22, t)
    g.gain.exponentialRampToValueAtTime(0.001, t + 0.28)
    o.connect(g); out(g, 0.28)
    o.start(t); o.stop(t + 0.3)
  }
  const src = noiseSource(c, 0.1)
  const bp = c.createBiquadFilter(); bp.type = 'bandpass'; bp.frequency.value = 2600; bp.Q.value = 2
  const g2 = c.createGain()
  g2.gain.setValueAtTime(0.3, t)
  g2.gain.exponentialRampToValueAtTime(0.001, t + 0.1)
  src.connect(bp).connect(g2); out(g2, 0.15)
  src.start(t); src.stop(t + 0.12)
}

function fnExplosion() {
  const c = ac(), t = c.currentTime
  const sub = c.createOscillator(); sub.type = 'sine'
  sub.frequency.setValueAtTime(90, t)
  sub.frequency.exponentialRampToValueAtTime(26, t + 0.9)
  const subG = c.createGain()
  subG.gain.setValueAtTime(0.001, t)
  subG.gain.linearRampToValueAtTime(0.9, t + 0.025)
  subG.gain.exponentialRampToValueAtTime(0.001, t + 0.9)
  sub.connect(subG); out(subG, 0.18, 1)
  sub.start(t); sub.stop(t + 0.95)

  const dur1 = 0.5
  const src1 = noiseSource(c, dur1)
  const bp1 = c.createBiquadFilter(); bp1.type = 'bandpass'; bp1.frequency.value = 550; bp1.Q.value = 0.55
  const g1 = c.createGain()
  g1.gain.setValueAtTime(0.0001, t)
  g1.gain.linearRampToValueAtTime(0.85, t + 0.007)
  g1.gain.exponentialRampToValueAtTime(0.001, t + dur1)
  src1.connect(bp1).connect(g1); out(g1, 0.35)
  src1.start(t); src1.stop(t + dur1 + 0.02)

  const dur2 = 1.8
  const src2 = noiseSource(c, dur2, true)
  const lp2 = c.createBiquadFilter(); lp2.type = 'lowpass'
  lp2.frequency.setValueAtTime(420, t)
  lp2.frequency.exponentialRampToValueAtTime(75, t + dur2)
  const g2 = c.createGain()
  g2.gain.setValueAtTime(0.0001, t + 0.02)
  g2.gain.linearRampToValueAtTime(0.55, t + 0.15)
  g2.gain.exponentialRampToValueAtTime(0.001, t + dur2)
  src2.connect(lp2).connect(g2); out(g2, 0.4)
  src2.start(t); src2.stop(t + dur2 + 0.05)

  // metal crumple layer
  const shaper = c.createWaveShaper()
  { const curve = new Float32Array(256); for (let i = 0; i < 256; i++) { const x = (i / 128) - 1; curve[i] = Math.tanh(x * 3) } shaper.curve = curve }
  const gCr = c.createGain()
  gCr.gain.setValueAtTime(0.24, t)
  gCr.gain.exponentialRampToValueAtTime(0.001, t + 0.35)
  for (const det of [0, 11, -13]) {
    const oc = c.createOscillator(); oc.type = 'sawtooth'
    oc.frequency.setValueAtTime(100 + det, t)
    oc.frequency.exponentialRampToValueAtTime(40, t + 0.35)
    oc.connect(shaper); oc.start(t); oc.stop(t + 0.36)
  }
  const lpCr = c.createBiquadFilter(); lpCr.type = 'lowpass'; lpCr.frequency.value = 1400
  shaper.connect(lpCr).connect(gCr); out(gCr, 0.12)

  const n = 10
  for (let i = 0; i < n; i++) {
    const tt = t + 0.08 + Math.random() * 0.7
    const dur = 0.03 + Math.random() * 0.06
    const srcD = noiseSource(c, dur + 0.02)
    const bpD = c.createBiquadFilter(); bpD.type = 'bandpass'
    bpD.frequency.value = 350 + Math.random() * 1000
    bpD.Q.value = 1.4 + Math.random() * 2
    const g3 = c.createGain()
    g3.gain.setValueAtTime(0.0001, tt)
    g3.gain.linearRampToValueAtTime(0.12 + Math.random() * 0.08, tt + 0.004)
    g3.gain.exponentialRampToValueAtTime(0.0001, tt + dur)
    srcD.connect(bpD).connect(g3); out(g3, 0.2)
    srcD.start(tt); srcD.stop(tt + dur + 0.02)
  }

  const oT = c.createOscillator(); oT.type = 'sine'; oT.frequency.value = 30
  const gT = c.createGain()
  gT.gain.setValueAtTime(0.2, t + 0.1)
  gT.gain.exponentialRampToValueAtTime(0.001, t + 1.4)
  oT.connect(gT); out(gT, 0.12)
  oT.start(t + 0.1); oT.stop(t + 1.5)
}

function coinDing(t, baseFreq = 1800, peak = 0.12) {
  const c = ac()
  const f1 = vary(baseFreq, 0.03)
  const o1 = c.createOscillator(); o1.type = 'sine'; o1.frequency.value = f1
  const g1 = c.createGain()
  g1.gain.setValueAtTime(0.0001, t)
  g1.gain.linearRampToValueAtTime(peak, t + 0.006)
  g1.gain.exponentialRampToValueAtTime(0.0001, t + 0.35)
  o1.connect(g1); out(g1, 0.22)
  o1.start(t); o1.stop(t + 0.4)
  const o2 = c.createOscillator(); o2.type = 'sine'; o2.frequency.value = f1 * 1.5
  const g2 = c.createGain()
  g2.gain.setValueAtTime(0.0001, t)
  g2.gain.linearRampToValueAtTime(peak * 0.5, t + 0.004)
  g2.gain.exponentialRampToValueAtTime(0.0001, t + 0.18)
  o2.connect(g2); out(g2, 0.22)
  o2.start(t); o2.stop(t + 0.2)
}

function fnCoin() { coinDing(ac().currentTime) }

function fnCascade(n) {
  const c = ac()
  const count = Math.max(1, Math.min(24, n | 0))
  let delay = 0, interval = 0.09
  for (let i = 0; i < count; i++) {
    const t = c.currentTime + delay
    coinDing(t, 1600 * Math.pow(1.035, i), 0.1 * (0.85 + Math.random() * 0.3))
    delay += interval
    interval = Math.max(0.025, interval * 0.92)
  }
}

function fnPowerup(pitchUp) {
  const c = ac(), t0 = c.currentTime
  const notes = pitchUp ? [523.25, 659.25, 784.0, 1046.5, 1318.5] : [659.25, 784.0, 987.77, 1318.5]
  notes.forEach((f, i) => {
    const t = t0 + i * 0.06
    const o = c.createOscillator(); o.type = 'triangle'; o.frequency.value = vary(f, 0.008)
    const g = c.createGain()
    envelope(g.gain, { t0: t, peak: 0.2, attack: 0.006, decay: 0.08, sustain: 0.4, sustainTime: 0.05, release: 0.22 })
    o.connect(g); out(g, 0.28)
    o.start(t); o.stop(t + 0.4)
  })
}

function fnSlowmoEnter() {
  const c = ac(), t = c.currentTime
  const o = c.createOscillator(); o.type = 'sine'
  o.frequency.setValueAtTime(400, t)
  o.frequency.exponentialRampToValueAtTime(90, t + 0.5)
  const lp = c.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.setValueAtTime(4000, t); lp.frequency.exponentialRampToValueAtTime(500, t + 0.5)
  const g = c.createGain()
  g.gain.setValueAtTime(0.0001, t)
  g.gain.linearRampToValueAtTime(0.3, t + 0.08)
  g.gain.exponentialRampToValueAtTime(0.0001, t + 0.55)
  o.connect(lp).connect(g); out(g, 0.3)
  o.start(t); o.stop(t + 0.6)
}
function fnSlowmoExit() {
  const c = ac(), t = c.currentTime
  const o = c.createOscillator(); o.type = 'sine'
  o.frequency.setValueAtTime(140, t)
  o.frequency.exponentialRampToValueAtTime(600, t + 0.35)
  const g = c.createGain()
  g.gain.setValueAtTime(0.0001, t)
  g.gain.linearRampToValueAtTime(0.26, t + 0.05)
  g.gain.exponentialRampToValueAtTime(0.0001, t + 0.4)
  o.connect(g); out(g, 0.25)
  o.start(t); o.stop(t + 0.45)
}

function fnChest() {
  const c = ac(), t0 = c.currentTime
  const notes = [523.25, 659.25, 784.0, 1046.5]
  notes.forEach((f, i) => {
    const t = t0 + i * 0.09
    const o = c.createOscillator(); o.type = 'triangle'; o.frequency.value = vary(f, 0.01)
    const g = c.createGain()
    envelope(g.gain, { t0: t, peak: 0.22, attack: 0.008, decay: 0.12, sustain: 0.4, sustainTime: 0.08, release: 0.35 })
    o.connect(g); out(g, 0.28)
    o.start(t); o.stop(t + 0.6)
  })
}

function fnUpgrade() {
  const c = ac(), t0 = c.currentTime
  const clicks = 5
  for (let i = 0; i < clicks; i++) {
    const t = t0 + i * 0.045
    const src = noiseSource(c, 0.03)
    const bp = c.createBiquadFilter(); bp.type = 'bandpass'; bp.frequency.value = 1200 + i * 120; bp.Q.value = 4
    const g = c.createGain()
    g.gain.setValueAtTime(0.0001, t)
    g.gain.linearRampToValueAtTime(0.12, t + 0.003)
    g.gain.exponentialRampToValueAtTime(0.0001, t + 0.035)
    src.connect(bp).connect(g); out(g, 0.12)
    src.start(t); src.stop(t + 0.04)
  }
  const tc = t0 + clicks * 0.045 + 0.03
  ;[523.25, 659.25].forEach((f, i) => {
    const t = tc + i * 0.02
    const o = c.createOscillator(); o.type = 'triangle'; o.frequency.value = f
    const g = c.createGain()
    envelope(g.gain, { t0: t, peak: 0.22, attack: 0.006, decay: 0.1, sustain: 0.5, sustainTime: 0.1, release: 0.3 })
    o.connect(g); out(g, 0.2)
    o.start(t); o.stop(t + 0.5)
  })
}

function fnDeny() {
  const c = ac(), t0 = c.currentTime
  ;[0, 0.13].forEach(dt => {
    const t = t0 + dt
    const o = c.createOscillator(); o.type = 'sine'
    o.frequency.setValueAtTime(220, t)
    o.frequency.exponentialRampToValueAtTime(160, t + 0.12)
    const lp = c.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 500
    const g = c.createGain()
    g.gain.setValueAtTime(0.0001, t)
    g.gain.linearRampToValueAtTime(0.15, t + 0.01)
    g.gain.exponentialRampToValueAtTime(0.0001, t + 0.14)
    o.connect(lp).connect(g); out(g, 0.08)
    o.start(t); o.stop(t + 0.16)
  })
}

function fnGoal() {
  const c = ac(), t0 = c.currentTime
  ;[523.25, 659.25, 784.0].forEach(f => {
    const o = c.createOscillator(); o.type = 'sawtooth'; o.frequency.value = f
    const lp = c.createBiquadFilter(); lp.type = 'lowpass'
    lp.frequency.setValueAtTime(4000, t0)
    lp.frequency.exponentialRampToValueAtTime(1200, t0 + 0.4)
    const g = c.createGain()
    envelope(g.gain, { t0, peak: 0.16, attack: 0.01, decay: 0.15, sustain: 0.5, sustainTime: 0.1, release: 0.3 })
    o.connect(lp).connect(g); out(g, 0.22)
    o.start(t0); o.stop(t0 + 0.55)
  })
  const o2 = c.createOscillator(); o2.type = 'triangle'; o2.frequency.value = 1046.5
  const g2 = c.createGain()
  g2.gain.setValueAtTime(0.0001, t0 + 0.02)
  g2.gain.linearRampToValueAtTime(0.2, t0 + 0.03)
  g2.gain.exponentialRampToValueAtTime(0.0001, t0 + 0.4)
  o2.connect(g2); out(g2, 0.25)
  o2.start(t0 + 0.02); o2.stop(t0 + 0.45)
}

function fnUnlock() {
  const c = ac(), t0 = c.currentTime
  const arp = [523.25, 659.25, 784.0, 1046.5, 1318.5]
  arp.forEach((f, i) => {
    const t = t0 + i * 0.1
    const o = c.createOscillator(); o.type = 'triangle'; o.frequency.value = f
    const o2 = c.createOscillator(); o2.type = 'sawtooth'; o2.frequency.value = f; o2.detune.value = -8
    const lp = c.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 5000
    const g = c.createGain()
    envelope(g.gain, { t0: t, peak: 0.3, attack: 0.008, decay: 0.12, sustain: 0.5, sustainTime: 0.15, release: 0.4 })
    o.connect(lp); o2.connect(lp); lp.connect(g)
    out(g, 0.3)
    o.start(t); o.stop(t + 0.7); o2.start(t); o2.stop(t + 0.7)
  })
  const dur3 = 1.2
  const src = noiseSource(c, dur3)
  const hp = c.createBiquadFilter(); hp.type = 'highpass'; hp.frequency.value = 4000
  const g3 = c.createGain()
  g3.gain.setValueAtTime(0.0001, t0)
  g3.gain.linearRampToValueAtTime(0.15, t0 + 0.5)
  g3.gain.exponentialRampToValueAtTime(0.0001, t0 + dur3)
  src.connect(hp).connect(g3); out(g3, 0.4)
  src.start(t0); src.stop(t0 + dur3 + 0.02)
}

// ---------- slot-machine juice: tickUp / counterTick / counterDone / jackpot ----------
const PENTA_STEPS = [0, 2, 4, 7, 9]
function pentaSemis(step) {
  const s = Math.max(0, step | 0)
  const octave = Math.floor(s / 5)
  return octave * 12 + PENTA_STEPS[s % 5]
}
function tickUpFreq(step) { return 660 * Math.pow(2, pentaSemis(step) / 12) }

function fnTickUp(step) {
  const c = ac(), t = c.currentTime
  const f = tickUpFreq(step)
  const o = c.createOscillator(); o.type = 'triangle'; o.frequency.value = f
  const g = c.createGain()
  g.gain.setValueAtTime(0.0001, t)
  g.gain.linearRampToValueAtTime(0.12, t + 0.004)
  g.gain.exponentialRampToValueAtTime(0.0001, t + 0.04)
  o.connect(g); out(g, 0.16)
  o.start(t); o.stop(t + 0.05)
  const src = noiseSource(c, 0.015)
  const bp = c.createBiquadFilter(); bp.type = 'bandpass'; bp.frequency.value = 4000; bp.Q.value = 2.5
  const ng = c.createGain()
  ng.gain.setValueAtTime(0.0001, t)
  ng.gain.linearRampToValueAtTime(0.05, t + 0.002)
  ng.gain.exponentialRampToValueAtTime(0.0001, t + 0.015)
  src.connect(bp).connect(ng); out(ng, 0.1)
  src.start(t); src.stop(t + 0.02)
}

function fnCounterTick(i) {
  const c = ac(), t = c.currentTime
  const ii = Math.max(0, i | 0)
  const pitchMul = Math.pow(2, Math.floor(ii / 8) / 12)
  const src = noiseSource(c, 0.025)
  const bp = c.createBiquadFilter(); bp.type = 'bandpass'
  bp.frequency.value = (3000 + Math.random() * 2000) * pitchMul
  bp.Q.value = 5
  const g = c.createGain()
  g.gain.setValueAtTime(0.0001, t)
  g.gain.linearRampToValueAtTime(0.09, t + 0.002)
  g.gain.exponentialRampToValueAtTime(0.0001, t + 0.022)
  src.connect(bp).connect(g); out(g, 0)
  src.start(t); src.stop(t + 0.03)
  const o = c.createOscillator(); o.type = 'square'; o.frequency.value = 1200 * pitchMul
  const og = c.createGain()
  og.gain.setValueAtTime(0.0001, t)
  og.gain.linearRampToValueAtTime(0.05, t + 0.001)
  og.gain.exponentialRampToValueAtTime(0.0001, t + 0.018)
  o.connect(og); out(og, 0)
  o.start(t); o.stop(t + 0.025)
}

function fnCounterDone() {
  const c = ac(), t0 = c.currentTime
  const notes = [1318.51, 1760.0]
  notes.forEach((f, i) => {
    const t = t0 + i * 0.08
    const o = c.createOscillator(); o.type = 'triangle'; o.frequency.value = vary(f, 0.01)
    const o2 = c.createOscillator(); o2.type = 'sine'; o2.frequency.value = vary(f, 0.01)
    const g = c.createGain()
    envelope(g.gain, { t0: t, peak: 0.24, attack: 0.006, decay: 0.08, sustain: 0.4, sustainTime: 0.05, release: 0.2 })
    o.connect(g); o2.connect(g)
    out(g, 0.32)
    o.start(t); o.stop(t + 0.3); o2.start(t); o2.stop(t + 0.3)
  })
  const dur = 0.28
  const src = noiseSource(c, dur)
  const hp = c.createBiquadFilter(); hp.type = 'highpass'; hp.frequency.value = 5000
  const g2 = c.createGain()
  g2.gain.setValueAtTime(0.0001, t0 + 0.07)
  g2.gain.linearRampToValueAtTime(0.06, t0 + 0.1)
  g2.gain.exponentialRampToValueAtTime(0.0001, t0 + 0.07 + dur)
  src.connect(hp).connect(g2); out(g2, 0.35)
  src.start(t0 + 0.07); src.stop(t0 + 0.07 + dur + 0.02)
}

function fnJackpot() {
  const c = ac(), t0 = c.currentTime
  let t = t0, interval = 0.075
  for (let i = 0; i < 8; i++) {
    const f = 880 * Math.pow(2, pentaSemis(i) / 12)
    coinDing(t, f, 0.22 + i * 0.012)
    t += interval
    interval = Math.max(0.035, interval * 0.9)
  }
  const chord = [440.0, 554.37, 659.25, 880.0]
  const padDur = 1.6
  chord.forEach((f, i) => {
    const o = c.createOscillator(); o.type = 'sine'; o.frequency.value = vary(f, 0.01); o.detune.value = (i - 1.5) * 3
    const o2 = c.createOscillator(); o2.type = 'triangle'; o2.frequency.value = vary(f, 0.01) * 0.5
    const g = c.createGain()
    g.gain.setValueAtTime(0.0001, t0)
    g.gain.linearRampToValueAtTime(0.08, t0 + 0.5)
    g.gain.setValueAtTime(0.08, t0 + padDur - 0.5)
    g.gain.linearRampToValueAtTime(0.0001, t0 + padDur)
    o.connect(g); o2.connect(g)
    out(g, 0.3)
    o.start(t0); o.stop(t0 + padDur + 0.05); o2.start(t0); o2.stop(t0 + padDur + 0.05)
  })
  const shimDur = 1.5
  const src = noiseSource(c, shimDur)
  const bp = c.createBiquadFilter(); bp.type = 'bandpass'; bp.frequency.value = 7500; bp.Q.value = 1.5
  const g3 = c.createGain()
  g3.gain.setValueAtTime(0.0001, t0)
  g3.gain.linearRampToValueAtTime(0.18, t0 + 0.6)
  g3.gain.exponentialRampToValueAtTime(0.0001, t0 + shimDur)
  src.connect(bp).connect(g3); out(g3, 0.4)
  src.start(t0); src.stop(t0 + shimDur + 0.02)
  const tEnd = t0 + 1.5
  const o4 = c.createOscillator(); o4.type = 'sine'
  o4.frequency.setValueAtTime(80, tEnd)
  o4.frequency.exponentialRampToValueAtTime(40, tEnd + 0.25)
  const g4 = c.createGain()
  g4.gain.setValueAtTime(0.5, tEnd)
  g4.gain.exponentialRampToValueAtTime(0.001, tEnd + 0.3)
  o4.connect(g4); out(g4, 0.2)
  o4.start(tEnd); o4.stop(tEnd + 0.32)
  coinDing(tEnd, 1760, 0.35)
}

// ---------- continuous loops ----------

let windState = null
function ensureWind(c) {
  if (windState) return windState
  const src = c.createBufferSource()
  src.buffer = noiseBuffer(c, 4, true)
  src.loop = true
  const bp = c.createBiquadFilter(); bp.type = 'lowpass'; bp.frequency.value = 300
  const g = c.createGain(); g.gain.value = 0.0001
  src.connect(bp).connect(g)
  out(g, 0.15)
  src.start()
  windState = { src, bp, g }
  return windState
}

// Missile engine whoosh loop — pitch-tracks forward speed.
let engineState = null
function ensureEngine(c) {
  if (engineState) return engineState
  const o1 = c.createOscillator(); o1.type = 'sawtooth'; o1.frequency.value = 70
  const o2 = c.createOscillator(); o2.type = 'sawtooth'; o2.frequency.value = 71.5
  const sub = c.createOscillator(); sub.type = 'sine'; sub.frequency.value = 35
  const lp = c.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 500; lp.Q.value = 0.6
  const chop = c.createGain(); chop.gain.value = 0.8
  const lfo = c.createOscillator(); lfo.type = 'sine'; lfo.frequency.value = 7
  const lfoDepth = c.createGain(); lfoDepth.gain.value = 0.15
  lfo.connect(lfoDepth); lfoDepth.connect(chop.gain)
  const nz = c.createBufferSource(); nz.buffer = noiseBuffer(c, 2, true); nz.loop = true
  const nbp = c.createBiquadFilter(); nbp.type = 'bandpass'; nbp.frequency.value = 900; nbp.Q.value = 0.7
  const ng = c.createGain(); ng.gain.value = 0.22
  const g = c.createGain(); g.gain.value = 0.0001
  o1.connect(lp); o2.connect(lp); sub.connect(lp)
  lp.connect(chop); chop.connect(g)
  nz.connect(nbp); nbp.connect(ng); ng.connect(chop)
  out(g, 0.08)
  o1.start(); o2.start(); sub.start(); lfo.start(); nz.start()
  engineState = { o1, o2, sub, lp, lfo, g }
  return engineState
}

let laserState = null
function ensureLaser(c) {
  if (laserState) return laserState
  const o = c.createOscillator(); o.type = 'sawtooth'; o.frequency.value = 120
  const o2 = c.createOscillator(); o2.type = 'sawtooth'; o2.frequency.value = 121
  const bp = c.createBiquadFilter(); bp.type = 'bandpass'; bp.frequency.value = 900; bp.Q.value = 3
  const g = c.createGain(); g.gain.value = 0.0001
  o.connect(bp); o2.connect(bp); bp.connect(g)
  out(g, 0.2)
  o.start(); o2.start()
  laserState = { o, o2, bp, g }
  return laserState
}

// ---------- public API ----------

export const sfx = {
  unlock() { try { const c = ac(); c.resume() } catch {} },
  click() { try { fnClick() } catch {} },
  swoosh() { try { fnSwoosh() } catch {} },
  launch() { try { fnLaunch() } catch {} },
  graze() { try { fnGraze() } catch {} },
  explosion() { try { fnExplosion() } catch {} },
  crash() { try { fnExplosion() } catch {} },
  coin() { try { fnCoin() } catch {} },
  cascade(n = 8) { try { fnCascade(n) } catch {} },
  chest() { try { fnChest() } catch {} },
  powerup(pitchUp = true) { try { fnPowerup(pitchUp) } catch {} },
  slowmoEnter() { try { fnSlowmoEnter() } catch {} },
  slowmoExit() { try { fnSlowmoExit() } catch {} },
  upgrade() { try { fnUpgrade() } catch {} },
  deny() { try { fnDeny() } catch {} },
  goal() { try { fnGoal() } catch {} },
  unlockNext() { try { fnUnlock() } catch {} },
  fanfare() { try { fnUnlock() } catch {} },

  wind(v = 0) {
    try {
      const c = ac()
      const s = ensureWind(c)
      const vv = Math.max(0, Math.min(1, v))
      const t = c.currentTime
      const shaped = Math.pow(vv, 1.8)
      s.g.gain.setTargetAtTime(Math.max(shaped * 0.35, 0.0001), t, 0.15)
      s.bp.frequency.setTargetAtTime(600 + vv * 2900, t, 0.15)
    } catch {}
  },
  // Engine whoosh loop — v = 0..1 normalized speed, pitch + volume track it.
  engine(v = 0) {
    try {
      const c = ac()
      const s = ensureEngine(c)
      const vv = Math.max(0, Math.min(1, v))
      const t = c.currentTime
      const freq = 62 + vv * 90
      s.o1.frequency.setTargetAtTime(freq, t, 0.1)
      s.o2.frequency.setTargetAtTime(freq * 1.022, t, 0.1)
      s.sub.frequency.setTargetAtTime(freq * 0.5, t, 0.1)
      s.lfo.frequency.setTargetAtTime(5 + vv * 14, t, 0.15)
      s.lp.frequency.setTargetAtTime(350 + vv * 900, t, 0.1)
      s.g.gain.setTargetAtTime(vv <= 0.001 ? 0.0001 : 0.06 + vv * 0.13, t, 0.12)
    } catch {}
  },
  // Laser hum — proximity 0..1 (0 = far/off, 1 = right next to an active laser grid)
  laserHum(prox = 0) {
    try {
      const c = ac()
      const s = ensureLaser(c)
      const p = Math.max(0, Math.min(1, prox))
      const t = c.currentTime
      s.g.gain.setTargetAtTime(p <= 0.01 ? 0.0001 : 0.03 + p * 0.09, t, 0.1)
      s.bp.frequency.setTargetAtTime(700 + p * 500, t, 0.1)
    } catch {}
  },

  tickUp(step = 0) { try { fnTickUp(step) } catch {} },
  counterTick(i = 0) { try { fnCounterTick(i) } catch {} },
  counterDone() { try { fnCounterDone() } catch {} },
  jackpot() { try { fnJackpot() } catch {} },

  // Global slow-mo audio filter — routes master through a lowpass (underwater feel).
  setSlowmo(active) {
    try {
      const c = ac()
      const t = c.currentTime
      if (!dryGain || !wetLpGain) return
      dryGain.gain.setTargetAtTime(active ? 0.15 : 1, t, 0.2)
      wetLpGain.gain.setTargetAtTime(active ? 0.85 : 0, t, 0.2)
    } catch {}
  },
}

// Music intentionally removed — no-op keeps any legacy call sites harmless.
export const music = { start() {}, stop() {}, setEnabled() {}, duck() {}, unduck() {} }
