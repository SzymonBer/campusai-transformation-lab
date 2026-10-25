import * as THREE from 'three'
import { useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import { RoundedBox, useGLTF, Clone } from '@react-three/drei'
import { easing } from 'maath'
import { BASE, ROOM } from './layout'
import { useSet } from './materials'

const M = (n: string) => `${BASE}models/${n}.glb`
export function Model({ name, ...props }: { name: string } & JSX.IntrinsicElements['group']) {
  const g = useGLTF(M(name))
  const s = useMemo(() => { g.scene.traverse((o: any) => { if (o.isMesh) { o.castShadow = true; o.receiveShadow = true } }); return g.scene }, [g])
  return <Clone object={s} {...props} />
}

function Glass({ args, position, rotation }: { args: [number, number]; position: [number, number, number]; rotation?: [number, number, number] }) {
  return (
    <mesh position={position} rotation={rotation}>
      <planeGeometry args={args} />
      <meshPhysicalMaterial color="#e9f3ef" transparent opacity={0.12} roughness={0.04} metalness={0} envMapIntensity={1.4} side={THREE.DoubleSide} depthWrite={false} />
    </mesh>
  )
}
const frameMat = <meshStandardMaterial color="#2a2f2d" metalness={0.85} roughness={0.32} />

function CurtainWall({ axis, at, from, to }: { axis: 'x' | 'z'; at: number; from: number; to: number }) {
  const H = ROOM.h, step = 1.5
  const n = Math.round((to - from) / step)
  const items = []
  for (let k = 0; k <= n; k++) {
    const u = from + k * step
    const p: [number, number, number] = axis === 'z' ? [u, H / 2, at] : [at, H / 2, u]
    items.push(<mesh key={'m' + k} position={p} castShadow>{axis === 'z' ? <boxGeometry args={[0.07, H, 0.12]} /> : <boxGeometry args={[0.12, H, 0.07]} />}{frameMat}</mesh>)
    if (k < n) {
      const c = u + step / 2
      const gp: [number, number, number] = axis === 'z' ? [c, H / 2 + 0.1, at] : [at, H / 2 + 0.1, c]
      items.push(<Glass key={'g' + k} args={[step - 0.07, H - 0.2]} position={gp} rotation={axis === 'x' ? [0, Math.PI / 2, 0] : [0, 0, 0]} />)
    }
  }
  const len = to - from, mid = (from + to) / 2
  const rail = (y: number, h: number) => axis === 'z'
    ? <mesh position={[mid, y, at]} castShadow receiveShadow><boxGeometry args={[len, h, 0.16]} />{frameMat}</mesh>
    : <mesh position={[at, y, mid]} castShadow receiveShadow><boxGeometry args={[0.16, h, len]} />{frameMat}</mesh>
  return <group>{items}{rail(0.1, 0.2)}{rail(H - 0.04, 0.08)}</group>
}

function Ceiling({ hidden }: { hidden: boolean }) {
  const g = useRef<THREE.Group>(null!)
  useFrame((_, dt) => { easing.damp3(g.current.position, [0, hidden ? 6 : 0, 0], 0.5, dt); g.current.visible = g.current.position.y < 5.5 })
  const panels = useMemo(() => {
    const a: [number, number][] = []
    for (let x = -9; x <= 9; x += 3) for (let z = -6; z <= 6; z += 3) a.push([x, z])
    return a
  }, [])
  const W = ROOM.maxX - ROOM.minX, D = ROOM.maxZ - ROOM.minZ
  return (
    <group ref={g}>
      <mesh position={[0, ROOM.h, 0]} rotation-x={Math.PI / 2} receiveShadow>
        <planeGeometry args={[W, D]} />
        <meshStandardMaterial color="#fbfbf8" roughness={0.95} />
      </mesh>
      {panels.map(([x, z], k) => (
        <group key={k} position={[x, ROOM.h - 0.012, z]}>
          <mesh rotation-x={Math.PI / 2} position={[0, -0.011, 0]}><planeGeometry args={[1.22, 0.62]} /><meshStandardMaterial color="#ffffff" emissive="#fffaf0" emissiveIntensity={2.2} toneMapped={false} /></mesh>
          <mesh position={[0, -0.004, 0]}><boxGeometry args={[1.26, 0.01, 0.66]} /><meshStandardMaterial color="#d8d8d4" metalness={0.5} roughness={0.4} /></mesh>
        </group>
      ))}
    </group>
  )
}

export default function Room({ topdown }: { topdown: boolean }) {
  const floor = useSet('laminate_floor_02', [10, 7])
  const plaster = useSet('white_plaster_02', [6, 2])
  const W = ROOM.maxX - ROOM.minX, D = ROOM.maxZ - ROOM.minZ, H = ROOM.h
  return (
    <group>
      {/* podłoga */}
      <mesh rotation-x={-Math.PI / 2} receiveShadow>
        <planeGeometry args={[W, D]} />
        <meshStandardMaterial {...floor} color="#c9c3bb" roughness={0.6} envMapIntensity={0.5} />
      </mesh>
      {/* płyta stropu pod podłogą (widoczna w widoku z góry) */}
      <mesh position={[0, -0.16, 0]} receiveShadow><boxGeometry args={[W + 0.6, 0.3, D + 0.6]} /><meshStandardMaterial color="#6f7570" roughness={0.9} /></mesh>
      {/* ściany pełne: zachodnia i południowa */}
      <mesh position={[ROOM.minX - 0.1, H / 2, 0]} receiveShadow castShadow><boxGeometry args={[0.2, H, D]} /><meshStandardMaterial {...plaster} color="#eeece7" /></mesh>
      <mesh position={[-1.6, H / 2, ROOM.maxZ + 0.1]} receiveShadow castShadow><boxGeometry args={[W - 3.2 - 2.2, H, 0.2]} /><meshStandardMaterial {...plaster} color="#eeece7" /></mesh>
      <mesh position={[-11.4, H / 2, ROOM.maxZ + 0.1]} receiveShadow castShadow><boxGeometry args={[1.2, H, 0.2]} /><meshStandardMaterial {...plaster} color="#eeece7" /></mesh>
      <mesh position={[-9.7, H - 0.45, ROOM.maxZ + 0.1]} castShadow><boxGeometry args={[2.2, 0.9, 0.2]} /><meshStandardMaterial {...plaster} color="#eeece7" /></mesh>
      {/* drzwi wejściowe (szklane, rama) */}
      <group position={[-9.7, 0, ROOM.maxZ + 0.08]}>
        {[-1.1, 1.1].map(x => <mesh key={x} position={[x, (H - 0.9) / 2, 0]}><boxGeometry args={[0.08, H - 0.9, 0.24]} />{frameMat}</mesh>)}
        <mesh position={[0, H - 0.9, 0]}><boxGeometry args={[2.28, 0.08, 0.24]} />{frameMat}</mesh>
        <Glass args={[1.04, H - 1.0]} position={[-0.53, (H - 0.9) / 2, 0]} />
        <Glass args={[1.04, H - 1.0]} position={[0.53, (H - 0.9) / 2, 0.03]} />
        {[-0.1, 0.1].map(x => <mesh key={x} position={[x, 1.05, -0.06]}><boxGeometry args={[0.025, 0.9, 0.025]} /><meshStandardMaterial color="#c8ccc9" metalness={1} roughness={0.2} /></mesh>)}
        <mesh position={[0, 2.05, -0.13]}><boxGeometry args={[0.36, 0.14, 0.02]} /><meshStandardMaterial color="#1f6f4a" emissive="#2fae72" emissiveIntensity={0.4} /></mesh>
      </group>
      {/* okna na całą wysokość: północ i wschód */}
      <CurtainWall axis="z" at={ROOM.minZ} from={ROOM.minX} to={ROOM.maxX} />
      <CurtainWall axis="x" at={ROOM.maxX} from={ROOM.minZ} to={ROOM.maxZ} />
      {/* ściana południowa na odcinku wschodnim (za salą) */}
      <mesh position={[10.4, H / 2, ROOM.maxZ + 0.1]} receiveShadow><boxGeometry args={[3.2, H, 0.2]} /><meshStandardMaterial {...plaster} color="#eeece7" /></mesh>
      {/* kolumny konstrukcyjne */}
      {[[-3.6, -0.6], [3.2, -0.6]].map(([x, z], k) => (
        <mesh key={k} position={[x, H / 2, z]} castShadow receiveShadow><boxGeometry args={[0.5, H, 0.5]} /><meshStandardMaterial {...plaster} color="#f1efea" /></mesh>
      ))}
      {/* listwy przypodłogowe */}
      <mesh position={[ROOM.minX + 0.01, 0.05, 0]}><boxGeometry args={[0.02, 0.1, D]} /><meshStandardMaterial color="#cfcac2" /></mesh>
      {/* sala spotkań: szklane ściany */}
      <MeetingRoom />
      {/* strefa socjalna / lounge przy ścianie zachodniej */}
      <Model name="sofa_02" position={[-11.1, 0, 5.4]} rotation-y={Math.PI / 2} scale={1} />
      <Model name="coffee_table_round_01" position={[-9.9, 0, 5.4]} />
      <Model name="potted_plant_01" position={[-11.3, 0, 7.3]} scale={1.3} />
      <Model name="potted_plant_02" position={[-11.3, 0, -7.3]} scale={1.4} />
      <Model name="potted_plant_01" position={[11.3, 0, -7.3]} scale={1.3} />
      <Model name="potted_plant_02" position={[2.2, 0, 7.4]} scale={1.2} />
      <Model name="potted_plant_02" position={[-3.6, 0, -1.2]} scale={0.9} />
      {[-11.55, ].map(x => [ -1.6, -0.7, 0.2, 1.1].map(z => <Model key={z} name="drawer_cabinet" position={[x, 0, z]} rotation-y={Math.PI / 2} />))}
      {/* tablica / ekran na ścianie zachodniej */}
      <group position={[ROOM.minX + 0.03, 1.55, -4.4]} rotation-y={Math.PI / 2}>
        <RoundedBox args={[2.4, 1.2, 0.03]} radius={0.01}><meshStandardMaterial color="#fbfbf9" roughness={0.25} /></RoundedBox>
        <mesh position={[0, -0.64, 0.05]}><boxGeometry args={[2.2, 0.03, 0.08]} /><meshStandardMaterial color="#9aa09d" metalness={0.8} roughness={0.3} /></mesh>
      </group>
      <Ceiling hidden={topdown} />
    </group>
  )
}

function MeetingRoom() {
  const x0 = 3.6, z0 = 2.6, x1 = ROOM.maxX, z1 = ROOM.maxZ, H = ROOM.h
  const veneer = useSet('white_oak_veneer', [2, 1])
  return (
    <group>
      {/* ściana północna sali (szkło + słupki) */}
      {Array.from({ length: 6 }, (_, k) => {
        const w = (x1 - x0) / 6, cx = x0 + w * (k + 0.5)
        return <group key={k}><Glass args={[w - 0.05, H]} position={[cx, H / 2, z0]} /><mesh position={[x0 + w * k, H / 2, z0]}><boxGeometry args={[0.05, H, 0.06]} />{frameMat}</mesh>
          <mesh position={[cx, 1.1, z0 + 0.002]}><planeGeometry args={[w - 0.05, 0.08]} /><meshStandardMaterial color="#e8efe9" transparent opacity={0.55} /></mesh></group>
      })}
      {/* ściana zachodnia sali z drzwiami (luka z = 2.9..4.0) */}
      <Glass args={[z1 - 4.0, H]} position={[x0, H / 2, (4.0 + z1) / 2]} rotation={[0, Math.PI / 2, 0]} />
      <mesh position={[x0, H / 2, 4.0]}><boxGeometry args={[0.06, H, 0.06]} />{frameMat}</mesh>
      <mesh position={[x0, H / 2, 2.9]}><boxGeometry args={[0.06, H, 0.06]} />{frameMat}</mesh>
      <mesh position={[x0, H - 0.04, (z0 + z1) / 2]}><boxGeometry args={[0.08, 0.08, z1 - z0]} />{frameMat}</mesh>
      <mesh position={[(x0 + x1) / 2, H - 0.04, z0]}><boxGeometry args={[x1 - x0, 0.08, 0.08]} />{frameMat}</mesh>
      {/* stół konferencyjny */}
      <RoundedBox args={[3.4, 0.05, 1.25]} radius={0.02} position={[7.0, 0.74, 5.0]} castShadow receiveShadow>
        <meshStandardMaterial {...veneer} color="#d8c4a6" roughness={0.45} />
      </RoundedBox>
      {[[5.8, 5.0], [8.2, 5.0]].map(([x, z], k) => (
        <mesh key={k} position={[x, 0.36, z]} castShadow><boxGeometry args={[0.12, 0.72, 0.8]} /><meshStandardMaterial color="#2a2f2d" metalness={0.85} roughness={0.3} /></mesh>
      ))}
      <Model name="modern_ceiling_lamp_01" position={[7.0, ROOM.h - 0.95, 5.0]} />
      <Model name="projector_screen" position={[11.7, 0, 5.0]} rotation-y={-Math.PI / 2} />
      <Model name="office_notepads" position={[6.6, 0.765, 4.8]} />
    </group>
  )
}
Object.values(['sofa_02', 'coffee_table_round_01', 'potted_plant_01', 'potted_plant_02', 'drawer_cabinet', 'modern_ceiling_lamp_01', 'projector_screen', 'office_notepads', 'stationery_supplies']).forEach(n => useGLTF.preload(M(n)))
