import { chromium } from "playwright-core"
const b = await chromium.launch({ executablePath: process.env.CHROME || "/opt/pw-browsers/chromium-1194/chrome-linux/chrome" })
const p = await b.newPage({ viewport: { width: 600, height: 1000 }, deviceScaleFactor: 1.5 })
const errs = []; p.on("pageerror", (e) => errs.push(e.message))
await p.goto("file://" + process.argv[2]); await p.waitForTimeout(700)
const el = p.locator(".loop")
for (let i = 0; i < 12; i++) { await el.screenshot({ path: `cq${String(i).padStart(2,"0")}.png` }); await p.waitForTimeout(260) }
console.log("errors", errs); await b.close()
