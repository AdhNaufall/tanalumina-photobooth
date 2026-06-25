# Tanalumina Photobooth

Photobooth personal berbasis React dengan alur 5 halaman:

1. Pilih template strip
2. Pilih metode input
3. Kamera dengan countdown dan flash
4. Upload foto dengan drag & drop
5. Hasil strip dengan simpan dan buat ulang

## Menjalankan

Jalankan server statis lokal dari folder project:

```bash
python -m http.server 5173
```

Lalu buka `http://localhost:5173`.

## Catatan

- Template yang tersedia: Classic 4, Trio, Duo, Grid 2×2, Featured, dan Film Roll.
- Strip hasil bisa diunduh sebagai PNG.
- Jika kamera tidak diizinkan, alur tetap bisa dilanjutkan lewat upload.
