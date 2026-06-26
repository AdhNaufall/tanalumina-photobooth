# Tanalumina Photobooth

Photobooth personal interaktif berbasis React dengan desain modern dan responsif. Memiliki alur penggunaan yang mulus dari pemilihan template hingga hasil cetak foto.

## ✨ Fitur Utama

Aplikasi ini memiliki 5 alur halaman yang saling terintegrasi:

1. 🎞️ **Pilih Template Strip:** Berbagai variasi grid dan layout (Classic 4, Trio, Duo, Grid 2×2, Featured, dan Film Roll).
2. 📥 **Pilih Metode Input:** Dukungan untuk pengambilan foto langsung maupun unggah foto.
3. 📸 **Kamera dengan Countdown:** Pengambilan gambar langsung menggunakan webcam dengan fitur hitung mundur dan efek flash.
4. 📤 **Upload Foto (Drag & Drop):** Alternatif bagi perangkat tanpa kamera atau untuk foto dari galeri.
5. 🖼️ **Hasil Strip:** Generate hasil akhir berupa strip foto yang siap diunduh (PNG) atau simpan, serta opsi untuk membuat ulang.

## 🚀 Menjalankan Secara Lokal

Untuk menjalankan aplikasi ini secara lokal, Anda dapat menggunakan server statis. Jalankan perintah berikut dari folder root project:

```bash
python -m http.server 5173
```

Setelah server berjalan, buka browser Anda dan kunjungi:
👉 `http://localhost:5173`

## 📝 Catatan Penting

- **Unduhan Mudah:** Strip hasil akhir dapat diunduh langsung dalam format `.png`.
- **Aksesibilitas:** Jika akses kamera diblokir atau tidak tersedia, pengguna tetap bisa melanjutkan alur melalui fitur unggah foto manual.
