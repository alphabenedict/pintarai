# PintarAI

PintarAI adalah asisten belajar offline untuk siswa di Indonesia. Aplikasi ini dirancang untuk dapat berjalan secara lokal tanpa memerlukan koneksi internet, menggunakan model AI (seperti Gemma dan Wllama) yang langsung berjalan pada perangkat.

## Fitur Utama

- **Offline Pertama:** Sepenuhnya dapat dijalankan secara lokal tanpa perlu terhubung ke cloud/internet. Menjaga privasi dan hemat kuota.
- **Dukungan Multi-Platform:** Tersedia untuk Android dan Desktop (Windows/Mac/Linux).
- **Asisten AI Lokal:** Dukungan model bahasa offline dengan integrasi MediaPipe dan Wllama.
- **Antarmuka Interaktif:** Dibuat menggunakan React, Tailwind CSS, serta animasi mulus dari Framer Motion untuk pengalaman belajar yang menyenangkan.

## Teknologi yang Digunakan

- **Frontend:** React, Vite, Tailwind CSS
- **Desktop:** Electron
- **Mobile (Android):** Capacitor
- **AI / Model Lokal:** Wllama, ONNX / Nemotron ekspor, format model `.bin` teroptimasi (misal: Gemma Int4)
- **UI & Ikon:** Radix UI, Framer Motion, Lucide React

## Prasyarat

Pastikan Anda telah menginstal beberapa alat pengembangan berikut sebelum mencoba menjalankan aplikasi ini:
- [Node.js](https://nodejs.org/) (versi LTS terbaru direkomendasikan)
- Python (untuk skrip pengolahan model)
- Android Studio & Android SDK (jika ingin melakukan build Android)

## Cara Menjalankan

1. **Instalasi Dependencies:**
   ```bash
   npm install
   ```

2. **Menjalankan di Mode Development (Web):**
   ```bash
   npm run dev
   ```

3. **Menjalankan di Mode Development (Desktop / Electron):**
   ```bash
   npm run dev:electron
   ```

4. **Kompilasi / Build untuk Android:**
   Aplikasi ini menggunakan Capacitor. Untuk membuild dan membuka Android Studio:
   ```bash
   npm run build:android
   npm run open:android
   ```

5. **Build Aplikasi Desktop (Production):**
   ```bash
   npm run dist
   ```

## Model AI dan Skrip Utilitas

Aplikasi ini menyertakan skrip untuk menyiapkan model (contoh: `gemma-2b-it-gpu-int4.bin`). Skrip tersedia di folder `scripts/`, yang termasuk di dalamnya:
- `export-nemotron-onnx.py`
- `validate-nemotron-export.py`
- Serta berbagai script pembuatan manifest dan persiapan asset (`prepare-android.cjs`, dll).
