import { cleanImage } from '../src/lib/cleaner.js'

const w = 200
const h = 200
const n = w * h
const src = new Uint8ClampedArray(n * 4)

for (let y = 0; y < h; y++) {
  for (let x = 0; x < w; x++) {
    const i = (y * w + x) * 4
    const bg = 150 + Math.round(60 * Math.sin(x / 30)) + Math.round(40 * Math.sin(y / 25))
    const isText = (x % 40 < 8) && (y % 20 < 4)
    const v = isText ? 40 : Math.max(0, Math.min(255, bg))
    src[i] = v
    src[i + 1] = v
    src[i + 2] = v
    src[i + 3] = 255
  }
}

const out = cleanImage(src, w, h, { blur: 101, block: 35, c: 15 })

let textPixels = 0
let whiteBgPixels = 0
let keptTextPixels = 0
for (let y = 0; y < h; y++) {
  for (let x = 0; x < w; x++) {
    const i = (y * w + x) * 4
    const isText = (x % 40 < 8) && (y % 20 < 4)
    const whitened = out[i] === 255 && out[i + 1] === 255 && out[i + 2] === 255
    if (isText) {
      textPixels++
      if (!whitened) keptTextPixels++
    } else if (whitened) {
      whiteBgPixels++
    }
  }
}

const bgCount = n - textPixels
console.log('text pixels:', textPixels, 'kept dark:', keptTextPixels, Math.round((keptTextPixels / textPixels) * 100) + '%')
console.log('bg pixels:', bgCount, 'whitened:', whiteBgPixels, Math.round((whiteBgPixels / bgCount) * 100) + '%')