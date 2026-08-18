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
  const [crop, setCrop] = useState(null)
  const [cropMode, setCropMode] = useState(false)
  const [liveDrag, setLiveDrag] = useState(null)

  const origCanvasRef = useRef(null)
  const origWrapRef = useRef(null)
  const resultCanvasRef = useRef(null)
  const fullResCanvasRef = useRef(null)
  const imageRef = useRef(null)
  const debounceRef = useRef(null)
  const draggingRef = useRef(false)

  const loadFile = useCallback((file) => {
    if (!file || !file.type.startsWith('image/')) return
    const url = URL.createObjectURL(file)
    const img = new Image()
    img.onload = () => {
      imageRef.current = img
      setCrop(null)
      setCropMode(false)
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

    setBusy(true)
    if (debounceRef.current) clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(() => {
      requestAnimationFrame(() => {
        try {
          const resC = resultCanvasRef.current
          const rctx = resC.getContext('2d')

          if (crop) {
            const sx = Math.round(crop.x0 * w)
            const sy = Math.round(crop.y0 * h)
            const sw = Math.max(1, Math.round((crop.x1 - crop.x0) * w))
            const sh = Math.max(1, Math.round((crop.y1 - crop.y0) * h))
            resC.width = sw
            resC.height = sh
            const region = ctx.getImageData(sx, sy, sw, sh)
            const out = cleanImage(region.data, sw, sh, params)
            rctx.putImageData(new ImageData(out, sw, sh), 0, 0)
          } else {
            resC.width = w
            resC.height = h
            const src = ctx.getImageData(0, 0, w, h)
            const out = cleanImage(src.data, w, h, params)
            rctx.putImageData(new ImageData(out, w, h), 0, 0)
          }
          setBusy(false)
        } catch (e) {
          setBusy(false)
          setError(e.message)
        }
      })
    }, 160)
  }, [image, params, crop])

  const setParam = (key) => (e) => setParams((p) => ({ ...p, [key]: Number(e.target.value) }))

  const canvasPoint = (e) => {
    const c = origCanvasRef.current
    const rect = c.getBoundingClientRect()
    return {
      x: Math.min(1, Math.max(0, ((e.clientX - rect.left) / rect.width) * c.width / c.width)),
      y: Math.min(1, Math.max(0, ((e.clientY - rect.top) / rect.height) * c.height / c.height)),
    }
  }

  const onMouseDown = (e) => {
    if (!cropMode) return
    e.preventDefault()
    draggingRef.current = true
    const p = canvasPoint(e)
    setLiveDrag({ x0: p.x, y0: p.y, x1: p.x, y1: p.y })
  }

  const onMouseMove = (e) => {
    if (!draggingRef.current) return
    e.preventDefault()
    const p = canvasPoint(e)
    setLiveDrag((d) => (d ? { ...d, x1: p.x, y1: p.y } : d))
  }

  const onMouseUp = () => {
    if (!draggingRef.current) return
    draggingRef.current = false
    setLiveDrag((d) => {
      if (!d) return d
      const x0 = Math.min(d.x0, d.x1)
      const x1 = Math.max(d.x0, d.x1)
      const y0 = Math.min(d.y0, d.y1)
      const y1 = Math.max(d.y0, d.y1)
      if (x1 - x0 > 0.01 && y1 - y0 > 0.01) {
        setCrop({ x0, y0, x1, y1 })
      }
      setCropMode(false)
      return null
    })
  }

  const rectStyle = (r) => {
    if (!r) return null
    return {
      left: `${r.x0 * 100}%`,
      top: `${r.y0 * 100}%`,
      width: `${(r.x1 - r.x0) * 100}%`,
      height: `${(r.y1 - r.y0) * 100}%`,
    }
  }

  const exportFull = () => {
    const img = imageRef.current
    if (!img) return
    const canvas = fullResCanvasRef.current
    const nw = img.naturalWidth
    const nh = img.naturalHeight

    let sx = 0, sy = 0, sw = nw, sh = nh
    if (crop) {
      sx = Math.round(crop.x0 * nw)
      sy = Math.round(crop.y0 * nh)
      sw = Math.max(1, Math.round((crop.x1 - crop.x0) * nw))
      sh = Math.max(1, Math.round((crop.y1 - crop.y0) * nh))
    }

    canvas.width = sw
    canvas.height = sh
    const ctx = canvas.getContext('2d')
    ctx.drawImage(img, sx, sy, sw, sh, 0, 0, sw, sh)

    const src = ctx.getImageData(0, 0, sw, sh)
    const out = cleanImage(src.data, sw, sh, params)
    ctx.putImageData(new ImageData(out, sw, sh), 0, 0)
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

  const cropBox = crop || liveDrag

  return (
    <div className="app">
      <header className="header">
        <h1>Belge Temizleyici</h1>
        <p className="subtitle">
          Fotoğrafı çekilmiş belgeleri beyazlat ve çıktı almaya hazır hale getir — tamamı
          tarayıcında çalışır, hiçbir görsel sunucuya gönderilmez.
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
              <button
                className={`btn ${cropMode ? 'active' : ''}`}
                onClick={() => setCropMode((m) => !m)}
              >
                {cropMode ? 'Kırpma çiz…' : 'Kırp'}
              </button>
              {crop && (
                <button className="btn ghost" onClick={() => setCrop(null)}>
                  Kırpmayı kaldır
                </button>
              )}
            </div>
            {cropMode && (
              <p className="controls-hint">Orijinal resimde sürükleyerek kırpılacak alanı seç.</p>
            )}
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
              işlenir. Kırpma varsa sadece o alan işlenip indirilir.
            </p>
          </aside>

          <main className="preview">
            <figure className="panel">
              <figcaption>Orijinal</figcaption>
              <div ref={origWrapRef} className="canvas-wrap">
                <canvas
                  ref={origCanvasRef}
                  className="canvas"
                  onMouseDown={onMouseDown}
                  onMouseMove={onMouseMove}
                  onMouseUp={onMouseUp}
                  onMouseLeave={onMouseUp}
                />
                {cropBox && <div className="crop-overlay" style={rectStyle(cropBox)} />}
              </div>
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
        eşikleme → beyazlatma. Kırpma ile sadece istenen bölge işlenir.
      </footer>
    </div>
  )
}

export default App