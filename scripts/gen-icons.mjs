// Writes every app icon from the one drawing below: a diagonal capsule pill
// (teal half, white half) with a heartbeat line across it, on a soft tile.
// Run `npm run icons` after changing the drawing, and commit what it writes to public/.
import sharp from 'sharp'
import { mkdir, writeFile } from 'node:fs/promises'
import { fileURLToPath } from 'node:url'

const pub = (name) => fileURLToPath(new URL(`../public/${name}`, import.meta.url))

const TEAL = '#0f9488'
const PAPER = '#ffffff'
const BG = '#f4f6f8'
const BEAT = '#e8505b'

// The mark on a 512 grid, centred on (256,256). Keep in sync with Logo in src/client/components/icons.tsx.
const mark = `
  <g transform="rotate(-35 256 256)">
    <path d="M256 186H162a70 70 0 0 0 0 140H256Z" fill="${TEAL}"/>
    <path d="M256 186H350a70 70 0 0 1 0 140H256Z" fill="${PAPER}"/>
    <rect x="92" y="186" width="328" height="140" rx="70" fill="none" stroke="${TEAL}" stroke-width="16"/>
    <path d="M132 256H206L232 206L272 306L300 236L316 256H380" fill="none" stroke="${BEAT}" stroke-width="22" stroke-linecap="round" stroke-linejoin="round"/>
  </g>`

const svg = (body) => `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512">${body}\n</svg>\n`

const rounded = svg(`\n  <rect width="512" height="512" rx="112" fill="${BG}"/>${mark}`)
// Full-bleed, mark shrunk into the safe zone: iOS and Android cut their own shape out of it.
const square = svg(
  `\n  <rect width="512" height="512" fill="${BG}"/>\n  <g transform="translate(256 256) scale(0.8) translate(-256 -256)">${mark}\n  </g>`,
)

await mkdir(pub('icons'), { recursive: true })
await writeFile(pub('favicon.svg'), rounded)
const png = (src, size, name) => sharp(Buffer.from(src)).resize(size, size).png().toFile(pub(name))
await png(rounded, 192, 'icons/icon-192.png')
await png(rounded, 512, 'icons/icon-512.png')
await png(square, 512, 'icons/icon-512-maskable.png')
await png(square, 180, 'apple-touch-icon.png')
console.log('wrote favicon.svg, apple-touch-icon.png, icons/icon-192.png, icon-512.png, icon-512-maskable.png')
