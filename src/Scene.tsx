import * as THREE from 'three'
import { Suspense, useEffect, useMemo, useRef } from 'react'
import { useFrame, useThree } from '@react-three/fiber'
import { CameraControls, Environment, Html, PerformanceMonitor } from '@react-three/drei'
import { EffectComposer, N8AO, Bloom, Vignette, SMAA, ToneMapping, DepthOfField } from '@react-three/postprocessing'
import { ToneMappingMode } from 'postprocessing'
import { easing } from 'maath'
import { Mode, Results, STAGES } from './model'
import Room from './office/Room'
import Skyline from './office/Skyline'
import { Workstation, Chair } from './office/Desk'
import { Person, Act } from './office/People'
import { BASE, ZONES, OVERVIEW, TOPDOWN, ROOM, flowCurve } from './office/layout'
import { useSet } from './office/materials'

export interface SceneProps {
  mode: Mode; results: Results; selected: number | null; hovered: number | null
  setSelected: (i: number | null) => void; setHovered: (i: number | null) => void
  exploded: boolean; tour: boolean; camKey: number; quality: 'high' | 'low'; setQuality: (q: 'high' | 'low') => void
}

const ROT = Number(new URLSearchParams(location.search).get('rot') ?? 0)
const PAPER: Record<Mode, number> = { traditional: 1, assisted: 0.45, automated: 0.12 }

function actFor(stage: number, k: number, mode: Mode): Act {
  if (stage === 4) return 'sit'
  if (stage === 3) return k % 2 === 0 ? 'phone' : 'type'
  if (stage === 1 && k === 3) return 'sit'
  return mode === 'traditional' && k === 4 ? 'phone' : 'type'
}

function AgentCore({ position, seed }: { position: [number, number, number]; seed: number }) {
  const g = useRef<THREE.Group>(null!)
  const s = useRef(0.001)
  useFrame((st, dt) => {
    s.current = THREE.MathUtils.damp(s.current, 1, 3, dt)
    g.current.scale.setScalar(s.current)
    g.current.position.y = position[1] + Math.sin(st.clock.elapsedTime * 0.9 + seed) * 0.03
    g.current.rotation.y += dt * 0.35
  })
  return (
    <group ref={g} position={position}>
      <mesh castShadow><sphereGeometry args={[0.11, 48, 32]} /><meshPhysicalMaterial color="#eaf6ef" roughness={0.18} transmission={0.9} thickness={0.25} ior={1.45} envMapIntensity={1.2} /></mesh>
      <mesh><sphereGeometry args={[0.045, 24, 16]} /><meshStandardMaterial color="#c9f0d8" emissive="#9fe6bc" emissiveIntensity={1.1} /></mesh>
      <mesh rotation-x={Math.PI / 2}><torusGeometry args={[0.16, 0.004, 8, 96]} /><meshStandardMaterial color="#d7dcd9" metalness={1} roughness={0.15} /></mesh>
      <mesh position={[0, -0.22, 0]}><cylinderGeometry args={[0.004, 0.004, 0.2, 8]} /><meshStandardMaterial color="#c7cac8" metalness={1} roughness={0.2} /></mesh>
    </group>
  )
}

function ZoneHighlight({ i, p }: { i: number; p: SceneProps }) {
  const m = useRef<THREE.MeshBasicMaterial>(null!)
  const z = ZONES[i]
  const on = p.selected === i ? 0.55 : p.hovered === i ? 0.35 : p.exploded ? 0.22 : 0
  useFrame((_, dt) => { m.current.opacity = THREE.MathUtils.damp(m.current.opacity, on, 6, dt) })
  const w = z.kind === 'meeting' ? 4.6 : 5.0, d = z.kind === 'meeting' ? 3.2 : 3.4
  const shape = useMemo(() => {
    const s = new THREE.Shape(), r = 0.25, x = -w / 2, y = -d / 2
    s.moveTo(x + r, y); s.lineTo(x + w - r, y); s.quadraticCurveTo(x + w, y, x + w, y + r); s.lineTo(x + w, y + d - r); s.quadraticCurveTo(x + w, y + d, x + w - r, y + d)
    s.lineTo(x + r, y + d); s.quadraticCurveTo(x, y + d, x, y + d - r); s.lineTo(x, y + r); s.quadraticCurveTo(x, y, x + r, y)
    const hole = new THREE.Path(); const q = 0.05
    hole.moveTo(x + r, y + q); hole.lineTo(x + w - r, y + q); hole.quadraticCurveTo(x + w - q, y + q, x + w - q, y + r); hole.lineTo(x + w - q, y + d - r); hole.quadraticCurveTo(x + w - q, y + d - q, x + w - r, y + d - q)
    hole.lineTo(x + r, y + d - q); hole.quadraticCurveTo(x + q, y + d - q, x + q, y + d - r); hole.lineTo(x + q, y + r); hole.quadraticCurveTo(x + q, y + q, x + r, y + q)
    s.holes.push(hole); return s
  }, [w, d])
  return (
    <mesh position={[z.center[0], 0.006, z.center[2]]} rotation-x={-Math.PI / 2}>
      <shapeGeometry args={[shape]} />
      <meshBasicMaterial ref={m} color="#b8e62e" transparent opacity={0} depthWrite={false} toneMapped={false} />
    </mesh>
  )
}

function Zone({ i, p, veneer }: { i: number; p: SceneProps; veneer: any }) {
  const z = ZONES[i], st = p.results.stages[i]
  const seated = Math.min(6, st.workers)
  const overflow = Math.min(3, Math.max(0, st.workers - 6))
  return (
    <group>
      <mesh position={[z.center[0], 1.0, z.center[2]]} visible={false}
        onPointerOver={e => { e.stopPropagation(); p.setHovered(i); document.body.style.cursor = 'pointer' }}
        onPointerOut={() => { p.setHovered(null); document.body.style.cursor = '' }}
        onClick={e => { e.stopPropagation(); p.setSelected(i) }}>
        <boxGeometry args={[4.8, 2, 3.2]} />
      </mesh>
      <ZoneHighlight i={i} p={p} />
      {z.seats.map((s, k) => (
        <group key={k} position={s.pos} rotation-y={s.rot}>
          {z.kind === 'island'
            ? <Workstation stage={i} mode={p.mode} variant={k + i} occupied={k < seated} veneer={veneer} paper={PAPER[p.mode]} />
            : <Chair />}
          {k < seated && <Suspense fallback={null}><Person who={(i * 2 + k) % 6} act={actFor(i, k, p.mode)} seed={i * 7 + k} position={[0, 0, z.kind === 'meeting' ? -0.05 : 0.07]} /></Suspense>}
          {k < seated && p.mode === 'assisted' && z.kind === 'island' && (
            <mesh position={[0.42, 1.18, 0.86]}><sphereGeometry args={[0.025, 16, 12]} /><meshStandardMaterial color="#d6f5e2" emissive="#9fe6bc" emissiveIntensity={0.9} /></mesh>
          )}
        </group>
      ))}
      {Array.from({ length: overflow }, (_, k) => (
        <Suspense key={'o' + k} fallback={null}>
          <Person who={(k + i + 3) % 6} act={k === 0 && i === 4 ? 'present' : 'talk'} seed={i * 11 + k}
            position={[z.center[0] + (k - 1) * 0.9, 0, z.center[2] + (z.kind === 'meeting' ? -1.6 : (i < 3 ? 2.0 : -2.0))]} rotation={i < 3 ? Math.PI : 0} />
        </Suspense>
      ))}
      {Array.from({ length: st.agents }, (_, k) => (
        <AgentCore key={'a' + k} seed={k + i} position={[z.center[0] + (k - (st.agents - 1) / 2) * 0.55, z.kind === 'meeting' ? 1.25 : 1.62, z.center[2]]} />
      ))}
      {p.selected !== i && (
        <Html position={[z.center[0], 2.55, z.center[2]]} center distanceFactor={p.exploded ? 18 : 8} zIndexRange={[10, 0]} style={{ pointerEvents: 'none' }}>
          <div className={`slabel ${st.isBottleneck ? 'bn' : ''}`}>
            <div className="sl-n">{String(i + 1).padStart(2, '0')}</div>
            <div><div className="sl-t">{st.def.name}</div>
              <div className="sl-s">{st.workers} os.{st.agents ? ` · ${st.agents} ag. AI` : ''} · {Math.round(st.utilization * 100)}%</div>
              <div className="sl-bar"><i style={{ width: `${Math.min(100, st.utilization * 66)}%`, background: st.utilization > 1 ? '#e0583c' : st.utilization > 0.85 ? '#f2a33a' : '#2fae72' }} /></div></div>
          </div>
        </Html>
      )}
    </group>
  )
}

function Flow({ p }: { p: SceneProps }) {
  const curve = useMemo(() => flowCurve(), [])
  const ribbon = useMemo(() => {
    const pts = curve.getSpacedPoints(300), pos: number[] = [], idx: number[] = [], uv: number[] = []
    pts.forEach((pt, k) => {
      const t = curve.getTangentAt(k / 300), n = new THREE.Vector3(-t.z, 0, t.x).multiplyScalar(0.035)
      pos.push(pt.x + n.x, 0.008, pt.z + n.z, pt.x - n.x, 0.008, pt.z - n.z); uv.push(k / 300, 0, k / 300, 1)
      if (k) { const a = (k - 1) * 2; idx.push(a, a + 1, a + 2, a + 1, a + 3, a + 2) }
    })
    const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2)); g.setIndex(idx); g.computeVertexNormals(); return g
  }, [curve])
  const mat = useRef<THREE.MeshBasicMaterial>(null!)
  const N = 40
  const inst = useRef<THREE.InstancedMesh>(null!)
  const cardMat = useRef<THREE.MeshPhysicalMaterial>(null!)
  const o = useMemo(() => new THREE.Object3D(), [])
  const prog = useRef(0)
  const density = Math.min(1, 0.15 + p.results.completed / 120)
  const speed = p.mode === 'traditional' ? 0.006 : p.mode === 'assisted' ? 0.012 : 0.022
  const sp = useRef(speed)
  useFrame((st, dt) => {
    sp.current = THREE.MathUtils.damp(sp.current, speed, 2, dt)
    prog.current += dt * sp.current
    const visible = p.mode !== 'traditional' ? 1 : 0.45
    mat.current.opacity = THREE.MathUtils.damp(mat.current.opacity, (p.exploded ? 0.9 : 0.35) * visible + 0.1, 3, dt)
    for (let k = 0; k < N; k++) {
      const u = (k / N + prog.current) % 1, on = k / N < density
      const pt = curve.getPointAt(u), t = curve.getTangentAt(u)
      o.position.set(pt.x, 1.05 + Math.sin(st.clock.elapsedTime * 1.5 + k) * 0.03, pt.z)
      o.rotation.set(0, Math.atan2(t.x, t.z) + Math.PI / 2, 0)
      o.scale.setScalar(on ? 1 : 0.0001); o.updateMatrix(); inst.current.setMatrixAt(k, o.matrix)
    }
    inst.current.instanceMatrix.needsUpdate = true
    const trad = p.mode === 'traditional'
    easing.dampC(cardMat.current.color, trad ? '#f5f3ee' : '#dff7ea', 0.4, dt)
    easing.dampC(cardMat.current.emissive, trad ? '#000000' : '#9fe6bc', 0.4, dt)
    cardMat.current.opacity = THREE.MathUtils.damp(cardMat.current.opacity, trad ? 0.95 : 0.55, 3, dt)
  })
  return (
    <group>
      <mesh geometry={ribbon}><meshBasicMaterial ref={mat} color="#9fe6bc" transparent opacity={0.3} depthWrite={false} toneMapped={false} /></mesh>
      <instancedMesh ref={inst} args={[undefined, undefined, N]} castShadow={false}>
        <boxGeometry args={[0.21, 0.297, 0.004]} />
        <meshPhysicalMaterial ref={cardMat} transparent opacity={0.6} roughness={0.2} emissiveIntensity={0.5} />
      </instancedMesh>
    </group>
  )
}

function CameraRig({ p }: { p: SceneProps }) {
  const ref = useRef<CameraControls>(null!)
  const { size } = useThree()
  const narrow = size.width < size.height
  const tourIdx = useRef(0)
  const go = (sel: number | null) => {
    const c = ref.current; if (!c) return
    if (p.exploded) {
      c.boundaryEnclosesCamera = false; c.maxDistance = 40
      c.setBoundary(undefined as any)
      const k = narrow ? 1.5 : 1
      return c.setLookAt(TOPDOWN.pos[0] * k, TOPDOWN.pos[1] * k, TOPDOWN.pos[2] * k, ...TOPDOWN.target, true)
    }
    c.maxDistance = 16
    c.setBoundary(new THREE.Box3(new THREE.Vector3(ROOM.minX + 0.6, 0.3, ROOM.minZ + 0.6), new THREE.Vector3(ROOM.maxX - 0.6, ROOM.h - 0.3, ROOM.maxZ - 0.6)))
    c.boundaryEnclosesCamera = true
    const v = sel === null ? OVERVIEW : ZONES[sel].cam
    if (narrow && sel !== null) {
      const d = new THREE.Vector3(...v.pos).sub(new THREE.Vector3(...v.target)).multiplyScalar(1.35).add(new THREE.Vector3(...v.target))
      return c.setLookAt(d.x, d.y, d.z, ...v.target, true)
    }
    c.setLookAt(...v.pos, ...v.target, true)
  }
  useEffect(() => { go(p.selected) }, [p.selected, p.exploded, p.camKey, narrow])
  useEffect(() => {
    if (!p.tour) return
    const id = setInterval(() => { tourIdx.current = (tourIdx.current + 1) % 6; p.setSelected(tourIdx.current === 5 ? null : tourIdx.current) }, 5200)
    tourIdx.current = 0; p.setSelected(0)
    return () => clearInterval(id)
  }, [p.tour])
  useEffect(() => { if (ref.current) ref.current.smoothTime = p.tour ? 1.6 : 0.85 }, [p.tour])
  return <CameraControls ref={ref} makeDefault minDistance={0.8} maxDistance={16} maxPolarAngle={Math.PI * 0.62} dollySpeed={0.6} truckSpeed={1} />
}

function Lights({ quality }: { quality: 'high' | 'low' }) {
  return (
    <>
      <hemisphereLight args={['#f4f1ea', '#a39e94', 0.7]} />
      <directionalLight position={[9, 6.5, -18]} intensity={2.6} color="#fff4e2" castShadow
        shadow-mapSize={quality === 'high' ? [2048, 2048] : [1024, 1024]} shadow-camera-left={-16} shadow-camera-right={16} shadow-camera-top={10} shadow-camera-bottom={-10}
        shadow-camera-near={1} shadow-camera-far={45} shadow-bias={-0.0003} shadow-normalBias={0.02} shadow-radius={6} />
      {[[-7, -4], [0, -4], [6.5, -4], [-4.6, 3.6], [7, 5]].map(([x, z], k) => (
        <pointLight key={k} position={[x, ROOM.h - 0.25, z]} intensity={9} distance={10} decay={2} color="#fff6ea" />
      ))}
    </>
  )
}

export default function Scene(p: SceneProps) {
  const veneer = useSet('white_oak_veneer', [1, 1])
  const target = useMemo(() => new THREE.Vector3(), [])
  const { controls } = useThree() as any
  useFrame(() => { if (controls?.getTarget) controls.getTarget(target) })
  return (
    <>
      <PerformanceMonitor onDecline={() => p.setQuality('low')} onIncline={() => p.setQuality('high')} flipflops={3} />
      <Environment files={`${BASE}hdri/rooftop_day_2k.hdr`} background backgroundIntensity={2.2} environmentIntensity={1.1} backgroundRotation={[0, ROT, 0]} environmentRotation={[0, ROT, 0]} />
      <Lights quality={p.quality} />
      <group onPointerMissed={() => p.setSelected(null)}>
        <Room topdown={p.exploded} />
        <Skyline />
        {STAGES.map((_, i) => <Zone key={i} i={i} p={p} veneer={veneer} />)}
        <Flow p={p} />
      </group>
      <CameraRig p={p} />
      <EffectComposer multisampling={0} enableNormalPass={false}>
        {p.quality === 'high' ? <N8AO halfRes aoRadius={0.6} intensity={2.4} distanceFalloff={0.4} quality="medium" /> : <></>}
        {p.tour && p.quality === 'high' ? <DepthOfField target={target} focalLength={0.04} bokehScale={2.2} height={480} /> : <></>}
        <Bloom mipmapBlur luminanceThreshold={1.1} intensity={0.25} radius={0.5} />
        <ToneMapping mode={ToneMappingMode.AGX} />
        <Vignette offset={0.3} darkness={0.35} />
        <SMAA />
      </EffectComposer>
    </>
  )
}
