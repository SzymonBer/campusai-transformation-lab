import { chromium } from 'playwright'
const b = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] })
for (const r of process.argv.slice(2)) {
  const p = await b.newPage({ viewport: { width: 1200, height: 675 } })
  await p.goto('http://localhost:4173/campusai-transformation-lab/?rot=' + r); await p.waitForSelector('[data-testid=loader]', { state: 'detached', timeout: 180000 })
  await p.addStyleTag({ content: '.panel,.modes,.top,.hint,.slabel{display:none!important}' }); await p.waitForTimeout(4000)
  await p.screenshot({ path: `shots/hdri_${r}.png` }); await p.close(); console.log(r)
}
await b.close()
