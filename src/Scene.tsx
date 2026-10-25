import { useMemo, useRef, useState, useEffect } from 'react'
import * as THREE from 'three'
import { useFrame, useThree } from '@react-three/fiber'
import { CameraControls, Environment, Lightformer, RoundedBox, Html, SoftShadows, PerformanceMonitor } from '@react-three/drei'
import { EffectComposer, N8AO, Bloom, Vignette, SMAA } from '@react-three/postprocessing'
import { easing } from 'maath'
import { Mode, Results, STAGES } from './model'
import { C, STATION_X } from './theme'

export interface SceneProps {
  mode: Mode; results: Results; selected: number | null; hovered: number | null
  setSelected: (i: number | null) => void; setHovered: (i: number | null) => void
  exploded: boolean; tour: boolean; camKey: number; quality: 'high' | 'low'; setQuality: (q: 'high' | 'low') => void
}

const MAXD = 6
const deskSlots = Array.from({ length: MAXD }, (_, k) => ({ x: (k % 2 === 0 ? -1.15 : 1.15), z: -1.25 + Math.floor(k / 2) * 1.35 }))

function stationPos(i: number, exploded: boolean): [number, number, number] {
  return exploded ? [STATION_X[i] * 1.32, 2.4 + (i % 2) * 0.9, i % 2 ? -1.4 : 1.4] : [STATION_X[i], 0, 0]
}

/* ---------- elementy wyposażenia ---------- */
function Chair({ rot = 0 }: { rot?: number }) {
  return (
    <group rotation-y={rot}>
      <mesh position={[0, 0.42, 0]} castShadow><boxGeometry args={[0.42, 0.06, 0.42]} /><meshStandardMaterial color={C.dark} roughness={0.7} /></mesh>
      <mesh position={[0, 0.7, 0.2]} castShadow><boxGeometry args={[0.42, 0.5, 0.05]} /><meshStandardMaterial color={C.dark} roughness={0.7} /></mesh>
      <mesh position={[0, 0.22, 0]}><cylinderGeometry args={[0.03, 0.03, 0.4, 8]} /><meshStandardMaterial color="#8a948f" metalness={0.8} roughness={0.3} /></mesh>
      <mesh position={[0, 0.03, 0]}><cylinderGeometry args={[0.24, 0.24, 0.04, 16]} /><meshStandardMaterial color="#59625d" metalness={0.6} roughness={0.4} /></mesh>
    </group>
  )
}

function Desk({ visible, mode, active, flip, seed }: { visible: boolean; mode: Mode; active: boolean; flip: boolean; seed: number }) {
  const g = useRef<THREE.Group>(null!)
  const screen = useRef<THREE.MeshStandardMaterial>(null!)
  const orb = useRef<THREE.Mesh>(null!)
  const papers = useRef<THREE.Group>(null!)
  const target = useMemo(() => new THREE.Color(), [])
  useFrame((st, dt) => {
    const s = visible ? 1 : 0.0001
    easing.damp3(g.current.scale, [s, s, s], 0.35, dt)
    target.set(mode === 'traditional' ? '#9fb8ad' : mode === 'assisted' ? C.green2 : C.lime)
    easing.dampC(screen.current.color, target, 0.4, dt)
    easing.dampC(screen.current.emissive, target, 0.4, dt)
    screen.current.emissiveIntensity = (active ? 1.1 : 0.55) + Math.sin(st.clock.elapsedTime * 2 + seed) * 0.08
    const o = mode === 'traditional' ? 0.0001 : 1
    easing.damp3(orb.current.scale, [o, o, o], 0.4, dt)
    orb.current.position.y = 1.62 + Math.sin(st.clock.elapsedTime * 1.6 + seed) * 0.06
    orb.current.rotation.y += dt * 1.2
    const p = mode === 'traditional' ? 1 : mode === 'assisted' ? 0.45 : 0.2
    easing.damp3(papers.current.scale, [1, p, 1], 0.5, dt)
  })
  return (
    <group ref={g} rotation-y={flip ? Math.PI : 0}>
      <mesh position={[0, 0.74, 0]} castShadow receiveShadow><boxGeometry args={[1.5, 0.05, 0.75]} /><meshStandardMaterial color={C.wood} roughness={0.55} /></mesh>
      {[[-0.7, -0.32], [0.7, -0.32], [-0.7, 0.32], [0.7, 0.32]].map(([x, z], k) => (
        <mesh key={k} position={[x, 0.36, z]} castShadow><boxGeometry args={[0.05, 0.72, 0.05]} /><meshStandardMaterial color="#2d3a34" metalness={0.7} roughness={0.35} /></mesh>
      ))}
      <mesh position={[0, 0.82, 0.1]}><boxGeometry args={[0.5, 0.02, 0.16]} /><meshStandardMaterial color="#e6e9e5" roughness={0.6} /></mesh>
      <group position={[0, 0.77, -0.22]}>
        <mesh position={[0, 0.03, 0]}><boxGeometry args={[0.22, 0.02, 0.14]} /><meshStandardMaterial color="#26302b" metalness={0.6} /></mesh>
        <mesh position={[0, 0.18, 0]}><boxGeometry args={[0.04, 0.3, 0.04]} /><meshStandardMaterial color="#26302b" metalness={0.6} /></mesh>
        <mesh position={[0, 0.42, 0.01]} castShadow><boxGeometry args={[0.78, 0.46, 0.04]} /><meshStandardMaterial color="#141c18" roughness={0.3} metalness={0.4} /></mesh>
        <mesh position={[0, 0.42, 0.032]}><planeGeometry args={[0.72, 0.4]} /><meshStandardMaterial ref={screen} toneMapped={false} roughness={0.2} /></mesh>
      </group>
      <group ref={papers} position={[0.52, 0.77, 0.05]}>
        {[0, 1, 2, 3, 4, 5].map(k => (
          <mesh key={k} position={[((k * 37 + seed) % 5) * 0.004, 0.012 + k * 0.022, 0]} rotation-y={(k % 3) * 0.08} castShadow><boxGeometry args={[0.24, 0.02, 0.32]} /><meshStandardMaterial color={C.paper} roughness={0.9} /></mesh>
        ))}
      </group>
      <mesh ref={orb} position={[-0.55, 1.6, -0.15]}>
        <icosahedronGeometry args={[0.1, 1]} />
        <meshStandardMaterial color={C.lime} emissive={C.lime} emissiveIntensity={1.6} toneMapped={false} />
      </mesh>
      <group position={[0, 0, 0.62]}><Chair /></group>
    </group>
  )
}

function Plant({ position, s = 1 }: { position: [number, number, number]; s?: number }) {
  return (
    <group position={position} scale={s}>
      <mesh position={[0, 0.25, 0]} castShadow><cylinderGeometry args={[0.22, 0.17, 0.5, 20]} /><meshStandardMaterial color="#e8e4da" roughness={0.8} /></mesh>
      {[[0, 0.75, 0, 0.32], [0.14, 0.95, 0.06, 0.22], [-0.12, 0.92, -0.05, 0.24], [0.02, 1.12, -0.02, 0.18]].map(([x, y, z, r], k) => (
        <mesh key={k} position={[x, y, z]} castShadow><icosahedronGeometry args={[r, 1]} /><meshStandardMaterial color={k % 2 ? C.green : '#2c6e49'} roughness={0.8} flatShading /></mesh>
      ))}
    </group>
  )
}

/* ---------- agent AI: symboliczny rdzeń ---------- */
function AgentHub({ count, color }: { count: number; color: string }) {
  const g = useRef<THREE.Group>(null!)
  const ring = useRef<THREE.Mesh>(null!)
  const cores = useRef<(THREE.Mesh | null)[]>([])
  useFrame((st, dt) => {
    const show = count > 0 ? 1 : 0.0001
    easing.damp3(g.current.scale, [show, show, show], 0.45, dt)
    const t = st.clock.elapsedTime
    ring.current.rotation.z += dt * 0.8
    cores.current.forEach((m, k) => {
      if (!m) return
      const on = k < count ? 1 : 0.0001
      easing.damp3(m.scale, [on, on, on], 0.3, dt)
      const a = t * 0.9 + (k / 5) * Math.PI * 2
      m.position.set(Math.cos(a) * 0.75, 1.55 + Math.sin(t * 2 + k) * 0.12, Math.sin(a) * 0.75)
      m.rotation.x += dt; m.rotation.y += dt * 1.3
    })
  })
  return (
    <group ref={g} position={[0, 0, 1.95]}>
      <mesh position={[0, 0.3, 0]} castShadow receiveShadow><cylinderGeometry args={[0.45, 0.55, 0.6, 32]} /><meshStandardMaterial color={C.dark} metalness={0.5} roughness={0.35} /></mesh>
      <mesh position={[0, 0.62, 0]}><cylinderGeometry args={[0.38, 0.38, 0.04, 32]} /><meshStandardMaterial color={color} emissive={color} emissiveIntensity={1.5} toneMapped={false} /></mesh>
      <mesh ref={ring} position={[0, 1.55, 0]} rotation-x={Math.PI / 2}><torusGeometry args={[0.75, 0.015, 8, 64]} /><meshStandardMaterial color={C.mint} emissive={C.mint} emissiveIntensity={0.8} toneMapped={false} /></mesh>
      <mesh position={[0, 1.55, 0]}><icosahedronGeometry args={[0.26, 2]} /><meshPhysicalMaterial color={C.lime} emissive={C.lime} emissiveIntensity={0.9} roughness={0.1} transmission={0.2} toneMapped={false} /></mesh>
      {[0, 1, 2, 3, 4].map(k => (
        <mesh key={k} ref={el => (cores.current[k] = el)}><octahedronGeometry args={[0.13, 0]} /><meshStandardMaterial color={C.green2} emissive={C.green2} emissiveIntensity={1.2} toneMapped={false} /></mesh>
      ))}
    </group>
  )
}

/* ---------- kolejka dokumentów (instancing) ---------- */
function QueuePile({ queue }: { queue: number }) {
  const ref = useRef<THREE.InstancedMesh>(null!)
  const N = 40
  const cur = useRef(0)
  const m = useMemo(() => new THREE.Object3D(), [])
  useFrame((_, dt) => {
    cur.current = THREE.MathUtils.damp(cur.current, Math.min(N, queue * 2.2), 3, dt)
    for (let k = 0; k < N; k++) {
      const col = k % 4, lvl = Math.floor(k / 4)
      const vis = k < cur.current ? 1 : 0
      m.position.set((col % 2) * 0.32, 0.03 + lvl * 0.07, Math.floor(col / 2) * 0.4)
      m.rotation.set(0, ((k * 13) % 7) * 0.03, 0)
      m.scale.setScalar(vis || 0.0001)
      m.updateMatrix(); ref.current.setMatrixAt(k, m.matrix)
    }
    ref.current.instanceMatrix.needsUpdate = true
  })
  return (
    <instancedMesh ref={ref} args={[undefined, undefined, N]} position={[2.05, 0.06, -1.9]} castShadow>
      <boxGeometry args={[0.28, 0.06, 0.36]} />
      <meshStandardMaterial color={C.paper} roughness={0.85} />
    </instancedMesh>
  )
}

/* ---------- stanowisko etapu ---------- */
function Station({ i, p }: { i: number; p: SceneProps }) {
  const g = useRef<THREE.Group>(null!)
  const pad = useRef<THREE.MeshStandardMaterial>(null!)
  const st = p.results.stages[i]
  const accent = p.mode === 'traditional' ? '#7f9c8f' : p.mode === 'assisted' ? C.green2 : C.lime
  const isSel = p.selected === i, isHov = p.hovered === i
  const tCol = useMemo(() => new THREE.Color(), [])
  useFrame((_, dt) => {
    easing.damp3(g.current.position, stationPos(i, p.exploded), 0.6, dt)
    tCol.set(isSel ? C.lime : isHov ? C.mint : accent)
    easing.dampC(pad.current.emissive, tCol, 0.25, dt)
    pad.current.emissiveIntensity = isSel ? 0.9 : isHov ? 0.6 : 0.35
  })
  const util = Math.min(1.5, st.utilization)
  return (
    <group ref={g}>
      <group
        onPointerOver={e => { e.stopPropagation(); p.setHovered(i); document.body.style.cursor = 'pointer' }}
        onPointerOut={() => { p.setHovered(null); document.body.style.cursor = '' }}
        onClick={e => { e.stopPropagation(); p.setSelected(i) }}
      >
        <RoundedBox args={[5.6, 0.16, 6.2]} radius={0.06} position={[0, 0.08, 0]} receiveShadow castShadow>
          <meshStandardMaterial color={p.exploded ? '#eef1ec' : '#e4e9e3'} roughness={0.8} />
        </RoundedBox>
        <mesh position={[0, 0.165, 3.05]}><boxGeometry args={[5.4, 0.012, 0.05]} /><meshStandardMaterial ref={pad} color={accent} emissive={accent} toneMapped={false} /></mesh>
        {/* niska ścianka działowa */}
        <mesh position={[0, 0.55, -2.95]} castShadow receiveShadow><boxGeometry args={[5.4, 0.8, 0.08]} /><meshStandardMaterial color="#dfe5df" roughness={0.9} /></mesh>
        {/* ekran ścienny etapu */}
        <group position={[-1.4, 1.75, -2.88]}>
          <mesh castShadow><boxGeometry args={[1.9, 1.05, 0.06]} /><meshStandardMaterial color="#111814" roughness={0.3} metalness={0.5} /></mesh>
          {[0, 1, 2, 3, 4].map(k => {
            const h = 0.12 + (((k * 7 + i * 3) % 5) / 5) * 0.55 * (p.mode === 'traditional' ? 0.5 : p.mode === 'assisted' ? 0.8 : 1)
            return <mesh key={k} position={[-0.65 + k * 0.32, -0.38 + h / 2, 0.035]}><planeGeometry args={[0.2, h]} /><meshStandardMaterial color={accent} emissive={accent} emissiveIntensity={0.9} toneMapped={false} /></mesh>
          })}
          <mesh position={[0, -0.47, 0.031]}><planeGeometry args={[1.7, 0.01]} /><meshBasicMaterial color={C.mint} /></mesh>
        </group>
        {deskSlots.map((d, k) => (
          <group key={k} position={[d.x, 0.16, d.z]}>
            <Desk visible={k < st.workers} mode={p.mode} active={isSel} flip={false} seed={i * 7 + k} />
          </group>
        ))}
        <AgentHub count={st.agents} color={accent} />
        <QueuePile queue={st.queue} />
        <Plant position={[-2.4, 0.16, 2.6]} s={0.8} />
      </group>
      {p.selected === null && <Html position={[0, p.exploded ? 3.6 : 3.1, -2.2]} center distanceFactor={p.exploded ? 22 : 18} zIndexRange={[10, 0]} style={{ pointerEvents: 'none' }}>
        <div className={`slabel ${isSel ? 'sel' : ''} ${st.isBottleneck ? 'bn' : ''}`}>
          <div className="sl-n">{String(i + 1).padStart(2, '0')}</div>
          <div>
            <div className="sl-t">{st.def.name}</div>
            <div className="sl-s">{st.workers} os. {st.agents > 0 ? `· ${st.agents} ag. AI` : ''} · {Math.round(st.utilization * 100)}% obł.</div>
            <div className="sl-bar"><i style={{ width: `${Math.min(100, util / 1.5 * 100)}%`, background: st.utilization > 1 ? C.red : st.utilization > 0.85 ? C.warn : C.green2 }} /></div>
          </div>
        </div>
      </Html>}
    </group>
  )
}

/* ---------- przepływ informacji: taśma + tokeny-dokumenty ---------- */
function Flow({ p }: { p: SceneProps }) {
  const N = 70
  const ref = useRef<THREE.InstancedMesh>(null!)
  const tube = useRef<THREE.Mesh>(null!)
  const m = useMemo(() => new THREE.Object3D(), [])
  const pts = useRef(STATION_X.map((_, i) => new THREE.Vector3(...stationPos(i, false))))
  const curve = useMemo(() => new THREE.CatmullRomCurve3(pts.current.map(v => v.clone()), false, 'catmullrom', 0.3), [])
  const offs = useMemo(() => Array.from({ length: N }, (_, k) => k / N), [])
  const prog = useRef(0)
  const col = useMemo(() => new THREE.Color(), [])
  const mat = useRef<THREE.MeshStandardMaterial>(null!)
  const speedT = 0.012 + Math.min(1, p.results.completed / 120) * 0.05
  const speed = useRef(speedT)
  const density = Math.min(1, 0.25 + p.results.completed / 100)
  const geomVer = useRef(0)
  useFrame((_, dt) => {
    let moved = false
    pts.current.forEach((v, i) => {
      const [x, y, z] = stationPos(i, p.exploded)
      const before = v.clone()
      easing.damp3(v, [x, y + 1.35, z + 3.35], 0.6, dt)
      if (before.distanceToSquared(v) > 1e-7) moved = true
    })
    // przedłużenia wejścia/wyjścia
    const all = [pts.current[0].clone().add(new THREE.Vector3(-4, 0, 0)), ...pts.current, pts.current[4].clone().add(new THREE.Vector3(4, 0, 0))]
    curve.points = all
    if (moved || geomVer.current === 0) {
      geomVer.current++
      tube.current.geometry.dispose()
      tube.current.geometry = new THREE.TubeGeometry(curve, 160, 0.06, 8, false)
    }
    speed.current = THREE.MathUtils.damp(speed.current, speedT, 2, dt)
    prog.current += dt * speed.current
    for (let k = 0; k < N; k++) {
      const u = (offs[k] + prog.current) % 1
      const on = (k / N) < density
      const pos = curve.getPointAt(u), tan = curve.getTangentAt(u)
      m.position.copy(pos).add(new THREE.Vector3(0, 0.12, 0))
      m.rotation.set(0, Math.atan2(tan.x, tan.z), 0)
      m.scale.setScalar(on ? 1 : 0.0001)
      m.updateMatrix(); ref.current.setMatrixAt(k, m.matrix)
    }
    ref.current.instanceMatrix.needsUpdate = true
    col.set(p.mode === 'traditional' ? C.paper : p.mode === 'assisted' ? C.mint : C.lime)
    easing.dampC(mat.current.color, col, 0.4, dt)
    easing.dampC(mat.current.emissive, col, 0.4, dt)
    mat.current.emissiveIntensity = p.mode === 'traditional' ? 0.05 : p.mode === 'assisted' ? 0.4 : 1.1
  })
  return (
    <group>
      <mesh ref={tube} castShadow><bufferGeometry /><meshStandardMaterial color={C.dark} metalness={0.6} roughness={0.3} /></mesh>
      <instancedMesh ref={ref} args={[undefined, undefined, N]} castShadow>
        <boxGeometry args={[0.18, 0.04, 0.24]} />
        <meshStandardMaterial ref={mat} toneMapped={false} roughness={0.5} />
      </instancedMesh>
    </group>
  )
}

/* ---------- budynek ---------- */
function Building({ exploded, mode }: { exploded: boolean; mode: Mode }) {
  const g = useRef<THREE.Group>(null!)
  const walls = useRef<THREE.Group>(null!)
  const tiles = useRef<THREE.InstancedMesh>(null!)
  const floorMat = useRef<THREE.MeshStandardMaterial>(null!)
  const W = 38, D = 12
  const tileData = useMemo(() => {
    const arr: [number, number][] = []
    for (let x = -W / 2 + 1; x < W / 2; x += 2) for (let z = -D / 2 + 1; z < D / 2; z += 2) arr.push([x, z])
    return arr
  }, [])
  useEffect(() => {
    const o = new THREE.Object3D()
    tileData.forEach(([x, z], k) => { o.position.set(x, 0, z); o.updateMatrix(); tiles.current.setMatrixAt(k, o.matrix) })
    tiles.current.instanceMatrix.needsUpdate = true
  }, [tileData])
  const tc = useMemo(() => new THREE.Color(), [])
  useFrame((_, dt) => {
    easing.damp3(g.current.position, [0, exploded ? -3.2 : 0, 0], 0.6, dt)
    const s = exploded ? 0.0001 : 1
    easing.damp3(walls.current.scale, [1, s, 1], 0.5, dt)
    tc.set(exploded ? '#7d8f86' : '#cfd6cf')
    easing.dampC(floorMat.current.color, tc, 0.6, dt)
  })
  const cols = [-19, -9.75, 0, 9.75, 19]
  return (
    <group ref={g}>
      <RoundedBox args={[W + 2, 0.8, D + 2.4]} radius={0.15} position={[0, -0.42, 0.6]} receiveShadow castShadow>
        <meshStandardMaterial color={C.dark} roughness={0.6} />
      </RoundedBox>
      <mesh position={[0, -0.01, 0.6]} receiveShadow><boxGeometry args={[W + 1.4, 0.02, D + 1.8]} /><meshStandardMaterial ref={floorMat} color={'#cfd6cf'} roughness={0.85} /></mesh>
      <instancedMesh ref={tiles} args={[undefined, undefined, tileData.length]} position={[0, 0.002, 0.6]} receiveShadow>
        <boxGeometry args={[1.96, 0.004, 1.96]} />
        <meshStandardMaterial color="#d5dcd4" roughness={0.9} />
      </instancedMesh>
      {/* mozaika marki na krawędzi cokołu */}
      <mesh position={[0, -0.42, D / 2 + 1.82]}><boxGeometry args={[W + 1.6, 0.06, 0.02]} /><meshStandardMaterial color={C.lime} emissive={C.lime} emissiveIntensity={0.6} toneMapped={false} /></mesh>
      <group ref={walls}>
        {/* ściana tylna z przeszkleniem */}
        <mesh position={[0, 2.2, -D / 2 - 0.1]} receiveShadow><boxGeometry args={[W + 1.4, 4.4, 0.2]} /><meshStandardMaterial color="#d6ddd6" roughness={0.9} /></mesh>
        {Array.from({ length: 12 }, (_, k) => (
          <group key={k} position={[-W / 2 + 1.8 + k * (W - 3.6) / 11, 2.7, -D / 2 + 0.02]}>
            <mesh><boxGeometry args={[2.6, 2.2, 0.04]} /><meshPhysicalMaterial color={C.glass} roughness={0.08} metalness={0.1} transmission={0} emissive="#cfeee0" emissiveIntensity={0.35} /></mesh>
            <mesh position={[0, 0, 0.03]}><boxGeometry args={[0.05, 2.2, 0.04]} /><meshStandardMaterial color="#3b4a43" metalness={0.8} roughness={0.3} /></mesh>
          </group>
        ))}
        {/* ściana boczna */}
        <mesh position={[-W / 2 - 0.6, 2.2, 0.6]} castShadow receiveShadow><boxGeometry args={[0.2, 4.4, D + 1.6]} /><meshStandardMaterial color="#d0d8d1" roughness={0.9} /></mesh>
        {cols.map(x => (
          <mesh key={x} position={[x, 2.2, -D / 2 + 0.25]} castShadow><boxGeometry args={[0.4, 4.4, 0.4]} /><meshStandardMaterial color="#f1f3ef" roughness={0.7} /></mesh>
        ))}
        {/* belka sufitu z logo */}
        <mesh position={[0, 4.5, -D / 2 + 0.2]} castShadow><boxGeometry args={[W + 1.4, 0.2, 0.6]} /><meshStandardMaterial color={C.dark} roughness={0.5} /></mesh>
        <mesh position={[0, 4.5, -D / 2 + 0.51]}><boxGeometry args={[6, 0.06, 0.01]} /><meshStandardMaterial color={C.lime} emissive={C.lime} emissiveIntensity={1.2} toneMapped={false} /></mesh>
        <Plant position={[-18.5, 0, 5.8]} s={1.2} />
        <Plant position={[18.5, 0, 5.8]} s={1.2} />
        <Plant position={[-18.5, 0, -4.8]} s={1.1} />
      </group>
    </group>
  )
}

/* ---------- kamera ---------- */
function CameraRig({ p }: { p: SceneProps }) {
  const ref = useRef<CameraControls>(null!)
  const { size } = useThree()
  const narrow = size.width < size.height
  const tourIdx = useRef(0)
  const go = (sel: number | null) => {
    const c = ref.current; if (!c) return
    const k = narrow ? 1.9 : 1
    if (sel !== null) {
      const [x, y, z] = stationPos(sel, p.exploded)
      c.setLookAt(x + 4.2 * k, y + 5.2 * k, z + 8.5 * k, x, y + 1.0, z, true)
    } else if (p.exploded) {
      c.setLookAt(-2 * k, 16 * k, 38 * k, 0, 1.6, 0, true)
    } else {
      c.setLookAt(-3 * k, 14 * k, 25.5 * k, 0.6, 0.4, -1.2, true)
    }
  }
  useEffect(() => { go(p.selected) }, [p.selected, p.exploded, p.camKey, narrow])
  useEffect(() => {
    if (!p.tour) return
    const id = setInterval(() => {
      tourIdx.current = (tourIdx.current + 1) % 6
      p.setSelected(tourIdx.current === 5 ? null : tourIdx.current)
    }, 3800)
    tourIdx.current = 0; p.setSelected(0)
    return () => clearInterval(id)
  }, [p.tour])
  return <CameraControls ref={ref} makeDefault minDistance={5} maxDistance={70} maxPolarAngle={Math.PI / 2.15} smoothTime={0.9} />
}

export default function Scene(p: SceneProps) {
  const sunCol = p.mode === 'automated' ? '#fff6e6' : '#fffaf0'
  return (
    <>
      <PerformanceMonitor onDecline={() => p.setQuality('low')} onIncline={() => p.setQuality('high')} flipflops={3} />
      <color attach="background" args={['#0a2a20']} />
      <fog attach="fog" args={['#0a2a20', 55, 110]} />
      {p.quality === 'high' && <SoftShadows size={22} samples={10} focus={0.6} />}
      <ambientLight intensity={0.1} />
      <hemisphereLight args={['#eafff4', '#20352c', 0.3]} />
      <directionalLight position={[-14, 24, 16]} intensity={1.5} color={sunCol} castShadow
        shadow-mapSize={[2048, 2048]} shadow-camera-left={-26} shadow-camera-right={26} shadow-camera-top={16} shadow-camera-bottom={-16} shadow-bias={-0.0004} shadow-normalBias={0.03} />
      <directionalLight position={[18, 10, -8]} intensity={0.5} color="#cdf3df" />
      <Environment resolution={256} frames={1} environmentIntensity={0.55}>
        <Lightformer form="rect" intensity={2.2} position={[0, 10, 0]} rotation-x={Math.PI / 2} scale={[30, 8, 1]} />
        <Lightformer form="rect" intensity={1.2} color={C.mint} position={[-12, 4, 10]} rotation-y={Math.PI / 4} scale={[10, 4, 1]} />
        <Lightformer form="rect" intensity={0.8} color={C.lime} position={[14, 3, -6]} rotation-y={-Math.PI / 3} scale={[8, 2, 1]} />
        <Lightformer form="ring" intensity={1.5} position={[0, 6, 14]} scale={6} />
      </Environment>
      <group onPointerMissed={() => p.setSelected(null)}>
        <Building exploded={p.exploded} mode={p.mode} />
        {STAGES.map((_, i) => <Station key={i} i={i} p={p} />)}
        <Flow p={p} />
      </group>
      <CameraRig p={p} />
      <EffectComposer multisampling={0} enableNormalPass={false}>
        {p.quality === 'high' ? <N8AO halfRes aoRadius={1.4} intensity={2.2} distanceFalloff={0.8} quality="medium" /> : <></>}
        <Bloom mipmapBlur luminanceThreshold={0.85} intensity={0.55} radius={0.6} />
        <Vignette offset={0.25} darkness={0.55} />
        <SMAA />
      </EffectComposer>
    </>
  )
}
