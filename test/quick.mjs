import { chromium } from 'playwright'
const URL = 'http://localhost:4173/campusai-transformation-lab/'
const b = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] })
const errs = []
const p = await b.newPage({ viewport: { width: 1600, height: 900 } })
p.on('console', m => { if (m.type() === 'error') errs.push(m.text()) }); p.on('pageerror', e => errs.push('pageerror ' + e.message))
await p.goto(URL); await p.waitForSelector('[data-testid=loader]', { state: 'detached', timeout: 180000 }).catch(() => errs.push('loader timeout'))
await p.waitForTimeout(6000)
const s = async n => { await p.screenshot({ path: `shots/${n}.png` }); console.log('shot', n) }
await s('r01_overview_trad')
await p.locator('.sb').nth(0).click(); await p.waitForTimeout(6000); await s('r02_lead_close')
await p.screenshot({ path: 'shots/r02z_zoom_people.png', clip: { x: 400, y: 200, width: 800, height: 450 } })
await p.keyboard.press('Escape'); await p.click('[data-mode=automated]'); await p.waitForTimeout(3000)
await p.locator('.sb').nth(2).click(); await p.waitForTimeout(6000); await s('r03_offer_auto')
await p.keyboard.press('Escape'); await p.waitForTimeout(5000); await s('r04_overview_auto')
await p.click('[data-testid=b-explode]'); await p.waitForTimeout(6000); await s('r05_topdown')
console.log('ERR', JSON.stringify(errs.slice(0, 8)))
await b.close()
