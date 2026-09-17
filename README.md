# Minerals & Co. — Panel Admin

Backend admin panel sederhana untuk mengelola toko:

1. **Upload massal SKU & harga** (CSV / Excel)
2. **Order masuk** (dari frontend, otomatis tersimpan di database)
3. **Print resi** (PDF label pengiriman)
4. **Konfirmasi manual** via WhatsApp (`wa.me`) atau Email (`mailto`)

Stack: Node.js + Express + PostgreSQL (Prisma) + EJS. Didesain untuk deploy ke **Railway**.

---

## 1. Deploy ke Railway

1. Push folder ini ke sebuah repo GitHub (baru atau existing).
2. Di [railway.app](https://railway.app) → **New Project** → **Deploy from GitHub repo** → pilih repo ini.
3. Tambahkan database: klik **+ New** di project → **Database** → **Add PostgreSQL**.
   Railway otomatis membuat variabel `DATABASE_URL` dan menghubungkannya ke service kamu (pastikan variabel itu ter-reference di service backend, biasanya otomatis kalau satu project).
4. Buka service backend → tab **Variables**, tambahkan:

   | Key | Contoh nilai |
   |---|---|
   | `ADMIN_USER` | `admin` |
   | `ADMIN_PASSWORD_HASH` | *(lihat langkah 5)* |
   | `SESSION_SECRET` | string acak panjang, misal hasil `openssl rand -hex 32` |
   | `FRONTEND_ORIGIN` | `https://minerals-co.id` |
   | `STORE_NAME` | `Minerals & Co. Jewelery` |
   | `STORE_ADDRESS` | alamat toko (untuk resi) |
   | `STORE_PHONE` | nomor telepon toko |
   | `NODE_ENV` | `production` |

   `DATABASE_URL` biasanya sudah otomatis ada dari plugin Postgres — cek di tab Variables, jangan ditimpa.

5. **Generate password admin** — di komputer kamu (butuh Node.js terinstal):
   ```bash
   npm install
   node scripts/hash-password.js password-rahasia-kamu
   ```
   Copy hasilnya (`ADMIN_PASSWORD_HASH=...`) ke Variables di Railway.

6. **Set Start Command** di Railway (tab Settings → Deploy → Custom Start Command):
   ```
   npx prisma migrate deploy && node src/index.js
   ```
   Ini memastikan tabel database dibuat otomatis setiap deploy.

7. Deploy. Setelah selesai, Railway kasih URL publik, misalnya `https://toko-panel-production.up.railway.app`.

8. Buka URL itu → login pakai `ADMIN_USER` / password yang kamu hash tadi.

---

## 2. Integrasi dengan frontend minerals-co.id

Panel ini menyediakan **API publik** untuk menerima order dari halaman checkout kamu:

```
POST https://<url-railway-kamu>/api/orders
Content-Type: application/json

{
  "customerName": "Budi Santoso",
  "phone": "081234567890",
  "email": "budi@email.com",
  "address": "Jl. Mawar No. 10",
  "city": "Bandung",
  "postalCode": "40123",
  "notes": "Tolong dibungkus rapi",
  "items": [
    { "sku": "RING-001", "qty": 2 },
    { "sku": "NECK-002", "qty": 1 }
  ]
}
```

Response sukses:
```json
{ "success": true, "orderNumber": "ORD-20260911-1234", "total": 550000 }
```

Contoh kode di frontend (JavaScript, dipanggil saat tombol "Checkout" ditekan):

```javascript
async function submitOrder(data) {
  const res = await fetch('https://<url-railway-kamu>/api/orders', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  const result = await res.json();
  if (!res.ok) {
    alert('Gagal order: ' + result.error);
    return;
  }
  alert('Order berhasil! No. Order: ' + result.orderNumber);
}
```

**Catatan penting:**
- Harga dihitung ulang di server berdasarkan data produk di database (bukan dari frontend), jadi harga tidak bisa dimanipulasi dari sisi client.
- SKU pada `items` harus persis sama dengan SKU yang di-upload lewat panel admin.
- Pastikan `FRONTEND_ORIGIN` di environment variable sesuai domain frontend kamu, supaya tidak diblok CORS.

---

## 3. Cara pakai fitur

### Upload massal SKU & harga
- Buka menu **Produk** → download template CSV → isi kolom `sku, name, price, stock` → upload.
- Bisa juga upload file Excel (.xlsx) dengan kolom yang sama (boleh `sku/harga/nama/stok` versi Indonesia).
- SKU yang sudah ada otomatis di-*update* (bukan dobel).

### Order masuk
- Menu **Order** menampilkan semua order dari frontend, dengan filter status: Baru, Diproses, Dikirim, Selesai, Batal.

### Print resi
- Buka detail order → tombol **🖨 Print Resi** → PDF label pengiriman terbuka di tab baru, siap di-print (ukuran ~10x15cm, cocok untuk kertas label kurir).

### Konfirmasi manual
- Di detail order ada tombol **💬 Konfirmasi via WhatsApp** (buka WhatsApp Web/App dengan pesan siap kirim ke nomor pembeli) dan **✉️ Konfirmasi via Email** (buka aplikasi email default dengan draft siap kirim). Kamu tinggal review lalu tekan kirim — tidak ada yang terkirim otomatis.

---

## 4. Menjalankan di lokal (opsional, untuk development)

```bash
npm install
cp .env.example .env
# isi .env, minimal DATABASE_URL (bisa pakai Postgres lokal atau Railway),
# ADMIN_USER, dan ADMIN_PASSWORD_HASH (generate lewat scripts/hash-password.js)

npx prisma migrate dev --name init
npm start
```

Buka `http://localhost:3000`.

---

## 5. Struktur folder

```
toko-panel/
  prisma/schema.prisma      # skema database: Product, Order, OrderItem
  src/
    index.js                # entry point Express
    db.js                   # Prisma client
    middleware/auth.js      # proteksi login admin
    routes/
      auth.js                # login/logout
      products.js            # CRUD produk + upload massal
      orders.js               # API publik /api/orders + halaman admin order
      resi.js                 # generate PDF resi
  views/                     # tampilan EJS (login, dashboard, produk, order)
  public/css/style.css       # styling
  scripts/hash-password.js   # utilitas generate password admin
```
