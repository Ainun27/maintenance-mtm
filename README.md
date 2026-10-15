# PT Menara Terus Makmur (MTM) - Maintenance Apps

Aplikasi Full-Stack berbasis **TypeScript** yang mengintegrasikan sistem **Maintenance Apps MTM (A Member of ASTRA Otoparts Group)** dengan **Real-Time IoT MQTT Telemetry Ingestion (Dual PostgreSQL: Timescale & Monitoring)**.

---

## 📸 Fitur Tampilan

### 1. Layar Login (Halaman Masuk)
* **Latar Belakang Pabrik**: Foto kompleks industri modern dengan overlay blur halus.
* **Branding Resmi MTM**: Logo geometris ganda, logo teks MTM (*Menara Terus Makmur*), dan identitas *"A Member of ASTRA Otoparts Group"*.
* **Form Login**: Field NPK / Username & Password dengan fitur lihat password (*toggle eye icon*).
* **Quick Access Shortcut**: 4 tombol akses cepat dengan satu klik langsung masuk sesuai hak akses:
  * 👤 **PIC** (*PIC Jig Fixture / Admin*)
  * 🪪 **Section** (*Section Head Machining*)
  * 🛡️ **Dept** (*Department Head*)
  * 👁️ **Guest** (*Tamu / Read-Only Observer*)

### 2. Dashboard Kanban MTM
* **Sidebar Kiri Gelap**:
  * Logo MTM & Astra
  * Menu navigasi: `Dashboard`, `Monitoring (LIVE)`, `TPM Control`
  * Tombol `Approval Center` biru
  * Profil pengguna aktif, bel notifikasi (badge 1), dan tombol Logout
* **4 Kolom Kanban Utama**:
  1. 🟦 **TPM**: Filter (*Semua, Overdue, ≤7 Hari, Belum*), kartu child part, due date, progress counter (`0/500x`), link `Modul TPM`.
  2. 🟦 **TASK & APPROVAL**: Filter status, empty state *"Semua task selesai"*, link `Approval Center Lengkap`.
  3. 🟦 **LIFETIME JIG**: Ringkasan Overdue / ≤30d / Aman, progress bar usia jig (`2%`), link `Detail Lifetime`.
  4. 🟦 **STOK REMINDER**: Ringkasan Habis / Menipis / Aman, visual stok jig & part dengan progress bar indikator merah (*Habis*) dan hijau (*Aman*), link `Kontrol Stok`.

### 3. Monitoring Telemetri IoT (Dual PostgreSQL: Timescale & Monitoring)
* Klik menu **`Monitoring`** pada sidebar untuk membuka panel telemetri IoT.
* Menampilkan status live koneksi:
  1. **Broker MQTT** (Active Ingestion)
  2. **PostgreSQL Timescale** (Penyimpanan Time-Series Telemetri / Hypertable)
  3. **PostgreSQL Monitoring** (Status Kondisi Real-Time Per Perangkat & Alert Audit)
* Kartu sensor real-time per mesin/jig (Suhu, Kelembapan, Tekanan, Status NORMAL/WARNING).
* Live terminal ingestion stream.
* Tabel riwayat telemetri dari database Timescale dengan filter per perangkat.

---

## 🚀 Arsitektur Database (Hanya PostgreSQL)

Sistem menggunakan **dua database PostgreSQL**:
1. **Timescale Database (`timescale_db`)**:
   * Menyimpan miliaran baris data telemetri berstempel waktu (`iot_telemetry`).
   * Menggunakan partisi waktu hypertable TimescaleDB (otomatis fallback ke PostgreSQL time-series biasa jika plugin belum aktif).
2. **Monitoring Database (`monitoring_db`)**:
   * Menyimpan status kondisi terakhir per unit mesin/jig (`device_monitoring`).
   * Menyimpan log audit event dan peringatan anomali sistem (`system_monitoring_logs`).

---

## 🛠️ Panduan Menjalankan

### 1. Konfigurasi [.env](file:///d:/MTM/PM/backend/.env)
Pastikan parameter database sesuai dengan instalasi PostgreSQL Anda:
```env
# 1. PostgreSQL untuk Timescale
TIMESCALE_HOST=localhost
TIMESCALE_PORT=5432
TIMESCALE_DB=timescale_db
TIMESCALE_USER=postgres
TIMESCALE_PASSWORD=<password_postgres_anda>

# 2. PostgreSQL untuk Monitoring
MONITORING_HOST=localhost
MONITORING_PORT=5432
MONITORING_DB=monitoring_db
MONITORING_USER=postgres
MONITORING_PASSWORD=<password_postgres_anda>
```

> **Catatan**: Jika menggunakan satu server PostgreSQL lokal (port 5432), kedua database (`timescale_db` dan `monitoring_db`) dapat berjalan bersama di server yang sama. Aplikasi akan otomatis membuat database dan tabel yang dibutuhkan saat pertama kali dijalankan.

### 2. Jalankan Aplikasi (Full-Stack)
Dari folder utama (`d:\MTM\PM`), jalankan:
```powershell
npm start
```
Buka browser di alamat:
👉 **`http://localhost:4000`**

### 3. Uji Coba Pengiriman Data Sensor (Simulator)
Buka terminal kedua dan jalankan:
```powershell
npm run simulator
```
*Data sensor akan dikirim setiap 2 detik ke MQTT dan otomatis masuk ke Timescale DB dan Monitoring DB.*
