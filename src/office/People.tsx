import * as THREE from 'three'
import { useEffect, useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import { useGLTF } from '@react-three/drei'
import { clone as skClone } from 'three/examples/jsm/utils/SkeletonUtils.js'
import { PEOPLE } from './layout'

export type Act = 'type' | 'phone' | 'sit' | 'talk' | 'idle' | 'walk' | 'present'
const CLIP: Record<Act, string> = { type: 'Desk typing', phone: 'Desk phone call', sit: 'Sit idle (chair)', talk: 'Talk', idle: 'Idle', walk: 'Walk', present: 'Presenting at a board' }

export function Person({ who, act, position, rotation = 0, seed = 0, path }: { who: number; act: Act; position?: [number, number, number]; rotation?: number; seed?: number; path?: THREE.Curve<THREE.Vector3> }) {
  const gltf = useGLTF(PEOPLE[who % PEOPLE.length])
  const obj = useMemo(() => {
    const o = skClone(gltf.scene)
    o.traverse((m: any) => { if (m.isMesh || m.isSkinnedMesh) { m.castShadow = true; m.receiveShadow = true; m.frustumCulled = false } })
    return o
  }, [gltf])
  const mixer = useMemo(() => new THREE.AnimationMixer(obj), [obj])
  const g = useRef<THREE.Group>(null!)
  const scl = useRef(0.001)
  useEffect(() => {
    const clip = gltf.animations.find(a => a.name === CLIP[act]) ?? gltf.animations[0]
    const a = mixer.clipAction(clip)
    a.reset(); a.time = (seed * 1.618) % clip.duration; a.timeScale = 0.9 + ((seed * 0.37) % 0.2); a.fadeIn(0.4).play()
    return () => { a.fadeOut(0.3) }
  }, [act, mixer, gltf, seed])
  const u = useRef((seed * 0.137) % 1)
  useFrame((_, dt) => {
    mixer.update(Math.min(dt, 0.05))
    scl.current = THREE.MathUtils.damp(scl.current, 1, 4, dt)
    g.current.scale.setScalar(scl.current)
    if (path) {
      const len = path.getLength()
      u.current = (u.current + (dt * 1.15) / len) % 1
      const p = path.getPointAt(u.current), t = path.getTangentAt(u.current)
      g.current.position.set(p.x, 0, p.z)
      g.current.rotation.y = Math.atan2(t.x, t.z)
    }
  })
  return <group ref={g} position={position} rotation-y={rotation}><primitive object={obj} /></group>
}
PEOPLE.forEach(p => useGLTF.preload(p))
