import * as THREE from 'three'
import { RoundedBox } from '@react-three/drei'
import type { Mode } from '../model'
import { screenTex } from './screens'
import { Model } from './Room'

const metal = <meshStandardMaterial color="#e9eae7" metalness={0.6} roughness={0.35} />
const dark = <meshStandardMaterial color="#1b1e1d" metalness={0.4} roughness={0.35} />

export function Workstation({ stage, mode, variant, occupied, veneer, paper }: { stage: number; mode: Mode; variant: number; occupied: boolean; veneer: any; paper: number }) {
  // lokalnie: pracownik siedzi w (0,0,0) twarzą do +Z; blat przed nim
  const tex = screenTex(stage, mode, variant)
  const on = occupied || mode === 'automated'
  return (
    <group>
      {/* blat i stelaż */}
      <RoundedBox args={[1.4, 0.035, 0.78]} radius={0.012} position={[0, 0.735, 0.62]} castShadow receiveShadow>
        <meshStandardMaterial {...veneer} color="#e2d3bc" roughness={0.5} />
      </RoundedBox>
      {[-0.64, 0.64].map(x => (
        <group key={x} position={[x, 0, 0.62]}>
          <mesh position={[0, 0.36, 0]} castShadow><boxGeometry args={[0.05, 0.72, 0.05]} />{metal}</mesh>
          <mesh position={[0, 0.015, 0]} castShadow><boxGeometry args={[0.06, 0.03, 0.7]} />{metal}</mesh>
          <mesh position={[0, 0.7, 0]}><boxGeometry args={[0.05, 0.03, 0.66]} />{metal}</mesh>
        </group>
      ))}
      {/* panel akustyczny między biurkami */}
      <mesh position={[0, 1.0, 1.0]} castShadow receiveShadow><boxGeometry args={[1.38, 0.5, 0.03]} /><meshStandardMaterial color="#5f6f67" roughness={0.95} /></mesh>
      {/* monitor */}
      <group position={[0.05, 0.755, 0.86]} rotation-y={Math.PI}>
        <mesh position={[0, 0.01, 0]} castShadow><cylinderGeometry args={[0.11, 0.12, 0.015, 32]} />{dark}</mesh>
        <mesh position={[0, 0.2, 0.03]} castShadow><boxGeometry args={[0.04, 0.36, 0.02]} />{dark}</mesh>
        <RoundedBox args={[0.62, 0.37, 0.025]} radius={0.008} position={[0, 0.38, 0.0]} castShadow>{dark}</RoundedBox>
        <mesh position={[0, 0.385, 0.0135]}>
          <planeGeometry args={[0.6, 0.345]} />
          <meshStandardMaterial map={tex} emissiveMap={tex} emissive="#ffffff" emissiveIntensity={on ? 0.55 : 0.02} color={on ? '#ffffff' : '#111'} roughness={0.25} />
        </mesh>
      </group>
      {/* klawiatura + klawisze, mysz, kubek */}
      <group position={[0.02, 0.757, 0.42]}>
        <RoundedBox args={[0.43, 0.014, 0.13]} radius={0.004} castShadow><meshStandardMaterial color="#d9dbd8" metalness={0.3} roughness={0.4} /></RoundedBox>
        {Array.from({ length: 4 }, (_, r) => <mesh key={r} position={[0, 0.009, -0.045 + r * 0.03]}><boxGeometry args={[0.4, 0.005, 0.022]} /><meshStandardMaterial color="#f2f2f0" roughness={0.6} /></mesh>)}
        <mesh position={[0.3, 0.004, 0.02]} castShadow scale={[1, 0.5, 1.5]}><sphereGeometry args={[0.032, 16, 12]} /><meshStandardMaterial color="#e5e6e3" roughness={0.35} /></mesh>
      </group>
      <mesh position={[-0.52, 0.8, 0.5]} castShadow><cylinderGeometry args={[0.042, 0.038, 0.1, 24]} /><meshStandardMaterial color={variant % 2 ? '#f3f1ec' : '#1f6f4a'} roughness={0.3} /></mesh>
      {/* stos papierów: zależy od trybu */}
      <group position={[-0.42, 0.755, 0.78]} scale={[1, paper, 1]}>
        {Array.from({ length: 6 }, (_, k) => <mesh key={k} position={[0.004 * (k % 3), 0.004 + k * 0.009, 0]} rotation-y={0.03 * k} castShadow><boxGeometry args={[0.21, 0.008, 0.297]} /><meshStandardMaterial color="#f5f3ee" roughness={0.9} /></mesh>)}
      </group>
      {variant % 3 === 0 && <Model name="stationery_supplies" position={[0.5, 0.755, 0.82]} scale={0.8} />}
      {/* krzesło biurowe */}
      <Chair />
    </group>
  )
}

export function Chair() {
  const fabric = <meshStandardMaterial color="#2c3431" roughness={0.92} />
  const chrome = <meshStandardMaterial color="#c7cac8" metalness={1} roughness={0.22} />
  return (
    <group position={[0, 0, -0.05]}>
      <RoundedBox args={[0.5, 0.08, 0.48]} radius={0.03} position={[0, 0.44, 0.02]} castShadow receiveShadow>{fabric}</RoundedBox>
      <RoundedBox args={[0.46, 0.6, 0.06]} radius={0.03} position={[0, 0.82, -0.24]} rotation-x={-0.12} castShadow>{fabric}</RoundedBox>
      <mesh position={[0, 0.6, -0.26]} rotation-x={-0.1}><boxGeometry args={[0.05, 0.3, 0.03]} />{chrome}</mesh>
      {[-0.26, 0.26].map(x => <mesh key={x} position={[x, 0.6, 0.0]} castShadow><boxGeometry args={[0.04, 0.03, 0.3]} />{chrome}</mesh>)}
      <mesh position={[0, 0.25, 0]}><cylinderGeometry args={[0.025, 0.025, 0.36, 16]} />{chrome}</mesh>
      {Array.from({ length: 5 }, (_, k) => {
        const a = (k / 5) * Math.PI * 2
        return <group key={k} rotation-y={a}>
          <mesh position={[0, 0.06, 0.16]} rotation-x={0.12}><boxGeometry args={[0.04, 0.025, 0.32]} />{chrome}</mesh>
          <mesh position={[0, 0.025, 0.31]}><sphereGeometry args={[0.025, 12, 8]} /><meshStandardMaterial color="#111" roughness={0.5} /></mesh>
        </group>
      })}
    </group>
  )
}
