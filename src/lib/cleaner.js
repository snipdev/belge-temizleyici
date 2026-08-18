const kernelCache = new Map()

function gaussianKernel(ksize) {
  const key = ksize
  let cached = kernelCache.get(key)
  if (cached) return cached
  const sigma = 0.3 * ((ksize - 1) * 0.5 - 1) + 0.8
  const radius = (ksize - 1) >> 1
  const k = new Float32Array(ksize)
  let sum = 0
  for (let i = 0; i < ksize; i++) {
    const x = i - radius
    k[i] = Math.exp(-(x * x) / (2 * sigma * sigma))
    sum += k[i]
  }
  for (let i = 0; i < ksize; i++) k[i] /= sum
  cached = { k, radius }
  kernelCache.set(key, cached)
  return cached
}

function blurGray(gray, w, h, ksize) {
  const { k, radius } = gaussianKernel(ksize)
  const n = w * h
  const tmp = new Float32Array(n)
  const out = new Float32Array(n)

  for (let y = 0; y < h; y++) {
    const row = y * w
    for (let x = 0; x < w; x++) {
      let acc = 0
      for (let j = -radius; j <= radius; j++) {
        const xx = x + j < 0 ? 0 : x + j >= w ? w - 1 : x + j
        acc += gray[row + xx] * k[j + radius]
      }
      tmp[row + x] = acc
    }
  }

  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      let acc = 0
      for (let j = -radius; j <= radius; j++) {
        const yy = y + j < 0 ? 0 : y + j >= h ? h - 1 : y + j
        acc += tmp[yy * w + x] * k[j + radius]
      }
      out[y * w + x] = acc
    }
  }
  return out
}

export function cleanImage(src, w, h, { blur, block, c }) {
  const blurK = Math.max(1, blur | 1)
  const blockK = Math.max(3, block | 1)
  const n = w * h

  const gray = new Uint8Array(n)
  for (let i = 0, j = 0; i < n; i++, j += 4) {
    gray[i] = (src[j] * 299 + src[j + 1] * 587 + src[j + 2] * 114) / 1000
  }

  const bg = blurGray(gray, w, h, blurK)

  const corrected = new Uint8Array(n)
  for (let i = 0; i < n; i++) {
    let v = (gray[i] / (bg[i] + 1)) * 255
    if (v < 0) v = 0
    else if (v > 255) v = 255
    corrected[i] = Math.round(v)
  }

  const mean = blurGray(corrected, w, h, blockK)

  const out = new Uint8ClampedArray(src)
  for (let i = 0, j = 0; i < n; i++, j += 4) {
    if (corrected[i] > mean[i] - c) {
      out[j] = 255
      out[j + 1] = 255
      out[j + 2] = 255
    }
  }
  return out
}