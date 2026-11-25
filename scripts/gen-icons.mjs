// Writes every app icon from the one drawing below: a diagonal capsule pill
// (teal half, white half) with a heartbeat line across it, on a soft tile.
// Run `npm run icons` after changing the drawing, and commit what it writes to public/.
import sharp from 'sharp'
import { mkdir, writeFile } from 'node:fs/promises'
import { fileURLToPath } from 'node:url'

const pub = (name) => fileURLToPath(new URL(`../public/${name}`, import.meta.url))

const DEEP = '#075a53'
const PAPER = '#ffffff'
const BEAT = '#ff6b6b'

// Header logo (transparent, outlined, for light/dark theme backgrounds). Keep in sync with Logo in src/client/components/icons.tsx.
// The tile mark below drops the outline: white half + deep-teal half pop on the teal gradient.
const beat = `<path d="M132 256H206L232 206L272 306L300 236L316 256H380" fill="none" stroke="${BEAT}" stroke-width="24" stroke-linecap="round" stroke-linejoin="round"/>`
const mark = `
  <g transform="rotate(-35 256 256)" filter="url(#sh)">
    <path d="M256 186H162a70 70 0 0 0 0 140H256Z" fill="${DEEP}"/>
    <path d="M256 186H350a70 70 0 0 1 0 140H256Z" fill="${PAPER}"/>
    ${beat}
  </g>`
const defs = `<defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#14b2a2"/><stop offset="1" stop-color="#0b6f66"/></linearGradient><filter id="sh" x="-20%" y="-20%" width="140%" height="140%"><feDropShadow dx="0" dy="8" stdDeviation="10" flood-color="#04302c" flood-opacity=".35"/></filter></defs>`

const svg = (body) => `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512">${body}\n</svg>\n`

const rounded = svg(`\n  ${defs}<rect width="512" height="512" rx="112" fill="url(#g)"/>\n  <g transform="translate(256 256) scale(1.2) translate(-256 -256)">${mark}\n  </g>`)
// Full-bleed, mark shrunk into the safe zone: iOS and Android cut their own shape out of it.
const square = svg(
  `\n  ${defs}<rect width="512" height="512" fill="url(#g)"/>\n  <g transform="translate(256 256) scale(1.2) translate(-256 -256)">${mark}\n  </g>`,
)

await mkdir(pub('icons'), { recursive: true })
await writeFile(pub('favicon.svg'), rounded)
const png = (src, size, name) => sharp(Buffer.from(src)).resize(size, size).png().toFile(pub(name))
await png(rounded, 192, 'icons/icon-192.png')
await png(rounded, 512, 'icons/icon-512.png')
await png(square, 512, 'icons/icon-512-maskable.png')
await png(square, 180, 'apple-touch-icon.png')
console.log('wrote favicon.svg, apple-touch-icon.png, icons/icon-192.png, icon-512.png, icon-512-maskable.png')
