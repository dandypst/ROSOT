# 🛡️ Bank Soal Harian — Safety & Teknis

Website bank soal harian dengan login Google, soal otomatis, dan rekap admin lengkap.
Hosting: **Vercel** | Database & Auth: **Firebase**

---

## 📋 Fitur
- ✅ Login dengan akun Google
- ✅ Soal harian otomatis (1 Safety + 1 Teknis per hari, berganti tiap tengah malam)
- ✅ Bank soal 30 soal dengan filter & pencarian
- ✅ Skor pribadi per user + riwayat jawaban
- ✅ Rekap Admin: tabel semua user, grafik aktivitas, detail jawaban, export CSV
- ✅ Data terpusat di Firebase — bisa diakses dari device mana saja

---

## 🚀 PANDUAN SETUP LENGKAP

### BAGIAN 1 — Setup Firebase

**Langkah 1: Buat Project Firebase**
1. Buka https://console.firebase.google.com
2. Klik **"Add project"** (atau "Tambahkan project")
3. Nama project: `bank-soal` → klik **Continue** sampai selesai

**Langkah 2: Aktifkan Authentication Google**
1. Di sidebar kiri: klik **Authentication**
2. Klik tab **"Sign-in method"**
3. Klik **Google** → toggle **Enable** → isi email support → klik **Save**

**Langkah 3: Buat Firestore Database**
1. Di sidebar kiri: klik **Firestore Database**
2. Klik **"Create database"**
3. Pilih **"Start in production mode"** → pilih region terdekat (asia-southeast2) → klik **Enable**

**Langkah 4: Set Firestore Security Rules**
1. Di Firestore, klik tab **"Rules"**
2. Hapus semua teks yang ada, paste rules berikut:

```
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /daily_answers/{docId} {
      allow read, write: if request.auth != null;
    }
    match /answer_records/{docId} {
      allow read, write: if request.auth != null;
    }
  }
}
```

3. Klik **Publish**

**Langkah 5: Daftarkan Web App & Ambil Config**
1. Di halaman utama project, klik ikon **"</>"** (Web app)
2. Nama app: `bank-soal-web` → klik **Register app**
3. Kamu akan melihat kode seperti ini — **SALIN nilai-nilainya**:
```js
const firebaseConfig = {
  apiKey: "AIzaSy...",
  authDomain: "bank-soal-xxx.firebaseapp.com",
  projectId: "bank-soal-xxx",
  storageBucket: "bank-soal-xxx.appspot.com",
  messagingSenderId: "123456789",
  appId: "1:123456789:web:abc..."
};
```
4. Klik **Continue to console**

**Langkah 6: Tambahkan Domain ke Authorized Domains**
1. Di Authentication → **Settings** → tab **Authorized domains**
2. Nanti setelah deploy Vercel, tambahkan domain Vercel kamu di sini (contoh: `bank-soal.vercel.app`)

---

### BAGIAN 2 — Upload ke GitHub

**Langkah 1: Install Git** (kalau belum ada)
- Download dari https://git-scm.com/download/win

**Langkah 2: Buat Repository GitHub**
1. Buka https://github.com → login
2. Klik **"+"** → **New repository**
3. Nama: `bank-soal` → **Private** (supaya kode tidak publik) → **Create repository**

**Langkah 3: Upload Project**
1. Ekstrak file zip project ini
2. Buka folder hasil ekstrak → klik kanan di area kosong → **"Open Git Bash here"** (atau Command Prompt)
3. Jalankan perintah berikut satu per satu:

```bash
git init
git add .
git commit -m "first commit"
git branch -M main
git remote add origin https://github.com/USERNAMEKAMU/bank-soal.git
git push -u origin main
```

> Ganti `USERNAMEKAMU` dengan username GitHub kamu

---

### BAGIAN 3 — Deploy ke Vercel

**Langkah 1: Daftar & Connect GitHub**
1. Buka https://vercel.com → **Sign Up** → pilih **Continue with GitHub**
2. Authorize Vercel

**Langkah 2: Import Project**
1. Di dashboard Vercel, klik **"Add New Project"**
2. Pilih repo `bank-soal` → klik **Import**

**Langkah 3: Tambahkan Environment Variables**

Sebelum deploy, klik **"Environment Variables"** dan tambahkan satu per satu:

| Key | Value (dari Firebase config) |
|-----|------|
| REACT_APP_FIREBASE_API_KEY | `AIzaSy...` |
| REACT_APP_FIREBASE_AUTH_DOMAIN | `bank-soal-xxx.firebaseapp.com` |
| REACT_APP_FIREBASE_PROJECT_ID | `bank-soal-xxx` |
| REACT_APP_FIREBASE_STORAGE_BUCKET | `bank-soal-xxx.appspot.com` |
| REACT_APP_FIREBASE_MESSAGING_SENDER_ID | `123456789` |
| REACT_APP_FIREBASE_APP_ID | `1:123...` |
| REACT_APP_ADMIN_EMAILS | `emailkamu@gmail.com` |

> `REACT_APP_ADMIN_EMAILS` = email Google kamu (yang akan jadi admin). Bisa lebih dari satu, pisahkan dengan koma: `email1@gmail.com,email2@gmail.com`

**Langkah 4: Deploy**
1. Klik **Deploy**
2. Tunggu 2-3 menit
3. ✅ Website live! Kamu dapat URL seperti `https://bank-soal-xxx.vercel.app`

**Langkah 5: Tambahkan Domain ke Firebase**
1. Salin URL Vercel kamu (contoh: `bank-soal-xxx.vercel.app`)
2. Buka Firebase Console → Authentication → Settings → Authorized domains
3. Klik **Add domain** → paste URL Vercel → **Add**

---

## ✅ Test Website

1. Buka URL Vercel kamu
2. Login dengan akun Google yang ada di `REACT_APP_ADMIN_EMAILS`
3. Kamu akan punya akses menu **Rekap Admin**
4. Bagikan URL ke tim — mereka login dengan akun Google masing-masing

---

## ➕ Cara Tambah Soal

Edit file `src/data/questions.js`, tambahkan di dalam array:
```js
{ 
  id: 31,
  type: "safety",        // "safety" atau "teknis"
  question: "Pertanyaan di sini?", 
  options: ["A", "B", "C", "D"], 
  answer: 0              // index jawaban benar (0=A, 1=B, 2=C, 3=D)
}
```
Setelah edit → `git add . && git commit -m "tambah soal" && git push` → Vercel otomatis rebuild.

---

## 🆘 Troubleshooting

**Login Google gagal / popup error**
→ Pastikan domain Vercel sudah ditambahkan di Firebase Authorized Domains

**Data tidak tersimpan**
→ Cek Firestore Rules sudah di-publish

**Halaman Rekap Admin tidak muncul**
→ Pastikan email kamu di `REACT_APP_ADMIN_EMAILS` sama persis dengan email Google yang dipakai login

**Build Vercel gagal**
→ Cek semua Environment Variables sudah diisi dengan benar (tidak ada yang kosong)
