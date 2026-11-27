#!/usr/bin/env node
/*
 * Génère les icônes PNG (PWA, notifications) à partir de public/favicon.svg (logo plein cadre)
 * et de public/badge.svg (silhouette monochrome du badge de notification).
 * Usage : node scripts/generate-icons.cjs   (nécessite Playwright + Chromium)
 */
const fs = require('node:fs')
const path = require('node:path')
const { chromium } = require('playwright')

const ROOT = path.resolve(__dirname, '..')
const LOGO = path.join(ROOT, 'public', 'favicon.svg')
const BADGE = path.join(ROOT, 'public', 'badge.svg')
const OUT_DIR = path.join(ROOT, 'public', 'icons')

// Le logo est plein cadre (fond nuit + halos) : pas de fond ajouté, échelle 1. Le contenu utile
// (disque de verre, r = 168/512) tient dans le cercle sûr de 80 % du masque adaptatif.
// scale : part du côté occupée par l'image. background : null = transparent.
const ICONS = [
  { file: 'icon-192.png', size: 192, scale: 1, background: null, source: LOGO },
  { file: 'icon-512.png', size: 512, scale: 1, background: null, source: LOGO },
  { file: 'maskable-512.png', size: 512, scale: 1, background: null, source: LOGO },
  { file: 'apple-touch-icon.png', size: 180, scale: 1, background: null, source: LOGO },
  { file: 'badge-96.png', size: 96, scale: 1, background: null, source: BADGE },
]

function html(svgDataUrl, { size, scale, background }) {
  const logo = Math.round(size * scale)
  return `<!doctype html><html><head><style>
    html, body { margin: 0; padding: 0; background: ${background ?? 'transparent'}; }
    .box { width: ${size}px; height: ${size}px; display: flex; align-items: center; justify-content: center; }
    img { width: ${logo}px; height: ${logo}px; object-fit: contain; }
  </style></head><body><div class="box"><img src="${svgDataUrl}" alt=""></div></body></html>`
}

async function main() {
  const dataUrl = (file) => `data:image/svg+xml;base64,${fs.readFileSync(file).toString('base64')}`
  fs.mkdirSync(OUT_DIR, { recursive: true })

  const browser = await chromium.launch()
  try {
    for (const icon of ICONS) {
      const page = await browser.newPage({ viewport: { width: icon.size, height: icon.size }, deviceScaleFactor: 1 })
      await page.setContent(html(dataUrl(icon.source), icon))
      await page.locator('img').evaluate((img) => img.decode())
      await page.screenshot({
        path: path.join(OUT_DIR, icon.file),
        omitBackground: !icon.background,
        clip: { x: 0, y: 0, width: icon.size, height: icon.size },
      })
      await page.close()
      console.log(`public/icons/${icon.file} (${icon.size}×${icon.size})`)
    }
  } finally {
    await browser.close()
  }
}

main().catch((error) => {
  console.error(error)
  process.exit(1)
})
