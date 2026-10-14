# The Jangkar Canggu — Website

Website landing page bilingual (EN/ID) dengan video hero sinematik, kalender cek ketersediaan, dan booking via WhatsApp (+62 813-3767-7891).

## Struktur
```
index.html               ← halaman utama
assets/css/styles.css    ← desain
assets/js/config.js      ← PENGATURAN: nomor WA & tanggal penuh (edit di sini)
assets/js/i18n.js        ← teks Bahasa Indonesia
assets/js/app.js         ← logika (kalender, WA, video, galeri)
assets/photos/           ← 13 foto
assets/video/            ← hero.mp4 (desktop), hero-mobile.mp4 (HP), poster
tools/render_hero.py     ← skrip render ulang video hero
```

## Menandai tanggal penuh (fully booked)
Buka `assets/js/config.js`, isi daftar `booked`:
```js
booked: {
  double: ["2026-12-24", "2026-12-28..2027-01-02"],
  villa:  ["2026-11-10..2026-11-14"],
}
```
Tanggal itu akan dicoret di kalender dan tidak bisa dipilih tamu.

## Ganti foto / render ulang video
1. Taruh foto baru di `assets/photos/` (nama sama untuk mengganti).
2. Ubah urutan di `SHOTS_WIDE` / `SHOTS_TALL` dalam `tools/render_hero.py` bila perlu.
3. Jalankan (butuh Python 3 + ffmpeg): `python3 tools/render_hero.py`

## Online-kan (gratis)
- **Netlify Drop**: buka app.netlify.com/drop → seret folder ini → langsung live.
- Atau upload isi folder ke hosting/cPanel Anda (public_html).

Catatan: buka lewat hosting/server, bukan dobel-klik file, agar video & peta tampil optimal.
