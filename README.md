# Panduan: Terjemahan Al-Qur’an (bacaan bersambung)

Aplikasi ini menampilkan terjemahan Al-Qur’an bahasa Indonesia seperti buku: paragraf bersambung, nomor ayat kecil di depan setiap ayat, dan catatan kaki berupa huruf.

## Membuka aplikasi

**Di komputer:** klik dua kali `index.html`. Tidak perlu internet dan tidak perlu server.

**Di ponsel:** ponsel tidak bisa membuka file HTML dari penyimpanan dengan baik, jadi folder ini perlu dipasang di hosting web. Contohnya dengan GitHub Pages:

1. Unggah isi folder ini ke sebuah repositori GitHub.
2. Buka **Settings → Pages** dan pilih *Deploy from a branch*, cabang `master`, folder `/ (root)`.
3. Buka alamat yang diberikan, misalnya `https://namaanda.github.io/tq/`.

Setelah dibuka sekali dengan internet, aplikasi tetap bisa dipakai tanpa internet. Pilih **Tambahkan ke Layar Utama** (*Add to Home Screen*) agar aplikasi muncul seperti aplikasi biasa.

## Isi folder

| File | Fungsi |
|---|---|
| `index.html` | Halaman utama. Buka file ini. |
| `surah/001.js` … `surah/114.js` | **Teks terjemahan, satu file per surah. Bagian inilah yang diedit.** |
| `style.css` | Tampilan (huruf, warna, jarak). |
| `parser.js`, `app.js` | Program pembaca. Tidak perlu diubah. |
| `sw.js`, `manifest.webmanifest`, `icons/` | Untuk mode offline dan pemasangan di ponsel. |
| `service-worker.js` | Menghapus versi lama (React) dari perangkat pengunjung lama. Biarkan saja. |

## Mengedit teks surah

Buka file surah dengan editor teks apa saja (Notepad, VS Code, dan lain-lain). Contoh isinya:

```
// Terjemahan Al-Qur’an — Surah 2 (Al-Baqarah). Cara mengedit: lihat PANDUAN.md
TQ.surah(`
# 2 | Al-Baqarah | Sapi Betina | Madaniyah

// Huruf-huruf pembuka surah
{1} Alif Lām Mīm.[^1a]

// Sifat orang-orang yang bertakwa
{2} Kitab (Al-Qur’an) ini tidak ada keraguan padanya; petunjuk bagi mereka yang bertakwa,[^2a] {3} (Yaitu) mereka yang beriman …

***

// Sifat orang-orang munafik
{8} Dan di antara manusia ada yang berkata, …

[^1a]: Beberapa surah dalam Al-Qur’an dibuka dengan huruf abjad …
[^2a]: Takwa yaitu mengikuti segala perintah Allah dan menjauhi segala larangan-Nya.
`);
```

### Aturannya

| Tulisan | Arti |
|---|---|
| `# 2 \| Al-Baqarah \| Sapi Betina \| Madaniyah` | Baris judul: nomor, nama, arti, tempat turun. |
| `{12}` | Awal ayat 12. Nomor ayat harus berurutan. |
| baris kosong | Paragraf baru. |
| `***` | Pergantian bagian (ruku’). Tampil sebagai tanda • • •. |
| `[^12a]` | Tanda catatan kaki di dalam teks. Pembaca melihatnya sebagai huruf *a*. |
| `[^12a]: isi catatan` | Isi catatan kaki, satu baris, ditulis di bagian bawah file. |
| `// teks` | Label untuk peninjau. Hanya tampil di **Mode tinjauan**. |

### Contoh perubahan

- **Menggabungkan dua paragraf:** hapus baris kosong (dan label `//`) di antara keduanya.
- **Memecah paragraf:** sisipkan baris kosong sebelum `{nomor}` ayat yang menjadi awal paragraf baru. Paragraf juga boleh dipecah di tengah ayat.
- **Menambah catatan kaki:** sisipkan `[^15b]` di dalam teks ayat 15, lalu tulis `[^15b]: isi catatan` di bagian bawah. Labelnya bebas, tetapi gunakan pola *nomor ayat + huruf* agar mudah dilacak.

### Yang harus dihindari

- **Jangan menulis tanda `` ` `` (backtick) di dalam teks.** Tanda itu menutup isi file. Untuk hamzah, pakai `’`.
- **Jangan menghapus atau mengubah baris pembuka dan penutup.** Baris pembuka adalah ``TQ.surah(` `` dan baris penutup adalah `` `); ``.
- Simpan file dengan pengodean **UTF-8**. Ini sudah menjadi bawaan di hampir semua editor.

Setelah menyimpan, muat ulang halaman di peramban (F5) untuk melihat hasilnya.

## Jika ada kesalahan

Kalau file surah mengandung kesalahan, aplikasi menampilkan kotak peringatan berwarna jingga di atas surah itu. Isinya menyebutkan nomor barisnya, misalnya *"Baris 14: ayat 13 tidak ditemukan"* atau *"tanda [^5a] tidak punya isi catatan"*. Perbaiki baris tersebut, lalu muat ulang halaman.

Dalam **Mode tinjauan**, halaman daftar isi juga menampilkan daftar semua file yang bermasalah.

## Mode tinjauan

Buka **Aa → Mode tinjauan**. Setiap paragraf kemudian diberi keterangan:

- rentang ayatnya (misalnya *2:8–20*) dan label isinya;
- catatan bertanda *Catatan:* (berwarna jingga), yaitu tempat batas paragraf yang bisa diperdebatkan;
- nomor bagian (ruku’) pada setiap pergantian bagian.

Label dan catatan ini dibuat sebagai draf untuk ditinjau. Boleh diubah atau dihapus. Pembaca biasa tidak melihatnya.

## Memperbarui versi di hosting

Unggah ulang file yang diubah ke tempat yang sama. Pembaca akan mendapatkan versi baru pada kunjungan berikutnya, karena aplikasi memeriksa pembaruan di latar belakang.
