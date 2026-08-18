import { useCallback, useEffect, useRef, useState } from 'react'
import './App.css'
import { cleanImage } from './lib/cleaner.js'

const DEFAULTS = { blur: 101, block: 35, c: 15 }
const PREVIEW_MAX = 1100

function App() {
  const [image, setImage] = useState(null)
  const [params, setParams] = useState(DEFAULTS)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  const origCanvasRef = useRef(null)
  const resultCanvasRef = useRef(null)
  const fullResCanvasRef = useRef(null)
  const imageRef = useRef(null)
  const debounceRef = useRef(null)

  const loadFile = useCallback((file) => {
    if (!file || !file.type.startsWith('image/')) return
    const url = URL.createObjectURL(file)
    const img = new Image()
    img.onload = () => {
      imageRef.current = img
      setImage(url)
      setError('')
    }
    img.src = url
  }, [])

  useEffect(() => {
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current)
    }
  }, [])

  useEffect(() => {
    if (!imageRef.current) return
    const img = imageRef.current

    const scale = Math.min(1, PREVIEW_MAX / Math.max(img.naturalWidth, img.naturalHeight))
    const w = Math.max(1, Math.round(img.naturalWidth * scale))
    const h = Math.max(1, Math.round(img.naturalHeight * scale))

    const origC = origCanvasRef.current
    origC.width = w
    origC.height = h
    const ctx = origC.getContext('2d')
    ctx.drawImage(img, 0, 0, w, h)
    const src = ctx.getImageData(0, 0, w, h)

    setBusy(true)
    if (debounceRef.current) clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(() => {
      requestAnimationFrame(() => {
        try {
          const out = cleanImage(src.data, w, h, params)
          const resC = resultCanvasRef.current
          resC.width = w
          resC.height = h
          const rctx = resC.getContext('2d')
          rctx.putImageData(new ImageData(out, w, h), 0, 0)
          setBusy(false)
        } catch (e) {
          setBusy(false)
          setError(e.message)
        }
      })
    }, 160)
  }, [image, params])

  const setParam = (key) => (e) => setParams((p) => ({ ...p, [key]: Number(e.target.value) }))

  const exportFull = () => {
    const img = imageRef.current
    if (!img) return
    const canvas = fullResCanvasRef.current
    canvas.width = img.naturalWidth
    canvas.height = img.naturalHeight
    const ctx = canvas.getContext('2d')
    ctx.drawImage(img, 0, 0)
    const src = ctx.getImageData(0, 0, canvas.width, canvas.height)
    const out = cleanImage(src.data, canvas.width, canvas.height, params)
    ctx.putImageData(new ImageData(out, canvas.width, canvas.height), 0, 0)
    canvas.toBlob((blob) => {
      const a = document.createElement('a')
      a.href = URL.createObjectURL(blob)
      a.download = 'temizlenmis-belge.jpg'
      a.click()
      URL.revokeObjectURL(a.href)
    }, 'image/jpeg', 0.92)
  }

  const resetParams = () => setParams(DEFAULTS)

  const slider = (label, key, min, max, step) => (
    <label className="slider">
      <span className="slider-label">{label}</span>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={params[key]}
        onChange={setParam(key)}
      />
      <span className="slider-value">{params[key]}</span>
    </label>
  )

  return (
    <div className="app">
      <header className="header">
        <h1>Belge Temizleyici</h1>
        <p className="subtitle">
          Fotoğrafı çekilmiş belgeleri beyazlat, okunaklı hale getir — tamamı tarayıcında
          çalışır, hiçbir görsel sunucuya gönderilmez.
        </p>
      </header>

      {!image && (
        <div
          className="dropzone"
          onDragOver={(e) => e.preventDefault()}
          onDrop={(e) => {
            e.preventDefault()
            loadFile(e.dataTransfer.files[0])
          }}
        >
          <input
            type="file"
            accept="image/*"
            id="file-input"
            onChange={(e) => loadFile(e.target.files[0])}
          />
          <label htmlFor="file-input" className="dropzone-label">
            <span className="dropzone-icon">🖼️</span>
            <strong>Resim seç veya buraya sürükle</strong>
            <span className="dropzone-hint">JPG, PNG, WEBP…</span>
          </label>
        </div>
      )}

      {image && (
        <div className="workspace">
          <aside className="controls">
            <div className="control-group">
              <button className="btn" onClick={() => setImage(null)}>
                ← Yeni resim
              </button>
            </div>
            {slider('Bulanıklaştırma boyutu', 'blur', 1, 201, 2)}
            {slider('Adaptif blok boyutu', 'block', 3, 99, 2)}
            {slider('Eşik sabiti (C)', 'c', 1, 60, 1)}
            <div className="control-group">
              <button className="btn ghost" onClick={resetParams}>
                Varsayılana dön
              </button>
              <button className="btn primary" onClick={exportFull} disabled={busy}>
                {busy ? 'İşleniyor…' : 'Tam çözünürlükte indir'}
              </button>
            </div>
            <p className="controls-hint">
              Ayar değiştikçe önizleme otomatik güncellenir; indirirken orijinal boyutta
              işlenir.
            </p>
          </aside>

          <main className="preview">
            <figure className="panel">
              <figcaption>Orijinal</figcaption>
              <canvas ref={origCanvasRef} className="canvas" />
            </figure>
            <figure className="panel">
              <figcaption>Temizlenmiş</figcaption>
              <canvas ref={resultCanvasRef} className="canvas" />
            </figure>
          </main>
          <canvas ref={fullResCanvasRef} hidden />
        </div>
      )}

      {error && <div className="error">{error}</div>}

      <footer className="footer">
        Algoritma: Gauss bulanıklığı ile zemin tahmini → ışık düzeltme (divide) → adaptif
        eşikleme → beyazlatma.
      </footer>
    </div>
  )
}

export default App