import * as THREE from 'three'
import { useTexture } from '@react-three/drei'
import { useMemo } from 'react'
import { BASE } from './layout'

function prep(t: THREE.Texture, rep: [number, number], srgb = false) {
  t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(...rep); t.anisotropy = 8
  if (srgb) t.colorSpace = THREE.SRGBColorSpace
  t.needsUpdate = true
  return t
}
export function useSet(name: string, rep: [number, number], hasDiff = true) {
  const files = [`${BASE}tex/${name}_nor.jpg`, `${BASE}tex/${name}_rough.jpg`, ...(hasDiff ? [`${BASE}tex/${name}_diff.jpg`] : [])]
  const tx = useTexture(files) as THREE.Texture[]
  return useMemo(() => {
    const c = tx.map(t => t.clone())
    return { normalMap: prep(c[0], rep), roughnessMap: prep(c[1], rep), map: hasDiff ? prep(c[2], rep, true) : undefined }
  }, [tx, rep[0], rep[1]])
}
