import * as THREE from 'three'
import { useMemo } from 'react'

function facadeTex(seed: number) {
  const c = document.createElement('canvas'); c.width = 128; c.height = 256
  const g = c.getContext('2d')!
  const base = ['#8d969a', '#a7adb0', '#6f7b80', '#b9b4aa'][seed % 4]
  g.fillStyle = base; g.fillRect(0, 0, 128, 256)
  for (let y = 4; y < 256; y += 10) for (let x = 4; x < 128; x += 12) {
    const r = Math.sin(x * 12.9 + y * 78.2 + seed * 3.1) * 43758.5; const v = r - Math.floor(r)
    g.fillStyle = v > 0.92 ? '#e9e3cf' : v > 0.5 ? '#46535a' : '#5d6a70'
    g.fillRect(x, y, 8, 6)
  }
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.wrapS = t.wrapT = THREE.RepeatWrapping
  return t
}

/** Proceduralne wieżowce za oknami (biuro na ~20. piętrze), z perspektywą powietrzną. */
export default function Skyline() {
  const items = useMemo(() => {
    const tex = [0, 1, 2, 3].map(facadeTex)
    const haze = new THREE.Color('#c9d6df')
    const out: JSX.Element[] = []
    let k = 0
    const rnd = (n: number) => { const x = Math.sin(n * 127.1) * 43758.5453; return x - Math.floor(x) }
    for (let i = 0; i < 150; i++) {
      const side = i % 3 === 0 ? 'east' : 'north'
      const dist = 60 + rnd(i) * 260
      const lat = (rnd(i + 99) - 0.5) * (dist * 2.2)
      const w = 10 + rnd(i + 7) * 22, d = 10 + rnd(i + 5) * 22, h = 25 + rnd(i + 3) * rnd(i + 11) * (dist > 160 ? 150 : 90)
      const x = side === 'north' ? lat : 12 + dist, z = side === 'north' ? -8 - dist : lat
      const fade = Math.min(0.9, 0.25 + dist / 360)
      const ti = tex[k++ % 4].clone(); ti.repeat.set(Math.max(1, w / 8), Math.max(1, h / 16)); ti.needsUpdate = true
      out.push(
        <mesh key={i} position={[x, -60 + h / 2, z]}>
          <boxGeometry args={[w, h, d]} />
          <meshStandardMaterial map={ti} color={new THREE.Color('#ffffff').lerp(haze, fade)} emissive={haze} emissiveIntensity={fade * 1.2} roughness={0.6} metalness={0.2} />
        </mesh>,
      )
    }
    return out
  }, [])
  return <group>{items}</group>
}
