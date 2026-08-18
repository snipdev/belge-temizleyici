# Belge Temizleyici (Web)

Fotoğrafı çekilmiş belgeleri tarayıcıda **beyazlatıp okunaklı hale getiren** bir web uygulaması.
BelgeTemizleyici (PyInstaller/tkinter) aracının modern web sürümü — aynı algoritma, saf JavaScript ile.

## Algoritma

1. Gri tonlamaya çevir
2. `GaussianBlur` ile zemin (arka plan) tahmini
3. Işık düzeltme: `divide(gray, bg + 1, scale=255)`
4. `adaptiveThreshold` (GAUSSIAN_C + THRESH_BINARY) ile metin/kağıt ayrımı
5. Parçayı/kağıt bölgesini beyazla

Bu, orijinal Python aracının (OpenCV) adım adım karşılığıdır.

## Özellikler

- Sürükle-bırak veya dosya seçerek resim yükleme (JPG/PNG/WEBP)
- Canlı önizleme: **Bulanıklaştırma boyutu**, **Adaptif blok boyutu**, **Eşik sabiti (C)** slider'ları
- Orijinal / Temizlenmiş yan yana karşılaştırma
- Orijinal çözünürlükte JPG indirme
- Tamamı tarayıcıda çalışır — görsel sunucuya gönderilmez
- Koyu tema, duyarlı (responsive) düzen

## Geliştirme

```bash
npm install
npm run dev       # geliştirme
npm run build     # üretim derlemesi (dist/)
npm run preview   # build'i önizle
```

Test: `node scripts/test-cleaner.mjs` (sentetik görsel üzerinde algoritma doğrulaması).

## Yapı

```
src/
  App.jsx            # UI + canlı önizleme + export
  App.css            # koyu tema
  lib/cleaner.js     # saf JS algoritması (Gaussian blur + adaptif eşikleme)
scripts/
  test-cleaner.mjs   # algoritma doğrulama
```

## Lisans

MIT