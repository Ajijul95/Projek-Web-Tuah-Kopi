# Tuah Kopi Firebase

Project web Tuah Kopi yang sudah dipisah menjadi halaman user, admin, barista, CSS, dan JS.

## Firebase

Project ini sudah memakai config Firebase milik:

- Project ID: `kedai-kopi-f2f88`
- Collection produk: `products`
- Collection pesanan: `orders`
- Collection barista: `baristas`

## Struktur Field Products

Setiap document di collection `products` harus punya field:

- `name` string
- `price` int64
- `category` string: `panas`, `dingin`, `signature`, atau `nonkopi`
- `desc` string
- `image` string
- `icon` string
- `badge` string opsional

Jika tambah produk dari admin web, document ID otomatis mengikuti nama produk.
Contoh: `Kopi Susu Aren` menjadi `kopi_susu_aren`.

## Cara Jalankan

1. Buka folder di VS Code.
2. Jalankan dengan Live Server.
3. Buka `index.html`.
4. Login staff di `login.html`.

## Login Demo

- Admin: `admin` / `admin123`
- Barista: `barista` / `barista123`

## Firestore Rules Demo

Gunakan rules ini hanya untuk demo/tugas:

```js
rules_version = '2';

service cloud.firestore {
  match /databases/{database}/documents {
    match /{document=**} {
      allow read, write: if true;
    }
  }
}
```


## Update Icon Produk
Pada halaman Admin > Kelola Menu, icon produk sudah memakai pilihan dropdown. Saat tambah/edit produk, pilih icon seperti ☕, 🧊, 🥛, 🍵, 🍫, dan lain-lain. Nilai icon tetap disimpan ke Firestore field `icon`.


## Upload gambar produk

Admin bisa mengisi URL gambar manual atau memilih file gambar dari laptop. Jika file dipilih, gambar akan diupload ke Firebase Storage pada folder `products/`, lalu URL hasil upload otomatis disimpan ke field `image` di Firestore collection `products`.

Pastikan Firebase Storage sudah diaktifkan dan rules demo sementara mengizinkan read/write saat pengujian.

## Update: Aktivitas / Tracking Pesanan User

Versi ini menambahkan halaman `user/tracking.html` agar pelanggan bisa melihat status pesanan secara realtime dari Firebase Firestore.

Alur status pesanan:

1. `baru` - Pesanan diterima
2. `proses` - Pesanan sedang dibuat barista
3. `diantar` - Pesanan sedang diantar ke meja
4. `selesai` - Pesanan selesai
5. `batal` - Pesanan dibatalkan

Setelah user mengirim pesanan dari `user/order.html`, web otomatis mengarahkan user ke halaman `user/tracking.html?code=KODE_PESANAN`. Barista/admin bisa mengubah status dari dashboard, lalu halaman tracking user ikut berubah otomatis.
