import * as THREE from 'three'
import type { Mode } from '../model'
const cache = new Map<string, THREE.CanvasTexture>()
const TITLES = ['Leady', 'Research konta', 'Oferta', 'Kontakt', 'Umowa']
/** Realistyczny "UI CRM" na monitorze, zależny od etapu i trybu. */
export function screenTex(stage: number, mode: Mode, variant: number) {
  const key = `${stage}-${mode}-${variant % 3}`
  if (cache.has(key)) return cache.get(key)!
  const c = document.createElement('canvas'); c.width = 512; c.height = 300
  const g = c.getContext('2d')!
  g.fillStyle = '#f4f6f5'; g.fillRect(0, 0, 512, 300)
  g.fillStyle = '#0d3b2c'; g.fillRect(0, 0, 512, 28)
  g.fillStyle = '#dff7ea'; g.font = '600 14px Inter, sans-serif'; g.fillText('CRM · ' + TITLES[stage], 12, 19)
  g.fillStyle = '#e3e8e5'; g.fillRect(0, 28, 92, 272)
  for (let i = 0; i < 7; i++) { g.fillStyle = i === stage ? '#1f8a5b' : '#b9c4be'; g.fillRect(12, 44 + i * 26, 64, 9) }
  const rnd = (n: number) => { const x = Math.sin(n * 91.7 + stage * 13 + variant * 7) * 43758.5; return x - Math.floor(x) }
  if (mode === 'traditional') {
    for (let r = 0; r < 12; r++) for (let col = 0; col < 5; col++) {
      g.fillStyle = r === 0 ? '#9aa6a0' : '#c9d1cc'; g.fillRect(104 + col * 80, 40 + r * 20, 70 * (0.5 + rnd(r * 5 + col) * 0.5), 8)
    }
  } else {
    for (let k = 0; k < 4; k++) { g.fillStyle = '#ffffff'; g.fillRect(104 + k * 100, 40, 92, 56); g.fillStyle = '#1f8a5b'; g.font = '700 20px Inter'; g.fillText(String(Math.round(20 + rnd(k) * 80)), 114 + k * 100, 76) }
    g.strokeStyle = '#2fae72'; g.lineWidth = 3; g.beginPath()
    for (let i = 0; i < 20; i++) { const x = 110 + i * 19, y = 220 - rnd(i + 3) * 70 - i * 2; i ? g.lineTo(x, y) : g.moveTo(x, y) } g.stroke()
    g.fillStyle = mode === 'automated' ? '#e6f6d0' : '#e1f2e9'; g.fillRect(104, 236, 396, 52)
    g.fillStyle = '#0d3b2c'; g.font = '500 12px Inter'
    g.fillText(mode === 'automated' ? 'Agent AI: przetworzono ' + Math.round(10 + rnd(9) * 30) + ' zadań · czeka na akceptację' : 'Asystent AI: szkic gotowy · sugerowane kolejne kroki', 114, 266)
  }
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 4
  cache.set(key, t); return t
}
