// Inline the Vite build into one self-contained HTML file (for artifact
// hosting and for the TikTok package, which must not reference external hosts).
import { readFileSync, writeFileSync, readdirSync } from 'node:fs'
import { join } from 'node:path'

const dist = new URL('../dist', import.meta.url).pathname
let html = readFileSync(join(dist, 'index.html'), 'utf8')
const assets = join(dist, 'assets')

for (const f of readdirSync(assets)) {
  const content = readFileSync(join(assets, f), 'utf8')
  if (f.endsWith('.js')) {
    html = html.replace(
      new RegExp(`<script type="module"[^>]*src="\\./assets/${f}"[^>]*></script>`),
      () => `<script type="module">${content.replace(/<\/script>/g, '<\\/script>')}</script>`,
    )
  } else if (f.endsWith('.css')) {
    html = html.replace(
      new RegExp(`<link rel="stylesheet"[^>]*href="\\./assets/${f}"[^>]*>`),
      () => `<style>${content}</style>`,
    )
  }
}

writeFileSync(join(dist, 'missile.html'), html)
console.log('wrote dist/missile.html', (html.length / 1024).toFixed(0) + 'KB')
