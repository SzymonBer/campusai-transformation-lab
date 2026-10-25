/**
 * CampusAI Transformation Lab — JEDYNY model symulacji.
 * Wszystkie liczby są DEMONSTRACYJNE (ilustracyjne założenia, nie dane z badań).
 */
export type Mode = 'traditional' | 'assisted' | 'automated'

export interface StageDef {
  id: string; name: string; short: string; description: string
  baseHours: number      // godziny pracy człowieka na 1 zadanie w trybie tradycyjnym
  aiFactor: number       // mnożnik czasu, gdy pracownik ma asystenta AI
  automatable: number    // maks. udział zadań, które agent AI może przejąć w całości
  agentMinutes: number   // czas obsługi zadania przez agenta (min)
  traditional: string; assisted: string; automated: string
}

export const STAGES: StageDef[] = [
  { id: 'lead', name: 'Pozyskanie leada', short: 'Lead', baseHours: 1.2, aiFactor: 0.55, automatable: 0.9, agentMinutes: 4,
    description: 'Identyfikacja i kwalifikacja potencjalnych klientów.',
    traditional: 'Ręczne przeszukiwanie baz, arkusze, zimne listy.',
    assisted: 'AI podpowiada scoring i uzupełnia dane firm.',
    automated: 'Agent monitoruje sygnały zakupowe i sam kwalifikuje leady.' },
  { id: 'research', name: 'Research', short: 'Research', baseHours: 2.5, aiFactor: 0.35, automatable: 0.85, agentMinutes: 8,
    description: 'Zrozumienie firmy, potrzeb i decydentów.',
    traditional: 'Godziny czytania stron, raportów i LinkedIn.',
    assisted: 'AI streszcza źródła i przygotowuje brief.',
    automated: 'Agent buduje kompletny profil konta i hipotezy potrzeb.' },
  { id: 'offer', name: 'Przygotowanie oferty', short: 'Oferta', baseHours: 3.5, aiFactor: 0.45, automatable: 0.65, agentMinutes: 12,
    description: 'Dopasowanie oferty, wycena, dokumenty.',
    traditional: 'Kopiowanie starych ofert, ręczne wyceny.',
    assisted: 'AI generuje szkic oferty z bazy wiedzy.',
    automated: 'Agent składa ofertę z modułów; człowiek zatwierdza wyjątki.' },
  { id: 'contact', name: 'Kontakt', short: 'Kontakt', baseHours: 2.0, aiFactor: 0.75, automatable: 0.45, agentMinutes: 6,
    description: 'Rozmowy, maile, follow-upy, spotkania.',
    traditional: 'Ręczne maile i notatki po rozmowach.',
    assisted: 'AI pisze follow-upy i notatki ze spotkań.',
    automated: 'Agent prowadzi sekwencje i umawia spotkania; ludzie rozmawiają.' },
  { id: 'close', name: 'Zamknięcie sprzedaży', short: 'Zamknięcie', baseHours: 2.2, aiFactor: 0.85, automatable: 0.15, agentMinutes: 10,
    description: 'Negocjacje, umowa, przekazanie do realizacji.',
    traditional: 'Negocjacje i obieg umowy mailem.',
    assisted: 'AI przygotowuje warianty negocjacyjne i umowy.',
    automated: 'Agent obsługuje obieg dokumentów; negocjuje człowiek.' },
]

export const MODES: Record<Mode, { label: string; sub: string }> = {
  traditional: { label: 'Tradycyjny', sub: 'Ludzie, arkusze, maile' },
  assisted: { label: 'Wspomagany AI', sub: 'Każdy pracownik z asystentem' },
  automated: { label: 'Częściowo zautomatyzowany', sub: 'Agenci AI + ludzie' },
}

export const ASSUMPTIONS = {
  hoursPerWeek: 32,          // efektywne godziny pracy / tydzień / osoba
  salaryMonthly: 11000,      // pełny koszt pracodawcy, PLN / mies.
  aiSeatMonthly: 250,        // licencja asystenta AI / osoba / mies.
  agentPlatformMonthly: 4000,// platforma agentowa / mies. (tryb zautomatyzowany)
  agentCostPerTask: 1.8,     // koszt modelu na 1 zadanie obsłużone przez agenta, PLN
  weeksPerMonth: 4.33,
  handoffHours: { traditional: 6, assisted: 3, automated: 0.5 } as Record<Mode, number>, // oczekiwanie na przekazanie między etapami
  agentConcurrency: 4,       // równoległe zadania na 1 instancję agenta
}

export interface Inputs { mode: Mode; employees: number; tasks: number; automation: number }

export interface StageResult {
  def: StageDef; workers: number; agents: number; humanShare: number
  humanHours: number; cycleHours: number; capacity: number; demand: number
  utilization: number; waitHours: number; queue: number; isBottleneck: boolean
}

export interface Results {
  stages: StageResult[]; completed: number; leadTimeDays: number
  weeklyCost: number; costPerTask: number; humanHoursPerTask: number
  bottleneck: number; agentsTotal: number; automationEffective: number
}

export function effectiveAutomation(mode: Mode, slider: number) {
  return mode === 'automated' ? slider : 0
}

export function simulate(inp: Inputs): Results {
  const A = ASSUMPTIONS
  const auto = effectiveAutomation(inp.mode, inp.automation)
  const pre = STAGES.map(def => {
    const f = inp.mode === 'traditional' ? 1 : def.aiFactor
    const agentShare = def.automatable * auto
    const humanHours = def.baseHours * f
    return { def, humanHours, agentShare, load: humanHours * (1 - agentShare) }
  })
  // przydział ludzi proporcjonalnie do obciążenia (min. 1 na etap), metoda największych reszt
  const totalLoad = pre.reduce((s, p) => s + p.load, 0)
  const n = Math.max(STAGES.length, inp.employees)
  const raw = pre.map(p => 1 + (n - STAGES.length) * (p.load / totalLoad))
  const workers = raw.map(Math.floor)
  let rest = n - workers.reduce((a, b) => a + b, 0)
  raw.map((r, i) => [r - Math.floor(r), i] as const).sort((a, b) => b[0] - a[0]).forEach(([, i]) => { if (rest-- > 0) workers[i]++ })

  let flow = inp.tasks
  const stages: StageResult[] = pre.map((p, i) => {
    const w = workers[i]
    const agents = auto > 0 && p.agentShare > 0.05 ? Math.min(5, Math.max(1, Math.round(p.agentShare * 5 * Math.min(1.4, inp.tasks / 60)))) : 0
    const humanCap = p.load > 0 ? (w * A.hoursPerWeek) / p.load : Infinity // zadań/tydz. (część ludzka limituje)
    const capacity = humanCap
    const demand = flow
    const utilization = demand / capacity
    const cycleHours = p.humanHours * (1 - p.agentShare) + (p.def.agentMinutes / 60) * p.agentShare
    // przybliżenie kolejki M/M/1 na zespół, ograniczone dla stabilności wizualizacji
    const rho = Math.min(utilization, 0.97)
    const waitHours = cycleHours * (rho / (1 - rho)) / Math.max(1, w * 0.6) + (utilization > 1 ? (utilization - 1) * A.hoursPerWeek : 0)
    const queue = Math.max(0, demand - capacity) + rho * rho / (1 - rho)
    flow = Math.min(flow, capacity)
    return { def: p.def, workers: w, agents, humanShare: 1 - p.agentShare, humanHours: p.humanHours, cycleHours, capacity, demand, utilization, waitHours, queue, isBottleneck: false }
  })
  const completed = flow
  let b = 0; stages.forEach((s, i) => { if (s.utilization > stages[b].utilization) b = i }); stages[b].isBottleneck = true
  const totalHours = stages.reduce((s, x) => s + x.cycleHours + x.waitHours, 0) + A.handoffHours[inp.mode] * (STAGES.length - 1)
  const leadTimeDays = totalHours / 8
  const people = n * A.salaryMonthly / A.weeksPerMonth
  const seats = inp.mode === 'traditional' ? 0 : n * A.aiSeatMonthly / A.weeksPerMonth
  const platform = auto > 0 ? A.agentPlatformMonthly / A.weeksPerMonth : 0
  const agentRuns = stages.reduce((s, x) => s + Math.min(x.demand, x.capacity / Math.max(0.0001, x.humanShare)) * (1 - x.humanShare), 0) * A.agentCostPerTask
  const weeklyCost = people + seats + platform + agentRuns
  return {
    stages, completed, leadTimeDays, weeklyCost, costPerTask: weeklyCost / Math.max(0.1, completed),
    humanHoursPerTask: stages.reduce((s, x) => s + x.humanHours * x.humanShare, 0),
    bottleneck: b, agentsTotal: stages.reduce((s, x) => s + x.agents, 0), automationEffective: auto,
  }
}

export const fmtPLN = (v: number) => new Intl.NumberFormat('pl-PL', { maximumFractionDigits: 0 }).format(v) + ' zł'
export const fmt1 = (v: number) => new Intl.NumberFormat('pl-PL', { maximumFractionDigits: 1, minimumFractionDigits: 1 }).format(v)
