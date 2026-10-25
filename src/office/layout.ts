import * as THREE from 'three'
export const ROOM = { minX: -12, maxX: 12, minZ: -8, maxZ: 8, h: 3.1 }
export const BASE = import.meta.env.BASE_URL + 'assets/'
export const PEOPLE = ['anna', 'marek', 'kasia', 'tomasz', 'david', 'mei'].map(n => `${BASE}people/${n}.glb`)

export interface Seat { pos: [number, number, number]; rot: number }
export interface Zone {
  id: string; center: [number, number, number]; kind: 'island' | 'meeting'
  seats: Seat[]; cam: { pos: [number, number, number]; target: [number, number, number] }
  flow: [number, number, number] // punkt przepływu informacji
}

function islandSeats(cx: number, cz: number): Seat[] {
  const s: Seat[] = []
  for (let k = 0; k < 6; k++) {
    const side = k % 2 === 0 ? 1 : -1, col = Math.floor(k / 2)
    s.push({ pos: [cx + (col - 1) * 1.5, 0, cz + side * 1.02], rot: side > 0 ? Math.PI : 0 })
  }
  return s
}
function meetingSeats(cx: number, cz: number): Seat[] {
  const s: Seat[] = []
  for (let k = 0; k < 6; k++) {
    const side = k % 2 === 0 ? 1 : -1, col = Math.floor(k / 2)
    s.push({ pos: [cx + (col - 1) * 1.0, 0, cz + side * 0.95], rot: side > 0 ? Math.PI : 0 })
  }
  return s
}

export const ZONES: Zone[] = [
  { id: 'lead', center: [-7.2, 0, -4.4], kind: 'island', seats: islandSeats(-7.2, -4.4), flow: [-7.2, 0, -2.4],
    cam: { pos: [-3.6, 1.75, -0.6], target: [-7.4, 0.85, -4.6] } },
  { id: 'research', center: [-0.4, 0, -4.4], kind: 'island', seats: islandSeats(-0.4, -4.4), flow: [-0.4, 0, -2.4],
    cam: { pos: [2.6, 1.7, -0.8], target: [-0.6, 0.85, -4.6] } },
  { id: 'offer', center: [6.4, 0, -4.4], kind: 'island', seats: islandSeats(6.4, -4.4), flow: [6.4, 0, -2.4],
    cam: { pos: [9.6, 1.8, -1.0], target: [6.2, 0.85, -4.6] } },
  { id: 'contact', center: [-4.6, 0, 3.6], kind: 'island', seats: islandSeats(-4.6, 3.6), flow: [-2.0, 0, 1.0],
    cam: { pos: [-1.0, 1.7, 0.2], target: [-4.8, 0.85, 3.8] } },
  { id: 'close', center: [7.0, 0, 5.0], kind: 'meeting', seats: meetingSeats(7.0, 5.0), flow: [3.0, 0, 3.4],
    cam: { pos: [4.4, 1.7, 3.2], target: [7.4, 0.8, 5.4] } },
]

export const OVERVIEW = { pos: [-10.6, 2.55, 7.0] as [number, number, number], target: [1.8, 0.7, -2.2] as [number, number, number] }
export const TOPDOWN = { pos: [-1.5, 22, 12] as [number, number, number], target: [0, 0, 0] as [number, number, number] }

export const flowCurve = () => new THREE.CatmullRomCurve3([
  new THREE.Vector3(-10.5, 0.012, -2.4),
  ...ZONES.map(z => new THREE.Vector3(z.flow[0], 0.012, z.flow[2])),
  new THREE.Vector3(5.4, 0.012, 3.9),
], false, 'centripetal')
