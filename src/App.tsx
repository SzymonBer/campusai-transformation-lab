import { Suspense, useMemo, useState, useEffect } from 'react'
import { Canvas } from '@react-three/fiber'
import { useProgress } from '@react-three/drei'
import Scene from './Scene'
import { ASSUMPTIONS, MODES, Mode, STAGES, simulate, fmtPLN, fmt1 } from './model'

const DEFAULTS = { employees: 12, tasks: 60, automation: 0.6 }

export default function App() {
  const [mode, setMode] = useState<Mode>('traditional')
  const [employees, setEmployees] = useState(DEFAULTS.employees)
  const [tasks, setTasks] = useState(DEFAULTS.tasks)
  const [automation, setAutomation] = useState(DEFAULTS.automation)
  const [selected, setSelected] = useState<number | null>(null)
  const [hovered, setHovered] = useState<number | null>(null)
  const [exploded, setExploded] = useState(false)
  const [tour, setTour] = useState(false)
  const [camKey, setCamKey] = useState(0)
  const [info, setInfo] = useState(false)
  const [quality, setQuality] = useState<'high' | 'low'>('high')
  const [panelOpen, setPanelOpen] = useState(typeof window === 'undefined' || window.innerWidth > 760)

  const results = useMemo(() => simulate({ mode, employees, tasks, automation }), [mode, employees, tasks, automation])
  const base = useMemo(() => simulate({ mode: 'traditional', employees, tasks, automation }), [employees, tasks, automation])
  const delta = (v: number, b: number) => b ? Math.round((v / b - 1) * 100) : 0

  useEffect(() => {
    const k = (e: KeyboardEvent) => {
      if ((e.target as HTMLElement).tagName === 'INPUT') return
      if (e.key === '1') setMode('traditional'); if (e.key === '2') setMode('assisted'); if (e.key === '3') setMode('automated')
      if (e.key.toLowerCase() === 'x') setExploded(v => !v)
      if (e.key.toLowerCase() === 'c') setTour(v => !v)
      if (e.key.toLowerCase() === 'r') { setSelected(null); setTour(false); setCamKey(v => v + 1) }
      if (e.key === 'Escape') { setSelected(null); setInfo(false) }
    }
    window.addEventListener('keydown', k); return () => window.removeEventListener('keydown', k)
  }, [])

  const sel = selected !== null ? results.stages[selected] : null
  const selBase = selected !== null ? base.stages[selected] : null

  return (
    <div className="app">
      <Canvas shadows flat dpr={quality === 'high' ? [1, 1.75] : [0.75, 1]} gl={{ antialias: false, powerPreference: 'high-performance', preserveDrawingBuffer: true }}
        camera={{ position: [-10.6, 2.55, 7.0], fov: 50, near: 0.05, far: 300 }}>
        <Suspense fallback={null}>
          <Scene {...{ mode, results, selected, hovered, setSelected: (i) => { setSelected(i) }, setHovered, exploded, tour, camKey, quality, setQuality }} />
        </Suspense>
      </Canvas>

      <Loader />
      <header className="top">
        <div className="brand"><span className="logo">C</span><div><b>CampusAI</b> Transformation Lab<small>Dział sprzedaży przed i po adopcji AI</small></div></div>
        <div className="demo-badge" title="Wszystkie wartości pochodzą z modelu demonstracyjnego">DANE DEMONSTRACYJNE</div>
      </header>

      <nav className="modes" data-testid="modes">
        {(Object.keys(MODES) as Mode[]).map((m, k) => (
          <button key={m} className={mode === m ? 'on' : ''} onClick={() => setMode(m)} data-mode={m}>
            <span className="mk">{k + 1}</span><span><b>{MODES[m].label}</b><small>{MODES[m].sub}</small></span>
          </button>
        ))}
      </nav>

      <aside className={`panel left ${panelOpen ? '' : 'closed'}`}>
        <button className="collapse" onClick={() => setPanelOpen(v => !v)}>{panelOpen ? '–' : 'Sterowanie'}</button>
        <h3>Eksperyment</h3>
        <label>Liczba pracowników <b data-testid="v-emp">{employees}</b>
          <input type="range" min={5} max={30} value={employees} onChange={e => setEmployees(+e.target.value)} data-testid="s-emp" /></label>
        <label>Zadania (leady) / tydzień <b>{tasks}</b>
          <input type="range" min={10} max={200} step={5} value={tasks} onChange={e => setTasks(+e.target.value)} data-testid="s-tasks" /></label>
        <label className={mode !== 'automated' ? 'dim' : ''}>Udział automatyzacji <b>{Math.round(automation * 100)}%</b>
          <input type="range" min={0} max={1} step={0.05} value={automation} onChange={e => setAutomation(+e.target.value)} data-testid="s-auto" />
          {mode !== 'automated' && <small>Działa w trybie „Częściowo zautomatyzowany”.</small>}
        </label>
        <div className="row">
          <button className={exploded ? 'on' : ''} onClick={() => setExploded(v => !v)} data-testid="b-explode">Widok z góry: przepływ <kbd>X</kbd></button>
          <button className={tour ? 'on' : ''} onClick={() => setTour(v => !v)} data-testid="b-tour">Kamera filmowa <kbd>C</kbd></button>
        </div>
        <div className="row">
          <button onClick={() => { setSelected(null); setTour(false); setCamKey(v => v + 1) }}>Reset widoku <kbd>R</kbd></button>
          <button onClick={() => setInfo(true)} data-testid="b-info">Założenia modelu</button>
        </div>
      </aside>

      <aside className="panel right" data-testid="results">
        <h3>Wyniki tygodnia <span className="tag">demo</span></h3>
        <Kpi label="Czas leada → umowy" value={`${fmt1(results.leadTimeDays)} dni`} d={delta(results.leadTimeDays, base.leadTimeDays)} good="down" />
        <Kpi label="Ukończone sprzedaże / tydz." value={fmt1(results.completed)} d={delta(results.completed, base.completed)} good="up" testid="k-done" />
        <Kpi label="Koszt na zadanie" value={fmtPLN(results.costPerTask)} d={delta(results.costPerTask, base.costPerTask)} good="down" />
        <Kpi label="Koszt działu / tydz." value={fmtPLN(results.weeklyCost)} d={delta(results.weeklyCost, base.weeklyCost)} good="down" />
        <Kpi label="Praca ludzi na zadanie" value={`${fmt1(results.humanHoursPerTask)} h`} d={delta(results.humanHoursPerTask, base.humanHoursPerTask)} good="down" />
        <div className="stagebars">
          {results.stages.map((s, i) => (
            <button key={i} className={`sb ${selected === i ? 'on' : ''}`} onClick={() => setSelected(i)} onMouseEnter={() => setHovered(i)} onMouseLeave={() => setHovered(null)}>
              <span>{s.def.short}</span>
              <i><em style={{ width: `${Math.min(100, s.utilization * 66)}%` }} className={s.utilization > 1 ? 'r' : s.utilization > 0.85 ? 'o' : ''} /></i>
              <span className="pc">{Math.round(s.utilization * 100)}%</span>
            </button>
          ))}
          <small>Obłożenie etapów · wąskie gardło: <b>{results.stages[results.bottleneck].def.short}</b>{results.agentsTotal ? ` · agenci AI: ${results.agentsTotal}` : ''}</small>
        </div>
      </aside>

      {sel && selBase && (
        <section className="detail" data-testid="detail">
          <button className="x" onClick={() => setSelected(null)}>×</button>
          <div className="dn">Etap {selected! + 1} / 5</div>
          <h2>{sel.def.name}</h2>
          <p>{sel.def.description}</p>
          <p className="how"><b>{MODES[mode].label}:</b> {sel.def[mode]}</p>
          <div className="grid">
            <Stat l="Ludzie" v={sel.workers} /><Stat l="Agenci AI" v={sel.agents} />
            <Stat l="Czas cyklu" v={`${fmt1(sel.cycleHours)} h`} b={`${fmt1(selBase.cycleHours)} h`} />
            <Stat l="Oczekiwanie" v={`${fmt1(sel.waitHours)} h`} b={`${fmt1(selBase.waitHours)} h`} />
            <Stat l="Przepustowość" v={`${fmt1(Math.min(999, sel.capacity))}/tydz.`} />
            <Stat l="Kolejka" v={fmt1(sel.queue)} />
            <Stat l="Udział ludzi" v={`${Math.round(sel.humanShare * 100)}%`} /><Stat l="Obłożenie" v={`${Math.round(sel.utilization * 100)}%`} />
          </div>
          <div className="nav"><button disabled={selected === 0} onClick={() => setSelected(selected! - 1)}>← Poprzedni</button><button disabled={selected === 4} onClick={() => setSelected(selected! + 1)}>Następny →</button></div>
        </section>
      )}

      {info && (
        <div className="modal" onClick={() => setInfo(false)} data-testid="info">
          <div className="card" onClick={e => e.stopPropagation()}>
            <button className="x" onClick={() => setInfo(false)}>×</button>
            <h2>Założenia modelu <span className="tag">demonstracyjne</span></h2>
            <p>Jeden model (<code>src/model.ts</code>) jednocześnie liczy wyniki w panelach i steruje sceną 3D: liczbą osób przy biurkach w każdej strefie, liczbą agentów AI, stosami papieru na biurkach oraz gęstością i tempem przepływu dokumentów. Liczby są ilustracyjne, nie pochodzą z badań.</p>
            <table><thead><tr><th>Etap</th><th>h / zadanie (trad.)</th><th>Mnożnik z AI</th><th>Maks. automatyzacja</th><th>Agent</th></tr></thead>
              <tbody>{STAGES.map(s => <tr key={s.id}><td>{s.name}</td><td>{s.baseHours}</td><td>×{s.aiFactor}</td><td>{Math.round(s.automatable * 100)}%</td><td>{s.agentMinutes} min</td></tr>)}</tbody></table>
            <ul>
              <li>Efektywny czas pracy: {ASSUMPTIONS.hoursPerWeek} h/tydz./os.; koszt etatu {fmtPLN(ASSUMPTIONS.salaryMonthly)}/mies.</li>
              <li>Licencja asystenta AI: {fmtPLN(ASSUMPTIONS.aiSeatMonthly)}/os./mies.; platforma agentowa {fmtPLN(ASSUMPTIONS.agentPlatformMonthly)}/mies.; {ASSUMPTIONS.agentCostPerTask} zł za zadanie agenta.</li>
              <li>Ludzie przydzielani do etapów proporcjonalnie do obciążenia (min. 1 os.). Przepustowość etapu = godziny zespołu / godziny ludzkie na zadanie.</li>
              <li>Oczekiwanie: przybliżenie kolejkowe ρ/(1−ρ); przy przeciążeniu rośnie zaległość. Przekazania między etapami: {ASSUMPTIONS.handoffHours.traditional} / {ASSUMPTIONS.handoffHours.assisted} / {ASSUMPTIONS.handoffHours.automated} h.</li>
              <li>Ukończone = przepustowość wąskiego gardła (nie więcej niż popyt). Koszt na zadanie = koszt tygodnia / ukończone.</li>
            </ul>
            <p className="keys"><kbd>1</kbd><kbd>2</kbd><kbd>3</kbd> tryby · <kbd>X</kbd> rozstrzelenie · <kbd>C</kbd> kamera filmowa · <kbd>R</kbd> reset · przeciągnij = orbita · scroll = zoom</p>
          </div>
        </div>
      )}
      <footer className="hint">Kliknij stanowisko, aby zobaczyć szczegóły · przeciągnij, aby obracać</footer>
    </div>
  )
}

function Loader() {
  const { progress, active } = useProgress()
  const [gone, setGone] = useState(false)
  useEffect(() => { if (!active && progress >= 100) { const t = setTimeout(() => setGone(true), 700); return () => clearTimeout(t) } }, [active, progress])
  if (gone) return null
  return <div className={`loader ${!active && progress >= 100 ? 'out' : ''}`} data-testid="loader"><div className="logo">C</div><b>CampusAI Transformation Lab</b><div className="lbar"><i style={{ width: `${progress}%` }} /></div><small>Ładowanie biura, ludzi i oświetlenia… {Math.round(progress)}%</small></div>
}

function Kpi({ label, value, d, good, testid }: { label: string; value: string; d: number; good: 'up' | 'down'; testid?: string }) {
  const ok = d === 0 ? '' : (d < 0) === (good === 'down') ? 'good' : 'bad'
  return <div className="kpi" data-testid={testid}><span>{label}</span><b>{value}</b>{d !== 0 && <em className={ok}>{d > 0 ? '+' : ''}{d}% vs trad.</em>}</div>
}
function Stat({ l, v, b }: { l: string; v: string | number; b?: string }) {
  return <div className="stat"><span>{l}</span><b>{v}</b>{b && <small>trad.: {b}</small>}</div>
}
