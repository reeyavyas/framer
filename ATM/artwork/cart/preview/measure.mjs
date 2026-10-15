import { chromium } from "playwright-core"
import fs from "fs"
const svg = fs.readFileSync(process.argv[2], "utf8").replace(/<svg[^>]*>/, '<svg xmlns="http://www.w3.org/2000/svg" viewBox="190 80 2120 1480" width="2120" height="1480">')
const b = await chromium.launch({ executablePath: process.env.CHROME || "/opt/pw-browsers/chromium-1194/chrome-linux/chrome" })
const p = await b.newPage({ viewport: { width: 2120, height: 1480 } })
await p.setContent(`<body style="margin:0;background:#fff">${svg}</body>`)
await p.screenshot({ path: "measure.png" }); await b.close()
